// Apify SDK - toolkit for building Apify Actors (Read more at https://docs.apify.com/sdk/js/)
import { Actor, log } from 'apify';
import { noMetamorphTest } from './no-metamorph-test.js';

export interface Input {
    oldDatasetId: string;
    newDatasetId: string;

    fieldToMapBy: string;
    fieldsToDiff: string[];
    outputTypes: ResultType[];
    outputDatasetId?: string;
    onlyLoadStoreDiffedFields?: boolean;
    doNoMetamorphTest: boolean;
}

export const transformingFunction = (items: Item[], { customInputData, diff }: TransformFunctionOptions): Result[] => {
    const {
        fieldToMapBy,
        fieldsToDiff,
        // TODO: the outputType logic is not very clean, it should be refactored
        outputTypes,
        oldDatasetId,
        newDatasetId,
    } = customInputData;

    // First we categorize items by dataset, appendDatasetIds will add __datasetId__ variable to each item
    const oldDatasetItemsMap: Record<string, Item> = {};
    const newDatasetItemsMap: Record<string, Item> = {};

    let itemsWithoutFieldToMap = 0;

    for (const item of items) {
        const key = item[fieldToMapBy] as string;
        if (!key) {
            itemsWithoutFieldToMap++;
            continue;
        }
        if (item.__datasetId__ === oldDatasetId) {
            delete item.__datasetId__;
            oldDatasetItemsMap[key] = item;
        } else if (item.__datasetId__ === newDatasetId) {
            delete item.__datasetId__;
            newDatasetItemsMap[key] = item;
        } else {
            // This would mean a bug in the dedup Actor so it should not happen
            console.warn(`Unknown dataset id: ${item.__datasetId__}`);
        }
    }

    console.log(`There are ${itemsWithoutFieldToMap} items without ${fieldToMapBy} field, these were skipped`);

    // Now we construct the final outputs and create the diff
    const output = [];

    // We keep track of what we already compared & pushed from looping the first map
    const alreadyChecked: Record<string, boolean> = {};

    for (const [key, oldItem] of (Object.entries(oldDatasetItemsMap))) {
        alreadyChecked[key] = true;

        const newItem = newDatasetItemsMap[key];

        const result: Result = {
            type: 'new',
        };

        result.newItem = newItem;
        result.oldItem = oldItem;

        if (!newItem) {
            result.type = 'removed';
            if (outputTypes.includes('removed')) {
                output.push(result);
            }
            continue;
        }

        const diffOutput: Record<string, DiffLibOutout> = {};
        for (const field of fieldsToDiff) {
            // We convert all values to strings
            const oldValue = `${oldItem[field] ?? ''}`;
            const newValue = `${newItem[field] ?? ''}`;
            const fieldDiffOutput = diff(oldValue, newValue) as DiffLibOutout;
            // This means there was no change
            if (fieldDiffOutput.length === 1 && fieldDiffOutput[0][0] === 0) {
                // do nothing
            } else {
                diffOutput[field] = fieldDiffOutput;
            }
        }

        if (Object.keys(diffOutput).length > 0) {
            result.type = 'updated';
            result.diff = diffOutput;
            if (outputTypes.includes('updated')) {
                output.push(result);
            }
        } else {
            result.type = 'unchanged';
            if (outputTypes.includes('unchanged')) {
                output.push(result);
            }
        }
    }

    // Now we add the items that are only in the new dataset
    for (const [key, newItem] of (Object.entries(newDatasetItemsMap))) {
        if (alreadyChecked[key]) {
            continue;
        }

        const result: Result = {
            type: 'new',
            newItem,
        };

        if (outputTypes.includes('new')) {
            output.push(result);
        }
    }

    return output;
};

// The init() call configures the Actor for its environment. It's recommended to start every Actor with an init()
await Actor.init();

// Structure of input is defined in input_schema.json
const {
    fieldToMapBy,
    fieldsToDiff = ['text'],
    outputTypes = ['new', 'updated', 'removed', 'unchanged'],

    // If run by webhook, pick triggerring run and the next older run
    oldDatasetId,
    newDatasetId,
    onlyLoadStoreDiffedFields = false,
    doNoMetamorphTest = false,
    outputDatasetId,
} = await Actor.getInput<Input>() ?? {} as Input;

if (doNoMetamorphTest) {
    log.info('Running without metamorph (test mode)');
    await noMetamorphTest({ fieldToMapBy, fieldsToDiff, outputTypes, oldDatasetId, newDatasetId, doNoMetamorphTest, onlyLoadStoreDiffedFields });
    await Actor.exit();
}

const customInputDataForDedup = {
    fieldToMapBy,
    fieldsToDiff,
    outputTypes,
    oldDatasetId,
    newDatasetId,
};

type Item = Record<string, unknown>
type DiffLibOutout = [number, string][];
interface TransformFunctionOptions {
    customInputData: typeof customInputDataForDedup;
    diff: (oldStr: string, newStr: string) => DiffLibOutout;
}

type ResultType = 'new' | 'updated' | 'unchanged' | 'removed';

// Types can be
// - new - fieldToMapBy is only in the new dataset
// - updated - fieldToMapBy is in both and any of fieldsToDiff is different
// - unchanged - fieldToMapBy is in both anf fieldsToDiff are all the same
// - removed - fieldToMapBy is only in old dataset
interface Result {
    type: ResultType;
    oldItem?: Item;
    newItem?: Item;
    diff?: Record<string, DiffLibOutout>;
}

const dedupActorInput = {
    datasetIds: [oldDatasetId, newDatasetId],
    customInputData: customInputDataForDedup,
    postDedupTransformFunction: transformingFunction,
    appendDatasetIds: true,
    outputDatasetId,
    // This can make the Actor significantly faster and load/store less data
    fieldsToLoad: onlyLoadStoreDiffedFields ? [...fieldsToDiff, fieldToMapBy] : undefined,
};

await Actor.metamorph('lukaskrivka/dedup-datasets', dedupActorInput);

await Actor.exit();
