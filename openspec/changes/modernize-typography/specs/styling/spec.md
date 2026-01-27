## MODIFIED Requirements
### Requirement: 基础字体和排版样式
网站 SHALL 使用现代化字体大小和行高配置，提升中文阅读体验。

**当前状态**：基础字体大小约为14-15px，行高1.0-1.4，字体栈为 'PT Mono','Noto Sans SC', 'Noto Serif SC' 等

**更新后要求**：
- 基础字体大小：桌面端 16px，移动端 18px
- 正文行高：1.7（中文优化）
- 标题行高：1.3-1.4
- 字体栈：优先使用系统UI字体，格式为 -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans CJK SC", sans-serif
- 段落间距：1.25em → 1.5em

#### Scenario: 桌面端阅读体验
- **GIVEN** 用户在桌面端访问博客
- **WHEN** 查看文章正文内容
- **THEN** 字体大小为16px，行高1.7，段落间距适中，阅读舒适

#### Scenario: 移动端阅读体验
- **GIVEN** 用户在手机端访问博客
- **WHEN** 查看文章正文内容
- **THEN** 字体大小为18px，行高1.7，适应触摸阅读

### Requirement: 代码块样式现代化
技术内容中的代码块 SHALL 使用现代化样式，提升开发者阅读体验。

**当前状态**：代码块使用基础样式，内边距0.8em，字体大小0.72em（移动）到0.9em（桌面）

**更新后要求**：
- 内边距：增加到24px
- 字体大小：保持等宽字体，桌面端0.95em，移动端1.0em
- 圆角：6px → 8px
- 背景：更现代化的配色方案
- 边框：保留但颜色更柔和
- 阴影：添加subtle阴影效果

#### Scenario: 代码块可读性
- **GIVEN** 文章包含Java代码块
- **WHEN** 用户阅读代码内容
- **THEN** 代码块有充足的内边距，字体清晰易读，视觉层次分明

### Requirement: 标题层级优化
所有标题（H1-H6） SHALL 使用优化的字体大小和行高，符合现代网站特征。

**当前状态**：H1为2.125em，H2为1.6875em，H3为1.375em

**更新后要求**：
- H1：2.5em → 2.75em（更大更突出）
- H2：2.0em → 2.25em
- H3：1.5em → 1.75em
- H4及以下：相应调整，保持层级关系
- 行高：1.2 → 1.3（更紧凑但清晰）
- 字重：保持或略增（700 vs 600）

#### Scenario: 标题层级清晰度
- **GIVEN** 文章包含多级标题
- **WHEN** 用户浏览文章结构
- **THEN** 标题层级清晰，视觉区分明显，易于快速扫描

### Requirement: 响应式设计增强
网站 SHALL 在移动端、平板、桌面端都有良好的排版效果。

**当前状态**：使用Bootstrap 5.1.3响应式网格，但字体未针对移动端优化

**更新后要求**：
- 移动端（<768px）：基础字体18px，代码块更大，间距增加
- 平板端（768px-1024px）：基础字体17px，平衡的间距
- 桌面端（>1024px）：基础字体16px，标准间距
- 触摸友好：按钮和链接有足够的点击区域（最小44px）

#### Scenario: 跨设备一致性
- **GIVEN** 同一篇文章在不同设备上查看
- **WHEN** 用户切换设备
- **THEN** 内容可读性保持一致，无需缩放或横向滚动

### Requirement: 内联代码和强调文本
内联代码、强调文本 SHALL 使用改进的样式，与正文形成良好对比。

**当前状态**：内联代码使用 #691816 颜色，基础样式

**更新后要求**：
- 内联代码：使用更柔和的背景色（#f5f5f5），深色文字（#333）
- 边框：保留圆角（3px → 4px）
- 内边距：0.2em 0.4em → 0.3em 0.5em
- 强调文本（strong/em）：保持可访问的对比度

#### Scenario: 内联代码识别度
- **GIVEN** 正文中包含 `System.out.println()` 等内联代码
- **WHEN** 用户阅读
- **THEN** 代码片段清晰可见，与正文区分明显但不突兀

## ADDED Requirements
### Requirement: 现代字体加载优化
网站 SHALL 使用系统字体栈而非Web字体，提升加载性能。

**要求**：
- 不加载Google Fonts或其他Web字体
- 使用系统默认字体栈
- 字体显示策略：font-display: swap（如果未来需要Web字体）

#### Scenario: 加载性能
- **GIVEN** 用户首次访问网站
- **WHEN** 页面加载
- **THEN** 无需额外字体文件加载，FOUT最小化

### Requirement: 中文字体优化
网站 SHALL 针对中文阅读进行字体优化。

**要求**：
- 优先使用系统中文字体：PingFang SC（macOS）、Microsoft YaHei（Windows）、Noto Sans CJK SC（Linux）
- 字间距：letter-spacing 优化（中文场景下通常为0或0.5px）
- 避免字体抖动和模糊

#### Scenario: 中文显示效果
- **GIVEN** 中文技术文章
- **WHEN** 用户阅读
- **THEN** 字体清晰，无模糊，显示流畅

## REMOVED Requirements
### Requirement: 过时的自定义字体配置
**原因**：当前base.css中注释掉的字体导入和PT Mono字体栈不再需要
**迁移**：使用新的系统字体栈替代
