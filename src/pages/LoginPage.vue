<template>
  <main class="login-page">
    <section class="login-panel">
      <p class="eyebrow">Darpan</p>
      <h1>Sign In</h1>
      <p class="muted-copy">
        Sign in to access Darpan. Backend screens are admin-only.
      </p>

      <form class="stack-md" @submit.prevent="submit">
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
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import InlineValidation from '../components/ui/InlineValidation.vue'
import { loginWithCredentials, useAuthState } from '../lib/auth'
import { resolveInternalRedirectTarget } from '../lib/navigation'

const route = useRoute()
const router = useRouter()
const authState = useAuthState()

const username = ref('')
const password = ref('')
const loading = ref(false)
const localError = ref<string | null>(null)

const errorText = computed(() => localError.value ?? authState.error)

async function submit(): Promise<void> {
  loading.value = true
  localError.value = null
  try {
    const authenticated = await loginWithCredentials(username.value, password.value)
    if (!authenticated) {
      localError.value = authState.error ?? 'Invalid username or password.'
      return
    }

    const redirectTarget = resolveInternalRedirectTarget(route.query.redirect)
    await router.replace(redirectTarget)
  } finally {
    loading.value = false
  }
}
</script>
