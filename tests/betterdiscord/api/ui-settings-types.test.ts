import {expect, test} from "bun:test";
import type {Setting} from "@data/settings";


const settings: Setting[] = [
    {type: "table", id: "rows", value: [], columns: {name: {type: "string", label: "Name"}}},
    {type: "dropdown", id: "mode", value: "one", options: [{label: "One", value: "one"}]},
    {type: "number", id: "count", value: 1, min: 0, max: 10}
];

// @ts-expect-error Setting must continue rejecting unknown control discriminators.
const invalidSetting: Setting = {type: "unknown", id: "invalid"};

test("Setting keeps control-specific literal properties and validates its discriminator", () => {
    expect(settings.map(setting => setting.type)).toEqual(["table", "dropdown", "number"]);
    expect(invalidSetting).toBeDefined();
});
