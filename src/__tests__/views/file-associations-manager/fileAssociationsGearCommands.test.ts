/**
 * fileAssociationsGearCommands 单测——管理器两处齿轮三条命令的注册与「复制插件 id」回执可达
 * （2026-10-05 · 纠正案 02 §五 5.3 / §七）。
 *
 * ## 为什么只测「复制」这一条
 *
 * `clearRow` / `clearCard` 的动作是「查表 → 写配置」，判据住在 `planCardClear` 的纯函数单测里
 * （`fileAssociationsGearTarget.test.ts`）；这两条 handler 只是薄接线，写面在 `writeDefaults`。
 * 而「复制插件 id」的失败模式是**静默**的：`clipboard` 面缺席时 `?.()` 什么都不发生、而 promise
 * reject 会把后面的回执 toast 吞掉 ⇒ 用户看到的就是「点了没反应」（用户报的症状）。所以这里
 * 钉死三态：**面在 + resolve** ⇒ 成功回执；**面 reject** ⇒ 失败回执；**面缺席** ⇒ 明说不可用。
 *
 * ## 替身
 *
 * `commands` / `clipboard` / `notifications` 三个面按需 `vi.fn()`——插件专属桩住本仓测试文件
 * （共享地基 `@linkdesk/plugin-sdk/vitest-setup` 只放通用面）。
 */

import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import i18n from "i18next";
import { FILE_ASSOC_GEAR_COMMANDS } from "../../../views/file-associations-manager/fileAssociationsGearTarget";
import { registerFileAssociationGearCommands } from "../../../views/file-associations-manager/fileAssociationsGearCommands";

/* 生产前提 = 插件入口 i18n init 先行；单测不走入口 ⇒ 手动 init 同款默认实例（照
 * `keybindingGearCommands.test.ts` 先例），否则未初始化时 `i18n.t` 返回 undefined。 */
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

const { copyPluginId } = FILE_ASSOC_GEAR_COMMANDS;

/** `window.linkdesk` 的宽面视图——给需要删字段的负控用 */
const lk = () => window.linkdesk as unknown as Record<string, unknown>;

let handlers: Map<string, (args?: unknown) => unknown>;
let writeText: ReturnType<typeof vi.fn>;
let show: ReturnType<typeof vi.fn>;

beforeEach(() => {
  handlers = new Map();
  writeText = vi.fn(async () => undefined);
  show = vi.fn(async () => undefined);
  lk().commands = {
    registerCommand: (id: string, fn: (args?: unknown) => unknown) => {
      handlers.set(id, fn);
    },
  };
  lk().clipboard = { writeText };
  lk().notifications = { show };
});

afterEach(() => {
  vi.restoreAllMocks();
});

const runCopy = async (args: unknown) => {
  registerFileAssociationGearCommands();
  await handlers.get(copyPluginId)?.(args);
};

describe("注册", () => {
  it("注册 3 条，id 与 plugin.json 的 contributes.commands[] 一一对应", () => {
    expect(registerFileAssociationGearCommands()).toBe(3);
    expect([...handlers.keys()]).toEqual(Object.values(FILE_ASSOC_GEAR_COMMANDS));
  });

  it("commands 面不可用时返回 0（入口顶层调用——⛔ 抛出去就是整只插件加载失败）", () => {
    lk().commands = undefined;
    expect(registerFileAssociationGearCommands()).toBe(0);
  });
});

describe("复制插件 id——回执必须可达（C2.4 修的就是这条）", () => {
  it("面存在 + resolve ⇒ 剪贴板是该 id，且成功回执带上同一串", async () => {
    await runCopy([{ pluginId: "plug-a" }]);
    expect(writeText).toHaveBeenCalledWith("plug-a");
    expect(show).toHaveBeenCalledTimes(1);
    expect(show.mock.calls[0][0]).toContain("plug-a");
    expect(show.mock.calls[0][1]).toMatchObject({ type: "info" });
  });

  it("🔴 面 reject（IPC 失败/权限）⇒ 失败回执，⛔ 不是静默「点了没反应」", async () => {
    writeText = vi.fn(async () => {
      throw new Error("permission denied");
    });
    lk().clipboard = { writeText };
    await runCopy([{ pluginId: "plug-a" }]);
    expect(show).toHaveBeenCalledTimes(1);
    expect(show.mock.calls[0][0]).toContain("permission denied");
    expect(show.mock.calls[0][1]).toMatchObject({ type: "error" });
  });

  it("🔴 面缺席（旧壳/脱窗）⇒ 明说剪贴板不可用，⛔ 不静默", async () => {
    delete (lk().clipboard as Record<string, unknown>).writeText;
    await runCopy([{ pluginId: "plug-a" }]);
    expect(show).toHaveBeenCalledTimes(1);
    expect(show.mock.calls[0][1]).toMatchObject({ type: "warning" });
  });

  it("本卡身份缺失（空 context / 误传）⇒ 剪贴板与 toast 都不动（负控：别复制空串）", async () => {
    await runCopy([{}]);
    await runCopy([]);
    await runCopy(undefined);
    expect(writeText).not.toHaveBeenCalled();
    expect(show).not.toHaveBeenCalled();
  });
});
