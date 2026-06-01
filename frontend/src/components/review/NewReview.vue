<script setup lang="ts">
/**
 * NewReview —— 态③发起复盘弹窗（权威源 review.html #rv-launch 弹窗 + #rv-launching overlay）
 *
 * 弹窗表单：复盘对象（按账户/计划/题材 seg）+ 选择账户（下拉）+ 时间范围 seg + 复盘重点 seg。
 * 点「开始复盘」→ store.startReview()：关弹窗 → loading overlay（模拟 Agent 调研）→ 产出归因报告。
 * 只读 store 状态、触发 action；表单选项来自 store.newOptions（service mock）。
 */
import { ref, watch } from 'vue'
import { useReviewStore } from '@/stores/review'
import type { NewReviewObject } from '@/types/review'

const store = useReviewStore()

/* 本地表单态（弹窗内选择，不污染全局） */
const objectVal = ref<NewReviewObject>('account')
const accountVal = ref('A001')
const timeVal = ref('yesterday')
const focusVal = ref('all')

// 弹窗每次打开时重置默认选择 + 同步默认账户
watch(
  () => store.launchDialogOpen,
  (open) => {
    if (open) {
      objectVal.value = 'account'
      accountVal.value = store.newOptions?.accounts[0]?.value ?? 'A001'
      timeVal.value = 'yesterday'
      focusVal.value = 'all'
    }
  }
)

function start() {
  store.startReview(accountVal.value)
}
</script>

<template>
  <!-- 发起复盘弹窗 -->
  <div
    v-if="store.launchDialogOpen"
    class="rv-dlg-mask"
    @click.self="store.closeLaunchDialog()"
  >
    <div class="rv-dlg">
      <div class="rv-dlg-head">
        <div class="rv-dlg-title">发起复盘</div>
        <div class="rv-dlg-close" @click="store.closeLaunchDialog()">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </div>
      </div>
      <div class="rv-dlg-body">
        <!-- 复盘对象 -->
        <div class="rv-dlg-field">
          <div class="rv-dlg-label">复盘对象</div>
          <div class="rv-seg">
            <div
              v-for="o in store.newOptions?.objects ?? []"
              :key="o.value"
              class="rv-seg-item"
              :class="{ active: objectVal === o.value }"
              @click="objectVal = o.value"
            >
              {{ o.label }}
            </div>
          </div>
        </div>
        <!-- 选择账户 -->
        <div class="rv-dlg-field">
          <div class="rv-dlg-label">选择账户</div>
          <select v-model="accountVal" class="rv-dlg-select">
            <option
              v-for="a in store.newOptions?.accounts ?? []"
              :key="a.value"
              :value="a.value"
            >
              {{ a.label }}
            </option>
          </select>
        </div>
        <!-- 时间范围 -->
        <div class="rv-dlg-field">
          <div class="rv-dlg-label">时间范围</div>
          <div class="rv-seg">
            <div
              v-for="t in store.newOptions?.times ?? []"
              :key="t.value"
              class="rv-seg-item"
              :class="{ active: timeVal === t.value }"
              @click="timeVal = t.value"
            >
              {{ t.label }}
            </div>
          </div>
        </div>
        <!-- 复盘重点 -->
        <div class="rv-dlg-field">
          <div class="rv-dlg-label">复盘重点（可选）</div>
          <div class="rv-seg">
            <div
              v-for="f in store.newOptions?.focuses ?? []"
              :key="f.value"
              class="rv-seg-item"
              :class="{ active: focusVal === f.value }"
              @click="focusVal = f.value"
            >
              {{ f.label }}
            </div>
          </div>
        </div>
      </div>
      <div class="rv-dlg-foot">
        <button class="btn btn-outline btn-sm" @click="store.closeLaunchDialog()">取消</button>
        <button class="btn btn-primary btn-sm" @click="start">开始复盘</button>
      </div>
    </div>
  </div>

  <!-- 调研中 loading overlay -->
  <div v-if="store.launching" class="rv-launching">
    <div class="rv-launch-box">
      <div class="rv-launch-ring"></div>
      <div class="rv-launch-title">复盘 Agent 正在调研…</div>
      <div class="rv-launch-steps">
        <div class="done">✓ 拉取实时投放数据</div>
        <div class="done">✓ 对比历史基线</div>
        <div class="run">⏳ 检索归因线索 + 生成报告…</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* ===== 发起复盘弹窗 ===== */
