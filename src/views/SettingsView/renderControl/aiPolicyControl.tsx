/**
 * AiPolicyControl —— `uiHint:"aiPolicy"` 的渲染体（2026-11-24 · 线 1 的 AI 权限档位接线）。
 *
 * 判据（语义归属）：**档位词表、风险摘要、受保护命令全在壳**；本插件只把 `aiPolicy.getState`
 * 的结构化读数喂给共享件 `AiPolicyPicker`，写档位只调壳命令 `aiPolicy.setMode`（userOnly——
 * 插件界面调用 = 用户点击；外部 AI 经 exec 调会被壳拒）。
 *
 * ⛔ 本文件不出现任何档位字面量（"auto"/"full"…）、不读 settings.json、不自己判风险。
 * 只做「取数 → 渲染 → 回写」三件事；读不到（老壳/命令未注册）⇒ 回落既有只读行，不崩。
 */

import { useCallback, useEffect, useState } from "react";
import { AiPolicyPicker, type AiPolicyCapability, type AiPolicyOption, type AiPolicyPickerProps } from "@linkdesk/ui";

/** 档位 id 从共享件 props 推导（⛔ 插件里不写 read/ask/auto/full 字面量） */
type AiPolicyValue = AiPolicyPickerProps["value"];
import { ReadonlyControl } from "./sharedAdapters";
import type { ConfigProperty } from "../types";

interface AiPolicyState {
  mode: AiPolicyValue;
  /** 选项的 label/description 都是 i18n key（共享件用 translate 翻译；⛔ 壳不回终稿文字） */
  options: AiPolicyOption[];
  /** 档位下方的能力摘要（label 是 key，decision 来自壳） */
  capabilities?: AiPolicyCapability[];
}

function isState(v: unknown): v is AiPolicyState {
  if (!v || typeof v !== "object") return false;
  const o = v as { mode?: unknown; options?: unknown };
  return typeof o.mode === "string" && Array.isArray(o.options);
}

/** 壳命令读数——插件只拿结构化结果（⛔ 不猜形状、不写 fallback 文案） */
async function runCommand<T>(id: string, ...args: unknown[]): Promise<T | null> {
  try {
    const r = await window.linkdesk?.commands?.executeCommand?.(id, ...args);
    return (r as T) ?? null;
  } catch {
    return null;
  }
}

export function AiPolicyControl({
  prop,
  t,
}: {
  prop: ConfigProperty;
  t: (key: string) => string;
}) {
  /** undefined = 读取中；null = 不可用（老壳/命令未注册） */
  const [state, setState] = useState<AiPolicyState | null | undefined>(undefined);

  const reload = useCallback(() => {
    void runCommand<unknown>("aiPolicy.getState").then((raw) => setState(isState(raw) ? raw : null));
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  // 外部改档（状态栏 toast 的「恢复默认」等）也要刷新这一行——订阅壳的读面事件，⛔ 不读配置文件
  useEffect(() => {
    const off = window.linkdesk?.aiPolicy?.onChange?.(() => reload());
    return () => off?.();
  }, [reload]);

  if (state === undefined) {
    // 首帧：不闪只读行，也不画空选择器——留空位（0 高度由行样式承担）
    return null;
  }
  if (state === null) {
    return <ReadonlyControl prop={prop} />;
  }

  return (
    <AiPolicyPicker
      value={state.mode}
      options={state.options}
      capabilities={state.capabilities}
      // 文案 key → 当前语言（useTranslation 的 t 随语言切换更新 ⇒ 组件随之重绘）
      translate={t}
      note={state.mode === "full" ? "完全访问已开启。所有操作不再询问。" : undefined}
      onReset={() => {
        void runCommand("aiPolicy.setMode", undefined, "auto").then(reload);
      }}
      resetLabel={"恢复默认（自主）"}
      ariaLabel={"AI 权限档位"}
      onChange={(mode) => {
        // 写点唯一 = 壳命令（userOnly：界面点击 = 用户授权；⛔ 插件不写配置键）
        void runCommand("aiPolicy.setMode", undefined, mode).then(reload);
      }}
    />
  );
}
