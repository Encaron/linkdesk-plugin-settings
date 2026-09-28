/**
 * 只读状态行控件（M4 AI#38.12 · P-2 拍板 A）——renderHint "readonly" 的渲染体。
 *
 * 🔴 值来自**运行时数据源**（`statusCommand` 指向的壳命令），**不来自配置存储**——
 * 状态行回答「现在怎么样」，不是「用户选了什么」。命令缺省 / 抛错 = 静默空（不猜值，
 * 空值由 ReadOnlyText 不占位）——⛔ 别把 default 值当状态显示（那是写死字符串的假绿）。
 *
 * 刷新：挂载时取一次 + 每 3 秒轮询（状态是低频量：通道开关重启后生效、端口实况——
 * 3s 足够跟手；卸载清定时器 + alive 守卫，StrictMode 双挂载安全）。
 * 通用能力：任何插件声明 `renderHint: "readonly"` + `statusCommand` 即得同款（无 AI 特权）。
 */
import { useEffect, useState } from "react";
import { ReadOnlyText } from "@linkdesk/ui";
import type { ConfigProperty } from "../types";

export default function ReadOnlyStatus({ prop }: { prop: ConfigProperty }) {
  const [value, setValue] = useState("");

  useEffect(() => {
    let alive = true;
    const run = async () => {
      if (!prop.statusCommand) return;
      try {
        const r = await window.linkdesk?.commands?.executeCommand?.(prop.statusCommand);
        if (alive && typeof r === "string") setValue(r);
      } catch {
        // 命令不在 / 执行失败 = 保持现状（首次为空）——不猜、不写死
      }
    };
    void run();
    const timer = setInterval(run, 3000);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, [prop.statusCommand]);

  return <ReadOnlyText value={value} multiline={value.includes("\n")} />;
}
