/**
 * notify 门面单测 —— 成功回执优先轻 Toast、旧壳回退、失败/警告留铃铛。
 * fixture 全虚构值（硬约束 21），不触碰真实壳。
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { notify, NOTIFY_SOURCE } from "../notify";

type ShowMock = ReturnType<typeof vi.fn>;
type LkStub = {
  toasts?: { show: ShowMock };
  notifications?: { show: ShowMock };
};

let toastsShow: ShowMock;
let notifShow: ShowMock;

beforeEach(() => {
  toastsShow = vi.fn(async () => undefined);
  notifShow = vi.fn(async () => undefined);
});

afterEach(() => {
  delete (window as unknown as { linkdesk?: LkStub }).linkdesk;
});

function mountLk(withToasts: boolean): void {
  (window as unknown as { linkdesk?: LkStub }).linkdesk = {
    ...(withToasts ? { toasts: { show: toastsShow } } : {}),
    notifications: { show: notifShow },
  };
}

describe("settings notify —— 回执分面", () => {
  it("info/success 有 toasts 面 ⇒ 轻 Toast（severity 原样、带 source）", () => {
    mountLk(true);
    notify("演示回执", "success");
    expect(toastsShow).toHaveBeenCalledWith({
      message: "演示回执",
      severity: "success",
      source: NOTIFY_SOURCE,
    });
    expect(notifShow).not.toHaveBeenCalled();
  });

  it("旧壳无 toasts 面 ⇒ 回退通知面板（success 降为 info）", () => {
    mountLk(false);
    notify("演示回执", "success");
    expect(notifShow).toHaveBeenCalledWith("演示回执", { type: "info", source: NOTIFY_SOURCE });
    expect(toastsShow).not.toHaveBeenCalled();
  });

  it("warning/error 一律通知面板（即使 toasts 面在——失败要留档）", () => {
    mountLk(true);
    notify("演示失败", "error");
    notify("演示警告", "warning");
    expect(toastsShow).not.toHaveBeenCalled();
    expect(notifShow).toHaveBeenNthCalledWith(1, "演示失败", { type: "error", source: NOTIFY_SOURCE });
    expect(notifShow).toHaveBeenNthCalledWith(2, "演示警告", { type: "warning", source: NOTIFY_SOURCE });
  });

  it("通知面全缺（壳进程/预览）⇒ 静默不抛", () => {
    delete (window as unknown as { linkdesk?: LkStub }).linkdesk;
    expect(() => notify("演示回执")).not.toThrow();
  });
});
