/**
 * fileAssociationsGearCommands 单测——管理器两处齿轮三条命令的注册、**载荷形状**与回执可达。
 *
 * ## 🔴 「载荷形状」一节是 2026-10-06 补的（纠正案加严 **V3** 的机械判据）
 *
 * 壳按**展开**把载荷喂给 handler：`ContextMenu` 执行命令走
 * `executeCommand(id, undefined, ...commandArgs, context)` ⇒ 池预加载归一成 `realArgs` ⇒ `handler(...realArgs)`
 * （`electron/preload-pool/commands.ts`；同一语义在壳侧由 `commands.test.ts` 的
 * 「池内命中的 handler 收**展开**实参」两条用例钉住——那边一改，这里的形状也跟着有据可查）。
 *
 * ⛔ **调用形只能照 `invokeGear()` 造**。老版本把整包 `args` 数组当**一枚实参**直接喂 handler——
 * 那恰好与解析器「读 `args[0]`」的预期同形，于是三条命令**单测全绿、实机全空转**（用户报的「齿轮点了没反应」）。
 * 本文件钉的是**正控**（真实形状必须生效）。
 * ⚠️ 别在这里造「负控」模拟老写法：`(...args)` 是**宽**的——「数组套数组」它也收，
 *   真正会空转的是**被剥掉一层**的形状（单参 handler 的接收形状），那条判据住
 *   `fileAssociationsGearTarget.test.ts`「单参形状一律判空」一节（在那儿是直接的、不绕包装）。
 *
 * ## 为什么「复制插件 id」那条还钉三态
 *
 * 它的失败模式是**静默**的：`clipboard` 面缺席时 `?.()` 什么都不发生、而 promise reject 会把后面的
 * 回执 toast 吞掉 ⇒ 用户看到的就是「点了没反应」。所以这里钉死三态：**面在 + resolve** ⇒ 成功回执；
 * **面 reject** ⇒ 失败回执；**面缺席** ⇒ 明说不可用。
 * （⚠️ 2026-10-06 更正：C2.4 当初把「点了没反应」归因给 `clipboard` 缺席——真因是载荷形状，
 *  三条齿轮一起空转；探面保留作旧壳/脱窗降级，但钉住 V3 的是上面那一节。）
 *
 * ## 替身
 *
 * `commands` / `clipboard` / `notifications` / `fileAssociation` / `configuration` / `pluginManager`
 * 六个面按需 `vi.fn()`——插件专属桩住本仓测试文件（共享地基 `@linkdesk/plugin-sdk/vitest-setup` 只放通用面）。
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

const { clearRow, clearCard, copyPluginId } = FILE_ASSOC_GEAR_COMMANDS;

/** `window.linkdesk` 的宽面视图——给需要删字段的负控用 */
const lk = () => window.linkdesk as unknown as Record<string, unknown>;

/** 卡齿轮的 `context`——`PluginCard.tsx` 硬编码（共享件契约，管理器管不着） */
const CARD_CTX = { pluginId: "plug-a" };

/** 该插件声明的类型：`md` / `pdf` / `zip` */
const PLUGIN_MANIFEST = {
  contributes: {
    fileAssociations: [{ extension: "md" }, { extension: "pdf" }, { extension: "zip" }],
  },
};

/** 覆盖表：只有 `md` 有键（`zip` 没键 ⇒ 不进清除清单） */
const TABLE = { ".md": "plug-a" };

let handlers: Map<string, (...args: unknown[]) => unknown>;
let writeText: ReturnType<typeof vi.fn>;
let show: ReturnType<typeof vi.fn>;
let setDefault: ReturnType<typeof vi.fn>;
let setDefaultBulk: ReturnType<typeof vi.fn>;
let cfgGet: ReturnType<typeof vi.fn>;
let pmList: ReturnType<typeof vi.fn>;

beforeEach(() => {
  handlers = new Map();
  writeText = vi.fn(async () => undefined);
  show = vi.fn(async () => undefined);
  setDefault = vi.fn(async () => undefined);
  setDefaultBulk = vi.fn(async () => undefined);
  cfgGet = vi.fn(async () => TABLE);
  pmList = vi.fn(async () => [{ pluginId: "plug-a", manifest: PLUGIN_MANIFEST }]);
  lk().commands = {
    registerCommand: (id: string, fn: (...args: unknown[]) => unknown) => {
      handlers.set(id, fn);
    },
  };
  lk().clipboard = { writeText };
  lk().notifications = { show };
  lk().fileAssociation = { setDefault, setDefaultBulk };
  lk().configuration = { get: cfgGet };
  lk().pluginManager = { list: pmList };
});

