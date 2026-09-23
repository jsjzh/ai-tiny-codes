import { createJsonStore } from "@ai-tiny-codes/utils";
import { datasDir } from "../utils/project";

/**
 * 同步数据统一放在仓库内 datas/fitness/synced/，与计划解耦：
 * fitness:sync 只负责写入，任何调用方（checkin 等）都可读取。
 */
export const syncedStore = createJsonStore("fitness/synced", { baseDir: datasDir() });