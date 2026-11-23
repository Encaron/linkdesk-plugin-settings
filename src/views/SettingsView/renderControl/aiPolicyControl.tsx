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
import { AiPolicyPicker, type AiPolicyOption, type AiPolicyValue } from "@linkdesk/ui";
import { ReadonlyControl } from "./sharedAdapters";
import type { ConfigProperty } from "../types";

interface AiPolicyState {
  mode: AiPolicyValue;
  /** getState 的 options 比共享件类型多一个 `description`（当前档的一句人话） */
  options: Array<AiPolicyOption & { description?: string }>;
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

  if (state === undefined) {
    // 首帧：不闪只读行，也不画空选择器——留空位（0 高度由行样式承担）
    return null;
  }
  if (state === null) {
    return <ReadonlyControl prop={prop} />;
  }

  const current = state.options.find((o) => o.value === state.mode);
  return (
    <AiPolicyPicker
      value={state.mode}
      options={state.options}
      description={current?.description}
      note={
        state.mode === "full"
          ? t(
              "AI 现在可以执行所有操作，不会再询问。这个设置会一直有效，直到你在上面对应位置改回来。",
            )
          : undefined
      }
      onReset={() => {
        void runCommand("aiPolicy.setMode", undefined, "auto").then(reload);
      }}
      resetLabel={t("改成自主")}
      ariaLabel={t("AI 权限档位")}
      onChange={(mode) => {
        // 写点唯一 = 壳命令（userOnly：界面点击 = 用户授权；⛔ 插件不写配置键）
        void runCommand("aiPolicy.setMode", undefined, mode).then(reload);
      }}
    />
  );
}
