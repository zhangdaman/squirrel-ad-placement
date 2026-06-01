<script setup lang="ts">
/**
 * LoadingState —— DIAG-02 诊断中 · 扫描动画（权威源 diagnose-styles.html DIAG-02）
 * - loading-ring 旋转 + tool-progress 5 步逐步点亮（done / running / pending）
 * - 步进索引由 store.scanStep 驱动（纯视觉，不承载业务）
 */
import { useDiagnoseStore } from '@/stores/diagnose'

const store = useDiagnoseStore()

/** 步骤视觉态：< step done / = step running / > step pending */
function stepClass(idx: number): string {
  if (idx < store.scanStep) return 'done'
  if (idx === store.scanStep) return 'running'
  return 'pending'
}
</script>

<template>
  <div class="diag-state-loading">
    <div class="loading-hero">
      <div class="loading-ring" />
      <div class="loading-title">AI 正在诊断素材…</div>
      <div class="loading-file">{{ store.loadingFileLabel }}</div>
      <div class="tool-progress">
        <div
          v-for="(s, idx) in store.scanSteps"
          :key="idx"
          class="tp-item"
          :class="stepClass(idx)"
        >
          {{ s }}
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* DIAG-02 诊断中 · 扫描动画（权威源 diagnose-styles.html DIAG-02） */
.diag-state-loading {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 32px 24px;
}
.loading-hero {
  max-width: 440px;
  width: 100%;
  padding: 32px 24px;
  text-align: center;
}
.loading-ring {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  border: 4px solid var(--brand-100);
  border-top-color: var(--brand-600);
  margin: 0 auto 18px;
  animation: diag-spin 0.8s linear infinite;
}
@keyframes diag-spin {
  to {
    transform: rotate(360deg);
  }
}
.loading-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--gray-900);
  margin-bottom: 4px;
}
.loading-file {
  font-size: 12px;
  color: var(--gray-500);
  margin-bottom: 22px;
}
.tool-progress {
  text-align: left;
  background: var(--gray-50);
  border: 1px solid var(--border-light);
  border-radius: 12px;
  padding: 12px 16px;
}
.tp-item {
  font-size: 13px;
  padding: 7px 0 7px 26px;
  position: relative;
  color: var(--gray-400);
}
.tp-item::before {
  content: "○";
  position: absolute;
  left: 4px;
}
.tp-item.pending {
  color: var(--gray-400);
}
.tp-item.done {
  color: var(--success);
}
.tp-item.done::before {
  content: "✓";
}
.tp-item.running {
  color: var(--brand-700);
  font-weight: 600;
}
.tp-item.running::before {
  content: "⏳";
}
</style>
