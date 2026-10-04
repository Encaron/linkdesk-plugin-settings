/**
 * renderControl——根据 property type/uiHint 渲染对应控件（分发器门面）。
 * 自壳迁入（E5.8#41.14）；E6#54c：控件 import 全走 @linkdesk/ui（零 @src/core）。
 * 依赖方向：renderControl → @linkdesk/ui 控件（Toggle/SelectBox/FontFamilySelect/FilePathInput/NumberInput）
 *   + ObjectEditor + types + 同名夹子件；被 SettingRow 消费。
 * E6#87d：四个自定义控件移入同名夹（`renderControl/imagePicker.tsx` / `renderControl/toneControls.tsx`），
 *   stringList 的 locked/editable 前置计算移入 `renderControl/stringList.ts`（纯函数）。
 * 设置行案 2.2（2026-10-04）：分发器拆成「主部件（`renderPrimary`，原逻辑一字未动）＋ 伴生件包裹
 *   （`renderControl`）」——`statusCommand`/`actionCommand` 可与任何主控件共存，渲染
 *   `[主控件][伴生按钮][伴生只读]`（见文件末注释与 01-方案与落点契约 §1.2）。
 */

// E6#54c：共享控件走 @linkdesk/ui（@src/components/shared 双入口已禁——见 eslint 插件块）
import {
  Button, // E5.8#99：实心动作按钮（双轨制实心轨——原 settings-action-btn 收编壳共享）
  DynamicSelect, // E5.8#50.23：动态下拉（optionsFrom 渲染时调 listRecipes）
  FilePathInput,
  FontFamilySelect,
  NumberInput,
  SegmentedRadio, // E5.8#99：分段单选（ghost 双轨制——#91 fontTone/#98 accentSource 收敛共用）
  SelectBox,
  Slider, // E5.8#50.9：滑杆控件
  StringListEditor, // E6#30c：字符串数组编辑器（uiHint "stringList"——marketplaceSources 源列表）
  ThemePicker, // E5.8#50.22：主题配方卡片（数据走 window.linkdesk.theme）
  Toggle,
  inferSliderStep, // E5.8#65：滑杆 step 推导（浮点区间连续可调）
  urlSourceKey, // E6#30c：URL 源身份（owner/repo、分支无关）——stringList 的 itemKey（判重规则见 renderControl/stringList.ts）
} from "@linkdesk/ui";
import ObjectEditor from "./ObjectEditor";
import { enumDescriptionAt } from "./enumDescription";
import { mapSegmentedOptions } from "./mapSegmentedOptions"; // E5.8#99：分段单选选项映射（通用 segmented + fontTone/accentSource 预览覆盖共用）
import type { ConfigProperty } from "./types";
// 本案 5.1（02 E1 双轨）：只读行／背景图／未知 hint 降级全走适配层——共享件在就收编、不在退本地件
import { ImageControl, ReadonlyControl, UnknownHintControl } from "./renderControl/sharedAdapters";
import { AccentSourceControl, FontToneControl } from "./renderControl/toneControls";
import { splitStringList } from "./renderControl/stringList";

/** 主部件渲染（原分发逻辑，一字未动）——根据 property type/uiHint 渲染对应控件。
 *  伴生件（statusCommand/actionCommand）由下方 `renderControl` 包裹追加（设置行案 2.2）。 */
