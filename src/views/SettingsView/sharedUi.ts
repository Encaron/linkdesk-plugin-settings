/**
 * sharedUi.ts —— 共享件能力中枢（「设置控件-词表正典与共享化」阶段 5.1 · 02 E1 双轨期）。
 *
 * 🔴 为什么走**命名空间间接取件**，而不是静态具名 import：
 * `@linkdesk/ui` 由**壳**经池子的 import map 供给（壳池 `pool-vendor/@linkdesk/ui.js`）。
 * 静态具名 import 的每个名字都必须在**已装壳**那份 dist 里存在，否则是**链接期 SyntaxError**
 * ⇒ 整个设置视图全崩（不是这一格降级）。而本案发版链是「插件先发、壳后发」（01 §五·顺位 7→8），
 * 共享新件在现装壳上必然缺席（现装 0.2.36 无 `useStatusPolling`/`SourceBadge`/哨兵两枚）。
 * 故：`import * as UI` ＋ **变量键**下标读取（`ns[name]`——打包器与 TS 都没法把它折回具名 import）
 * ＋ 逐项**运行时能力探测**：有共享件走共享件（收编），没有退回本地件（零回归）。
 *
 * 📌 顺带的好处：本仓 vitest 解析到的是插件依赖里的 `@linkdesk/ui`（0.2.36）⇒ **仓内测试跑的正是
 * 现装壳那条 fallback 路径**（E1 验收的证据面）；共享件路径由 dev 壳（0.2.37 源）＋实机验。
 *
 * 5.3（壳攒批发版后）这一层整体塌成静态具名 import、本文件随之删除——⛔ 别在别处再开第二个口子。
 * ⛔ 本文件只做「取件与探测」，不做业务判定（判定留在各自纯函数/适配层）。
 */
import * as UI from "@linkdesk/ui";
import type { ComponentType } from "react";

/** 命名空间表——变量键读取的前提 */
const ns: Record<string, unknown> = UI as unknown as Record<string, unknown>;

/** 按下标取件：缺失 = `undefined`（⛔ 不是抛错——那正是双轨期的正常态） */
function pick<T>(name: string): T | undefined {
  return ns[name] as T | undefined;
}

/* ── 能力探测（探针取「新件的代表导出」——同一次 @linkdesk/ui 发版内同生共死） ── */

/** 只读状态行的轮询模式（`ReadOnlyText` 的 `statusCommand`/`runCommand` 与 `useStatusPolling` 同批发布） */
export const HAS_POLLING_READONLY: boolean = typeof pick("useStatusPolling") === "function";

/** 背景图选择控件（能力注入式：onPick/onImport） */
export const SHARED_IMAGE_PICKER: ComponentType<{
  value: string;
  onChange: (value: unknown) => void;
  onPick: () => Promise<string | null | undefined>;
  onImport: (pickedPath: string) => Promise<string | null | undefined>;
}> | null = pick<ComponentType<{
  value: string;
  onChange: (value: unknown) => void;
  onPick: () => Promise<string | null | undefined>;
  onImport: (pickedPath: string) => Promise<string | null | undefined>;
}>>("BackgroundImagePicker") ?? null;

/** 来源徽标（可显两态 user/mix；theme 由调用方不渲染） */
export const SHARED_SOURCE_BADGE: ComponentType<{ source: "user" | "mix"; label: string }> | null =
  pick<ComponentType<{ source: "user" | "mix"; label: string }>>("SourceBadge") ?? null;

/** 生效值徽标（纯呈现：前缀＋色块＋值文字） */
export const SHARED_EFFECTIVE_BADGE: ComponentType<{ label?: string; value?: string; color?: string }> | null =
  pick<ComponentType<{ label?: string; value?: string; color?: string }>>("EffectiveBadge") ?? null;

/** 生效值展示形态（字体栈截首族／色值配 swatch）——缺席时用本地同款纯函数兜底 */
export const SHARED_FORMAT_EFFECTIVE_VALUE: ((value: string) => { label: string; color?: string }) | null =
  pick<(value: string) => { label: string; color?: string }>("formatEffectiveValue") ?? null;

/**
 * 哨兵字符串——跨插件/壳的**值契约**（`__none__` 绝对无／`followTheme` 混搭跟随主题）。
 * 共享正典在就取正典（单一真相源），不在就用本地同字面量兜底（契约值本身不变）。
 */
export function sentinel(name: "CONFIG_NONE_SENTINEL" | "MIX_FOLLOW_THEME_SENTINEL", fallback: string): string {
  const v = pick<unknown>(name);
  return typeof v === "string" && v !== "" ? v : fallback;
}

/**
 * 状态行执行句柄——壳命令 → 字符串读数（共享 `ReadOnlyText` 的 `runCommand`）。
 * 抛错／非字符串 = null（02 E7 保现值；与本地件同款语义）。
 */
export async function runStatusCommand(id: string): Promise<string | null> {
  try {
    const r = await window.linkdesk?.commands?.executeCommand?.(id);
    return typeof r === "string" ? r : null;
  } catch {
    return null;
  }
}
