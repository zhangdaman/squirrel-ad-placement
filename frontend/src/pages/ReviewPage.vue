<script setup lang="ts">
/**
 * 投放复盘页（FE-05）—— 判断层 · Agent 归因（套共享 AppShell，路由 /review）
 * 权威源：docs/prototypes/review.html（三态 inbox / report / new）。
 *
 * 三态（store.view）由 store 统一驱动，本页只做组装：
 *   - inbox  ReviewInbox     复盘收件箱（概览 + 筛选 + 分组卡片）
 *   - report AttributionReport Agent 归因报告（5 步 + 结论 + 建议 + 右栏对比/因子/时间轴/案例）
 *   - new    NewReview       发起复盘弹窗 + loading overlay（始终挂载，按 store 控制显隐）
 *
 * 直达报告态：支持从 监控 / 预警 跳转（query ?account=A001 或 hash #report）直接打开报告。
 * toast：本页 provide('reviewToast')，供 AttributionReport 导出 PDF / 次级动作 反馈复用。
 *
 * 灵魂约定（experience.md）：复盘 = 判断层；一键执行真承接（见 AttributionReport / store.execute）。
 */
import { onMounted, provide, ref } from 'vue'
import { useRoute } from 'vue-router'
import { useReviewStore } from '@/stores/review'
import ReviewInbox from '@/components/review/ReviewInbox.vue'
import AttributionReport from '@/components/review/AttributionReport.vue'
import NewReview from '@/components/review/NewReview.vue'

const store = useReviewStore()
const route = useRoute()

/* ---------- 轻 toast（导出 PDF / 次级动作反馈），provide 给子组件 ---------- */
const toastMsg = ref('')
let toastTimer: ReturnType<typeof setTimeout> | undefined
function showToast(msg: string) {
  toastMsg.value = msg
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => (toastMsg.value = ''), 2200)
}
provide('reviewToast', showToast)

onMounted(() => {
  // 监控 / 预警跳转直达报告：?account=A001 或 #report
  const account =
    typeof route.query.account === 'string' ? route.query.account : undefined
  if (account || route.hash === '#report') {
    store.openReport(account ?? 'A001')
  } else {
    store.loadInbox()
  }
})
</script>

<template>
  <div class="review-page">
    <!-- 态①：复盘收件箱 -->
    <ReviewInbox v-if="store.view === 'inbox'" />

    <!-- 态②：Agent 归因报告 -->
    <AttributionReport
      v-else-if="store.view === 'report' && store.report"
      :report="store.report"
    />

    <!-- 态②加载中骨架（报告拉取期间，避免空白闪烁） -->
    <div v-else-if="store.view === 'report'" class="rv-report-loading">
      <div class="rv-skel-ring"></div>
      <div class="rv-skel-text">归因报告生成中…</div>
    </div>

    <!-- 态③：发起复盘弹窗 + 调研 overlay（始终挂载，按 store 控制显隐） -->
    <NewReview />

    <!-- 轻 toast（导出 PDF / 次级动作） -->
    <Transition name="rv-toast-fade">
      <div v-if="toastMsg" class="rv-toast">{{ toastMsg }}</div>
    </Transition>
  </div>
</template>

<style scoped>
/* ===== 页面根容器 =====
   渲染在 AppShell .content 内（.content 已含 flex:1 + 纵向滚动 + padding 20/24），
   此处不重复这些职责，否则会双重 padding + 嵌套滚动条；仅作作用域锚点。 */
.review-page {
  min-width: 0;
}

/* 报告加载骨架 */
.rv-report-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 120px 0;
  gap: 16px;
}
.rv-skel-ring {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  border: 4px solid var(--brand-100);
  border-top-color: var(--brand-600);
  animation: rv-skel-spin 0.8s linear infinite;
}
@keyframes rv-skel-spin {
  to {
    transform: rotate(360deg);
  }
}
.rv-skel-text {
  font-size: 14px;
  color: var(--gray-500);
}

/* 轻 toast */
.rv-toast {
  position: fixed;
  top: 80px;
  left: 50%;
  transform: translateX(-50%);
  background: var(--gray-900);
  color: #fff;
  padding: 10px 18px;
  border-radius: 999px;
  font-size: 13px;
  z-index: 1000;
  box-shadow: var(--shadow-lg);
}
.rv-toast-fade-enter-active,
.rv-toast-fade-leave-active {
  transition: opacity 0.2s, transform 0.2s;
}
.rv-toast-fade-enter-from,
.rv-toast-fade-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(-6px);
}

@media (prefers-reduced-motion: reduce) {
  .rv-skel-ring {
    animation-duration: 1.6s;
  }
}
</style>
