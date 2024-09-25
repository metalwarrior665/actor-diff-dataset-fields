Compare items of two datasets to see changes in their fields. You match the items by a key field and then compare the any number of textual fields.

## Diff
You can choose one or more fields to diff between two items that are matched by a key field. The diff is computed using the [fast-diff](https://www.npmjs.com/package/fast-diff) package where the output is a list of text parts that are marked with a number depending if they are inserted (1), deleted (-1) or unchanged (0).

## Output

The output is a JSON object with the following properties:
- `type`: Representing how the items were compared. Can be `new`, `removed`, `unchanged` or `updated`.
- `oldItem`: The item from the old dataset
- `newItem`: The item from the new dataset
- `diff`: The diff between the two items. Only present if the type is `updated`.

### Example input
```json
{
    "oldDatasetId": "0Azg4BxggC3RmcPpY",
    "newDatasetId": "i4mfnrQEP8QmQAbHu",
    "fieldToMapBy": "url",
    "fieldsToDiff": ["text", "markdown"],
    "outputTypes": ["new", "removed", "updated", "unchanged"],
}
```

### Example output
This is one item that was matched in both datasets, the real output will have all items from both datasets.

```json
{
    "type": "updated",
    "oldItem": {
        "url": "https://www.peacocktv.com/start",
        "text": "PeacockAdobe AudienceManagerBack ButtonSearch IconFilter Icon\nEnter your email to get started",
		"markdown": "# PeacockAdobe AudienceManagerBack ButtonSearch IconFilter Icon\n\n## \n\nEnter your email to get started",
    },
    "newItem": {
        "url": "https://www.peacocktv.com/start",
        "text": "PeacockBack ButtonSearch IconFilter Icon\nEnter your email to get started",
		"markdown": "# PeacockBack ButtonSearch IconFilter Icon\n\n## \n\nEnter your email to get started",
    }
    ,
    "diff":{
        "text": [
            [
                0,
                "Peacock"
            ],
            [
                -1,
                "Adobe AudienceManager"
            ],
            [
                0,
                "Back ButtonSearch IconFilter Icon\nEnter your email to get started"
            ]
        ],
        "markdown": [
            [
                0,
                "# Peacock"
            ],
            [
                -1,
                "Adobe AudienceManager"
            ],
            [
                0,
                "Back ButtonSearch IconFilter Icon\n\n## \n\nEnter your email to get started"
            ]
        ]
    }
}
```