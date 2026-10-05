/**
 * fileAssociationsWrite——管理器唯一写口的**退化守卫**（旧壳兼容）。
 *
 * ## 为什么存在这一层
 *
 * `fileAssociation.setDefaultBulk` 是壳 **0.2.48** 才有的口（本波 4B-1 加的）。插件与壳**分开升级**：
 * 市场里的新设置插件会先落到用户机器上，而壳还是旧版——那时 `fa.setDefaultBulk` 是 `undefined`，
 * 管理器点「恢复自动（本格 6 类）」就是 `TypeError: fa.setDefaultBulk is not a function`。
 * 结果不是静默错（调用方有 catch ＋ 回滚），但「新插件在旧壳上有个按钮永远点不动」是可以避免的。
 *
 * ## 口径
 *
 * - 新壳（有 bulk 口）⇒ **一次调用写 N 类**——一次写盘、一次广播（E31/E32 聚合格的口径）；
 * - 旧壳（无 bulk 口）⇒ 逐类退化成 N 次 `setDefault`（N 次广播：功能等价，代价更大，但**不静默失败**）。
 * - ⛔ 两条路都不吞异常：写失败由调用方 catch（管理器据此回滚乐观值并弹错误 toast）。
 *
 * `fa` 从**参数**进来（不自己读 `window.linkdesk`）⇒ 本件是纯的、测得动——「旧壳走没走退化路」
 * 这条判据住测试，不靠目视。
 */

import { normalizeExtList } from "./model";

/**
 * 写面最小结构——`setDefaultBulk` **刻意标可选**：这不是「将来可能有」，而是**当下真有无 bulk 的壳
 * 在用**（类型如实描述运行时，而不是描述最新壳）。真实 face 结构兼容（required 可赋给 optional）。
 */
export interface BulkWriteApi {
  setDefault(ext: string, pluginId: string | null): Promise<void>;
  setDefaultBulk?(exts: string[], pluginId: string | null): Promise<void>;
}

/**
 * 批量写默认打开方式（`pluginId: null` = 恢复自动）。
 * 入参扩展名内部先归一化去重（`normalizeExtList`）——空清单直接返回（⛔ 不发无谓的写与广播）。
 */
export async function writeDefaults(
  fa: BulkWriteApi,
  exts: readonly string[],
  pluginId: string | null,
): Promise<void> {
  const list = normalizeExtList(exts);
  if (list.length === 0) return;
  if (typeof fa.setDefaultBulk === "function") {
    await fa.setDefaultBulk([...list], pluginId);
    return;
  }
  for (const ext of list) await fa.setDefault(ext, pluginId);
}
