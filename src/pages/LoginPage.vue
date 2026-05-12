<template>
  <main class="login-page">
    <section class="login-panel">
      <p class="eyebrow">Darpan</p>
      <h1>Sign In</h1>

      <form class="stack-md" @submit.prevent="submit" @keydown.enter="requestSubmitOnEnter">
        <label>
          <span>Username</span>
          <input v-model="username" type="text" autocomplete="username" required />
        </label>

        <label>
          <span>Password</span>
          <input v-model="password" type="password" autocomplete="current-password" required />
        </label>

        <div class="action-row">
          <button type="submit" :disabled="loading">Sign In</button>
        </div>
      </form>

      <InlineValidation v-if="errorText" tone="error" :message="errorText" />
    </section>
  </main>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import InlineValidation from '../components/ui/InlineValidation.vue'
import { useAuthStore } from '../stores/auth'
import { requestSubmitOnEnter } from '../lib/keyboard'
import { resolveInternalRedirectTarget } from '../lib/navigation'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const username = ref('')
const password = ref('')
const loading = ref(false)
const localError = ref<string | null>(null)

const INITIAL_UNAUTHENTICATED_MESSAGE = 'No active authenticated session detected.'

const errorText = computed(() => {
  if (localError.value) return localError.value
  if (authStore.status === 'unauthenticated' && authStore.error === INITIAL_UNAUTHENTICATED_MESSAGE) return null
  return authStore.error
})

function hasRedirectQuery(): boolean {
  return Object.prototype.hasOwnProperty.call(route.query, 'redirect')
}

function cleanupLoginSelfRedirect(): void {
  if (!hasRedirectQuery()) return

  const redirectTarget = resolveInternalRedirectTarget(route.query.redirect)
  if (redirectTarget !== '/') return

  void router.replace({ name: 'login' })
}

onMounted(cleanupLoginSelfRedirect)
watch(() => route.query.redirect, cleanupLoginSelfRedirect)

async function submit(): Promise<void> {
  loading.value = true
  localError.value = null
  try {
    const authenticated = await authStore.loginWithCredentials(username.value, password.value)
    if (!authenticated) {
      localError.value = authStore.error ?? 'Invalid username or password.'
      return
    }

    const redirectTarget = resolveInternalRedirectTarget(route.query.redirect)
    await router.replace(redirectTarget)
  } finally {
    loading.value = false
  }
}
</script>
