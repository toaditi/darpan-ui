<template>
  <main class="page-root">
    <FormSection
      title="Reconciliation Roadmap"
      description="Wave 1 keeps reconciliation as roadmap context while connection and schema prerequisites stabilize."
    >
      <div class="stack-md">
        <article class="card">
          <h3>Current state</h3>
          <p>
            Reconciliation UI is intentionally not active yet. Use the Connections and Schema Studio modules to complete
            prerequisite setup.
          </p>
        </article>
        <article class="card">
          <h3>Planned rollout</h3>
          <p>
            Upcoming delivery will introduce mapping, compare, and operational review surfaces on top of existing
            backend reconciliation services.
          </p>
        </article>
        <div class="actions-tight">
          <RouterLink class="ghost-link" to="/">Back to Hub</RouterLink>
          <RouterLink class="ghost-link" to="/connections/llm">Open Connections</RouterLink>
          <RouterLink class="ghost-link" to="/schemas/library">Open Schema Studio</RouterLink>
        </div>
      </div>
    </FormSection>
  </main>
</template>

<script setup lang="ts">
import { RouterLink } from 'vue-router'
import FormSection from '../components/ui/FormSection.vue'
</script>
