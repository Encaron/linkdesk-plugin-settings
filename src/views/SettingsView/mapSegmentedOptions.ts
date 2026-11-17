/**
 * E5.8#99：分段单选选项映射——enum + enumDescriptions → { value, label 短, title 全句 }。
 * 短标签 = enumDescription "—" 前段（分段窄放不下全句），tooltip = 全句。
 * 通用 uiHint:"segmented" + fontTone/accentSource 预览覆盖共用（#99 去重——三处选项映射收敛一处）。
 */
import type { ConfigProperty } from "./types";

export function mapSegmentedOptions(
  prop: Pick<ConfigProperty, "enum" | "enumDescriptions">,
  t: (key: string) => string,
): { value: string; label: string; title: string }[] {
  // 🔴 只按下标读**数组形态**（依赖追新 TS 收紧后暴露的存量隐患，2026-11-18 顺手修）：
  //  对象形态（值 → 显示名）用数字下标索引本来就拿不到档——按枚举值取才是它的语义，
  //  但本函数服务的是 segmented 的「下标对应」契约（壳侧声明形态），对象形态不在射程。
  const descList = Array.isArray(prop.enumDescriptions) ? prop.enumDescriptions : undefined;
  return (prop.enum ?? []).map((v, i) => {
    const full = descList?.[i] ? t(descList[i]) : t(v);
    return { value: v, label: full.split("—")[0], title: full };
  });
}