function renderPrimary(
  prop: ConfigProperty,
  value: unknown,
  onChange: (v: unknown) => void,
  t: (key: string) => string,
  onColorSwatchClick?: (e: React.MouseEvent<HTMLDivElement>) => void,
  actionDisabled?: boolean,
  /** 设置行案 2.2（E1 互斥显示）：true = 本行改显行尾生效徽标 ⇒ 主控件不渲染自带值标签 */
  suppressValueLabel?: boolean,
): React.ReactNode {
  const val = value ?? prop.default;

  // M4 AI#38.12（P-2 拍板 A）：renderHint "readonly"——只读状态行（值来自 statusCommand
  // 运行时数据源，不来自配置存储；与 type 无关放最前——状态行不参与编辑任何形态）。
  // 本案 5.1：渲染体进适配层（共享件轮询模式 ↔ 本地件双轨，见 sharedAdapters.tsx）。
  if (prop.renderHint === "readonly") {
    return <ReadonlyControl prop={prop} />;
  }

  // uiHint 优先——plugin.json 声明式控件选择
  switch (prop.uiHint) {
    case "fontSize": // E5.8 Phase 12 #161：min/max/step/unit 从 schema 读——editor.fontSize 不声明 → 8/72/1/无单位（零回归）；app.uiFontScale 声明 85/150/5/％
      return (
        <NumberInput
          value={Number(val)}
          onChange={(v) => onChange(v)}
          min={prop.minimum ?? 8}
          max={prop.maximum ?? 72}
          step={prop.step ?? 1}
          unit={prop.unit}
        />
      );
    case "color":
      return (
        <div className="settings-color-control">
          <div
            className="settings-color-swatch"
            style={{ background: String(val) }}
            data-hint={String(val)} data-hint-delay="0"
            onClick={onColorSwatchClick}
          />
          <input
            className="ldk-input"
            type="text"
            value={String(val)}
            onChange={(e) => onChange(e.target.value)}
          />
        </div>
      );
    case "fontFamily":
      // E5.8#50.20：monoOnly 从 property 声明读（缺省 = 等宽编辑器字体；app.fontFamily monoOnly:false = 全字族）
      return <FontFamilySelect value={String(val)} onChange={(v) => onChange(v)} monoOnly={prop.monoOnly} />;
    case "file":
      return <FilePathInput value={String(val)} onChange={(v) => onChange(v)} dialogType="file" />;
    case "directory":
      return <FilePathInput value={String(val)} onChange={(v) => onChange(v)} dialogType="directory" />;
    case "image": // E5.8#50.11：背景图——选图拷贝入库 + 清除（受控来源）；本案 5.1：适配层双轨
      return <ImageControl value={String(val)} onChange={onChange} t={t} />;
    case "segmented": // E5.8#99 通用化：第三方声明 uiHint:"segmented" + enum + enumDescriptions 即得分段单选（ghost 轨，零预览）
      return (
        <SegmentedRadio
          value={String(val)}
          ariaLabel={prop.description ? t(prop.description) : undefined}
          options={mapSegmentedOptions(prop, t)}
          onChange={(v) => onChange(v)}
        />
      );
    case "fontTone": // E5.8#91+#99：文字极性三态分段（跟随主题/亮字/暗字）——Aa 每态预览（预览覆盖，选项映射走 mapSegmentedOptions）
      return (
        <FontToneControl
          value={String(val)}
          options={mapSegmentedOptions(prop, t)}
          onChange={(v) => onChange(v)}
          t={t}
        />
      );
    case "accentSource": // E5.8#98+#99：强调色来源分段（跟随主题配方/自定义）——色块段内预览（预览覆盖，选项映射走 mapSegmentedOptions）
      return (
        <AccentSourceControl
          value={String(val)}
          options={mapSegmentedOptions(prop, t)}
          onChange={(v) => onChange(v)}
          t={t}
        />
      );
    case "slider": { // E5.8#50.9：滑杆（#50.10 玻璃五配置消费）——E5.8#65：step 推导（浮点区间 0.01，schema 可显式 step 覆盖）
      const sliderMin = prop.minimum ?? 0;
      const sliderMax = prop.maximum ?? 100;
      // 滑杆件能力扩展（2026-10-03）：值标签与 −/＋ 细调已下沉进 Slider 组件本体——本仓只把
      // 配置键上的声明原样直传（D3：传递者零知识，⛔ 不判键名、不自绘标签）。
      // 🔴 unit ?? "" 不可省（E3）：空串 = 有标签无单位（无单位键今天显示裸数值 0.5），
      //    写成 unit={prop.unit} 会让未声明 unit 的键整批丢标签。
      // 🔴 声明面时序（E2）：本分支传 unit/stepper 的前提 = @linkdesk/ui ≥ 0.2.36（老组件不认）。
      return (
        <Slider
          value={Number(val)}
          onChange={(v) => onChange(v)}
          min={sliderMin}
          max={sliderMax}
          step={prop.step ?? inferSliderStep(sliderMin, sliderMax)}
          // E1（设置行案 2.2）：跟随主题态（键声明 effectiveToken ⇒ SettingRow 传 suppressValueLabel 真）
          //   不传 unit ⇒ Slider 既有语义「unit === undefined ⇒ 不渲染值标签」⇒ 让位给行尾生效徽标；
          //   自定义态照常显值标签、不显徽标 ⇒ 永不同屏。⛔ 上面 E3 的 `?? ""` 不可省——只有本条命中才走 undefined。
          //   （fontSize 的 unit 是 NumberInput 件内后缀，语义不同，不在本规则内——真出现重复读数再按同一判据扩。）
          unit={suppressValueLabel ? undefined : (prop.unit ?? "")}
          unitPosition={prop.unitPosition ?? "after"}
          stepper={prop.stepper}
        />
      );
    }
    case "themePicker": // E5.8#50.22：主题配方卡片——value=app.theme，点卡片 onChange(recipeId)（onApply 应用配方）
      return <ThemePicker value={String(val)} onChange={(v) => onChange(v)} />;
    case "select": // E5.8#50.23：动态下拉——optionsFrom 渲染时调 listRecipes 动态取（colorways 配色变体 / sources 混搭来源）
      return (
        <DynamicSelect
          value={String(val)}
          onChange={(v) => onChange(v)}
          optionsFrom={prop.optionsFrom ?? ""}
          domain={prop.optionsFromDomain}
        />
      );
    case "stringList": {
      // E6#30c：锁定行/作者行的切分（身份规则见 renderControl/stringList.ts 头注）。存盘只写作者源数组
      //（onChange 收 StringListEditor 的 value = 已滤 locked 的剩余）。文案走 t()，对任何该 uiHint 配置通用。
      const { locked, editable } = splitStringList(prop, value);
      return (
        <StringListEditor
          value={editable}
          onChange={(next) => onChange(next)}
          locked={locked}
          lockedBadge={t("内置")}
          addLabel={t("添加")}
          removeTitle={t("删除")}
          urlOnly
          itemKey={urlSourceKey}
          placeholder={t("粘贴 URL…")}
          emptyMessage={t("请输入 URL。")}
          badUrlMessage={t("URL 格式不对——以 http(s):// 开头。")}
          duplicateMessage={t("这个 URL 已经在列表里了。")}
        />
      );
    }
    default:
      // 本案 5.1（01 §四 降级契约 · 判据 4）：**声明了** uiHint 但本渲染器不认识 ⇒ 只读展示＋说明，
      // 不再落进可编辑文本框（防裸字符串写穿值域——app.backgroundImage 露 __none__ 那类）。
      // ⛔ 「没声明 uiHint」不走这里：它落到下面的 type switch，是大多数键的正常路径（02 E2）。
      if (prop.uiHint) return <UnknownHintControl prop={prop} value={val} t={t} />;
      break;
  }

  switch (prop.type) {
    case "boolean":
      return (
        <Toggle
          checked={!!val}
          onChange={(v) => onChange(v)}
        />
      );

    case "string":
      // renderHint "action"：渲染操作按钮。
      // E5.8#50.26：onApply 是函数——IPC 序列化剥除（configuration.ts 剥离）——插件侧不可达，
      // 点击改走 actionCommand 执行壳命令（混搭复位 → theme.resetMix 单一写入点触发壳侧 onApply 链）；
      // actionDisabled = actionDisabledAll 全命中当前配置值 → 置灰（mockup 01 updateMixReset）。
      if (prop.renderHint === "action") {
        return <ActionButton prop={prop} t={t} actionDisabled={actionDisabled} />;
      }
      if (prop.enum && prop.enum.length > 0) {
        const enumOptions = prop.enum.map((v, i) => {
          // 显示名两种声明形态都吃（对象 = 插件 manifest schema 形态 / 数组 = 壳侧形态）——
          // 旧写法按下标直读 ⇒ 插件侧的对象形态恒取不到，下拉裸显英文值（见 enumDescription.ts 头注）
          const label = enumDescriptionAt(prop.enumDescriptions, v, i);
          return { value: v, label: label ? t(label) : t(v) };
        });
        return (
          <SelectBox
            value={String(val)}
            options={enumOptions}
            onChange={(v) => onChange(v)}
          />
        );
      }
      // renderHint "color" → 色块预览
      if (prop.renderHint === "color") {
        return (
          <div className="settings-color-control">
            <div
              className="settings-color-swatch"
              style={{ background: String(val) }}
              data-hint={String(val)} data-hint-delay="0"
              onClick={onColorSwatchClick}
            />
            <input
              className="ldk-input"
              type="text"
              value={String(val)}
              onChange={(e) => onChange(e.target.value)}
            />
          </div>
        );
      }
      return (
        <input
          className="ldk-input"
          type="text"
          value={String(val)}
          onChange={(e) => onChange(e.target.value)}
        />
      );

    case "number":
      return (
        <NumberInput
          value={Number(val)}
          onChange={(v) => onChange(v)}
          min={prop.minimum}
          max={prop.maximum}
        />
      );

    case "object": {
      const obj = (typeof val === "object" && val !== null && !Array.isArray(val))
        ? (val as Record<string, unknown>)
        : {};
      return <ObjectEditor value={obj} onChange={(newObj) => onChange(newObj)} />;
    }

    case "array": {
      const arr = Array.isArray(val) ? val : [];
      const obj: Record<string, unknown> = {};
      arr.forEach((item, i) => { obj[String(i)] = item; });
      return (
        <ObjectEditor
          value={obj}
          onChange={(newObj) => {
            const newArr = Object.values(newObj);
            onChange(newArr);
          }}
        />
      );
    }

    default:
      // E6#109k-a①（1.18 裁决，搭 1.17 的车落地）：原 className="settings-text-muted" 已摘——
      //   该名字全仓零 CSS 规则（宿主只有同名的 --text-muted 变量），一直是空转；摘掉后视觉零变化。
      return <span>{String(val)}</span>;
  }
}