afterEach(() => {
  vi.restoreAllMocks();
});

/**
 * 照**壳的真实语义**发一条命令——`ContextMenu.handleItemClick` 的原样 ＋ 池预加载的归一：
 * `executeCommand(id, undefined, ...commandArgs, context)` → 去掉占位 `undefined` → **展开**喂 handler。
 * ⛔ 别改成本文件的 `handler(args)`（整包形）——那就是 V3 的伪装。
 */
const invokeGear = async (
  id: string,
  opts: { commandArgs?: unknown[]; context?: unknown } = {},
) => {
  registerFileAssociationGearCommands();
  const args: unknown[] = [undefined, ...(opts.commandArgs ?? [])];
  args.push(opts.context);
  const realArgs = args[0] === undefined ? args.slice(1) : args;
  return handlers.get(id)?.(...realArgs);
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

describe("载荷形状——三条命令在真实形状下都得生效（🔴 V3 机械判据）", () => {
  it("clearRow：`commandArgs[0]` = 类型数组 ⇒ 整格恢复自动（一次 bulk 写，⛔ 不是逐类）", async () => {
    await invokeGear(clearRow, { commandArgs: [["md", "pdf"]], context: {} });

    expect(setDefaultBulk).toHaveBeenCalledTimes(1);
    expect(setDefaultBulk).toHaveBeenCalledWith(["md", "pdf"], null);
    expect(setDefault).not.toHaveBeenCalled();
    expect(show).toHaveBeenCalledTimes(1);
    expect(show.mock.calls[0][1]).toMatchObject({ type: "info" });
  });

  it("clearCard：`context.pluginId` ⇒ 只清该插件声明过**且真有键**的类", async () => {
    await invokeGear(clearCard, { context: CARD_CTX });

    expect(pmList).toHaveBeenCalled();
    expect(setDefaultBulk).toHaveBeenCalledWith(["md"], null); // 声明 md/pdf/zip ∩ 有键 {md}
    expect(show).toHaveBeenCalledTimes(1);
  });

  it("clearCard：该插件名下一个键都没有 ⇒ 不写盘，只回执「没有需要清除的」", async () => {
    cfgGet = vi.fn(async () => ({}));
    lk().configuration = { get: cfgGet };

    await invokeGear(clearCard, { context: CARD_CTX });

    expect(setDefaultBulk).not.toHaveBeenCalled();
    expect(setDefault).not.toHaveBeenCalled();
    expect(show).toHaveBeenCalledTimes(1);
  });

  it("空载荷 / 非数组载荷 ⇒ 三条命令一律不动手（⛔ 不清个空的）", async () => {
    await invokeGear(clearRow, { commandArgs: [[], {}], context: {} });
    await invokeGear(clearCard, { commandArgs: [[], {}] });
    await invokeGear(copyPluginId, { commandArgs: [[], {}] });

    expect(setDefaultBulk).not.toHaveBeenCalled();
    expect(writeText).not.toHaveBeenCalled();
    expect(show).not.toHaveBeenCalled();
  });
});

describe("复制插件 id——回执必须可达（C2.4 修的就是这条）", () => {
  it("面存在 + resolve ⇒ 剪贴板是该 id，且成功回执带上同一串", async () => {
    await invokeGear(copyPluginId, { context: CARD_CTX });
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
    await invokeGear(copyPluginId, { context: CARD_CTX });
    expect(show).toHaveBeenCalledTimes(1);
    expect(show.mock.calls[0][0]).toContain("permission denied");
    expect(show.mock.calls[0][1]).toMatchObject({ type: "error" });
  });

  it("🔴 面缺席（旧壳/脱窗）⇒ 明说剪贴板不可用，⛔ 不静默", async () => {
    delete (lk().clipboard as Record<string, unknown>).writeText;
    await invokeGear(copyPluginId, { context: CARD_CTX });
    expect(show).toHaveBeenCalledTimes(1);
    expect(show.mock.calls[0][1]).toMatchObject({ type: "warning" });
  });

  it("本卡身份缺失（空 context / 无 context / 误传）⇒ 剪贴板与 toast 都不动（负控：别复制空串）", async () => {
    await invokeGear(copyPluginId, { context: {} });
    await invokeGear(copyPluginId); // 无 context ⇒ ContextMenu 那一路也就是 undefined
    await invokeGear(copyPluginId, { context: "plug-a" }); // 裸字符串：⛔ 不拿它猜 id
    expect(writeText).not.toHaveBeenCalled();
    expect(show).not.toHaveBeenCalled();
  });
});
