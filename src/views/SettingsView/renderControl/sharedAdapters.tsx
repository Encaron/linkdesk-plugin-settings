/**
 * 接线件——三处「渲染宿主声明的控件」的组装点（判据 A：控件住共享层，本层只接宿主命令）。
 *
 * 2026-10-06《分段预览色块边缘串色》案 · 双轨塌缩（「设置控件-词表正典与共享化」5.3 的收尾）：
 * 原 E1 双轨（`sharedUi.ts` 的 `pick()` 运行时探测 ＋ 本地兜底件）整层删除。两个理由：
 *   ① 前置条件已满足——本插件 `minAppVersion` 现为 0.2.52，而三个共享件导入名的 `since`
 *      最高 0.2.40（`check-ui-min-app-version` 按**静态具名导入**算地板）⇒ 静态 import 天然安全；
 *   ② 双轨是**死重且有害**——现装壳上它恒走共享件那一支（本地件跑不到），而变量键下标读取
 *      （`ns[name]`）**不进地板账本**：插件真正依赖的共享面被藏了起来，官方示例插件不能是这个样子。
 *
 * 三个接线件语义逐格不变（12 E12：选图→入库→受控路径三态；只读行挂载即取＋轮询＋抛错保现值）：
 *   · `ReadonlyControl`——renderHint "readonly"：共享 `ReadOnlyText` 的轮询模式（`statusCommand` ＋ 宿主命令句柄）。
 *   · `ImageControl`——uiHint "image"：共享 `BackgroundImagePicker`（对话框/入库经 props 注入，
 *     共享件里零 `window.linkdesk`）。
 *   · `UnknownHintControl`——01 §四 降级契约：未知 hint 只读展示当前值＋说明。
 */
import { BackgroundImagePicker, ReadOnlyText } from "@linkdesk/ui";
import type { ConfigProperty } from "../types";

/** 选图对话框——标题/过滤器与共享件契约一致（E12：语义不变） */
async function pickImagePath(t: (key: string) => string): Promise<string | null> {
  const picked = await window.linkdesk?.dialog?.open({
    title: t("选择图片…"),
    filters: [{ name: t("图片"), extensions: ["png", "jpg", "jpeg", "webp"] }],
  });
  return picked ?? null;
}

/** 拷贝入库——受控来源（用户任选路径不可 file:// 直读） */
async function importImagePath(pickedPath: string): Promise<string | null> {
  const controlled = await window.linkdesk?.appearance?.importImage(pickedPath);
  return controlled ?? null;
}

/**
 * 状态行执行句柄——壳命令 → 字符串读数（共享 `ReadOnlyText` 的 `runCommand`）。
 * 抛错／非字符串 = null（02 E7 保现值；与共享件契约同款语义）。
 */
async function runStatusCommand(id: string): Promise<string | null> {
  try {
    const r = await window.linkdesk?.commands?.executeCommand?.(id);
    return typeof r === "string" ? r : null;
  } catch {
    return null;
  }
}

/** renderHint "readonly" 的渲染体——值来自 statusCommand 的运行时读数，不来自配置存储 */
export function ReadonlyControl({ prop }: { prop: ConfigProperty }) {
  if (!prop.statusCommand) return <ReadOnlyText value="" />;
  return <ReadOnlyText statusCommand={prop.statusCommand} runCommand={runStatusCommand} />;
}

/** uiHint "image" 的渲染体——共享件能力注入式（onPick / onImport） */
export function ImageControl({
  value,
  onChange,
  t,
}: {
  value: string;
  onChange: (v: unknown) => void;
  t: (key: string) => string;
}) {
  return (
    <BackgroundImagePicker
      value={value}
      onChange={onChange}
      onPick={() => pickImagePath(t)}
      onImport={importImagePath}
    />
  );
}

/**
 * 未知 hint 的只读降级（01 §四 降级契约 · 判据 4）——防裸字符串写穿值域
 * （`app.backgroundImage` 露 `__none__` 那类）。
 *
 * 🔴 判定**就是分发器的结构本身**（uiHint 那一层 switch 走到底 = 本渲染器不认识），
 * 故这里**不重复维护 13 值名单**——名单漂移在此不可能发生。
 * ⛔ 「没声明 uiHint」不在此列：那是大多数键的正常路径，仍按 `type` 渲染（02 E2）。
 */
export function UnknownHintControl({
  prop,
  value,
  t,
}: {
  prop: ConfigProperty;
  value: unknown;
  t: (key: string) => string;
}) {
  const text = String(value ?? "");
  return (
    <span
      data-hint={`${t("此控件类型尚未支持——只读展示当前值，不可编辑：")} ${prop.uiHint}`}
      data-hint-delay="0"
    >
      <ReadOnlyText value={text} multiline={text.includes("\n")} />
    </span>
  );
}
