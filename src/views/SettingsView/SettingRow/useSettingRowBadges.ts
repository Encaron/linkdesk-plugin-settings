/**
 * SettingRow 的两个行尾徽标——来源徽标（✏️/🔀）+ 跟随主题生效值徽标。
 * E6#87d 自 SettingRow.tsx 逐字搬出（只搬家，零逻辑变更）；两个派生函数本身仍是纯函数（deriveSourceBadge / effectiveBadge）。
 */

import { useConfigurationValueIpc } from "../../hooks/useConfigurationValueIpc";
import { deriveSourceBadge } from "../deriveSourceBadge";
import { resolveEffectiveBadge, formatEffectiveValue } from "../effectiveBadge";
// 本案 5.1（02 E1）：展示形态（截首族／配 swatch）优先用共享件；缺席（现装壳）退本地同款纯函数
import { SHARED_FORMAT_EFFECTIVE_VALUE } from "../sharedUi";
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
  // E5.8#87：来源徽标——sourceKey 声明槽才派生（appearanceMode 覆盖 9 键；第三方键零侵入）。
  // E5.8#90：域来源生效门控读外观主开关 app.appearanceMode（app.mixMode 已删）+ 域来源值走 IPC 订阅；
  // 无 sourceKey 时空 key 退化为 depValue 同款无订阅污染。
  const mode = useConfigurationValueIpc<string>("app.appearanceMode");
  const sourceValue = useConfigurationValueIpc(prop?.sourceKey ?? "");
  const badge = prop?.sourceKey
    ? deriveSourceBadge({
        sourceKey: prop.sourceKey,
        userValue: userOverrides[configKey],
        baseline: baselineSeeds[configKey],
        mode,
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
  // 本案 5.1（02 E1）：共享件在就用共享件，不在用本地件——两者语义逐字相同（同一次平移）
  const formatValue = SHARED_FORMAT_EFFECTIVE_VALUE ?? formatEffectiveValue;
  const effectiveBadge = effectiveBadgeRaw
    ? { ...effectiveBadgeRaw, ...formatValue(effectiveBadgeRaw.value) }
    : null;

  return { badge, effectiveBadge };
}
