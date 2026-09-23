import { createJsonStore } from "@ai-tiny-codes/utils";

const store = createJsonStore("fitness");

export const loadJson = store.load;
export const saveJson = store.save;
export const removeJson = store.remove;
export const listJson = store.list;
