<template>
  <main class="page-root narrow">
    <FormSection title="Authentication Required" description="Platform services require an authenticated admin session.">
      <div class="stack-lg">
        <InlineValidation tone="error" :message="errorText" />
        <p class="muted-copy">
          Sign in to Darpan backend and refresh this page.
        </p>
      </div>
    </FormSection>
  </main>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useAuthState } from '../lib/auth'
import FormSection from '../components/ui/FormSection.vue'
import InlineValidation from '../components/ui/InlineValidation.vue'

const authState = useAuthState()

const errorText = computed(() => authState.error ?? 'No active authenticated session detected.')
</script>
