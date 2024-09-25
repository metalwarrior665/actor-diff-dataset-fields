// This is for testing it without metamorphing into the dedup-datasets
import { Actor, log } from 'apify';
import diff from 'fast-diff';

import { transformingFunction } from './main.js';
import type { Input } from './main.js';

export const noMetamorphTest = async (input: Input) => {
    const items = [];

    const oldItems = (await Actor.apifyClient.dataset(input.oldDatasetId).listItems()).items;
    const newItems = (await Actor.apifyClient.dataset(input.newDatasetId).listItems()).items;

    log.info(`Old dataset has ${oldItems.length} items and new dataset has ${newItems.length} items`);

    for (const item of oldItems) {
        items.push({ ...item, __datasetId__: input.oldDatasetId });
    }

    for (const item of newItems) {
        items.push({ ...item, __datasetId__: input.newDatasetId });
    }

    const output = transformingFunction(items, {
        customInputData: input,
        diff,
    });

    log.info(`There are ${output.length} items in the output`);

    await Actor.pushData(output);
};
