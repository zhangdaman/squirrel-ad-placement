import { describe, it, expect } from 'vitest'
import { routeFlow } from './qa'

/**
 * routeFlow 意图路由单测
 * - 覆盖 23 意图的代表输入（验证关键词路由正确）
 * - 重点回归本轮修过的 7 个 routeFlow bug（顺序被抢 / 关键词漏 / 宽泛词）
 * 跑：npm test
 */
describe('routeFlow · 23 意图路由', () => {
  const cases: [string, string][] = [
    // ASK 问答（9）
    ['现言短剧 OCPM 出价多少', 'bid'],
    ['定向应该放宽还是收紧', 'targeting'],
    ['什么类型素材容易起量', 'creative'],
    ['预算怎么分配合理', 'budget'],
    ['新计划怎么快速起量', 'growth'],
    ['亏损多少该止损', 'shutdown'],
    ['计划123今天消耗多少', 'data'],
    ['怎么新建一个计划', 'guide'],
    ['巨量短剧素材能不能出现抽烟画面', 'reject'],
    // CHK 审核（5；rejection_diagnosis / material_precheck 共用 reject flow）
    ['我的素材被拒了怎么改', 'reject'],
    ['为什么巨量过了广点通被拒', 'cross_platform'],
    ['最近审核是不是变严了', 'reject_trend'],
    ['我的账户为什么被限流了', 'account_diag'],
    // RPT 复盘（6）
    ['短剧A的ROI为什么掉了', 'review'],
    ['帮我生成本周投放周报', 'report_gen'],
    ['最近哪条素材跑得最好', 'material_rank'],
    ['调了出价后效果怎么样', 'strategy_review'],
    ['M789为什么跑不动了', 'material_diag'],
    // GEN / 边界
    ['数据', 'data_pick'],
    ['帮我看看', 'vague'],
  ]

  it.each(cases)('「%s」→ %s', (input, expected) => {
    expect(routeFlow(input)).toBe(expected)
  })
})

describe('routeFlow · 顺序回归（防本轮修过的 bug 复发）', () => {
  it('素材诊断不被 growth「跑不动」抢走', () => {
    expect(routeFlow('M789为什么跑不动了')).toBe('material_diag')
  })
  it('策略复盘不被 bid「出价」抢走', () => {
    expect(routeFlow('调了出价后效果怎么样')).toBe('strategy_review')
  })
  it('具体数据查询不被 data_pick 宽泛词抢走', () => {
    expect(routeFlow('今天A001消耗多少')).toBe('data')
  })
  it('盯盘「投放情况」命中 data 而非兜底', () => {
    expect(routeFlow('帮我看看昨天的投放情况')).toBe('data')
  })
  it('「被拒」「能不能出现」命中 reject 而非兜底', () => {
    expect(routeFlow('我的素材被拒了')).toBe('reject')
    expect(routeFlow('能不能出现抽烟画面')).toBe('reject')
  })
})
