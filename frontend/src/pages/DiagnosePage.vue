<script setup lang="ts">
/**
 * 素材诊断页（FE-03）—— 4 态状态机（套在已有 AppShell 内，路由 /diagnose）
 * 权威源：docs/prototypes/diagnose.html（diag-state empty/loading/batch/report）
 *        + diagnose-styles.html（DIAG-01~05 真实样式）
 *
 * 布局：diag-layout（左 260px 新建诊断 + 诊断历史｜右 主诊断面板），满高。
 * 状态：empty(DIAG-01) → loading(DIAG-02) → report(DIAG-04) / batch(DIAG-03)；
 *       异常 → error(DIAG-05)。状态机收口在 stores/diagnose。
 * 仅图片，不支持视频：视频 / 非图在 service 拦截，落到 error 态引导转文字 / 人工。
 */
import { onMounted } from 'vue'
import { useDiagnoseStore } from '@/stores/diagnose'
import UploadZone from '@/components/diagnose/UploadZone.vue'
import LoadingState from '@/components/diagnose/LoadingState.vue'
import BatchOverview from '@/components/diagnose/BatchOverview.vue'
import DiagnoseReport from '@/components/diagnose/DiagnoseReport.vue'
import ErrorState from '@/components/diagnose/ErrorState.vue'
import type { DiagnoseHistoryItem } from '@/types/diagnose'

const store = useDiagnoseStore()

onMounted(() => {
  store.loadHistory()
})

function newDiag() {
  store.reset()
}

function openHistory(item: DiagnoseHistoryItem) {
  store.openHistory(item)
}
</script>

<template>
  <div class="diag-layout">
    <!-- 左：新建诊断 + 诊断历史 -->
    <aside class="diag-side">
      <div class="diag-side-head">
        <button class="btn-new-diag" @click="newDiag">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <path d="M12 5v14M5 12h14" />
          </svg>
          新建诊断
        </button>
      </div>
      <div class="diag-history-head">
        <h4>诊断历史</h4>
        <span class="text-xs text-muted">最近 30 天</span>
      </div>
      <div class="diag-history">
        <div
          v-for="h in store.history"
          :key="h.id"
          class="diag-h-item"
          :class="{ active: store.activeHistoryId === h.id }"
          @click="openHistory(h)"
        >
          <div class="diag-h-thumb" :style="{ background: h.gradient }" />
          <div style="flex: 1; min-width: 0">
            <div class="diag-h-name">{{ h.name.replace(/^\[Mock\]\s*/, '') }}</div>
            <div class="diag-h-meta">
              <span class="platform" :class="`platform-${h.platform.key}`" style="font-size: 10px; padding: 1px 5px">
                {{ h.platform.name }}
              </span>
              <span class="tag" :class="`tag-${h.statusTag === 'danger' ? 'danger' : h.statusTag === 'warn' ? 'warn' : 'success'}`" style="font-size: 10px">
                {{ h.statusText }}
              </span>
            </div>
            <div class="text-xs text-muted" style="margin-top: 4px">{{ h.timeLabel }}</div>
          </div>
        </div>
      </div>
    </aside>

    <!-- 右：主诊断面板（4 态 + 异常） -->
    <section class="diag-main">
      <!-- empty / loading / error：居中容器 -->
      <UploadZone v-if="store.state === 'empty'" />
      <LoadingState v-else-if="store.state === 'loading'" />
      <ErrorState v-else-if="store.state === 'error'" />
      <!-- batch / report：滚动容器 -->
      <BatchOverview v-else-if="store.state === 'batch'" />
      <DiagnoseReport
        v-else-if="store.state === 'report' && store.report"
        :report="store.report"
      />
    </section>
  </div>
</template>

<style scoped>
/* 两栏布局：左 260px 历史侧栏 | 右 撑满主面板 */
.diag-layout {
  display: flex;
  height: calc(100vh - var(--topbar-h));
  overflow: hidden;
}
.diag-side {
  width: 260px;
  flex-shrink: 0;
  border-right: 1px solid var(--border-base);
  background: #fff;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.diag-side-head {
  padding: 14px 14px 8px;
  border-bottom: 1px solid var(--border-light);
}
.btn-new-diag {
  display: flex; align-items: center; gap: 6px;
  width: 100%; padding: 8px 12px;
  border: 1px dashed var(--border-base); border-radius: 8px;
  background: var(--gray-50); color: var(--gray-700);
  font-size: 13px; font-weight: 500; cursor: pointer;
  transition: all .15s;
}
.btn-new-diag:hover { border-color: var(--brand-300); color: var(--brand-700); background: var(--brand-50); }
.diag-history-head {
  display: flex; align-items: center; justify-content: space-between;
  padding: 10px 14px 6px;
}
.diag-history-head h4 { font-size: 12px; font-weight: 600; color: var(--gray-700); margin: 0; }
.diag-history {
  flex: 1; overflow-y: auto; padding: 4px 8px 12px;
}
.diag-h-item {
  display: flex; align-items: flex-start; gap: 8px;
  padding: 9px 8px; border-radius: 8px; cursor: pointer;
  transition: background .1s;
}
.diag-h-item:hover { background: var(--gray-50); }
.diag-h-item.active { background: var(--brand-50); }
.diag-h-thumb {
  width: 36px; height: 36px; border-radius: 6px; flex-shrink: 0;
}
.diag-h-name {
  font-size: 12px; font-weight: 500; color: var(--gray-800);
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  max-width: 160px;
}
.diag-h-meta { display: flex; gap: 5px; margin-top: 4px; flex-wrap: wrap; }
.text-xs { font-size: 11px; }
.text-muted { color: var(--gray-400); }

/* 主面板 */
.diag-main {
  flex: 1; overflow-y: auto;
  background: var(--gray-50);
  display: flex; flex-direction: column;
}
</style>