.rv-dlg-mask {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.45);
  z-index: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  animation: rvdlg 0.18s ease;
}
@keyframes rvdlg {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}
.rv-dlg {
  width: 520px;
  max-width: 92vw;
  background: #fff;
  border-radius: 14px;
  box-shadow: var(--shadow-lg);
  overflow: hidden;
  animation: rvpop 0.22s ease;
}
@keyframes rvpop {
  from {
    opacity: 0;
    transform: scale(0.96);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}
.rv-dlg-head {
  padding: 16px 20px;
  border-bottom: 1px solid var(--border-light);
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.rv-dlg-title {
  font-size: 16px;
  font-weight: 700;
  color: var(--gray-900);
}
.rv-dlg-close {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--gray-500);
  cursor: pointer;
}
.rv-dlg-close:hover {
  background: var(--gray-100);
}
.rv-dlg-body {
  padding: 20px;
}
.rv-dlg-foot {
  padding: 14px 20px;
  border-top: 1px solid var(--border-light);
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}
.rv-dlg-field {
  margin-bottom: 16px;
}
.rv-dlg-field:last-child {
  margin-bottom: 0;
}
.rv-dlg-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--gray-700);
  margin-bottom: 7px;
}
.rv-dlg-select {
  width: 100%;
  height: 36px;
  border: 1px solid var(--border-base);
  border-radius: 8px;
  padding: 0 12px;
  font-size: 13px;
  background: #fff;
  color: var(--gray-800);
}
.rv-seg {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}
.rv-seg-item {
  padding: 7px 14px;
  border: 1px solid var(--border-base);
  border-radius: 8px;
  font-size: 13px;
  color: var(--gray-700);
  background: #fff;
  cursor: pointer;
  transition: all 0.15s;
}
.rv-seg-item:hover {
  border-color: var(--brand-300);
}
.rv-seg-item.active {
  background: var(--brand-50);
  border-color: var(--brand-400);
  color: var(--brand-700);
  font-weight: 600;
}

/* ===== 调研中 overlay ===== */
.rv-launching {
  position: fixed;
  inset: 0;
  background: rgba(245, 247, 251, 0.92);
  z-index: 720;
  display: flex;
  align-items: center;
  justify-content: center;
}
.rv-launch-box {
  text-align: center;
}
.rv-launch-ring {
  width: 50px;
  height: 50px;
  border-radius: 50%;
  border: 4px solid var(--brand-100);
  border-top-color: var(--brand-600);
  margin: 0 auto 18px;
  animation: rvspin 0.8s linear infinite;
}
@keyframes rvspin {
  to {
    transform: rotate(360deg);
  }
}
.rv-launch-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--gray-900);
  margin-bottom: 16px;
}
.rv-launch-steps {
  display: inline-flex;
  flex-direction: column;
  gap: 8px;
  text-align: left;
  background: #fff;
  border: 1px solid var(--border-light);
  border-radius: 12px;
  padding: 14px 18px;
  font-size: 13px;
}
.rv-launch-steps .done {
  color: var(--success);
}
.rv-launch-steps .run {
  color: var(--brand-700);
  font-weight: 600;
}
@media (prefers-reduced-motion: reduce) {
  .rv-launch-ring {
    animation-duration: 1.6s;
  }
}

/* btn 系列已在全局 style.css 定义（含全局 button reset），弹窗内直接复用，不重复 */
</style>
