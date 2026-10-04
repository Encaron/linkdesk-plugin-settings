/**
 * enumDescription——枚举档显示名的取字（纯函数，零依赖）。
 *
 * 🔴 为什么要单独立这一件（配置项短名案 T2 落地时暴露的既有盲区）：
 * `enumDescriptions` 有两种**合法**声明形态，而渲染此前只认其中一种——
 *   ① **对象**（`enum 值 → 显示名`）：**插件 manifest 的 schema 规定形态**
 *      （`plugin.schema.json` → `enumDescriptions: { type: "object" }`），官方各仓按此写；
 *   ② **数组**（下标与 `enum` 一一对应）：壳侧自身声明（`appearance.ts`/`update.ts`）与
 *      `ConfigurationRegistry.updateConfigurationEnum` 动态推送用的形态（壳内部类型 `string[]`）。
 * 渲染旧写法是 `prop.enumDescriptions?.[i]`——**按下标读**。对象形态下 `obj[0]` 恒为 `undefined`
 * ⇒ 插件侧声明的显示名**从未生效**，下拉一直落到 `t(值)` 裸显英文值（如 `powershell`）。
 * ⇒ 本函数把两种形态统一成「先按下标（数组）、再按值（对象）」双查。
 * 口径与 SDK 普查腿 `own-dict-coverage` 的 `mapValues`（对象/数组都收）**对齐**——两把尺子认同一个形状。
 */

/**
 * 取某枚举档的显示名。
 * @param enumDescriptions 声明原文（对象 / 数组 / 其它形状都吃——形状不对 = 无显示名）
 * @param value `enum` 里的值（对象形态按它查键）
 * @param index 该值在 `enum` 里的下标（数组形态按它取位）
 * @returns 显示名原文（**i18n key，调用方仍需 `t()`**）；没有则 `undefined`
 */
export function enumDescriptionAt(
  enumDescriptions: unknown,
  value: string,
  index: number,
): string | undefined {
  if (Array.isArray(enumDescriptions)) {
    const atIndex = enumDescriptions[index];
    return typeof atIndex === "string" ? atIndex : undefined;
  }
  if (enumDescriptions && typeof enumDescriptions === "object") {
    const byValue = (enumDescriptions as Record<string, unknown>)[value];
    return typeof byValue === "string" ? byValue : undefined;
  }
  return undefined;
}
