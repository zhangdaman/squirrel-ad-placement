# 松鼠投放（Squirrel Ad Placement）

短剧广告 AI 投放助手 · Web 端 B 端 SaaS。把投手日常的「出价、审核、监控、复盘」交给 AI 助手与专业工具页。

> 当前为**前端 Mock 优先**阶段：全程用本地 Mock 数据驱动，不依赖真实后端，可独立运行与演示。

## 功能模块

| 模块 | 路由 | 说明 |
|---|---|---|
| 智能问答 | `/qa`（默认首页） | AI 问答（出价 / 审核 / 数据 / 复盘），流式思考链 + 来源引用 + 边界场景兜底 |
| 素材诊断 | `/diagnose` | 上传素材做合规预检 / 拒审归因 + 可执行修改方案（不支持视频，转文字 / 人工） |
| 投放监控 | `/monitor` | 账户数据表 + 下钻（24h 趋势 / 订单留存热力图 / 数据明细），纯数据、不做判断 |
| 投放复盘 | `/review` | Agent 归因报告（5 步推理 + 结论 + 建议）+ 一键执行 |
| 知识库 | `/knowledge` | 公域平台规则同步 + 私域文档上传（清洗 → 分块 → 向量化 RAG pipeline） |
| 账户中心 | `/accounts` | 账户授权向导 + 状态管理 |
| 团队 | `/team` | 成员管理 + 角色权限矩阵 |
| 设置 | `/settings` | 个人 / 通知 / 偏好 / 安全 |

## 技术栈

- **Vue 3**（`<script setup>` + Composition API）
- **Vite** 构建 · **TypeScript** 全量类型
- **Pinia** 状态管理 · **Vue Router** 路由
- 设计系统：CSS 变量驱动，主色品牌蓝 `#2563EB`

## 快速开始

```bash
cd frontend
npm install        # 安装依赖
npm run dev        # 启动开发服务器 → http://localhost:5199
npm run build      # 类型检查 + 生产构建（产物在 frontend/dist/）
npm run preview    # 本地预览构建产物
```

环境变量见 `frontend/.env`：

```ini
VITE_USE_MOCK=true            # 前端 Mock 开关（true = 全程本地 Mock）
VITE_API_BASE_URL=/api        # 真实接口前缀（接后端时启用）
VITE_BACKEND_PROXY_TARGET=... # 开发代理目标
```

## 目录结构

```
ad-placement/
├── frontend/                 # Vue 3 前端工程
│   └── src/
│       ├── pages/            # 页面（按路由）
│       ├── components/       # 各模块组件（qa / diagnose / monitor / review / knowledge …）
│       ├── stores/           # Pinia 状态
│       ├── services/         # API service 层（Mock 优先，统一出口）
│       ├── mocks/            # Mock 数据（接真实后端后逐步替换）
│       ├── types/            # TypeScript 类型定义
│       └── style.css         # 全局设计系统
├── docs/                     # 产品文档
│   ├── PRD.md                # 产品需求文档
│   ├── api-contracts.md      # 接口契约
│   └── prototypes/           # 11 页核心原型 + 输出样式规范
└── .sdd/                     # SDD V7_2 框架状态（spec / 任务 / 经验）
```

## Mock 优先约定

- 所有数据经 `services/` 取，组件 / store 不直接调 `axios`
- `VITE_USE_MOCK=true` 时 service 走 `mocks/`，`false` 时打真实后端
- Mock 数据按规范带 `[Mock]` 标识，渲染层统一过滤，不外露给用户

---

由 SDD V7_2 框架管理。产品需求见 `docs/PRD.md`。
