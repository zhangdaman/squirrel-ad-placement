/**
 * 问答页 inline SVG 图标集（提取自原型，统一管理避免散落重复）。
 * 返回 SVG 字符串，配合 v-html 在卡片头部渲染。stroke=currentColor 继承文字色。
 */

const svg = (inner: string, size = 14, sw = 2) =>
  `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${sw}">${inner}</svg>`

/** 松鼠星标头像（AI 气泡头像） */
export const STAR_ICON = svg(
  '<path d="M12 2l3 6 6 1-4.5 4 1 6L12 16l-5.5 3 1-6L3 9l6-1z"/>',
  18,
  2.2
)

/** ansCard / edgeCard 头部图标，按语义取 */
export const HEAD_ICONS: Record<string, string> = {
  // 出价（货币圈）
  bid: svg('<circle cx="12" cy="12" r="10"/><path d="M16 8a4 4 0 11-8 0M12 12v6"/>'),
  // 审核（盾）
  shield: svg('<path d="M12 22s8-3 8-10V5l-8-3-8 3v7c0 7 8 10 8 10z"/>'),
  book: svg('<path d="M12 22s8-3 8-10V5l-8-3-8 3v7c0 7 8 10 8 10z"/>'),
  // 警示（三角感叹）
  alert: svg('<path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><path d="M12 9v4M12 17h.01"/>'),
  // 帮助（问号圈）
  help: svg('<circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>'),
  // 禁止（斜杠圈）
  ban: svg('<circle cx="12" cy="12" r="10"/><path d="M4.93 4.93l14.14 14.14"/>'),
  // 闪电（额度）
  bolt: svg('<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>'),
  // 视频
  video: svg('<polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/>'),
  // 时钟（Agent 计划）
  clock: svg('<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>'),
}

/** 采纳（赞）图标 */
export const THUMB_UP = svg(
  '<path d="M14 9V5a3 3 0 00-3-3l-4 9v11h11.28a2 2 0 002-1.7l1.38-9a2 2 0 00-2-2.3zM7 22H4a2 2 0 01-2-2v-7a2 2 0 012-2h3"/>',
  13
)
/** 不准确（踩）图标 */
export const THUMB_DOWN = svg(
  '<path d="M10 15v4a3 3 0 003 3l4-9V2H5.72a2 2 0 00-2 1.7l-1.38 9a2 2 0 002 2.3zM17 2h3a2 2 0 012 2v7a2 2 0 01-2 2h-3"/>',
  13
)
