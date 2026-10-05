/**
 * 分组树的搜索过滤——E6#87d 自 SettingsView.tsx 的 filteredGroups useMemo 逐字搬出（只搬家，零逻辑变更）。
 * 第 4 波追加一条：**管理器组恒保留**（见文件末那条注释，唯一的一处行为变更）。
 */

import { isManagerGroup } from "../file-associations-manager/managerHint";
import type { GroupInfo, ConfigProperty } from "./types";

export function filterGroups(
  groups: GroupInfo[],
  search: string,
  allProps: Record<string, ConfigProperty>,
): GroupInfo[] {
  if (!search.trim()) return groups;
  const q = search.toLowerCase();

  const keyHit = (g: GroupInfo, k: string) => {
    const prop = allProps[k];
    return (
      k.toLowerCase().includes(q) ||
      (prop?.title ?? "").toLowerCase().includes(q) ||
      (prop?.description ?? "").toLowerCase().includes(q) ||
      g.title.toLowerCase().includes(q)
    );
  };

  return (
    groups
      // 🔴 管理器组的键过滤要**跳过**（判据在原始键上，下一条 filter 用它保命）——⛔ 不能先滤再判：
      //    它整组只有一个键（覆盖表本身），搜「.pdf」那个键名永远不命中，先滤就必然被滤空 ⇒
      //    判据 `isManagerGroup(过滤后的组)` 恒假、整组连人带框消失，E30 落空。
      //    （2026-10-05 dev 实机读数踩到：搜「fa-probe」→ 左栏直接「无匹配设置」。）
      .map((g) => (isManagerGroup(g, allProps) ? g : { ...g, keys: g.keys.filter((k) => keyHit(g, k)) }))
      // 配置分组按匹配键保留；角色分组（可能空配置）按标题匹配保留——空配置组搜索标题仍可达
      // 🔴 管理器组（`uiHint: fileAssociationsManager`）**恒保留**：见上条注释——组内搜不到时由管理器
      //    自己出空态「没有匹配的类型或插件」（08/09 图三处空态之一）。
      .filter(
        (g) =>
          g.keys.length > 0 ||
          (!!g.role && g.title.toLowerCase().includes(q)) ||
          isManagerGroup(g, allProps),
      )
  );
}
