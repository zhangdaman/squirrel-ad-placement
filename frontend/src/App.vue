<script setup lang="ts">
/**
 * 应用根组件：登录页用空布局，其余页面套共享外壳 AppShell。
 * 由 route.meta.layout 控制（login => 'blank'）。
 */
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import AppShell from '@/components/AppShell.vue'

const route = useRoute()
const isBlank = computed(() => route.meta.layout === 'blank')
</script>

<template>
  <router-view v-if="isBlank" />
  <AppShell v-else />
</template>
