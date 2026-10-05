/**
 * useFileAssociationsModel——管理器**唯一的数据面**（IO 全在这，视图只渲染）。
 *
 * ## 拉什么、从哪拉
 *
 * | 步骤 | 面 | 说明 |
 * |:--|:--|:--|
 * | ① 插件清单 | `pluginManager.list()` | 只留 `contributes.fileAssociations` 非空的**启用**插件（禁用插件不带 contributes，天然出不来 = E5） |
 * | ② 候选快照 | `fileAssociation.listHandlersFor(ext)` × 声明过的类型 | 「谁是当前默认」的宿主判据（覆盖表 → 声明序 → 角色兜底）；N 个类型 = N 次读，都是内存查表 |
 * | ③ 覆盖表 | `configuration.get/onChange("workbench.fileAssociations")` | 走既有 `useConfigurationValueIpc`（E31 广播免费拿到：文件树选择器写一下，这边即时收到） |
 * | ④ 跨插件探活 | `commands.getCommands()` | E39：宿主命令 `workbench.action.openWith`（`SHELL_COMMANDS.openWith`）在不在册（不在 ⇒ 「打开方式…」整条不出现） |
 *
 * ## 三条时序口径
 *
 * 1. **懒加载、不阻塞首屏**：数据在 `useEffect` 里拉（不是 render 期），设置页先画出来、徽标随后到。
 *    这不只是性能——`SettingsView` 的导航计数徽标要数管理器的 `navCount`，所以**必须由 SettingsView
 *    这一层拥有数据**（管理器视图只在激活该组时挂载，那时再拉就晚了、徽标也永远是 0）。
 * 2. **写后不回填、等广播**（E31 单写者）：`pick()` 只调 `setDefault[Bulk]`，值的更新路径是
 *    「壳写盘 → config:changed → 本 hook 的 onChange」。**但**广播到宿主重算 `isCurrent` 之间隔着
 *    两次 IPC 往返，下拉会被旧值拽回去闪一下 ⇒ 中间用**乐观覆盖**（`pendingRef`）顶上，
 *    等真实表追上（或 2.5s 兜底）再摘掉。
 * 3. **表一变就重拉候选快照**：宿主 `isCurrent` 是覆盖表感知的，表变了它就可能翻转——
 *    不重拉则「当前单击打开：X」与徽标停在旧答案上（选择器那边也一样在等这份重算）。
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { pickIdentityArt } from "@linkdesk/ui";
import { SHELL_COMMANDS } from "@linkdesk/plugin-sdk/shell-commands";
import { lk } from "../SettingsView/helpers";
import { useConfigurationValueIpc } from "../hooks/useConfigurationValueIpc";
import {
  buildManagerModel,
  extractDeclaredExtensions,
  normalizeExtList,
  overrideKeyOf,
  type DeclaredPlugin,
  type HandlerSnapshot,
  type ManagerModel,
} from "./model";
import { writeDefaults } from "./fileAssociationsWrite";
import { WORKBENCH_FILE_ASSOCIATIONS_KEY } from "./managerHint";

/** 本插件自己的通知来源 id——壳通知面板按它分桶（与 `keybindingGearTarget.NOTIFY_SOURCE` 同值：
 *  都是「设置插件」这个生产者；两处各留一份常量是因为两个特性互不 import，值由 plugin.json 的 id 定）。 */
const NOTIFY_SOURCE = "settings";

/** 乐观覆盖的兜底时限——广播丢/写失败时别让界面一直挂着假值（两跳 IPC 正常在 100ms 内回来） */
const PENDING_TTL_MS = 2500;

interface SourceData {
  plugins: DeclaredPlugin[];
  handlersByExt: Record<string, HandlerSnapshot[]>;
  /** E39：文件树选择器命令是否在册 */
  openWithAvailable: boolean;
}

const EMPTY_SOURCE: SourceData = { plugins: [], handlersByExt: {}, openWithAvailable: false };

/** 池侧三个面的守卫——缺面（壳进程/预览/未就绪）时抛出，由调用方兜住成错误态。 */
function api() {
  const lkApi = window.linkdesk;
  if (!lkApi?.pluginManager || !lkApi?.fileAssociation) {
    throw new Error("[file-associations-manager] window.linkdesk.pluginManager/fileAssociation 不可用——preload 未就绪？");
  }
  return { pm: lkApi.pluginManager, fa: lkApi.fileAssociation, commands: lkApi.commands };
}

/** 声明过的全部类型（去重）——② 的批量入参 */
function collectExts(plugins: readonly DeclaredPlugin[]): string[] {
  const set = new Set<string>();
  for (const p of plugins) for (const decl of p.exts) set.add(decl.ext);
  return [...set];
}

