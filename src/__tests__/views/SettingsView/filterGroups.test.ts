/**
 * filterGroups——设置组树的搜索过滤（E6#150 补测；E6#87d 自 SettingsView.tsx 的 filteredGroups useMemo 搬出）。
 *
 * 为什么单独立文件：搜索框每敲一个字都走它，而它是「组整组消失」这类体感异常的唯一解释处——
 * 三种命中路径（键名 / 描述 / **组标题**）与「什么情况下整组被丢掉」既有测试零覆盖。
 *
 * ⚠️ 两条最容易写错的现行为（照现状钉住，⛔ 不改）：
 *   ① 组标题命中 ⇒ 该组**全部键**保留（标题那条在 keys 过滤谓词里 ⇒ 组内每个键都满足）；
 *   ② 角色分组（role 存在）即便一个键都没剩，只要标题命中就保留——「空配置组的标题仍可达」。
 */

import { describe, expect, it } from "vitest";
import { filterGroups } from "../../../views/SettingsView/filterGroups";
import type { ConfigProperty, GroupInfo } from "../../../views/SettingsView/types";

const g = (title: string, keys: string[], extra: Partial<GroupInfo> = {}): GroupInfo => ({
  pluginId: "demo",
  title,
  keys,
  ...extra,
});

const props = (map: Record<string, ConfigProperty>): Record<string, ConfigProperty> => map;

describe("filterGroups", () => {
  it("空搜索 / 纯空白 → **原样返回同一数组**（不重建，useMemo 的引用稳定性靠这条）", () => {
    const groups = [g("外观", ["a"])];

    expect(filterGroups(groups, "", {})).toBe(groups);
    expect(filterGroups(groups, "   ", {})).toBe(groups);
  });

  it("键名命中，大小写不敏感", () => {
    const groups = [g("外观", ["app.ThemeColor", "app.zoneRadius"])];

    expect(filterGroups(groups, "themecolor", {})[0].keys).toEqual(["app.ThemeColor"]);
    expect(filterGroups(groups, "APP.ZONE", {})[0].keys).toEqual(["app.zoneRadius"]);
  });

  it("描述命中也算命中（用户搜的是人话，不是键名）", () => {
    const groups = [g("外观", ["app.a", "app.b"])];

    const out = filterGroups(groups, "圆角", props({
      "app.a": { description: "窗口圆角大小" },
      "app.b": { description: "主色" },
    }));

    expect(out[0].keys).toEqual(["app.a"]);
  });

  it("短名（title）命中也算命中——行名已改显短名，用户照行名搜（配置项短名案 T2）", () => {
    const groups = [g("编辑器", ["editor.autoSave", "editor.tabSize"])];

    const out = filterGroups(groups, "自动保存", props({
      "editor.autoSave": { title: "自动保存", description: "off 手动保存 / afterDelay 1 秒空闲后自动保存" },
      "editor.tabSize": { title: "Tab 宽度" },
    }));

    expect(out[0].keys).toEqual(["editor.autoSave"]);
  });

  it("**组标题命中 ⇒ 组内全部键保留**（标题在 keys 谓词里 ⇒ 整组都满足）", () => {
    const groups = [g("整体配方", ["app.theme", "app.themeColor"])];

    expect(filterGroups(groups, "整体", {})[0].keys).toEqual(["app.theme", "app.themeColor"]);
  });

  it("普通组：一个键都没命中 → **整组丢弃**（不留空壳）", () => {
    const groups = [g("外观", ["app.a"]), g("混搭", ["app.mixFont"])];

    const out = filterGroups(groups, "mixfont", {});

    expect(out).toHaveLength(1);
    expect(out[0].title).toBe("混搭");
  });

  it("角色分组：键空但**标题命中 → 保留**（空配置组搜索标题仍可达）", () => {
    const groups = [g("文件管理器", [], { role: "fileManager", candidates: [{ pluginId: "p", title: "t" }] })];

    const out = filterGroups(groups, "文件", {});

    expect(out).toHaveLength(1);
    expect(out[0].keys).toEqual([]);
    expect(out[0].role).toBe("fileManager");
  });

  it("角色分组：键空且标题不命中 → 照丢（角色身份不是免死金牌）", () => {
    const groups = [g("文件管理器", [], { role: "fileManager" })];

    expect(filterGroups(groups, "圆角", {})).toEqual([]);
  });

  it("键在 allProps 里查不到 → 只看键名与标题，不炸", () => {
    const groups = [g("外观", ["ghost.key"])];

    expect(filterGroups(groups, "ghost", {})[0].keys).toEqual(["ghost.key"]);
    expect(filterGroups(groups, "nope", {})).toEqual([]);
  });

  it("不原地改原件——返回新组对象，原 groups 的 keys 不动", () => {
    const original = g("外观", ["app.a", "app.b"]);

    const out = filterGroups([original], "app.a", {});

    expect(out[0]).not.toBe(original);
    expect(original.keys).toEqual(["app.a", "app.b"]);
  });

  it("组上其余字段全透传（role / candidates / activeId 不许在过滤中丢）", () => {
    const role = g("文件管理器", ["app.a"], {
      role: "fileManager",
      candidates: [{ pluginId: "p1", title: "候选" }],
      activeId: "p1",
    });

    expect(filterGroups([role], "app.a", {})[0]).toEqual(role);
  });

  /* ── 第 4 波：管理器组豁免（E30「检索复用设置页搜索框」的命门） ── */

  const MANAGER_KEY = "workbench.fileAssociations";
  const managerWorld = () => ({
    groups: [g("默认打开方式", [MANAGER_KEY], { pluginId: "file-associations" }), g("外观", ["app.themeColor"])],
    props: props({ [MANAGER_KEY]: { uiHint: "fileAssociationsManager" } }),
  });

  it("🔴 管理器组恒保留——搜图上的类型名也不许整组消失，且它的键不被滤空", () => {
    const { groups, props: ap } = managerWorld();

    const out = filterGroups(groups, ".pdf", ap);

    // 判据必须在**原始键**上判：先滤键再判 = 恒假（dev 实机踩到过——搜一下左栏直接「无匹配设置」）
    expect(out.map((x) => x.pluginId)).toEqual(["file-associations"]);
    expect(out[0].keys).toEqual([MANAGER_KEY]);
  });

  it("豁免只给管理器组——其余组照旧：不命中就丢，命中就留（顺序按原表）", () => {
    const { groups, props: ap } = managerWorld();

    expect(filterGroups(groups, "zzz", ap).map((x) => x.pluginId)).toEqual(["file-associations"]);
    expect(filterGroups(groups, "themecolor", ap).map((x) => x.pluginId)).toEqual([
      "file-associations",
      "demo",
    ]);
  });
});