/* ══════════════════════════════════════════════════════════════════════════
   设置行案 2.2（2026-10-04 · 伴生声明正交化）——`[主控件][伴生按钮][伴生只读]`
   `statusCommand` / `actionCommand` 升为可与**任何**主控件共存的伴生声明；`renderHint:"readonly"/"action"`
   退化为「主控件就是它」的简写。契约与判据 = docs/04-软件更新/待抉择池/设置行-控制只读同行/01-方案与落点契约.md §1.2。
   ⛔ 本仓仍**键名零知识**：只认声明字段，不认任何一个具体键。
   ══════════════════════════════════════════════════════════════════════════ */

/** 动作按钮——主部件形态（`renderHint:"action"`）与伴生形态**共用同一段**（避免两处漂）。
 *  文案 = `t(description)`（action 行只有这一个字符串可承载文案，先例 `ai.mcp.openDetails`）；
 *  onApply 被 IPC 剥除插件不可达 ⇒ 点击走 `actionCommand` 执行壳命令；置灰 = `actionDisabledAll` 全命中。 */
function ActionButton({ prop, t, actionDisabled }: { prop: ConfigProperty; t: (key: string) => string; actionDisabled?: boolean }) {
  return (
    <Button
      disabled={actionDisabled}
      onClick={() => { void window.linkdesk?.commands?.executeCommand?.(prop.actionCommand ?? ""); }}
    >
      {t(prop.description ?? "")}
    </Button>
  );
}

