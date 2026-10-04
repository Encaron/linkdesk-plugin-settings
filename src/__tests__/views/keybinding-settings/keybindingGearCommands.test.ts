/**
 * keybindingGearCommands 单测——快捷键行齿轮菜单五条命令的注册与动作（2026-10-05 件 2）。
 *
 * ## 判据
 *
 * 真正的失败模式都是**静默**的：id 打错 ⇒ 菜单项点了没反应；复制项复制错字段
 * （把「命令名称」复制成 id）⇒ 看不出来；重置在用户点「取消」后仍写盘 ⇒ 覆盖悄悄没了。
 * 故每条命令都断言**剪贴板里到底是什么**（或**没被写**），而不只看调用次数。
 *
 * ## 替身
 *
 * `commands` / `clipboard` / `notifications` / `dialog` / `keybindings` 五个面按需 `vi.fn()`——
 * 「插件专属桩住本仓测试文件」的写法（共享地基只放六通用面）。
 */

import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import i18n from "i18next";
import {
  KEYBINDING_GEAR_COMMANDS,
  type KeybindingGearContext,
} from "../../../views/keybinding-settings/keybindingGearTarget";
import { registerKeybindingGearCommands } from "../../../views/keybinding-settings/keybindingGearCommands";

/* 生产前提 = 插件入口 i18n init 先行；单测不走入口 ⇒ 手动 init 同款默认实例，否则未初始化时
 * `i18n.t` 返回 **undefined**（回执文案与确认框的断言就没有牙了）。资源留空 ⇒ `t` 回 key
 * （i18n key = 中文原文，硬约束 2）——不引真字典、不硬写中文串。先例：marketplace `installGate.test.ts`。 */
beforeAll(async () => {
  await i18n.init({
    lng: "en",
    fallbackLng: false,
    nsSeparator: false,
    keySeparator: false,
    interpolation: { escapeValue: false },
    resources: { en: { translation: {} } },
  });
});

const { copyId, copyName, copyKey, copyJson, resetToDefault } = KEYBINDING_GEAR_COMMANDS;

const TARGET: KeybindingGearContext = {
  command: "workbench.action.selectLanguage",
  title: "选择语言",
  key: "ctrl+k ctrl+l",
  source: "user",
  keybindingHasKey: true,
  keybindingIsUser: true,
};

let handlers: Map<string, (args?: unknown) => unknown>;
let writeText: ReturnType<typeof vi.fn>;
let show: ReturnType<typeof vi.fn>;
let confirm: ReturnType<typeof vi.fn>;
let resetKeybindingToDefault: ReturnType<typeof vi.fn>;
let saveUserKeybindings: ReturnType<typeof vi.fn>;

beforeEach(() => {
  handlers = new Map();
  writeText = vi.fn(async () => undefined);
  show = vi.fn(async () => undefined);
  confirm = vi.fn(async () => true);
  resetKeybindingToDefault = vi.fn(async () => undefined);
  saveUserKeybindings = vi.fn(async () => undefined);
  const lk = window.linkdesk as unknown as Record<string, unknown>;
  lk.commands = {
    registerCommand: (id: string, fn: (args?: unknown) => unknown) => { handlers.set(id, fn); },
  };
  lk.clipboard = { writeText };
  lk.notifications = { show };
  lk.dialog = { confirm };
  lk.keybindings = { resetKeybindingToDefault, saveUserKeybindings };
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("注册", () => {
  it("注册 5 条，id 与菜单项声明一一对应", () => {
    expect(registerKeybindingGearCommands()).toBe(5);
    expect([...handlers.keys()]).toEqual([copyId, copyName, copyKey, copyJson, resetToDefault]);
  });

  it("commands 面不可用时返回 0（入口顶层调用——⛔ 抛出去就是整只插件加载失败）", () => {
    (window.linkdesk as unknown as Record<string, unknown>).commands = undefined;
    expect(registerKeybindingGearCommands()).toBe(0);
  });
});

describe("复制四条——各自复制的是本字段", () => {
  // ⚠️ 形参**不给默认值**：`undefined` 是「本行身份缺失」那条负控要真送进去的值，
  //    带默认值会让 `run(id, undefined)` 静默变成 `run(id, TARGET)`（假绿）。
  const run = async (id: string, args: unknown) => {
    registerKeybindingGearCommands();
    await handlers.get(id)?.(args);
  };

  it("复制命令 ID ⇒ 剪贴板是 command，回执带上同一串", async () => {
    await run(copyId, TARGET);
    expect(writeText).toHaveBeenCalledWith("workbench.action.selectLanguage");
    expect(show.mock.calls[0][0]).toContain("workbench.action.selectLanguage");
  });

  it("复制命令名称 ⇒ 剪贴板是 title", async () => {
    await run(copyName, TARGET);
    expect(writeText).toHaveBeenCalledWith("选择语言");
  });

  it("复制快捷键 ⇒ 键位串**保持声明原形**（含 chord 的空格分段，⛔ 不归一化）", async () => {
    await run(copyKey, TARGET);
    expect(writeText).toHaveBeenCalledWith("ctrl+k ctrl+l");
  });

  it("复制为 JSON ⇒ 与 keybindings.json 同形；带 when 的行不丢条件", async () => {
    await run(copyJson, { ...TARGET, when: "resourceIsFile" });
    expect(writeText).toHaveBeenCalledWith(
      JSON.stringify({ command: "workbench.action.selectLanguage", key: "ctrl+k ctrl+l", when: "resourceIsFile" })
    );
    expect(show).toHaveBeenCalledTimes(1);
  });

  it("本行身份缺失（menu 误传 / 空 context）⇒ 剪贴板与 toast 都不动（负控：别复制空串）", async () => {
    await run(copyId, undefined);
    await run(copyName, {});
    await run(copyKey, null);
    await run(copyJson, "workbench.action.selectLanguage");
    expect(writeText).not.toHaveBeenCalled();
    expect(show).not.toHaveBeenCalled();
  });
});

describe("重置为默认——确认框是前置闸门", () => {
  const runReset = async (args: unknown) => {
    registerKeybindingGearCommands();
    await handlers.get(resetToDefault)?.(args);
  };

  it("确认 ⇒ 重置该命令并保存", async () => {
    await runReset(TARGET);
    expect(confirm).toHaveBeenCalledTimes(1);
    expect(confirm.mock.calls[0][0]).toBe(i18n.t("确定要将「{{key}}」重置为默认值吗？", { key: "选择语言" }));
    expect(resetKeybindingToDefault).toHaveBeenCalledWith("workbench.action.selectLanguage");
    expect(saveUserKeybindings).toHaveBeenCalledTimes(1);
  });

  it("取消 ⇒ 一条都不写（负控：⛔ 不许「点了取消却已经落盘」）", async () => {
    confirm.mockResolvedValue(false);
    await runReset(TARGET);
    expect(resetKeybindingToDefault).not.toHaveBeenCalled();
    expect(saveUserKeybindings).not.toHaveBeenCalled();
  });

  it("本行身份缺失 ⇒ 连确认框都不弹（没有目标可重置）", async () => {
    await runReset({});
    expect(confirm).not.toHaveBeenCalled();
    expect(resetKeybindingToDefault).not.toHaveBeenCalled();
  });
});
