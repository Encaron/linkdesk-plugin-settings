/**
 * 分段控件的「每态预览」两件——文字极性（fontTone）+ 强调色来源（accentSource）。
 * E6#87d：自 renderControl.tsx 逐字搬出（原件 292 行以下四个自定义控件，另两个去了 imagePicker.tsx）。
 * 2026-10-06《分段预览色块边缘串色》案：预览原子改吃 `@linkdesk/ui` 的
 *   SegmentPreviewText / SegmentPreviewSwatch（判据 A：消费宿主声明的件住共享层）——
 *   本仓私有 swatch 两族 CSS 同笔删除（曾与共享件**同源同病**：半透明主题下左右各 1px 串色）。
 *   ⛔ 曾经「不敢静态具名 import」的理由已失效：插件地板现为 0.2.52，而两个导出名的
 *   `since` 最高 0.2.40（`check-ui-min-app-version` 按**静态具名导入**算地板）。
 */

import { SegmentPreviewSwatch, SegmentPreviewText, SegmentedRadio } from "@linkdesk/ui";

/** E5.8#91 文字极性预览半区映射——每态 = 系统双字系标尺两极性取样（深/浅）。
 *  「哪个 hint 值取哪几半」的映射留本仓（共享原子零语义）；取样色值住共享原子 CSS（--tone-* 标尺）。 */
const FONT_TONE_POLARITY_HALVES: Record<string, readonly string[]> = {
  followTheme: ["deep", "light"], // 分半深/浅——主题明暗决定极性（深半亮字 + 浅半暗字并置）
  light: ["deep"], // 亮字（深底用）——深底白字
  dark: ["light"], // 暗字（浅底用）——浅底深字
};

/** 段内预览——Aa 分半样本（原子住 `@linkdesk/ui`：几何 52×30 ＋ var(--radius-sm) 单一真相源） */
function FontTonePreview({ value }: { value: string }): React.ReactNode {
  const halves = FONT_TONE_POLARITY_HALVES[value];
  if (!halves) return null;
  return <SegmentPreviewText halves={halves} />;
}

/**
 * E5.8#98+#99：强调色来源分段控件——两态（跟随主题配方/自定义）+ 段内预览（#3 归一化，对标 #91 每态预览）。
 * 跟随主题配方段 = 中性分半示意「主题决定强调色」（themeable 变量，非运行值——真实主题强调色遍布壳 UI）；
 * 自定义段 = 实时生效强调色——applyAccentColor 恒把 effective accent 写 --accent（自定义色 / 清除回主题 /
 *   跟随主题 三态全对），声明式读 CSS 变量（共享原子 `.ldk-segment-preview--accent`），零 IPC 零 DOM 读。
 * 选项映射（短标签/tooltip）走 mapSegmentedOptions 通用函数（#99 三消费方共用）。无线电语义 + roving tabindex 在壳 SegmentedRadio。
 * （#98 曾用段外生效 swatch——第三 swatch 变体，本号按归一化改为段内预览；E5.8 Phase 11.13 去命令式读数。）
 */
export function AccentSourceControl({
  value,
  options,
  onChange,
  t,
}: {
  value: string;
  options: { value: string; label: string; title: string }[];
  onChange: (v: unknown) => void;
  t: (key: string) => string;
}) {
  return (
    <SegmentedRadio
      value={value}
      ariaLabel={t("强调色来源")}
      options={options.map((opt) => ({
        ...opt,
        preview:
          opt.value === "custom" ? (
            <SegmentPreviewSwatch variant="accent" />
          ) : (
            <SegmentPreviewSwatch variant="split" />
          ),
      }))}
      onChange={(v) => onChange(v)}
    />
  );
}

/**
 * E5.8#91+#99：文字极性分段控件——三态（跟随主题/亮字/暗字）+ 每态预览方块。
 * 选项映射（短标签/tooltip）走 mapSegmentedOptions 通用函数（#99 三消费方共用）。
 * 预览块取样系统双字系标尺；跟随主题 = 分半深/浅示意「主题明暗决定极性」。
 */
export function FontToneControl({
  value,
  options,
  onChange,
  t,
}: {
  value: string;
  options: { value: string; label: string; title: string }[];
  onChange: (v: unknown) => void;
  t: (key: string) => string;
}) {
  return (
    <SegmentedRadio
      value={value}
      ariaLabel={t("文字极性")}
      options={options.map((opt) => ({ ...opt, preview: <FontTonePreview value={opt.value} /> }))}
      onChange={(v) => onChange(v)}
    />
  );
}
