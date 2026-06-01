<script setup lang="ts">
/**
 * 共享外壳：左导航 + 顶栏 + 主内容区（router-view）
 * 登录页不套壳（见 App.vue），其余页面统一套此外壳。
 */
import AppSidebar from './AppSidebar.vue'
import AppTopbar from './AppTopbar.vue'
</script>

<template>
  <div class="app">
    <AppSidebar />
    <div class="main">
      <AppTopbar />
      <div class="content">
        <router-view />
      </div>
    </div>
  </div>
</template>
