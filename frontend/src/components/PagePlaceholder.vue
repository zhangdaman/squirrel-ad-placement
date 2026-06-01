<script setup lang="ts">
/**
 * 页面占位骨架（FE-01 外壳阶段用，FE-02+ 各页填充真实内容后替换）
 * 统一展示标题 / 副标题 / [Mock] 标识，套用 design-system .page-header。
 */
defineProps<{
  title: string
  subtitle?: string
  /** 该页对应的 PRD 编号，如 P02 */
  code?: string
}>()
</script>

<template>
  <div>
    <div class="page-header">
      <div>
        <div class="page-title">
          {{ title }}
          <span v-if="code" class="tag tag-gray">{{ code }}</span>
        </div>
        <div v-if="subtitle" class="page-subtitle">{{ subtitle }}</div>
      </div>
    </div>

    <div class="card">
      <div class="card-title">页面建设中</div>
      <p class="text-muted mt-2">
        本页为 FE-01 共享外壳阶段的占位组件，左导航、顶栏、平台 / 视角全局切换均已接入。
        具体业务内容将在后续任务（FE-02 及之后）按原型与契约填充。
      </p>
      <slot />
    </div>
  </div>
</template>
