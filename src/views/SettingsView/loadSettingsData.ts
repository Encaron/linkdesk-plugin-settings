/**
 * 设置分组树的数据拉取与组装——E6#87d 自 SettingsView.tsx 的 loadData 回调逐字搬出（只搬家，零逻辑变更）。
 * 自壳迁入（E5.8#41.14 内置设置纯插件化）；核心无知原则：不知道有哪些设置项——全部从 ConfigurationRegistry 派生。
 * 05 settings-侧栏入口图标：装配时随组附带图标来源（iconManifest）——插件组 manifest 裁决 ＋ 本体组声明 icon 空消费。
 */

import { lk, OWN_FACTORY_ROLE } from "./helpers";
import { resolveGroupIconManifest } from "./groupIcon";
import type { GroupInfo, ConfigProperty } from "./types";

/** 一次拉齐：配置分组 + 合并 schema + 角色枚举（#41.14 ⑤）+ 设置套候选/激活（#41.13）+ 已装插件清单（导航图标） */
export async function loadSettingsData(t: (key: string) => string): Promise<{
  groups: GroupInfo[];
  allProps: Record<string, ConfigProperty>;
  candidates: { pluginId: string; title: string; viewId?: string }[];
  activeId: string | undefined;
}> {
  const cfg = lk();
  const fs = window.linkdesk.factorySlots;
  const pm = window.linkdesk.pluginManager;
  // 并行拉取：配置分组 + schema + 角色枚举（#41.14 ⑤ 角色分组）+ 设置套候选/激活（#41.13）+ 已装插件（图标来源）
  const [entries, schema, roles, candidatesRaw, settingsActiveId, pluginEntries] = await Promise.all([
    cfg.getConfigurationContributions(),
    cfg.getSchema(),
    fs.listRoles(),
    fs.list(OWN_FACTORY_ROLE),
    fs.getActive(OWN_FACTORY_ROLE),
    // 导航行图标来源（05 settings-侧栏入口图标）：已装清单一次拉齐——插件贡献组必来自已装插件 ⇒ 必命中。
    // pluginManager 契约缺省/失败时静默空表 ⇒ 各组退回声明 icon / 无图，不阻塞设置页加载。
    (pm?.list ? pm.list().catch(() => []) : Promise.resolve([])),
  ]);
  // E5.8#41.14：getConfigurationContributions 契约已补全命名类型（LinkDeskConfigurationContribution）
  // ——不再需要 IPC 边界 cast，形状由契约保证
  const contributions = new Map(entries);
  // 导航行图标（05 settings-侧栏入口图标）：pluginId → manifest 一次索引，各组装配时查
  const manifestByPlugin = new Map(pluginEntries.map((e) => [e.pluginId, e.manifest ?? null]));
  const result: GroupInfo[] = [];

  // ① contributes.configuration 分组（非空）
  for (const [pluginId, contrib] of contributions) {
    const keys = Object.keys(contrib.properties ?? {});
    if (keys.length > 0) {
      // M4 AI#38.12：副标题两字段随行（contribution 级可选；未声明 = undefined，零侵入）
      result.push({
        pluginId,
        title: t(contrib.title ?? pluginId),
        subtitle: contrib.subtitle,
        groupDescriptions: contrib.groupDescriptions,
        keys,
        // 导航行图标（05 settings-侧栏入口图标）：插件组 manifest 裁决；本体组走声明 icon 空消费。
        // 🔴 窄化读取 = 0.2.53 前向消费——契约（LinkDeskConfigurationContribution）尚无 icon 字段，
        // 壳仓 04「内置配置组图标声明」补类型后此 cast 可去。
        // 04 内置配置组图标（2026-11-18）：声明 icon 原值随组透传——共享名渲染期按快照裁决
        icon: contrib.icon,
        iconManifest: resolveGroupIconManifest(
          manifestByPlugin.get(pluginId) ?? null,
          contrib.icon,
        ),
      });
    }
  }

  // ② factoryRole 角色分组（#41.14 ⑤）——任何非本设置插件角色 ≥2 候选 → 该角色名组出现：
  //    切换按钮在顶、激活套配置在下；复用同名组优先（按 pluginId 找激活候选自己的配置组，非显示名）、
  //    没有才新建；激活套无配置项 → 空状态。自身角色切换 = 顶部通用区（#41.13），不进导航组。
  const roleRows = await Promise.all(
    roles
      .filter((role) => role !== OWN_FACTORY_ROLE)
      .map(async (role) => {
        const [candidates, activeId] = await Promise.all([fs.list(role), fs.getActive(role)]);
        return { role, candidates, activeId };
      })
  );
  for (const { role, candidates, activeId } of roleRows) {
    if (!candidates || candidates.length < 2) continue; // 单候选不建组（无切换意义）
    const active = candidates.find((c) => c.pluginId === activeId) ?? candidates[0];
    const existing = contributions.get(active.pluginId);
    if (existing) {
      // 复用同名组：切换条直接进激活候选自己的配置组，不新建
      const idx = result.findIndex((g) => g.pluginId === active.pluginId);
      if (idx >= 0) {
        result[idx] = { ...result[idx], role, candidates, activeId: active.pluginId };
      } else {
        // 激活候选有贡献但组空（被 ① 过滤）——仍按贡献标题建组，保持命名语义
        result.push({
          pluginId: active.pluginId,
          title: t(existing.title ?? active.title),
          keys: Object.keys(existing.properties ?? {}),
          icon: existing.icon,
          iconManifest: resolveGroupIconManifest(
            manifestByPlugin.get(active.pluginId) ?? null,
            existing.icon,
          ),
          role,
          candidates,
          activeId: active.pluginId,
        });
      }
    } else {
      // 没有才新建：候选不贡献配置 → 自动建组 + 激活套无配置项空状态
      result.push({
        pluginId: active.pluginId,
        title: t(active.title),
        keys: [],
        iconManifest: resolveGroupIconManifest(manifestByPlugin.get(active.pluginId) ?? null, undefined),
        role,
        candidates,
        activeId: active.pluginId,
      });
    }
  }

  return {
    groups: result,
    allProps: (schema ?? {}) as Record<string, ConfigProperty>,
    candidates: candidatesRaw ?? [],
    activeId: settingsActiveId,
  };
}
