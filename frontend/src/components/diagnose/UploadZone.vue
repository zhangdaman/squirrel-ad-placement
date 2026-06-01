<script setup lang="ts">
/**
 * UploadZone —— DIAG-01 空态 · 上传入口（权威源 diagnose-styles.html DIAG-01）
 * - 拖拽 / 点击上传图片（可多张）；隐藏 <input accept="image/*"> 取真实 File
 * - 「文字描述违规」入口：转文字诊断（不传图，走单图 mock）
 * - 视频 / 非图：交由 store.upload → service 统一拦截 → 进 error 态引导（不调后端）
 *   这里仅承担选择与触发，拦截判定与引导收口在 service / ErrorState。
 */
import { ref } from 'vue'
import { useDiagnoseStore } from '@/stores/diagnose'

const store = useDiagnoseStore()
const fileInput = ref<HTMLInputElement | null>(null)
const dragOver = ref(false)

/** 点击拖拽区 → 弹系统文件选择 */
function pickFiles() {
  fileInput.value?.click()
}

/** 选中文件 → 交给 store（含视频 / 非图拦截） */
function onFiles(fileList: FileList | null) {
  if (!fileList || fileList.length === 0) return
  const files = Array.from(fileList).map((f) => ({
    name: f.name,
    type: f.type,
    size: f.size,
  }))
  store.upload(files)
}

function onInputChange(e: Event) {
  const input = e.target as HTMLInputElement
  onFiles(input.files)
  input.value = '' // 允许重复选同一文件再次触发
}

function onDrop(e: DragEvent) {
  dragOver.value = false
  onFiles(e.dataTransfer?.files ?? null)
}

/** 文字描述违规 → 转文字诊断（演示：单图报告，不传图） */
function describeByText() {
  store.upload([{ name: '文字描述素材.txt', type: 'text/plain' }], '用户文字描述的素材内容')
}

/** 粘贴拒审截图（演示：等价单图上传一张 rejected 截图） */
function pasteScreenshot() {
  store.upload([{ name: '拒审截图.png', type: 'image/png', size: 1024 }])
}
</script>

<template>
  <div class="diag-state-empty">
    <div class="upload-hero">
      <div class="hero-title">素材合规诊断</div>
      <div class="hero-sub">
        提审前先扫一遍，或诊断已被拒的图片 —— 把图片交给松鼠，自动定位风险点并给出可执行的修改方案
      </div>

      <!-- 拖拽 / 点击上传 -->
      <div
        class="drop-zone"
        :class="{ 'drop-over': dragOver }"
        role="button"
        tabindex="0"
        @click="pickFiles"
        @keydown.enter="pickFiles"
        @dragover.prevent="dragOver = true"
        @dragleave.prevent="dragOver = false"
        @drop.prevent="onDrop"
      >
        <div class="dz-icon">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <circle cx="9" cy="9" r="2" />
            <path d="M21 15l-5-5L5 21" />
          </svg>
        </div>
        <div class="dz-main">拖拽图片到这里，或<span>点击上传（可多张）</span></div>
        <div class="dz-sub">支持 JPG / PNG / 拒审截图 · 可一次上传多张 · 单张 20MB 内</div>
      </div>

      <input
        ref="fileInput"
        type="file"
        accept="image/*"
        multiple
        hidden
        @change="onInputChange"
      />

      <!-- 其他方式 -->
      <div class="upload-alt">
        <span class="alt-label">或用其他方式：</span>
        <button class="alt-btn" @click="pasteScreenshot">粘贴拒审截图</button>
        <button class="alt-btn" @click="describeByText">文字描述违规</button>
      </div>

      <!-- 自动识别提示 -->
      <div class="auto-detect-hint">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 2l2.4 7.4H22l-6 4.6 2.3 7-6.3-4.6L5.7 21l2.3-7-6-4.6h7.6z" />
        </svg>
        <span>松鼠会自动识别：<b>待审素材</b> → 合规预检；<b>已拒素材</b> → 拒审归因 + 修改方案</span>
      </div>

    </div>
  </div>
</template>

<style scoped>
.diag-state-empty {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px 24px;
}
.upload-hero {
  width: 100%;
  max-width: 560px;
  text-align: center;
}
.hero-title { font-size: 22px; font-weight: 700; color: var(--gray-900); margin-bottom: 8px; }
.hero-sub { font-size: 13px; color: var(--gray-500); line-height: 1.7; margin-bottom: 24px; }
.drop-zone {
  border: 2px dashed var(--border-base);
  border-radius: 14px;
  background: #fff;
  padding: 40px 24px;
  cursor: pointer;
  transition: all .18s;
}
.drop-zone:hover, .drop-zone.drop-over { border-color: var(--brand-400); background: var(--brand-50); }
.dz-icon {
  width: 52px; height: 52px;
  margin: 0 auto 14px;
  border-radius: 12px;
  background: var(--brand-50);
  color: var(--brand-600);
  display: flex; align-items: center; justify-content: center;
}
.drop-zone.drop-over .dz-icon { background: var(--brand-100); }
.dz-main { font-size: 14px; color: var(--gray-700); font-weight: 500; margin-bottom: 6px; }
.dz-main span { color: var(--brand-600); font-weight: 600; }
.dz-sub { font-size: 12px; color: var(--gray-400); }
.upload-alt { display: flex; align-items: center; justify-content: center; gap: 10px; margin-top: 20px; }
.alt-label { font-size: 13px; color: var(--gray-500); }
.alt-btn {
  padding: 6px 14px;
  border: 1px solid var(--border-base);
  border-radius: 8px;
  background: #fff;
  font-size: 13px; color: var(--gray-700);
  cursor: pointer; transition: all .15s;
}
.alt-btn:hover { border-color: var(--brand-300); color: var(--brand-700); background: var(--brand-50); }
.auto-detect-hint {
  display: inline-flex; align-items: center; gap: 8px;
  margin-top: 22px;
  padding: 9px 16px;
  background: var(--gray-50);
  border: 1px solid var(--border-light);
  border-radius: 999px;
  font-size: 12px; color: var(--gray-600);
}
.auto-detect-hint svg { color: var(--brand-500); flex-shrink: 0; }
.auto-detect-hint b { color: var(--gray-800); font-weight: 600; }
</style>
