---
title: 为什么我觉得 OpenSpec 行？
date: 2025-12-30
description: 分享我对 OpenSpec 框架的分析：为什么它避开了其他 Vibe Coding 框架的坑，做到了理想的实践
tags:
  - OpenSpec
  - Vibe Coding
  - AI辅助编程
  - 系统设计
---
我的上一篇文章，评论一些 Vibe Coding 框架（如 `bmad-method`、`spec-kit`）存在的核心问题：**框架的"模板"和"内置指令"占了太大的比重，反而稀释了项目自身的"上下文"**。

但最近体验了 OpenSpec 之后，我发现这个框架**真的行**。它恰好避开了我之前批判的那些坑，做到了我心中理想的 Vibe Coding 实践。

---

## 为什么之前的框架不行？

简单回顾一下我之前的观点：

1. **不够聚焦** - 一上来就想面面俱到，不符合"先核心功能，再完善细节"的开发习惯
2. **修改成本高** - 生成的方案过于庞大，人很难有耐心看完和修改
3. **项目被"框架化"** - AI 更多是在遵循框架规则，而不是分析"如何与现有代码兼容"

我的结论是：**应该管理"结构"胜过管理"模板"**。需要的是轻量的文档结构和灵活的命令，而不是死板的模板。

---

## OpenSpec 为什么行？

### 1. 结构极简，模板极轻

OpenSpec 的核心结构非常清晰：

```
openspec/
├── specs/           # 当前状态 - 已构建的内容
└── changes/         # 提案 - 应该改变的内容
    └── [change-id]/
        ├── proposal.md   # 为什么改、改什么
        ├── tasks.md      # 实施清单
        ├── design.md     # 技术决策（按需）
        └── specs/        # 增量变更
            └── [capability]/
                └── spec.md
```

这个结构本身就说明了它的设计哲学：

每个 changes 目录下的提案都很小，只关注一个改动点。

proposal.md：是对变更的总结性描述，提炼要点而非详细技术细节

design.md：是具体的技术实现方案，没有固定模板，完全针对当前项目特点制定的实现策略

spec.md 内容本身几乎没有模板强制。你只需要遵循简单的格式：

```markdown
## ADDED Requirements
### Requirement: Two-Factor Authentication
The system MUST require a second factor during login.

#### Scenario: OTP required
- WHEN a user submits valid credentials
- THEN an OTP challenge is required
```

这种格式足够轻量，AI 可以灵活发挥，同时又有足够结构让人类可读、可验证。

### 2. 三阶段流程，符合自然开发习惯

OpenSpec 的三阶段工作流和我之前提出的"三步走"高度契合：

| 我的建议 | OpenSpec 实现 |
| --- | --- |
| 1. 需求草案（原始输入） | *Stage 1: Draft Proposal* - 创建 proposal.md 和 spec deltas |
| 2. 详细技术方案（最核心） | *Stage 2: Review & Align* - 迭代完善 specs 和 tasks |
| 3. To-Do List 跟踪 | *Stage 3: Implement & Archive* - 执行 tasks.md 并归档 |

关键的是，OpenSpec 在每个阶段都保留了**人的控制权**：

- Stage 1 完成后，必须 `openspec validate --strict` 验证格式
- Stage 2 强调 "Review & Align" —— 人要审核提案，AI 要根据反馈修改
- Stage 3 的归档是显式的 —— 只有部署后才 `openspec archive`

这避免了 AI "自动驾驶"式地生成大量不符合项目实际的代码。

### 3. Brownfield-first，与现有代码深度结合

我之前批判的框架大多是 "greenfield-first" —— 它们适合从 0 到 1 的新项目，但在修改现有功能时很吃力。

OpenSpec 的设计哲学是 **"brownfield-first"**：

[quote]
OpenSpec separates the source of truth from proposals: `openspec/specs/` (current truth) and `openspec/changes/` (proposed updates). This keeps diffs explicit and manageable across features.

这意味着：

- AI 在创建提案时，必须先读取 `specs/` 中的现有规范
- Delta 格式让变更范围一目了然
- 归档时才合并到 `specs/`，保持了单一事实来源

