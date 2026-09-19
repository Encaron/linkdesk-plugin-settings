# 更新日志

## v1.0.15（2026-09-19）

- **换轨到「壳池集中供给」（E6#125 · L9 第 9.4 轮）**：`@linkdesk/ui` 不再编译进本插件 bundle——构建时 external，运行时由壳池供给同一份实例。源码 `import` 一行未改，只把依赖从 `^0.3.0` 换到重锚号 `^0.2.13`（`@linkdesk/ui` 自此与壳同号锁步）＋ `@linkdesk/plugin-sdk` `^0.1.19 → ^0.1.41`，重新构建发布。
- **读数（产物前后对照）**：包 **333,374 → 39,780 字节（−88.1%）**；根 bundle JS **607,777 → 45,114 字节**，CSS **→ 28,384 字节**。产物里组件实现痕迹（`data-overlay-wrapper` / `overlay-root` / `ldk-badge` / `ldk-button` / `ldk-form-row` / `ldk-toggle` / `ldk-colorpicker`）grep **零命中**；只剩 `from "@linkdesk/ui"` 裸 specifier 交给壳解析。
- **本仓自己借用的宿主类名照旧生效**：`className="ldk-input"` 与 `.ldk-slider` / `.ldk-theme-picker` 选择器没动——那些类名的**定义**现在由壳池全局供给（过去靠自带一份），写法不变、结果不变。

## v1.0.14（2026-09-16）

- **适配宿主 E6#109l-b 的共享组件类名归一（`@linkdesk/ui` 0.3.0）**：共享组件余下的 52 个类名一律收进 `ldk-` 前缀——`colorpicker-*` / `ctx-*` / `form-row` / `inline-input*` / `number-input*` / `segmented-radio*` / `sidebar-section*` / `theme-picker*` / `theme-card` / `theme-preview` / `.tbadge` / `.tname` / `.pv-*`，外加关键帧 `selectbox-in → ldk-selectbox-in`。至此**宿主与共享组件自己定义的类名 100% 是 `ldk-` 开头**（258 ＋ 89 个独立定义，零例外），规则只剩一句、不再有任何登记表。
- **本仓的源码改动只有 1 处（2 行）**：主题选择器那两张设置行的版式——`.settings-row:has(.theme-picker)` → **`.settings-row:has(.ldk-theme-picker)`**。不改就是**静默失配**：`.settings-row` 不再 `flex-wrap`、`.settings-row-control` 不再占满整行，主题卡片网格会被挤在半行里，**不报错**。
- **依赖**：`@linkdesk/ui` `^0.2.0 → ^0.3.0`（**必须手动放宽区间**——0.x 的 caret 只在上界之内挑版本，`^0.2.0` 永远够不到 0.3.0）＋ 随包 `@linkdesk/plugin-sdk` `0.1.23 → 0.1.25`。此外无任何逻辑改动。
- **解包复核（真产物——`npm run verify` 与壳仓 `npm run check` 都看不见这一层）**：解开本版的 `settings.linkdesk-plugin` ⇒ `index.bundle.css` **旧名 0 命中 / 新名 44 命中**；两个 `*.bundle.js` **旧名 0 / 新名 39**；`@keyframes ldk-selectbox-in` **定义与引用同在**（零悬空）；`:has(.theme-picker)` 残留 **false**、`:has(.ldk-theme-picker)` **true**。
- `package.json` 的 `version` 顺带对齐到 `1.0.14`（此前停在 1.0.11、与 `plugin.json` 长期不同步——发布链路读的是 `plugin.json`，这次一并抹平）。
- 无功能变化、无视觉变化（名字换了、规则落在同一个元素上）。

## v1.0.13（2026-09-16）

- **补上 v1.0.12 漏掉的一半：随包依赖也升到 `@linkdesk/ui@0.2.1`。** v1.0.12 只改了本插件自己的 6 处渲染点，但**打进包里的 `@linkdesk/ui` 还是 `0.2.0`**——那一版的 `NumberInput` / `FilePathInput` 渲染的仍是 `className="input"` / `"input number-input-field"`（解包 v1.0.12 实测：`index.bundle.js` 与 `views/SettingsView.bundle.js` **各 2 处**）。⇒ **对象编辑器的值输入框（`FilePathInput`）与 `renderControl` 的数字输入框（`NumberInput`）在新壳上仍会丢样式**——底色 / 边框 / 圆角 / 内边距全没，看着像浏览器原生输入框。**它们不在本插件源码里，所以 v1.0.12 的 grep 扫不到。**
- **根因是依赖而不是代码**：`@linkdesk/ui` 是共享组件的 npm 分发（真源在壳仓 `src/components/shared`），`.input → .ldk-input` 那次改名**同时动的是这根轴**（`0.2.0 → 0.2.1`，两版差异经解包比对 = **只有这一个类名**：CSS 一个类令牌 ＋ JS 两处 `className`）。本仓 lock 把 `0.2.0` 钉着，`npm install` 只要满足 `^0.2.0` 区间就**不会动** ⇒ 必须显式 `npm update @linkdesk/ui`。
- 本版 = **升依赖 ＋ 重打一次包**，插件源码零改动（除版本号与 `AGENTS.md` 的版本行）。
- 复核判据（解包真产物，`npm run check` 看不见它）：扫全部 `className` 字面量 ⇒ **裸 `input` 零命中**；`ldk-input` 由 6 处升至 **8 处**（自有 6 ＋ `@linkdesk/ui` 的 2）；CSS 侧裸 `.input` 选择器 2 → **0**、`.ldk-input` 0 → **2**。
- ⚠️ **教训（写给出包的人）**：宿主共享组件改名时，「插件源码 grep 归零」**不等于产物干净**——还要问一句「这个 repo 里有没有别人的 dist 被我打进去了」。