/** 主部件**就是**按钮？——判据 = 分发器的结构本身（`renderPrimary` 里 action 分支只在
 *  「`renderHint:"action"` ∧ 无 uiHint 命中 ∧ `type:"string"`」时渲染按钮）⇒ 命中则不再追加伴生按钮，
 *  ⛔ 避免同一动作画两遍。 */
function isActionPrimary(prop: ConfigProperty): boolean {
  return prop.renderHint === "action" && !prop.uiHint && prop.type === "string";
}

/** 主部件**就是**只读状态行？——readonly 分支在 `renderPrimary` 最前（状态行不参与编辑任何形态）。 */
function isReadonlyPrimary(prop: ConfigProperty): boolean {
  return prop.renderHint === "readonly";
}

/** 渲染主控件 ＋ 伴生件（顺序 `[主控件][伴生按钮][伴生只读]`；行尾生效徽标由 SettingRow 追加在其后）。
 *  ⚠️ 绝大多数键两个伴生字段都不声明 ⇒ **直接返回主控件，与改造前逐字一致（零回归）**。 */
function renderControl(
  prop: ConfigProperty,
  value: unknown,
  onChange: (v: unknown) => void,
  t: (key: string) => string,
  onColorSwatchClick?: (e: React.MouseEvent<HTMLDivElement>) => void,
  actionDisabled?: boolean,
  suppressValueLabel?: boolean,
): React.ReactNode {
  const primary = renderPrimary(prop, value, onChange, t, onColorSwatchClick, actionDisabled, suppressValueLabel);
  if (!prop.actionCommand && !prop.statusCommand) return primary;

  return (
    <>
      {primary}
      {/* 伴生按钮——主控件右侧；与主部件形态同源（ActionButton）。外层 span = 同排间隙＋宽度上限钩子 */}
      {prop.actionCommand && !isActionPrimary(prop) && (
        <span className="settings-row-companion">
          <ActionButton prop={prop} t={t} actionDisabled={actionDisabled} />
        </span>
      )}
      {/* 伴生只读——复用只读底座（共享 `ReadOnlyText` 轮询 ↔ 本地 `ReadOnlyStatus` 双轨，见 sharedAdapters）；
          **不带标题**（它是读数不是键）；⛔ 不造第二套轮询。⚠️ 底座是 `overflow:hidden ＋ text-overflow:ellipsis`
          且**不设 title** ⇒ 超宽读数被静默截断（2.2b 实测：272px 的绝对路径在 230px 上限处截断）；
          本格不改底座（加 title 属共享件改动，且有在飞的 `@linkdesk/ui` 列车）。 */}
      {prop.statusCommand && !isReadonlyPrimary(prop) && (
        <span className="settings-row-companion">
          <ReadonlyControl prop={prop} />
        </span>
      )}
    </>
  );
}

export default renderControl;
