<script setup lang="ts">
/**
 * ErrorState —— DIAG-05 异常兜底（权威源 diagnose-styles.html DIAG-05）
 * 触发：非素材图 / 太模糊 / 识别失败，或前端拦截的【视频】/【非图片】上传。
 * 引导：① 重新上传清晰素材；② 文字描述违规让松鼠研判；③ 复杂情况转人工审核。
 * 文案随 store.errorReason 切换（video → 强调不支持视频、转文字 / 人工）。
 */
import { computed } from 'vue'
import { useDiagnoseStore } from '@/stores/diagnose'

const store = useDiagnoseStore()

/** 标题随原因切换 */
const title = computed(() => {
  if (store.errorReason === 'video') return '暂不支持视频诊断'
  if (store.errorReason === 'non_image') return '这不是可诊断的图片素材'
  return '没识别出可诊断的素材'
})

/** 正文引导随原因切换（视频特别强调转文字 / 人工） */
const desc = computed(() => store.errorMessage)

/** 重新上传 → 回空态重选 */
function retry() {
  store.reset()
}

/** 文字描述违规 → 转文字诊断（不传图） */
function describeByText() {
  store.upload([{ name: '文字描述素材.txt', type: 'text/plain' }], '用户文字描述的素材内容')
}

/** 转人工审核（落地反馈，无真实后端） */
function toHuman() {
  // 纯前端演示：实际会转交内容团队
  store.reset()
}
</script>

<template>
  <div class="diag-state-error">
    <div class="error-wrap">
      <div class="error-emoji">🔍</div>
      <div class="error-title">{{ title }}</div>
      <div class="error-desc">
        {{ desc }}
        <template v-if="store.errorReason === 'video'">
          <br />松鼠目前只看图片，读不了视频画面。你可以：①
          <b>文字描述</b>素材内容让松鼠研判；② 复杂情况转<b>人工审核</b>。
        </template>
        <template v-else>
          <br />你可以：① 换一张清晰素材重传；② 直接<b>文字描述</b>素材内容让松鼠研判；③
          复杂情况转<b>人工审核</b>。
        </template>
      </div>
      <div class="error-actions">
        <button class="btn btn-primary btn-sm" @click="retry">重新上传</button>
        <button class="btn btn-outline btn-sm" @click="describeByText">文字描述违规</button>
        <button class="btn btn-outline btn-sm" @click="toHuman">转人工审核</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* DIAG-05 异常兜底（权威源 diagnose-styles.html DIAG-05） */
.diag-state-error {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 46px 20px;
}
.error-wrap {
  width: 100%;
  max-width: 480px;
  text-align: center;
}
.error-emoji {
  font-size: 40px;
  margin-bottom: 12px;
  line-height: 1;
}
.error-title {
  font-size: 16px;
  font-weight: 700;
  color: var(--gray-800);
  margin-bottom: 8px;
}
.error-desc {
  font-size: 13px;
  color: var(--gray-500);
  line-height: 1.7;
  max-width: 440px;
  margin: 0 auto;
}
.error-desc b {
  color: var(--gray-700);
  font-weight: 600;
}
.error-actions {
  display: flex;
  gap: 8px;
  justify-content: center;
  margin-top: 18px;
  flex-wrap: wrap;
}
</style>