/** ② 候选快照：逐类问宿主（内存查表，一类的读不依赖另一类） */
async function fetchHandlers(
  fa: Window["linkdesk"]["fileAssociation"],
  exts: readonly string[],
): Promise<Record<string, HandlerSnapshot[]>> {
  const pairs = await Promise.all(
    exts.map(async (ext) => {
      const list = await fa.listHandlersFor(ext).catch(() => []);
      return [
        ext,
        (list ?? []).map((h) => ({
          pluginId: h.pluginId,
          // C1.8：行主标签 = **插件名**（`title`）、类型名（`displayName`）另存 `typeLabel`——⛔ 不混
          title: h.title,
          typeLabel: h.displayName,
          isCurrent: !!h.isCurrent,
        })),
      ] as const;
    }),
  );
  return Object.fromEntries(pairs);
}

export interface FileAssociationsModelApi {
  model: ManagerModel;
  /** 首次加载中（决定「加载中…」空态） */
  loading: boolean;
  /** 已经成功拉到过一次（此后重拉失败不清屏） */
  ready: boolean;
  /** 拉取失败原因（只读面全挂时给一句话，⛔ 不静默空白） */
  error: string | null;
  openWithAvailable: boolean;
  /**
   * 写入面——`pluginId: null` = 恢复自动。
   * @param label 生效插件显示名（只用于 toast 文案；缺省退化为 pluginId）
   */
  pick(exts: readonly string[], pluginId: string | null, label?: string): void;
}