## v1.0.12（2026-09-16）

- **适配宿主 v0.2.0 的输入框工具类改名**：宿主 `src/index.css` 里那个输入框工具类 `.input` 改名为 **`.ldk-input`**（它是全软件最后一个不带前缀的宿主公共名，宿主侧一次把规矩收干净：**软件提供的样式名一律以 `ldk-` 开头**）。本插件 **6 处渲染点**同步改：对象编辑器的键/值输入框 3 处 ＋ `renderControl` 的文字/数字/颜色三处。
- **不改就是静默失配**——输入框**不报错**，只是丢掉宿主给的底色 / 边框 / 圆角 / 内边距，看起来像浏览器原生输入框。
- **同笔摘掉一个空转的类名**：`renderControl` 的 `default` 分支（配置项类型不在开关 / 滑杆 / 色板 / 对象 / 分段里时）原渲染 `<span className="settings-text-muted">`，而这个类名**在本仓与宿主都没有任何 CSS 规则**（宿主只有同名的 `--text-muted` **变量**，不是类）⇒ 它一直是空转、弱化色从未生效——v1.0.11 已把这条记为**改名前就有的老账**。本版按裁决直接摘掉这个 `className`，**视觉零变化**（那段字本来就是普通文字色），也不新增任何规则。
- **新增 `minAppVersion: "0.2.0"`**：新类名只存在于新壳。声明之后，旧壳用户会拿到一句明确的「**需要应用版本 ≥0.2.0**」（市场侧**拒装** ＋ 加载器侧拒载），而不是看到一个没样式的输入框。
- 无功能变化、无视觉变化

## v1.0.11（2026-09-15）

- **本插件 28 个自有 CSS 类名全部带上 `settings-` 前缀**（件 2「插件前缀不变量」）。起因见 v1.0.9：一个视图里同时装着宿主 CSS ＋ 共享组件 CSS ＋ 所有已加载插件的 CSS，**裸类名就是全局标识符**——一方「定义」、他方「渲染」，两条规则落到同一个元素上，不报错、只是长得不对。v1.0.9 修的是共享组件那一侧（`.badge` 撞车），这一版把插件自己这一侧清干净。
- 改名形状是**叠加**（在原名前插入 `settings-`，不改词干）：`object-editor-row` → `settings-object-editor-row`、`keybindings-view` → `settings-keybindings-view`……**逐字节证明 = 原文件 ＋ 只插入前缀**（83 处站点 / 7 个文件，剥掉前缀后与上一版逐字节相同）⇒ 零视觉变化。
- 另有 **2 处只存在于渲染点的类名**一并归位：`keybindings-col-key-cell` → `settings-keybindings-col-key-cell`、`text-muted` → `settings-text-muted`。**审计尺子看不见它们**（它扫的是 CSS 定义点，这两个类在全仓没有任何 CSS 规则），手扫渲染点才抖出来。
  - ⚠️ 顺带发现：`text-muted` 是**死类**——它指望的 `.text-muted` 规则在宿主与共享组件里都不存在（宿主的 `--text-muted` 是 CSS **变量**不是类）。⇒ 配置里遇到未知类型的值（`renderControl` 的 default 分支）渲染出来是普通文字色，不是弱化色。这是**改名前就有的老账**，且修它要动视觉（硬约束 16 的设计 skill 前置），本版只把名字归位、**不改外观**。
- 保留名照旧不碰：`className="input"` 是宿主登记表里的全局工具类，属借用不是自有名；`confirm`/`cancel` 是复合状态类（CSS 里本就是 `.settings-keybindings-inline-btn.confirm`）。
- 无功能变化

## v1.0.10（2026-09-15）

