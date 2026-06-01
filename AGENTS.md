# AGENTS · 松鼠投放

## 项目定位

短剧广告 AI 投放助手（Web 端 B 端 SaaS）。两大核心环节：**问**（智能问答）+ **诊**（素材诊断），以私域知识库（L1/L2/L3）为底座。当前为高保真前端原型。

## 关键约定（开发 / 改动前必读）

- 监控只做数据、不做判断；判断收口到复盘 Agent
- 平台 / 角色全局化（localStorage 驱动 scope 与导航过滤）
- 主色品牌蓝 `#2563EB`，B 端系统规范，避免营销感
- 不支持视频上传（转文字 / 人工接入）
- 完整口径见 `docs/PRD.md` 与 `.sdd/experience.md`

## 目录

- `docs/PRD.md` —— 产品需求（定稿 C）
- `docs/prototypes/` —— 11 页原型 + `qa-styles.html` / `diagnose-styles.html` 输出样式规范
- `.sdd/` —— 项目状态、经验、工作日志

## 待补

- `docs/api-contracts.md`、`docs/Plan.md`（进入开发阶段时产出）