export function useFileAssociationsModel(search: string, enabled = true): FileAssociationsModelApi {
  const { t } = useTranslation();
  const overrideTable = useConfigurationValueIpc<Record<string, unknown>>(WORKBENCH_FILE_ASSOCIATIONS_KEY);

  const [source, setSource] = useState<SourceData>(EMPTY_SOURCE);
  const [loading, setLoading] = useState(true);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const genRef = useRef(0);
  const pluginsRef = useRef<DeclaredPlugin[]>([]);
  /** 乐观覆盖：键 `.ext` → 目标值（`null` = 恢复自动）。真实表追上即摘。 */
  const pendingRef = useRef(new Map<string, string | null>());
  const bump = useCallback(() => setTick((v) => v + 1), []);

  /** 全量：①＋②＋④（插件装卸、首次进入走它） */
  const load = useCallback(async () => {
    const gen = ++genRef.current;
    setLoading(true);
    try {
      const { pm, fa, commands } = api();
      const [entries, commandsRaw] = await Promise.all([
        pm.list(),
        commands?.getCommands ? commands.getCommands().catch(() => []) : Promise.resolve([]),
      ]);
      if (gen !== genRef.current) return;
      const plugins: DeclaredPlugin[] = [];
      for (const entry of entries ?? []) {
        const exts = extractDeclaredExtensions(entry?.manifest?.contributes);
        if (exts.length === 0) continue;
        const name = entry.manifest?.name || entry.pluginId;
        const version = entry.manifest?.version;
        plugins.push({
          pluginId: entry.pluginId,
          name,
          ...(version ? { version } : {}),
          // 图标裁决照共享件规矩：marketIcon ?? icon → 默认彩色块（管理器不碰图标链）
          manifest: pickIdentityArt(entry.manifest ?? null),
          exts,
        });
      }
      const handlersByExt = await fetchHandlers(fa, collectExts(plugins));
      if (gen !== genRef.current) return;
      pluginsRef.current = plugins;
      setSource({
        plugins,
        handlersByExt,
        openWithAvailable: (commandsRaw ?? []).some((c) => c?.id === SHELL_COMMANDS.openWith),
      });
      setReady(true);
      setError(null);
    } catch (e) {
      if (gen === genRef.current) setError(e instanceof Error ? e.message : String(e));
    } finally {
      if (gen === genRef.current) setLoading(false);
    }
  }, []);

  /** 局部：只重拉 ②（覆盖表变了 ⇒ 宿主 isCurrent 可能已翻转）。⛔ 不 bump 代号，免得作废在途的全量 */
  const refreshHandlers = useCallback(async () => {
    const gen = genRef.current;
    const exts = collectExts(pluginsRef.current);
    if (exts.length === 0) return;
    try {
      const handlersByExt = await fetchHandlers(api().fa, exts);
      if (gen !== genRef.current) return;
      setSource((prev) => ({ ...prev, handlersByExt }));
    } catch {
      /* 只读面局部失败：保留旧快照即可，⛔ 不把整页打成错误态 */
    }
  }, []);

  // 首次进场 + 插件装卸（装卸会改声明面，也可能带来/带走 file-tree）
  // `enabled` = 壳确实声明了管理器挂载位（`SettingsView` 用 `findManagerPluginId` 判）——没这个位
  // 就一次 IPC 也不发（第三方壳无本组时零代价）；位到了才拉（数据仍是懒的，不阻塞设置页首屏）。
  useEffect(() => {
    if (!enabled) return;
    void load();
  }, [load, enabled]);

  useEffect(() => {
    if (!enabled) return;
    let unsub: (() => void) | undefined;
    try {
      unsub = lk().onPluginLifecycleChange(() => {
        void load();
      });
    } catch {
      unsub = undefined; // 配置面不可用（脱窗/预览）——静默，管理器还有初次 load 兜底
    }
    return () => unsub?.();
  }, [load, enabled]);

  // 覆盖表变化（本页写的、文件树选择器写的、手改 settings.json 的）——重算宿主判据
  const lastTableRef = useRef<Record<string, unknown> | undefined>(undefined);
  useEffect(() => {
    if (overrideTable === undefined) return;
    const prev = lastTableRef.current;
    lastTableRef.current = overrideTable;
    if (prev === undefined) return; // 第一次到值 = 基线值，初次 load 已在拉，别重复
    void refreshHandlers();
  }, [overrideTable, refreshHandlers]);

  // 乐观覆盖的对账：真实表追上了就摘（匹配不上则等 TTL 兜底自摘）
  useEffect(() => {
    if (overrideTable === undefined || pendingRef.current.size === 0) return;
    let changed = false;
    for (const [key, want] of [...pendingRef.current]) {
      const cur = overrideTable[key];
      const curVal = typeof cur === "string" && cur ? cur : null;
      if (curVal === want) {
        pendingRef.current.delete(key);
        changed = true;
      }
    }
    if (changed) bump();
  }, [overrideTable, bump]);

  // 合并表 = 真实表 ⊕ 乐观覆盖（交给纯模型算，模型不知道「乐观」这回事）
  const mergedTable = useMemo(() => {
    const base = overrideTable ?? {};
    if (pendingRef.current.size === 0) return base;
    const next: Record<string, unknown> = { ...base };
    for (const [key, want] of pendingRef.current) {
      if (want === null) delete next[key];
      else next[key] = want;
    }
    return next;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- tick 是 pendingRef 的变更信号（ref 变了不触发渲染）
  }, [overrideTable, tick]);

  const model = useMemo(
    () =>
      buildManagerModel({
        plugins: source.plugins,
        handlersByExt: source.handlersByExt,
        overrideTable: mergedTable,
        search,
      }),
    [source, mergedTable, search],
  );

  const notify = useCallback(
    (message: string, type: "info" | "warning" | "error") => {
      void window.linkdesk?.notifications?.show?.(message, { type, source: NOTIFY_SOURCE });
    },
    [],
  );

  const pick = useCallback(
    (exts: readonly string[], pluginId: string | null, label?: string) => {
      const list = normalizeExtList(exts);
      if (list.length === 0) return;
      const keys = list.map(overrideKeyOf).filter(Boolean);
      const name = label || pluginId || "";
      const single = list.length === 1;

      // ① 乐观顶上（下拉不等广播）
      for (const k of keys) pendingRef.current.set(k, pluginId);
      bump();
      // ② TTL 兜底：写失败/广播丢时不留假象
      for (const k of keys) {
        setTimeout(() => {
          if (pendingRef.current.get(k) === pluginId) {
            pendingRef.current.delete(k);
            bump();
          }
        }, PENDING_TTL_MS);
      }
      // ③ 真写（单类走 setDefault、N 类走 setDefaultBulk——后者保证「一次写盘一次广播」，E31/E32；
      //    旧壳无 bulk 口时 `writeDefaults` 内部退化成逐类写，⛔ 不让按钮点了没反应）
      void (async () => {
        try {
          const { fa } = api();
          await writeDefaults(fa, list, pluginId);
          notify(
            pluginId === null
              ? single
                ? t(".{{ext}} 已恢复自动", { ext: list[0] })
                : t("{{count}} 类已恢复自动", { count: list.length })
              : single
                ? t(".{{ext}} 的默认已改为 {{name}}", { ext: list[0], name })
                : t("{{count}} 类的默认已改为 {{name}}（整格）", { count: list.length, name }),
            "info",
          );
        } catch (e) {
          for (const k of keys) pendingRef.current.delete(k);
          bump();
          notify(t("写默认打开方式失败：{{msg}}", { msg: e instanceof Error ? e.message : String(e) }), "error");
        }
      })();
    },
    [bump, notify, t],
  );

  return { model, loading, ready, error, openWithAvailable: source.openWithAvailable, pick };
}
