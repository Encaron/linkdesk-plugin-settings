/**
 * 共享件适配层（本案 5.1 · 02 E1 双轨）——「有共享件用共享件、没有退回本地件」的选择**只在这一层**。
 *
 * 三个接线件都保持**现有语义逐格不变**（12 E12：选图→入库→受控路径三态；只读行挂载即取＋轮询＋抛错保现值）：
 *   · `ReadonlyControl`——renderHint "readonly"：共享件在 ⇒ 共享 `ReadOnlyText` 的轮询模式
 *     （`statusCommand` ＋ 宿主命令句柄）；不在 ⇒ 本地 `ReadOnlyStatus`（现装壳上的实际路径）。
 *   · `ImageControl`——uiHint "image"：共享件在 ⇒ 共享 `BackgroundImagePicker`（对话框/入库经
 *     props 注入，共享件里零 `window.linkdesk`）；不在 ⇒ 本地件。
 *   · `UnknownHintControl`——01 §四 降级契约：未知 hint 只读展示当前值＋说明。
 *
 * ⛔ 5.3（壳发版后）删本地件与这里的双轨分支，本层随之塌成直接渲染共享件。
 */
import { ReadOnlyText } from "@linkdesk/ui";
import type { ConfigProperty } from "../types";
import {
  HAS_POLLING_READONLY,
  SHARED_IMAGE_PICKER,
  runStatusCommand,
} from "../sharedUi";
import ReadOnlyStatus from "./readonlyStatus";
import { BackgroundImagePicker } from "./imagePicker";

/** 选图对话框——标题/过滤器与本地件逐字一致（E12：语义不变） */
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

/** renderHint "readonly" 的渲染体（共享件轮询模式 ↔ 本地件双轨） */
export function ReadonlyControl({ prop }: { prop: ConfigProperty }) {
  if (HAS_POLLING_READONLY && prop.statusCommand) {
    return <ReadOnlyText statusCommand={prop.statusCommand} runCommand={runStatusCommand} />;
  }
  return <ReadOnlyStatus prop={prop} />;
}

/** uiHint "image" 的渲染体（共享件能力注入 ↔ 本地件双轨） */
export function ImageControl({
  value,
  onChange,
  t,
}: {
  value: string;
  onChange: (v: unknown) => void;
  t: (key: string) => string;
}) {
  const Shared = SHARED_IMAGE_PICKER;
  if (Shared) {
    return (
      <Shared
        value={value}
        onChange={onChange}
        onPick={() => pickImagePath(t)}
        onImport={importImagePath}
      />
    );
  }
  return <BackgroundImagePicker value={value} onChange={onChange} t={t} />;
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
