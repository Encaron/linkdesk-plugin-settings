/**
 * 组内二级标题渲染——E6#87d 自 SettingsView.tsx 的 renderGroupedKeys 逐字搬出（只搬家，零逻辑变更）。
 *
 * ── 组内二级标题（E5.8#78）——按 prop.group 把 keys 归到子标题下渲染（主题组 6 分节）。
 *    无 group 的 key 保持平铺原样（第三方配置零侵入）；组标题字符串走 t() i18n（lang-defaults）。
 *    空桶（搜索过滤后整组无 key）不渲染标题——不显示空标题。归桶逻辑 = grouping.ts 纯函数。
 *    E5.8#90：空桶过滤——外观覆盖/域混搭 两节 dependsOn 挂外观主开关（appearanceMode=custom 才显），
 *    followTheme 下 整组空 → 不渲染空子标题（与搜索过滤后空桶同语义）。
 *    E5.8#98：强调色节不入本过滤——accentSource 独立轴恒显（无 dependsOn），accentColor 只门控
 *    accentSource=custom；强调色不再随外观主开关整组消失（mockup「始终可见」）。
 *    🔄 2026-11-24 语义归属（V2/V3）：dependsOn 改为**通用求值**——父级一次性订阅全部声明键
 *    （configValues），任何插件的任何依赖键都可评估；条件说明读 schema `descriptionWhen`。
 *    本层不再出现 `app.appearanceMode` / `app.themeColor` 等键名特判。
 */

import { useTranslation } from "react-i18next";
import { SectionSubtitle } from "@linkdesk/ui"; // M4 AI#38.12：分节副标题件（P-3 拍板 A）
import SettingRow from "./SettingRow";
import { groupSettingsKeys } from "./grouping";
import type { ConfigProperty } from "./types";

export default function GroupedKeys({
  keys,
  groupDescriptions,
  allProps,
  configValues,
  userOverrides,
  baselineSeeds,
  effectiveTokens,
  onChange,
}: {
  keys: string[];
  groupDescriptions?: Record<string, string>;
  allProps: Record<string, ConfigProperty>;
  /** dependsOn / descriptionWhen 的依赖值——父级一次性订阅全部声明键（通用：任何键，不只外观主开关） */
  configValues: Record<string, unknown>;
  userOverrides: Record<string, unknown>;
  baselineSeeds: Record<string, unknown>;
  effectiveTokens: Record<string, string>;
  onChange: () => void;
}) {
  const { t } = useTranslation();
  return groupSettingsKeys(keys, (k) => allProps[k]?.group ?? "").map((bucket) => {
    const visible = bucket.keys.filter((key) => {
      const dep = allProps[key]?.dependsOn;
      if (!dep) return true;
      const current = configValues[dep.key];
      // 未加载完（undefined）= 保守保留——避免首帧把整组闪隐（旧版仅对 appearanceMode 如此）
      if (current === undefined) return true;
      return current === dep.value;
    });
    if (visible.length === 0) return null;
    return (
      <div key={bucket.group || `flat-${bucket.keys[0]}`} className="settings-subsection">
        {bucket.group && <h3 className="settings-subsection-title">{t(bucket.group)}</h3>}
        {/* M4 AI#38.12（P-3）：分节副标题——声明即渲染，一行小字零交互 */}
        {bucket.group && groupDescriptions?.[bucket.group] && (
          <SectionSubtitle>{t(groupDescriptions[bucket.group])}</SectionSubtitle>
        )}
        {visible.map((key) => {
          // 2026-11-24 语义归属（V3）：条件说明读 schema 声明（descriptionWhen）——本层零键名特判
          const when = allProps[key]?.descriptionWhen;
          const conditionalDescription =
            when && configValues[when.key] === when.value ? t(when.description) : undefined;
          return (
            <SettingRow
              key={key}
              configKey={key}
              prop={allProps[key]}
              onChange={onChange}
              userOverrides={userOverrides}
              baselineSeeds={baselineSeeds}
              effectiveTokens={effectiveTokens}
              description={conditionalDescription}
            />
          );
        })}
      </div>
    );
  });
}