这正是我之前强调的：**让 AI 深度结合项目现状，产出"接地气"的方案**。

### 4. 命令极简，上下文留白

OpenSpec 只提供了 **3 个命令**，对应三个阶段：

- `/openspec:proposal` - 创建提案
- `/openspec:apply` - 实施变更
- `/openspec:archive` - 归档变更

就这么简单。没有 10+ 个复杂命令，没有各种"生成文档"、"创建测试"、"优化代码"的细分功能。

每个命令内部也只有 **5-7 个步骤**，步骤描述也极其克制。

但更重要的是，OpenSpec 在它的约束条件中**明确要求 AI 在创建提案前分析现有代码库**：

[quote]
Review `openspec/project.md`, run `openspec list` and `openspec list --specs`, and **inspect related code or docs (e.g., via `rg`/`ls`)** to ground the proposal in current behaviour

[quote]
Explore the codebase with `rg <keyword>`, `ls`, or direct file reads so **proposals align with current implementation realities**

**命令本身极简，但明确指向"去分析现有代码"**。结合 Claude Code 自身的 prompt 和代码分析能力（Read、Grep、Glob 等工具），AI 可以深度理解项目现状，而不是凭空生成方案。

这就是我说的 **"管理结构，不管理模板"** —— OpenSpec 管理的是文件放哪里、怎么命名、如何流转，而不是规定每个文件里必须写什么内容。

### 5. 将 AI 的隐式能力转化为项目资产

这一点可能是 OpenSpec 最容易被忽视、但最重要的特点。

当前的编程 AI 助手（Claude Code、GitHub Copilot、Cursor 等）其实已经非常强大了：

- 它们有 **plan 模式** —— 会思考任务拆解
- 它们有 **task 管理** —— 会跟踪执行进度
- 它们有强大的 **代码理解能力** —— 能分析现有代码库

**但这些能力产生的文件大多存储在 AI 自身的空间里，不是项目的一部分**。有的 agent 允许你在规划阶段修改这些文件，比如 Antigravity；有的则完全不支持灵活编辑。

OpenSpec 做的事情，是把 AI 的这些内部文件 **"项目化"**：

| AI 内部存储 | OpenSpec 项目化 |
| --- | --- |
| agent 内部的 plan 文件 | `proposal.md` + `design.md`（项目文件，可编辑） |
| agent 内部的 task 列表 | `tasks.md`（项目文件，版本控制） |
| agent 的代码分析结果 | `specs/`（累积的项目知识） |

关键区别在于：

1. **这些文件是项目的一部分** —— 不再是 agent 的内部状态，而是代码仓库里的文件
2. **可以灵活编辑** —— 任何编辑器都能改，不依赖 agent 的编辑界面
3. **可以版本控制** —— git diff、code review 都能覆盖
4. **可以跨 agent 共享** —— 不同的人用不同的 AI 工具，共享同一套 specs

OpenSpec **不是要替代这些 AI 工具的 plan/task 能力**，而是为这些能力产生的产物 **"规划好文档结构、控制好项目结构"**。AI 依然用它的 prompt 和控制机制工作，但现在它的思考和执行过程有了明确的存放位置和格式规范，可以被团队管理、审查和复用。

这正是我之前说的 **"管理结构，不管理模板"** —— OpenSpec 不规定这些文件的具体内容，只规定它们放哪里、叫什么名字、怎么流转。

---

## 总结

OpenSpec 行，是因为它做到了我之前批判其他框架时提出的那些原则：

1. **结构极简，模板极轻** — 只规定文件结构和流程，不规定内容格式
2. **增量变更，显式差异** — delta 格式让变更范围清晰可控
3. **brownfield-first** — 与现有代码和规范深度结合
4. **三阶段流程，人工把关** — 每个阶段都有人的审核和确认
5. **AI 能力项目化** — 把 AI 的 plan/task 能力产生的产物落地为项目资产

如果你也在寻找一个**让 AI 真正服务于项目上下文**的 Vibe Coding 实践，OpenSpec 值得一试。
