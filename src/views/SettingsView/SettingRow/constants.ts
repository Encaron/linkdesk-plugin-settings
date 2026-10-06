/**
 * SettingRow 行内常量——E6#87d 自 SettingRow.tsx 逐字搬出（只搬家，零逻辑变更）。
 */

// E5.8#6.6 hex 豁免：取色器预设色板（颜色即数据——用户可选值，非样式硬编码）
// eslint-disable-next-line linkdesk/no-hardcoded-hex
export const COLOR_PICKER_PRESETS = ["#0078d4", "#e81123", "#10893e", "#ff8c00", "#6b69d6", "#0099bc"];

// E5.8#99（#6）：来源徽标 UI 元数据——i18n label（文案由调用方 t() 传给共享件，共享件零中文）。
// 只含 user/mix（非默认态才显徽标，降噪；theme 态无徽标 = 主题来源）。deriveSourceBadge 保持纯函数。
// 🔴 codicon 图标不在这里——来源→图标的一处定义随件走（`@linkdesk/ui` SourceBadge.tsx 的 SOURCE_GLYPHS）。
export const SOURCE_BADGE_UI: Record<"user" | "mix", { labelKey: string }> = {
  user: { labelKey: "来源：用户覆盖" },
  mix: { labelKey: "来源：混搭域" },
};
