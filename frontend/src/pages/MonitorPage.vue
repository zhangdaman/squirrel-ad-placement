<script setup lang="ts">
/**
 * 数据监控页（FE-04）—— 纯数据层，禁判断（套共享 AppShell，路由 /monitor）
 * 权威源：docs/prototypes/monitor.html（mon-view list / detail）。
 *
 * 两视图（store.view）：
 *   - list   账户列表：页头 + 24h 消耗趋势（TrendChart）+ 账户明细表（AccountTable，按平台 tab）
 *   - detail 账户详情下钻：AccountDetail（数据总览 / 订单留存 / 数据明细 3 tab）
 * 点击账户行 → store.openDetail 进详情；详情头返回键回列表。
 * 平台 scope 取自顶栏全局平台（store.loadList 内按 platformStore.current 收敛）。
 *
 * 灵魂约定（experience.md「监控 = 事实层」）：
 *   全页纯数据 —— DOM 不出现任何判断词（异常/偏弱/建议/预警/需关注），
 *   ROI 不标红、无 danger 色，无 AI 解读 / 状态标签 / 涨跌判断箭头。判断收口到 /review。
 */
import { onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useMonitorStore } from '@/stores/monitor'
import { usePlatformStore } from '@/stores/platform'
import TrendChart from '@/components/monitor/TrendChart.vue'
import AccountTable from '@/components/monitor/AccountTable.vue'
import AccountDetail from '@/components/monitor/AccountDetail.vue'
import type { AccountRow } from '@/types/monitor'

const store = useMonitorStore()
const platformStore = usePlatformStore()
const route = useRoute()

onMounted(async () => {
  await store.loadList()
  // 复盘「一键执行」深链承接：/monitor?account=A001 → 加载后直接下钻该账户详情
  const account = route.query.account
  if (typeof account === 'string' && account) {
    const row = store.groups
      .flatMap((g) => g.rows)
      .find((r) => r.account === account)
    if (row) store.openDetail(row)
  }
})

// 顶栏切换全局平台 → 回列表并按新平台重载
watch(
  () => platformStore.current,
  () => {
    store.backToList()
    store.loadList()
  }
)

function onRowClick(row: AccountRow) {
  store.openDetail(row)
}
</script>

<template>
  <!-- 账户列表视图 -->
  <div v-if="store.view === 'list'">
    <div class="page-header">
      <div>
        <div class="page-title">
          数据监控
          <span class="realtime-pill"><span class="pulse-dot"></span> 实时</span>
        </div>
        <div class="page-subtitle">
          {{ store.totalAccounts }} 个账户 · {{ store.totalPlatforms }} 大平台 · 数据每 60s 刷新一次
        </div>
      </div>
    </div>

    <!-- 24h 消耗趋势 -->
    <TrendChart
      v-if="store.trend"
      :title="`实时消耗 · 24 小时趋势`"
      :unit="store.trend.unit"
      :today="store.trend.today"
      :yesterday="store.trend.yesterday"
      :now-label="store.trend.now_label"
    />

    <!-- 账户明细表 -->
    <AccountTable
      :groups="store.groups"
      :active-key="store.activeGroupKey"
      @select-group="store.selectGroup"
      @row-click="onRowClick"
    />
  </div>

  <!-- 账户详情下钻 -->
  <AccountDetail v-else />
</template>

<style scoped>
.realtime-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  background: var(--success-bg);
  color: var(--success);
  font-size: 12px;
  font-weight: 600;
  border-radius: 999px;
}
.pulse-dot {
  width: 8px;
  height: 8px;
  border-radius: 999px;
  background: var(--success);
  animation: pulse-anim 1.6s ease infinite;
}
@keyframes pulse-anim {
  0%,
  100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.5;
    transform: scale(1.3);
  }
}
</style>
