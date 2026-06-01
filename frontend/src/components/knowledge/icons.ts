/**
 * 知识库页 inline SVG 图标集（提取自 docs/prototypes/knowledge.html，统一管理）。
 * 返回 SVG 字符串，配合 v-html 渲染。stroke=currentColor 继承文字色。
 */
const svg = (inner: string, size = 16, sw = 2) =>
  `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${sw}">${inner}</svg>`

/* —— 卡片类型图标（按 KnowledgeType）—— */
export const TYPE_ICONS: Record<string, string> = {
  // 投放规则（盾）
  rule: svg('<path d="M12 22s8-3 8-10V5l-8-3-8 3v7c0 7 8 10 8 10z"/>'),
  // 实战案例（柱状）
  case: svg('<path d="M3 3h18v18H3zM7 17V9m5 8V5m5 12v-6"/>'),
  // 话术模板（对话气泡）
  template: svg('<path d="M21 12a8 8 0 01-12 7l-5 2 2-5A8 8 0 1121 12z"/>'),
  // 数据基准（图表折线）
  benchmark: svg('<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M7 14l3-3 2 2 5-5"/>'),
}

/** 卡片类型图标的底色 class（对齐原型 kbc-t-*） */
export const TYPE_ICON_CLASS: Record<string, string> = {
  rule: 'kbc-t-rule',
  case: 'kbc-t-case',
  template: 'kbc-t-qa',
  benchmark: 'kbc-t-doc',
}

/* —— 卡片底部统计图标 —— */
export const ICON_CITE = svg('<path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>', 11)
export const ICON_HIT = svg('<path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><path d="M22 4L12 14.01l-3-3"/>', 11)
export const ICON_WARN = svg('<circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/>', 11)

/* —— 搜索 —— */
export const ICON_SEARCH = svg('<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>', 13)

/* —— 抽屉关闭（左收起箭头）/ 通用关闭 —— */
export const ICON_COLLAPSE = svg('<polyline points="9 18 15 12 9 6"/>')
export const ICON_CLOSE = svg('<path d="M18 6L6 18M6 6l12 12"/>', 18)

/* —— 列表视图 —— */
export const ICON_LIST = svg(
  '<line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><circle cx="4" cy="6" r="1"/><circle cx="4" cy="12" r="1"/><circle cx="4" cy="18" r="1"/>',
  13
)

/* —— KPI 图标（按 tone）—— */
export const KPI_ICONS: Record<string, string> = {
  b: svg('<path d="M4 5a2 2 0 012-2h13v18H6a2 2 0 01-2-2z"/><path d="M4 19a2 2 0 012-2h13"/>'),
  o: svg('<path d="M3 12h4l3-8 4 16 3-8h4"/>'),
  g: svg('<path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><path d="M22 4L12 14.01l-3-3"/>'),
  r: svg('<path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><path d="M12 9v4M12 17h.01"/>'),
}
