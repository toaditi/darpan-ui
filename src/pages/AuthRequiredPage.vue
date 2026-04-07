<template>
  <main class="page-root narrow">
    <FormSection :title="pageTitle" :description="pageDescription">
      <div class="stack-lg">
        <InlineValidation tone="error" :message="errorText" />
        <div class="action-row">
          <button type="button" @click="retry">Retry</button>
          <button v-if="showLoginAction" type="button" @click="goToLogin">Sign In</button>
        </div>
      </div>
    </FormSection>
  </main>
</template>

<script setup lang="ts">
import { computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthState } from '../lib/auth'
import FormSection from '../components/ui/FormSection.vue'
import InlineValidation from '../components/ui/InlineValidation.vue'
import { resolveInternalRedirectTarget } from '../lib/navigation'

const authState = useAuthState()
const route = useRoute()
const router = useRouter()

const redirectTarget = computed(() => resolveInternalRedirectTarget(route.query.redirect))
const showLoginAction = computed(() => authState.status !== 'verification-failed')
const pageTitle = computed(() => (authState.status === 'verification-failed' ? 'Session Check Failed' : 'Authentication Required'))
const pageDescription = computed(() =>
  authState.status === 'verification-failed'
    ? 'Darpan could not verify your session on refresh. Retry the session check instead of signing in again.'
    : 'Sign in to continue to the requested page.',
)
const errorText = computed(() =>
  authState.error ?? (authState.status === 'verification-failed' ? 'Unable to verify authentication' : 'No active authenticated session detected.'),
)

watch(
  () => authState.status,
  async (status) => {
    if (status === 'authenticated') {
      await router.replace(redirectTarget.value)
      return
    }

    if (status === 'unauthenticated') {
      await router.replace({
        name: 'login',
        query: {
          redirect: redirectTarget.value,
        },
      })
    }
  },
  { immediate: true },
)

async function retry(): Promise<void> {
  await router.replace(redirectTarget.value)
}

async function goToLogin(): Promise<void> {
  await router.replace({
    name: 'login',
    query: {
      redirect: redirectTarget.value,
    },
  })
}
</script>
