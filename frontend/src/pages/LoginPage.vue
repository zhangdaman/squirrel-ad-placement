<script setup lang="ts">
/**
 * 登录页（P01 入口）—— FE-01 Mock 登录
 * 任意非空账号密码即登录成功；选择角色决定锁定平台与全站视角。
 * 登录后写 token / role / platform 到 localStorage，跳默认首页（智能问答）。
 * 登录页不套外壳（见 App.vue）。
 */
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { usePlatformStore } from '@/stores/platform'
import { useRoleStore } from '@/stores/role'
import { ROLE_OPTIONS } from '@/stores/role'
import type { RoleKey } from '@/types/role'
import type { PlatformKey } from '@/types/platform'

const router = useRouter()
const authStore = useAuthStore()
const platformStore = usePlatformStore()
const roleStore = useRoleStore()

const username = ref('qianxt')
const password = ref('demo')
const role = ref<RoleKey>('toushou')
const submitting = ref(false)
const error = ref('')

/** admin 默认全平台，其余锁定巨量（投手等单平台口径） */
const defaultPlatformFor = (r: RoleKey): PlatformKey => (r === 'admin' ? 'all' : 'juliang')

const canSubmit = computed(() => username.value.trim() && password.value.trim() && !submitting.value)

async function onSubmit() {
  if (!canSubmit.value) return
  error.value = ''
  submitting.value = true
  try {
    const platform = defaultPlatformFor(role.value)
    await authStore.login({ username: username.value.trim(), password: password.value }, role.value, platform)
    // 同步本地全局态（store 内已写 localStorage，这里刷新内存态）
    roleStore.setRole(role.value)
    platformStore.setPlatform(platform)
    await platformStore.loadPlatforms()
    router.replace('/')
  } catch (e) {
    error.value = '登录失败，请重试'
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="login-wrap">
    <div class="login-card">
      <div class="login-brand">
        <div class="brand-logo">
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M12 2l3 6 6 1-4.5 4 1 6L12 16l-5.5 3 1-6L3 9l6-1z" />
          </svg>
        </div>
        <div>
          <div class="login-title">松鼠投放</div>
          <div class="login-sub">AI 广告投放助手</div>
        </div>
      </div>

      <form class="login-form" @submit.prevent="onSubmit">
        <label class="field">
          <span class="field-label">账号</span>
          <input v-model="username" class="input input-lg" type="text" placeholder="账号" autocomplete="username" />
        </label>

        <label class="field">
          <span class="field-label">密码</span>
          <input v-model="password" class="input input-lg" type="password" placeholder="密码" autocomplete="current-password" />
        </label>

        <label class="field">
          <span class="field-label">登录视角</span>
          <select v-model="role" class="input input-lg">
            <option v-for="r in ROLE_OPTIONS" :key="r.key" :value="r.key">{{ r.name }}</option>
          </select>
        </label>

        <p v-if="error" class="login-error">{{ error }}</p>

        <button class="btn btn-primary btn-lg w-full" type="submit" :disabled="!canSubmit">
          {{ submitting ? '登录中…' : '登录' }}
        </button>

        <p class="login-hint">FE-01 演示：任意非空账号密码均可登录，视角决定锁定平台与导航。</p>
      </form>
    </div>
  </div>
</template>

<style scoped>
.login-wrap {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background:
    radial-gradient(circle at 85% 12%, rgba(37, 99, 235, 0.12), transparent 45%),
    radial-gradient(circle at 12% 88%, rgba(94, 137, 246, 0.1), transparent 45%),
    var(--bg-page);
}
.login-card {
  width: 380px;
  max-width: 100%;
  background: #fff;
  border: 1px solid var(--border-base);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-lg);
  padding: 28px 28px 24px;
}
.login-brand { display: flex; align-items: center; gap: 12px; margin-bottom: 22px; }
.login-title { font-size: 18px; font-weight: 700; color: var(--gray-900); letter-spacing: 0.5px; }
.login-sub { font-size: 12px; color: var(--gray-500); margin-top: 2px; display: flex; align-items: center; gap: 6px; }
.login-form { display: flex; flex-direction: column; gap: 14px; }
.field { display: flex; flex-direction: column; gap: 6px; }
.field-label { font-size: 12px; color: var(--gray-600); font-weight: 500; }
.login-error { font-size: 12px; color: var(--danger); margin: -4px 0 0; }
.login-hint { font-size: 11px; color: var(--gray-400); margin: 4px 0 0; line-height: 1.5; }
select.input { appearance: none; background: #fff; cursor: pointer; }
</style>