- **适配 `@linkdesk/ui` 0.2.0 的类名归一**：上一版修的 `.badge` 撞车是「**裸类名在宿主 + 共享组件 + 所有已加载插件同一张样式表里是全局标识符**」的一个特例；0.2.0 把共享组件剩下的 8 个裸类名（`badge` / `button` / `combobox` / `mdv` / `selectbox` / `sle` / `slider` / `toggle`）一次性收进 `ldk-` 命名空间，从概率上消掉这一类手滑。本插件对共享滑杆的一处 scoped 调优同步改名：`.settings-slider-control .slider` → `.settings-slider-control .ldk-slider`
- 这一行不改就是**静默失配**——滑杆「占满整行」的那条 flex 规则不再命中，滑杆会缩回组件自身宽度，没有报错
- `@linkdesk/ui` 升到 `^0.2.0`（`^0.1.7` → `^0.2.0`）。**必须手动放宽区间**：0.x 的 caret 只在上界之内挑版本，`^0.1.7` 永远够不到 0.2.0
- 无功能变化

## v1.0.9（2026-09-15）

- **修好「设置 → 主题里，每张卡片的右下角都是一块纯色方块」**：卡片徽标借用了 `@linkdesk/ui` 通用徽标组件的同一个类名（`.badge`），而通用徽标是**实心强调色药丸**（背景 + 圆角 + 内边距）。插件视图会把共享控件的样式与本插件自己的样式打进同一张表 ⇒ 两条 `.badge` 规则同时命中，底色与文字同为强调色，**文字被自己的背景吞掉**——看起来就是「一块纯色」。
- `@linkdesk/ui` 升到 `^0.1.7`（组件侧把卡片徽标类名改为专属的 `.tbadge`，不再占用通用类名）。
- 影响面：**多配色主题包**（暮色森林、薄荷苏打…）的「N 配色」计数、**单配色主题**的配色名——此前全部不可见。

## v1.0.8（2026-09-15）

- **分发件补上 MIT LICENSE**：`LICENSE` 早就在本仓里（E6#108g 那批加的），但**已发布的那版产物比它早** ⇒ 用户手上那份 zip 里一直没有版权声明。MIT 要求「副本里带声明」，而 zip 才是用户真正拿到的那份
- **不再夹带仓库面文件**：`@linkdesk/plugin-sdk` 升到 0.1.19（^0.1.14 → ^0.1.19）——旧 SDK 的打包通道会把 `marketplace.json` / `scripts/ci-verify.mjs` / `AGENTS.md` 这类**仓库面文件**一起装进 zip（那是给仓库看的，不是给用户看的），0.1.19 的排除表已覆盖
- 无功能变化——本版只为让「用户拿到的产物」与仓库对齐

## v1.0.7（2026-09-14）

- **本书是验收版：源码零改动，与 v1.0.6 内容相同**——用于 E6#101「出厂种子保鲜」的端到端验收：
  证明「插件在自己仓发版 → 出厂种子自动跟到最新版 → 新用户下载软件就拿到这一版」这条链路真的通
  （bump → publish → `sync:bundled --latest` → 打包 → 干净 profile 装机读数 = 1.0.7）
- 为什么要用一个真实版本号来验：种子与版本号是**箱子内容唯一可审查的答案**——版本号不动，就无从证明
  「用户装到的是新版」。验收完如果你不想让市场多这一条，删掉本 Release 即可（种子侧一并回退）

## v1.0.6（2026-09-14）

- 源码迁入独立仓（E6#99，L7 第 7.2 轮）——从壳仓 `Encaron/linkdesk` 抽出本插件子树，历史全保（hash 变）
- 随包 `plugin.json` 显式声明 `pluginId`（E6#98g）：插件身份不再靠目录名兜底，独立仓构建出的包名与身份稳定
- `$schema` 改指本仓 `node_modules/@linkdesk/plugin-sdk`（脱离壳仓后原相对路径指到仓外，编辑器补全/校验会失效）


## v1.0.5（2026-09-11）

- 修两处文案键错位（E6#92d）：对象编辑器新增行的键名不再走翻译（原本一旦有人补上译文就会把用户配置的键写坏）；「加载中…」改用正确的省略号字符，不再靠别的插件的字典活着

## v1.0.4（2026-09-11）

- 内部整理（E6#87d 文件整理层）：630 行样式表按现有分节一切三（壳/设置行/对象编辑器）+ SettingRow 拆同名夹四件 + 快捷键页拆三件 + 6 个测试迁 __tests__/——零行为变更，**功能与界面零变化**

## v1.0.2（2026-09-09）

- 图标身份分工（E6#69 三图模型）：icon → resources/icon-bar.svg（Type-1 齿轮剪影，仅图标栏用）；marketIcon → resources/icon.svg（Type-2 彩色身份图）；整幅封面迁入 README
