/**
 * SettingRow 的两个行尾徽标——来源徽标（✏️/🔀）+ 跟随主题生效值徽标。
 * E6#87d 自 SettingRow.tsx 逐字搬出（只搬家，零逻辑变更）；两个派生函数本身仍是纯函数（deriveSourceBadge / effectiveBadge）。
 */

import { useConfigurationValueIpc } from "../../hooks/useConfigurationValueIpc";
import { deriveSourceBadge } from "../deriveSourceBadge";
import { resolveEffectiveBadge } from "../effectiveBadge";
// 展示形态（截首族／配 swatch）的正典住共享件——判据 C 分工：判定住宿主、格式化住共享层
import { formatEffectiveValue } from "@linkdesk/ui";
import type { ConfigProperty } from "../types";

export function useSettingRowBadges({
  configKey,
  prop,
  userOverrides,
  baselineSeeds,
  effectiveTokens,
}: {
  configKey: string;
  prop: ConfigProperty | undefined;
  /** E5.8#87：用户覆盖集（getUserSettings）——来源徽标 presence 派生（无 override = 主题 🎨） */
  userOverrides: Record<string, unknown>;
  /** E5.8#88：主题/混搭基准种子集（theme.getBaselineSeeds）——「已修改」徽标 value-vs-baseline 判定基准 */
  baselineSeeds: Record<string, unknown>;
  /** E5.8#155：生效 token 集（theme.getEffectiveTokens）——跟随主题生效值徽标数据源 */
  effectiveTokens: Record<string, string>;
}) {
  // 2026-11-24 语义归属（V4）：来源徽标——sourceKey 声明槽才派生；激活条件/跟随哨兵全读 schema 声明
  //（sourceActiveWhen / sourceFollowValue）。本文件不再出现 app.appearanceMode 或 "custom"/"followTheme" 字面量。
  const activeWhen = prop?.sourceActiveWhen;
  const activeValue = useConfigurationValueIpc<unknown>(activeWhen?.key ?? "");
  const sourceValue = useConfigurationValueIpc(prop?.sourceKey ?? "");
  const badge = prop?.sourceKey
    ? deriveSourceBadge({
        sourceKey: prop.sourceKey,
        userValue: userOverrides[configKey],
        baseline: baselineSeeds[configKey],
        activeWhen,
        activeValue,
        followValue: prop.sourceFollowValue,
        sourceValue,
      })
    : null;
  // E5.8#155：跟随主题生效值徽标——跟随主题态（非用户修改）显示行实际生效值（对标 VS Code「从默认值继承」）。
  // 与来源徽标同源判定（isFollowingThemeValue = deriveSourceBadge 用户条件取反）：theme/mix 态都算跟随主题
  // （mix 态实际值来自混搭域，生效 token 即混搭来源生效值）；user 态不显（已显 ✏️ 用户覆盖）。
  // E5.8#155 归一化：token 映射声明进 schema（prop.effectiveToken，对齐 sourceKey 先例）——本行零映射表，
  // 声明键 + 生效 token 集解析；展示形态 formatEffectiveValue 按值驱动（色块/首族），token 语义零知识。
  const effectiveBadgeRaw = resolveEffectiveBadge(
    prop?.effectiveToken,
    effectiveTokens,
    userOverrides[configKey],
    baselineSeeds[configKey],
  );
  const effectiveBadge = effectiveBadgeRaw
    ? { ...effectiveBadgeRaw, ...formatEffectiveValue(effectiveBadgeRaw.value) }
    : null;

  return { badge, effectiveBadge };
}
