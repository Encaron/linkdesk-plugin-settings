/**
 * 设置行**说明文字**的悬停提示属性——纯函数，供 SettingRow 与单测共用。
 *
 * 04「悬停提示系统」的**揭示类**（设计详案 §一·1.2：「完整文字被截断了，让我看全」）：
 * `.settings-row-desc` 是单行省略号截断（`SettingsView-rows.css` 的 nowrap/overflow/ellipsis 三件套），
 * 长说明——如 `marketplace.marketplaceSources` 那句——**全屏也显示不全** ⇒ 悬停出全文。
 *
 * 两条判据（本件存在的理由，别并回内联）：
 * ① **延时 `"0"`**——揭示类要**立刻**出，⛔ 不跟说明类 120ms 的默认值（`hintAttrs.ts` 明文规定）；
 * ② **空文案零属性**——不必依赖壳渲染器「空文案不出条」的守卫，少给 DOM 留一个空属性。
 *
 * 属性式铁律：插件只在自己的 DOM 上写属性，⛔ 不 import 壳任何东西（插件独立）。
 */

/** 揭示类延时（毫秒，字符串形式——写进 DOM 属性；`"0"` = 不等待） */
export const DESC_HINT_DELAY_MS = "0";

/** 提示条属性（空文案时为空对象——展开到元素上是「什么都不加」） */
export type DescHintAttrs = { "data-hint"?: string; "data-hint-delay"?: string };

/**
 * 说明文字 → 提示属性。文案**逐字**来自调用方（＝行上显示的那一句，同一变量 ⇒ 一处真相源）。
 */
export function descHintAttrs(text: string): DescHintAttrs {
  if (text.trim() === "") return {};
  return { "data-hint": text, "data-hint-delay": DESC_HINT_DELAY_MS };
}
