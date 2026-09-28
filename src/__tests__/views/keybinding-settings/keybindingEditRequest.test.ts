/**
 * keybindingEditRequest 单测——意图槽的投递/过期/清理规则（M2 `AI#25`）。
 *
 * 为什么值得单测：这是命令侧与视图侧**唯一**的接缝，规则搞错的表现是「AI 说改了、界面没动」
 * （投递丢）或「用户事后自己开设置页，某行突然跳进编辑态」（过期没作废）——两者都不报错，
 * 只能靠这几条钉住。时间用**入参 `now`** 注入，不 mock 时钟。
 */

import { afterEach, describe, expect, it, vi } from "vitest";
import {
  consumeKeybindingEdit, requestKeybindingEdit, resetKeybindingEditRequest,
  subscribeKeybindingEdit, KEYBINDING_EDIT_TTL_MS,
} from "../../../views/keybinding-settings/keybindingEditRequest";

afterEach(() => {
  resetKeybindingEditRequest();
  vi.restoreAllMocks();
});

describe("视图不在场——待办通道", () => {
  it("写意图后领取，拿到的正是那条命令", () => {
    requestKeybindingEdit("file-tree.openFile");
    expect(consumeKeybindingEdit()).toBe("file-tree.openFile");
  });

  it("**消费即清**——意图不是状态，第二次领取为空（否则每次挂载都会重放）", () => {
    requestKeybindingEdit("file-tree.openFile");
    consumeKeybindingEdit();
    expect(consumeKeybindingEdit()).toBeNull();
  });

  it("没写过就是空——视图挂载时不该无中生有一行编辑态", () => {
    expect(consumeKeybindingEdit()).toBeNull();
  });

  it("窗口期内有效（刚好等于 TTL 仍算有效）", () => {
    requestKeybindingEdit("a.b", 1_000);
    expect(consumeKeybindingEdit(1_000 + KEYBINDING_EDIT_TTL_MS)).toBe("a.b");
  });

  it("超出窗口期作废——用户事后自己开设置页，不该突然有一行跳进编辑态", () => {
    requestKeybindingEdit("a.b", 1_000);
    expect(consumeKeybindingEdit(1_000 + KEYBINDING_EDIT_TTL_MS + 1)).toBeNull();
  });

  it("过期的待办同样**被清掉**——不能留给下一次挂载（清理由领取负责）", () => {
    requestKeybindingEdit("a.b", 1_000);
    expect(consumeKeybindingEdit(1_000 + KEYBINDING_EDIT_TTL_MS + 1)).toBeNull();
    expect(consumeKeybindingEdit(1_000 + KEYBINDING_EDIT_TTL_MS + 2)).toBeNull();
  });

  it("后写的顶掉先写的——单槽语义（同一时刻只可能有一个「要改哪条」）", () => {
    requestKeybindingEdit("a.b");
    requestKeybindingEdit("c.d");
    expect(consumeKeybindingEdit()).toBe("c.d");
  });
});

describe("视图在场——订阅通道", () => {
  it("有订阅者 ⇒ 当场投递，且不留待办（避免挂载时再落一次）", () => {
    const seen = vi.fn();
    subscribeKeybindingEdit(seen);
    requestKeybindingEdit("a.b");
    expect(seen).toHaveBeenCalledWith("a.b");
    expect(consumeKeybindingEdit()).toBeNull();
  });

  it("订阅者在场时，旧待办被丢弃——同一意图不落两次", () => {
    requestKeybindingEdit("stale.cmd");
    const seen = vi.fn();
    subscribeKeybindingEdit(seen);
    requestKeybindingEdit("fresh.cmd");
    expect(seen).toHaveBeenCalledTimes(1);
    expect(consumeKeybindingEdit()).toBeNull();
  });

  it("退订后回到待办通道（视图卸载的场景）", () => {
    const seen = vi.fn();
    const unsubscribe = subscribeKeybindingEdit(seen);
    unsubscribe();
    requestKeybindingEdit("a.b");
    expect(seen).not.toHaveBeenCalled();
    expect(consumeKeybindingEdit()).toBe("a.b");
  });

  it("退订只解掉**自己**那个订阅者（后订顶前，别把新订阅者误清）", () => {
    const first = vi.fn();
    const second = vi.fn();
    const unsubscribeFirst = subscribeKeybindingEdit(first);
    subscribeKeybindingEdit(second);
    unsubscribeFirst();
    requestKeybindingEdit("a.b");
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledWith("a.b");
  });
});
