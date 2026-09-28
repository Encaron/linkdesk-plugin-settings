/**
 * keybindingEditRequest——「要对哪条命令开编辑」的意图槽（M2 `AI#25`）。
 *
 * ## 为什么需要它
 *
 * 行内编辑态住在视图里（`useKeybindingEditor` 的 `editingRow`），而命令 handler 不在 React
 * 上下文——AI / CLI / 命令面板够得着的入口在视图之外。本模块是那道**单向意图通道**：
 * 命令侧写入「改这条」，视图侧消费并进编辑态（走的正是双击那一步 `startEdit + splitChord`）。
 *
 * ## 口径
 *
 * - **消费即清**——意图不是状态，没有「保持」语义（读一次就没了）。
 * - **有时效**（`KEYBINDING_EDIT_TTL_MS`）：AI 发过请求、用户当时没开设置页，事后再自己打开
 *   设置页**不该**突然有一行跳进编辑态（那会莫名其妙）。过期即作废。
 * - **双通道**（照壳侧 `openKeybindingsSettings` 的 pending + Emitter 先例）：订阅者在场 →
 *   当场投递；不在场 → 存待办，视图挂载时领取。**顺序无关**：先写意图再开页面（待办通道）
 *   与页面已开再写意图（订阅通道）都成立。
 * - **纯逻辑**：不碰 `window.linkdesk` ⇒ 投递/过期/清理规则可直接单测。
 * - ⚠️ **单订阅者**（后订顶前）：设置视图是单实例（`plugin.json` `tabBehavior.singleton` ＋
 *   壳 I8-3/IX-1「已有设置标签页则聚焦，不弹第二个面板」）⇒ 该假设由声明面保证。
 */

/** 待办窗口期——超出即作废（毫秒）。够一次「命令 → 开页面 → 视图挂载」的往返，不至于久到误伤 */
export const KEYBINDING_EDIT_TTL_MS = 30_000;

type EditListener = (command: string) => void;

let _pending: { command: string; at: number } | null = null;
let _listener: EditListener | null = null;

/**
 * 命令侧：请求对 `command` 开编辑。
 * 视图在场 ⇒ 当场投递（并丢掉可能残留的待办，避免同一意图落两次）；不在场 ⇒ 存待办。
 */
export function requestKeybindingEdit(command: string, now: number = Date.now()): void {
  if (_listener) {
    _pending = null;
    _listener(command);
    return;
  }
  _pending = { command, at: now };
}

/**
 * 视图侧：订阅意图（挂载时调用一次）。返回退订函数。
 * ⚠️ 单订阅者——见文件头注。
 */
export function subscribeKeybindingEdit(fn: EditListener): () => void {
  _listener = fn;
  return () => {
    if (_listener === fn) _listener = null;
  };
}

/**
 * 视图侧：领取挂载前留下的待办。**消费即清**（过期与否都清——过期的更不该留给下一次挂载）。
 * @returns 要开编辑的命令 id；无待办或已过期 ⇒ null
 */
export function consumeKeybindingEdit(now: number = Date.now()): string | null {
  const p = _pending;
  _pending = null;
  if (!p) return null;
  return now - p.at > KEYBINDING_EDIT_TTL_MS ? null : p.command;
}

/** 清空待办与订阅者——测试用（生产代码只在视图退订时动订阅者） */
export function resetKeybindingEditRequest(): void {
  _pending = null;
  _listener = null;
}
