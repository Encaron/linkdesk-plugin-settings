/**
 * SettingsView 类型层——自壳迁入（E5.8#41.14）。
 * 纯类型零逻辑。依赖方向：无（被聚合器 / useSettingsEvents / renderControl / SettingRow 消费）。
 */

interface SettingsViewProps {
  isActive: boolean;
  /** 所在标签页 id（E5.8#41.13 全插件侧换套）——由 PluginComponent 注入；浮动面板无标签页时为 undefined */
  tabId?: string;
}

interface GroupInfo {
  pluginId: string;
  title: string;
  /** M4 AI#38.12（P-3 拍板 A）：分区大标题下的一行副标题（contribution 级可选字段；未声明 = 不渲染） */
  subtitle?: string;
  /** M4 AI#38.12（P-3 拍板 A）：各分节（group）标题下的一行小字——键 = group 原文（可选，零侵入） */
  groupDescriptions?: Record<string, string>;
  keys: string[];
  /** 角色分组（#41.14 ⑤）——本组是 factoryRole 角色切换组：切换按钮在顶、激活套配置在下。未设置 = 普通配置分组 */
  role?: string;
  /** 角色候选 [{pluginId, title}]——切换按钮遍历渲染 */
  candidates?: { pluginId: string; title: string }[];
  /** 当前激活候选 pluginId——激活视觉标记 */
  activeId?: string;
}

/** ConfigurationProperty 精简版——IPC 序列化后使用的本地类型 */
interface ConfigProperty {
  type?: string;
  /** 配置项短名（行级人话名）——设置页行名取它，缺省回退显配置键（配置项短名案 T2）；
   *  取值口径与 description 同源：声明里的中文原文即 i18n key，英文界面走本仓 i18n/en.json 译名。 */
  title?: string;
  description?: string;
  default?: unknown;
  enum?: string[];
  /** 枚举档显示名——**两种形态都合法**：对象（插件 manifest 的 schema 规定形态，`值 → 显示名`）
   *  或数组（壳侧声明与动态推送的下标对应形态）；取字统一走 `enumDescription.ts`（⛔ 别按下标直读）。 */
  enumDescriptions?: string[] | Record<string, string>;
  minimum?: number;
  maximum?: number;
  /** E5.8#65：滑杆步进——uiHint "slider" 时第三方显式声明；缺省由 renderControl 按区间推导（浮点区间 0.01） */
  step?: number;
  uiHint?: string;
  renderHint?: string;
  /** E5.8#50.20：等宽限定——uiHint "fontFamily" 时 monoOnly=false = 全字族（UI 字体） */
  monoOnly?: boolean;
  dependsOn?: { key: string; value: unknown };
  onApply?: ((v: unknown) => void) | null; // E4V#46 renderHint "action"（IPC 剥除——插件不可达，按钮走 actionCommand）
  /** E5.8#50.23：动态下拉数据源——uiHint "select" 时读取（"theme.colorways" / "theme.sources"） */
  optionsFrom?: string;
  /** 混搭来源域过滤——optionsFrom "theme.sources" 时按此域过滤（RecipeMeta.domains 六域之一） */
  optionsFromDomain?: string;
  /** E5.8#50.26：renderHint "action" 按钮动作——点击执行此壳命令（混搭复位 → theme.resetMix） */
  actionCommand?: string;
  /** E5.8#50.26：renderHint "action" 按钮禁用条件——全部 {key,value} 匹配当前配置值时禁用（混搭复位置灰） */
  actionDisabledAll?: Array<{ key: string; value: unknown }>;
  /** E5.8#78：组内二级标题——无 group 保持平铺（第三方配置零侵入） */
  group?: string;
  /** M4 AI#38.12（P-2 拍板 A）：renderHint "readonly" 只读状态的运行时数据源——渲染时执行此
   *  壳命令取值（返回 string；显示话术由命令侧拼装）。值来自命令、不来自配置存储——通用能力。 */
  statusCommand?: string;
  /** E5.8#77：数值单位——uiHint "slider" 值标签单位（"×" / "px"；空 = 裸数值） */
  unit?: string;
  /** 滑杆件能力扩展（2026-10-03）：值标签方位——消费侧类型同步（声明从宿主 schema 流下，
   *  本仓只直传；缺省 after，above/below 只留插件自绘场景） */
  unitPosition?: "before" | "after" | "above" | "below";
  /** 滑杆件能力扩展（2026-10-03）：细调步进——uiHint "slider" 轨道两侧 −/＋ 常驻按钮；
   *  能力在 Slider 组件本体（@linkdesk/ui ≥ 0.2.36），本仓只直传 */
  stepper?: boolean;
  /** E5.8#87：来源徽标——本键所属外观域 mix 来源 key（混搭生效时徽标显示 🔀 域来源） */
  sourceKey?: string;
  /** E5.8#155：跟随主题生效值徽标——本键跟随主题时行尾显示的生效 token key（零侵入可选字段） */
  effectiveToken?: string;
  /** E5.8 用户审计 #3：跟随主题语义——壳 appearance 键声明；本键 user scope 删除后回落主题基线。
   *  SettingRow 读本字段 → 齿轮菜单「跟随主题」项可用（context key settingFollowTheme）。
   *  通用设置插件零外观知识——第三方设置/主题插件在自己的键上声明即获得同能力。 */
  resetsToTheme?: boolean;
  /** E5.8#158：默认项语义——本键有独立「默认项」落点（= 内置 dark/light 配方值 = __none__ 哨兵）。
   *  SettingRow 读本字段 → 齿轮「重置此设置」对四键改写成 __none__（真默认，不跟随主题），
   *  context key settingResetsToDefault。玻璃/圆角等无独立默认项键不声明（只显跟随主题）。 */
  resetsToDefault?: boolean;
}

export type { SettingsViewProps, GroupInfo, ConfigProperty };
