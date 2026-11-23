/**
 * notify —— settings 的统一回执门面（2026-11-23 toast 调用面归位）。
 *
 * ## 为什么分两个面
 *
 * 用户拍板（2026-11-23）：**做完即弃的过路回执**（复制 ID/名称、恢复默认、清除覆盖）走
 * 轻 Toast（底中、几秒消失）；**失败/警告**需要回看与诊断，仍走铃铛面板留档。
 *
 * ## 为什么这里还要写回退
 *
 * `toasts` 面自壳 **0.2.55** 起提供，而本插件 `minAppVersion = 0.2.53`。旧壳上没有
 * `window.linkdesk.toasts` ⇒ info/success 若只调 `toasts.show` 会静默消失。故缺面时回退
 * `notifications.show`（旧壳行为一字不变），新壳才享受轻 Toast。
 *
 * ⛔ 不在这里做降级判据：`error` / 长文本 / 多动作的落面由壳 `decidePresentation` 决定，
 * 本门面只做「成功回执优先轻 Toast」这一层意图表达。
 */

/** 本插件自己的通知来源 id——壳侧通知面板按它分组（同一次操作的回执落同一组） */
export const NOTIFY_SOURCE = "settings";

type NotifyType = "info" | "success" | "warning" | "error";

/** 壳轻 Toast 的窄结构（只用到 show；⛔ 不依赖 contracts 版本差异） */
interface ToastsLike {
  show(options: {
    message: string;
    severity?: "info" | "success" | "warning";
    ttl?: number;
    key?: string;
    /** 生产者身份随行（壳面板分组/常驻配额用） */
    source?: string;
  }): Promise<unknown>;
}

/**
 * 发一条回执。
 * - `info` / `success`：有 `toasts` 面 ⇒ 轻 Toast；无（旧壳）⇒ 回落通知面板。
 * - `warning` / `error`：一律通知面板（需留存诊断）。
 *
 * 通知面不可用（壳进程/预览）时静默，不影响动作本身。
 */
export function notify(message: string, type: NotifyType = "info"): void {
  const lk = window.linkdesk as unknown as
    | { toasts?: ToastsLike; notifications?: { show?: (m: string, o?: { type?: string; source?: string }) => Promise<unknown> } }
    | undefined;

  if (type === "info" || type === "success") {
    if (lk?.toasts?.show) {
      void lk.toasts.show({ message, severity: type, source: NOTIFY_SOURCE });
      return;
    }
  }
  void lk?.notifications?.show?.(message, {
    // 旧壳的通知面没有 success 语义——按 info 显示（图标由壳的 severity 映射兜底）
    type: type === "success" ? "info" : type,
    source: NOTIFY_SOURCE,
  });
}
