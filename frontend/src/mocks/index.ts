/**
 * Mock 统一导出（集中管理，禁止散落在组件 / 页面中）
 * 所有 Mock 数据结构与 docs/api-contracts.md 一一对应。
 */
export { mockLogin, mockMe, mockUserOf } from './auth'
export { mockPlatforms } from './platform'
export { mockPermissions } from './permissions'
export {
  routeFlow,
  mockAnswerScript,
  buildGrowthResult,
  buildContextTurns,
  mockSessions,
  mockSourceDetail,
} from './qa'
export {
  mockInbox,
  mockAttribution,
  mockExecute,
  mockNewReviewOptions,
} from './review'
export {
  mockKpis,
  mockFilters,
  defaultFilterState,
  mockSearch,
  mockDetail,
  mockFeedback,
  chipLabel,
  filterDefMap,
} from './knowledge'
