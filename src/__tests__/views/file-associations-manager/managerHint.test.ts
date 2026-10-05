/**
 * managerHint 单测——「这组该交给管理器渲染」的判据。
 *
 * ## 为什么这几条判据值得测
 *
 *   ① 提示词与覆盖表键是**跨仓契约**（提示词在 `@linkdesk/contracts` 的 `SettingsUiHint` 联合里、
 *      覆盖表键在壳的 `FileAssociationService` 里）：字符串漂了 ⇒ 壳声明得好好的，管理器**整组不出现**
 *      （静默——没有报错，只是「设置里没有那一页」）；
 *   ② 按**提示词**认组而不是按 pluginId：这条口径要是被写成按 id 认，第三方设置插件（别人写的整套
 *      设置 UI）就会把自己锁死在官方壳的 pseudo id 上——本测试把这句「为什么」钉在断言里。
 *
 * 纯逻辑——零 React、零 `window.linkdesk`。夹具用假名（`plug-x`），⛔ 不用真插件名/真文案。
 */

import { describe, expect, it } from "vitest";
import {
  MANAGER_UI_HINT,
  WORKBENCH_FILE_ASSOCIATIONS_KEY,
  findManagerPluginId,
  isManagerGroup,
} from "../../../views/file-associations-manager/managerHint";
import type { ConfigProperty, GroupInfo } from "../../../views/SettingsView/types";

const prop = (over: Partial<ConfigProperty> = {}): ConfigProperty => ({ type: "object", ...over });

const group = (over: Partial<GroupInfo> = {}): GroupInfo => ({
  pluginId: "plug-x",
  title: "某组",
  keys: [],
  ...over,
});

describe("常量（跨仓契约的锚点）", () => {
  it("提示词与覆盖表键逐字钉死——漂一个字符就是「管理器整组不出现」且无报错", () => {
    expect(MANAGER_UI_HINT).toBe("fileAssociationsManager");
    expect(WORKBENCH_FILE_ASSOCIATIONS_KEY).toBe("workbench.fileAssociations");
  });
});

describe("isManagerGroup", () => {
  it("组内任一键带管理器提示词 ⇒ 是管理器组", () => {
    const allProps = {
      "workbench.fileAssociations": prop({ uiHint: MANAGER_UI_HINT }),
      "other.key": prop({ uiHint: "slider" }),
    };
    expect(isManagerGroup(group({ keys: ["other.key", "workbench.fileAssociations"] }), allProps)).toBe(true);
  });

  it("键查不到（allProps 里没有）⇒ 不是——⛔ 不猜（猜错就把别人的组画成管理器）", () => {
    expect(isManagerGroup(group({ keys: ["workbench.fileAssociations"] }), {})).toBe(false);
  });

  it("其它 uiHint / 无 uiHint ⇒ 不是", () => {
    const allProps = { a: prop({ uiHint: "image" }), b: prop() };
    expect(isManagerGroup(group({ keys: ["a", "b"] }), allProps)).toBe(false);
  });

  it("空键组 ⇒ 不是（空组没有可渲染的东西）", () => {
    expect(isManagerGroup(group({ keys: [] }), { k: prop({ uiHint: MANAGER_UI_HINT }) })).toBe(false);
  });
});

describe("findManagerPluginId", () => {
  const allProps = {
    "workbench.fileAssociations": prop({ uiHint: MANAGER_UI_HINT }),
    "editor.fontFamily": prop(),
  };

  it("取**原始**分组里带提示词那组的 pluginId（⛔ 不按 id 硬编码——换壳实现也认得出）", () => {
    const groups = [
      group({ pluginId: "general", title: "通用", keys: ["editor.fontFamily"] }),
      group({ pluginId: "whatever-the-shell-calls-it", keys: ["workbench.fileAssociations"] }),
    ];
    expect(findManagerPluginId(groups, allProps)).toBe("whatever-the-shell-calls-it");
  });

  it("壳没声明这个挂载位 ⇒ null（管理器不出现，也不发一次 IPC）", () => {
    const groups = [group({ pluginId: "general", keys: ["editor.fontFamily"] })];
    expect(findManagerPluginId(groups, allProps)).toBeNull();
    expect(findManagerPluginId([], allProps)).toBeNull();
  });

  it("多个组都带（不该发生）⇒ 取第一个——确定性优先于「都对」", () => {
    const groups = [
      group({ pluginId: "first", keys: ["workbench.fileAssociations"] }),
      group({ pluginId: "second", keys: ["workbench.fileAssociations"] }),
    ];
    expect(findManagerPluginId(groups, allProps)).toBe("first");
  });
});
