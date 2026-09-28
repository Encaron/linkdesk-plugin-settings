/**
 * keybindingEditCommand——「修改快捷键」的命令面（M2 `AI#25`）。
 *
 * ## 补的是哪条唯一鼠标路径
 *
 * `KeybindingSettingsView.tsx`：绑定行 `onDoubleClick={… startEdit(row); splitChord(row)}`
 * ——**进入改键编辑态只有双击行**。（✕ / 点外部 = 取消，Enter = 落地保存，那些是编辑态**内**的动作。）
 *
 * ## 两种调用形
 *
 * 1. 带 `command`（命令 id）：直接对那条进编辑态——AI / CLI 一条命令直达。
 * 2. 不带：先弹选择器让用户挑一条命令（命令面板给不了参数，但选择器本身是**键盘可操作**的）
 *    ⇒ 不用鼠标也能走完全程。
 *
 * 两条路都**先把设置页开出来并切到「快捷键」页**——走壳命令
 * `workbench.action.openKeybindingsSettings`（`query` = 命令 id ⇒ 搜索框预填、目标行可见），
 * 再写意图。⚠️ **顺序不能反**：写成「先写意图再开页面」才两种状态都对——页面后开时领待办，
 * 页面已开时走订阅当场投递（见 `keybindingEditRequest.ts` 的双通道）。
 *
 * ## 🔴 边界（本格不越界）
 *
 * 本命令只负责**把目标行切进编辑态**。按键录制（双框 chord 捕获）与落地（Enter）仍是**人在视图里
 * 完成**——⛔ 不做「AI 代按/代存」的通道：改键是用户的绑定意图，`AI#29` 同款口径（录制这一步
 * 不该有非人路径）。故本命令的读数如实写「编辑态已就绪」而不是「已改完」。
 *
 * ⚠️ 说明与参数只写在 `plugin.json` 的 `contributes.commands[]`，运行时 `registerCommand`
 *   不带 meta（壳加载器会把那份注册进命令索引；池侧不带这两项时不会抹掉声明面那份）。
 */

import { requestKeybindingEdit } from "./keybindingEditRequest";

/** 壳侧命令——打开快捷键设置页（`settingsCommands.ts` 的 `workbench.action.openKeybindingsSettings`） */
const OPEN_KEYBINDINGS_COMMAND = "workbench.action.openKeybindingsSettings";

export interface EditKeybindingArgs {
  /** 要改哪条命令的快捷键（命令 id，如 `file-tree.openFile`）。省略 ⇒ 弹选择器让用户挑 */
  command?: string;
}

export interface EditKeybindingResult {
  /** 编辑态是否已就绪（false 只在用户取消选择时出现） */
  editing: boolean;
  /** 目标命令 id（取消时为空串） */
  command: string;
  /** 面向调用者的一句实情——⛔ 别把「编辑态已就绪」读成「快捷键已改」 */
  note: string;
}

type CommandInfo = { id: string; title?: string };
type BindingInfo = { command: string; key: string };

/**
 * 弹选择器挑一条命令。条目 `description` 携带命令 id 作回执（跨世界是结构化克隆，
 * 对象身份不可靠 ⇒ 不靠引用认条目）。
 * @returns 命令 id；用户取消 ⇒ 空串
 */
async function pickCommandId(commands: CommandInfo[]): Promise<string> {
  const kbs = ((await window.linkdesk?.keybindings?.getKeybindings?.()) ?? []) as BindingInfo[];
  const keyOf = new Map(kbs.map((k) => [k.command, k.key]));
  const items = commands.map((c) => ({
    label: c.title ?? c.id,
    description: c.id,
    detail: keyOf.get(c.id) ? `当前：${keyOf.get(c.id)}` : "当前未绑定",
  }));
  const picked = (await window.linkdesk?.quickPick?.show({
    items,
    placeholder: "要改哪条命令的快捷键？",
  })) as { description?: string } | undefined;
  return picked?.description ?? "";
}

/**
 * 命令 handler——把目标行切进编辑态。
 * @throws 命令 id 不存在（⛔ 不静默、「什么也没发生」比报错更难查）
 */
export async function runEditKeybinding(args?: EditKeybindingArgs): Promise<EditKeybindingResult> {
  const lk = window.linkdesk;
  const commands = ((await lk?.commands?.getCommands?.()) ?? []) as CommandInfo[];

  let target = args?.command?.trim() ?? "";
  if (target && !commands.some((c) => c.id === target)) {
    throw new Error(`没有这条命令：${target}——命令 id 可用 describe / 命令面板查（例：file-tree.openFile）`);
  }
  if (!target) {
    target = await pickCommandId(commands);
    if (!target) {
      return { editing: false, command: "", note: "已取消——没有选定要改的命令" };
    }
  }

  // 先写意图再开页面：页面后开 ⇒ 领待办；页面已开 ⇒ 订阅当场投递（两种都成立）
  requestKeybindingEdit(target);
  await lk?.commands?.executeCommand?.(OPEN_KEYBINDINGS_COMMAND, { query: target });

  return {
    editing: true,
    command: target,
    note: `已把「${target}」那一行切进编辑态（等于双击它）。按键由使用者按：按新键 → Enter 落地，Esc 取消`,
  };
}

/**
 * 注册命令。入口顶层调用（E6#62e：无视图时 AI 经 `exec` 打进来靠池的 on-command 激活
 * `import()` 本插件入口 ⇒ 顶层副作用才是唯一注册时机）。
 * @returns 注册成功的条数（0 = `window.linkdesk.commands` 不可用）
 */
export function registerKeybindingEditCommand(): number {
  const reg = window.linkdesk?.commands?.registerCommand;
  if (!reg) return 0;
  reg("settings.editKeybinding", async (args?: EditKeybindingArgs) => runEditKeybinding(args));
  return 1;
}
