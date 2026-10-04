/**
 * keybindingEditCommand 单测——命令面的注册与两条调用形（M2 `AI#25`）。
 *
 * ## 判据与两条负控
 *
 * 判据 = 「改键入口有命令路径」。真正的失败模式不是「报错」，而是**半做**：
 * 命令 id 打错时先把设置页开出来了、或用户取消选择却仍写了意图（界面若无其事地跳动）。
 * 故负控断言的是**三处都没动**：意图槽（`consumeKeybindingEdit` 为空）＋ 壳命令未被调 ＋ 抛错。
 *
 * ## 替身
 *
 * `commands` / `quickPick` / `keybindings` 是共享地基（`@linkdesk/plugin-sdk/vitest-setup`）
 * 六通用面之外的三个面，本文件按需 `vi.fn()` 补上——「插件专属桩住本仓测试文件」的写法。
 * 壳命令名与实参做了**字面断言**：`workbench.action.openKeybindingsSettings` 是壳侧那条命令
 * （`settingsCommands.ts`）。⚠️ **它不消费 `{ query }`**（只是历史注释里的说法，实为忽略）——
 * 别把那条断言读成「搜索框会预填」。
 *
 * 🔴 **2026-10-05 追加一组负控**：**已在快捷键页内时⛔ 不许调那条壳命令**——那条命令的语义
 * 是「打开设置页」，会连带把左栏的设置图标选中（用户实测的「缩回左侧栏」）。在场判据的
 * 置位/归零由 `keybindingViewPresence.test.tsx` 真渲染那只视图来钉。
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  consumeKeybindingEdit, resetKeybindingEditRequest,
} from "../../../views/keybinding-settings/keybindingEditRequest";
import { setKeybindingViewMounted } from "../../../views/keybinding-settings/keybindingViewPresence";
import {
  registerKeybindingEditCommand, runEditKeybinding,
} from "../../../views/keybinding-settings/keybindingEditCommand";

const COMMANDS = [
  { id: "file-tree.openFile", title: "打开" },
  { id: "serial-monitor.openPort", title: "打开端口" },
];

let handlers: Map<string, (args?: unknown) => unknown>;
let executeCommand: ReturnType<typeof vi.fn>;
let show: ReturnType<typeof vi.fn>;

beforeEach(() => {
  resetKeybindingEditRequest();
  setKeybindingViewMounted(false);
  handlers = new Map();
  executeCommand = vi.fn(async () => undefined);
  show = vi.fn(async () => undefined);
  const lk = window.linkdesk as unknown as Record<string, unknown>;
  lk.commands = {
    registerCommand: (id: string, fn: (args?: unknown) => unknown) => { handlers.set(id, fn); },
    getCommands: async () => COMMANDS,
    executeCommand,
  };
  lk.quickPick = { show };
  lk.keybindings = { getKeybindings: async () => [{ command: "file-tree.openFile", key: "ctrl+o", source: "user" }] };
});

afterEach(() => {
  resetKeybindingEditRequest();
  setKeybindingViewMounted(false);
  vi.restoreAllMocks();
});

describe("注册", () => {
  it("注册 1 条，id 是 settings.editKeybinding（进命令索引的那条）", () => {
    expect(registerKeybindingEditCommand()).toBe(1);
    expect([...handlers.keys()]).toEqual(["settings.editKeybinding"]);
  });

  it("commands 面不可用时返回 0（入口顶层调用——⛔ 抛出去就是整只插件加载失败）", () => {
    (window.linkdesk as unknown as Record<string, unknown>).commands = undefined;
    expect(registerKeybindingEditCommand()).toBe(0);
  });
});

describe("带 command——AI / CLI 一步直达", () => {
  it("写意图 ＋ 开设置页并带上 query=命令 id，读数如实说「编辑态已就绪」", async () => {
    const res = await runEditKeybinding({ command: "serial-monitor.openPort" });

    expect(executeCommand).toHaveBeenCalledWith("workbench.action.openKeybindingsSettings", { query: "serial-monitor.openPort" });
    expect(consumeKeybindingEdit()).toBe("serial-monitor.openPort");
    expect(res).toEqual({
      editing: true,
      command: "serial-monitor.openPort",
      note: expect.stringContaining("编辑态"),
    });
    expect(show).not.toHaveBeenCalled(); // 点名了就不弹选择器
  });

  it("命令 id 不存在 ⇒ 抛错，且**不开设置页、不写意图**（负控：别半做）", async () => {
    await expect(runEditKeybinding({ command: "nope.nothing" })).rejects.toThrow(/nope\.nothing/);
    expect(executeCommand).not.toHaveBeenCalled();
    expect(consumeKeybindingEdit()).toBeNull();
    expect(show).not.toHaveBeenCalled();
  });

  it("空白 command 视同没给 ⇒ 走选择器（⛔ 不当成「点了一条名叫空白的命令」）", async () => {
    await runEditKeybinding({ command: "   " });
    expect(show).toHaveBeenCalledTimes(1);
  });
});

describe("不带 command——选择器（命令面板给不了参数，那条路靠它）", () => {
  it("选中一条 ⇒ 对它开编辑态；条目上带着当前绑定与命令 id 作回执", async () => {
    show.mockImplementation(async (opts: { items: Array<{ label: string; description?: string }> }) => {
      const target = opts.items.find((i) => i.description === "serial-monitor.openPort");
      return target;
    });
    const res = await runEditKeybinding();

    expect(executeCommand).toHaveBeenCalledWith("workbench.action.openKeybindingsSettings", { query: "serial-monitor.openPort" });
    expect(consumeKeybindingEdit()).toBe("serial-monitor.openPort");
    expect(res.command).toBe("serial-monitor.openPort");

    // 条目形态：label = 显示名、description = 命令 id（回执靠它）、detail = 当前绑定
    const opts = show.mock.calls[0][0] as { items: Array<{ label: string; description: string; detail: string }>; placeholder: string };
    expect(opts.items.map((i) => i.description)).toEqual(["file-tree.openFile", "serial-monitor.openPort"]);
    expect(opts.items[0]).toMatchObject({ label: "打开", detail: "当前：ctrl+o" });
    expect(opts.items[1].detail).toBe("当前未绑定");
    expect(opts.placeholder).toContain("快捷键");
  });

  it("取消（选择器返回空）⇒ 什么都不动，读数如实说「已取消」（负控：不许开了页面再默默等人按）", async () => {
    show.mockResolvedValue(undefined);
    const res = await runEditKeybinding();

    expect(executeCommand).not.toHaveBeenCalled();
    expect(consumeKeybindingEdit()).toBeNull();
    expect(res).toEqual({ editing: false, command: "", note: expect.stringContaining("取消") });
  });
});

describe("🔴 已在快捷键页内——不许惊动壳（修「缩回左侧栏」）", () => {
  it("在场 ⇒ **不调那条壳命令**，但意图照写（挂载中的视图订阅它，当场进编辑态）", async () => {
    setKeybindingViewMounted(true);
    const res = await runEditKeybinding({ command: "serial-monitor.openPort" });

    expect(executeCommand).not.toHaveBeenCalled(); // ← 这一条就是「不再被弹回左侧栏」
    expect(consumeKeybindingEdit()).toBe("serial-monitor.openPort");
    expect(res.command).toBe("serial-monitor.openPort");
  });

  it("不在场（命令面板 / AI / CLI 直调）⇒ 仍请壳把这一页开出来", async () => {
    setKeybindingViewMounted(false);
    await runEditKeybinding({ command: "serial-monitor.openPort" });

    expect(executeCommand).toHaveBeenCalledWith("workbench.action.openKeybindingsSettings", { query: "serial-monitor.openPort" });
  });

  it("选择器那条路同样受在场判据管（点齿轮 = 在场，就不弹回左侧栏）", async () => {
    setKeybindingViewMounted(true);
    show.mockImplementation(async (opts: { items: Array<{ description?: string }> }) =>
      opts.items.find((i) => i.description === "serial-monitor.openPort"));

    await runEditKeybinding();

    expect(executeCommand).not.toHaveBeenCalled();
    expect(consumeKeybindingEdit()).toBe("serial-monitor.openPort");
  });
});
