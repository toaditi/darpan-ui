<template>
  <main class="page-root">
    <section class="module-intro">
      <p class="eyebrow">customer_access // linear_portal</p>
      <h1>Roadmap &amp; Requests</h1>
      <p class="muted-copy">
        Keep customers inside Darpan while they review roadmap context or open a new request through Linear.
      </p>
    </section>

    <FormSection
      title="Customer-facing Linear access"
      description="Roadmap and request entry points are driven by frontend environment configuration."
    >
      <div class="stack-lg">
        <article class="card portal-intro">
          <div class="stack-sm">
            <h3>How this surface behaves</h3>
            <p>
              Customers can use the cards below to review a customer-safe roadmap view and open a request without
              leaving Darpan. When embedding is disabled or blocked, the page still provides direct links.
            </p>
          </div>
          <div class="actions-tight">
            <RouterLink class="ghost-link" to="/">Back to Hub</RouterLink>
            <RouterLink class="ghost-link" to="/reconciliation/results">Open Results Workspace</RouterLink>
            <RouterLink class="ghost-link" to="/connections/llm">Open Connections</RouterLink>
          </div>
        </article>

        <article v-if="!hasConfiguredSurface" class="card setup-card">
          <div class="stack-sm">
            <h3>Configuration pending</h3>
            <p>
              No customer-safe Linear URLs are configured yet. Set one or both frontend env values below to activate
              this page for roadmap and request access.
            </p>
          </div>
          <ul class="portal-config-list">
            <li><code>VITE_DARPAN_LINEAR_ROADMAP_URL</code> for the customer roadmap page</li>
            <li><code>VITE_DARPAN_LINEAR_REQUEST_URL</code> for the customer request form</li>
            <li><code>VITE_DARPAN_LINEAR_EMBED_ENABLED=false</code> if the target page should open only in a new tab</li>
          </ul>
        </article>

        <div class="card-grid two">
          <article v-for="target in targets" :key="target.key" class="card portal-card">
            <div class="stack-sm">
              <p class="eyebrow">{{ target.eyebrow }}</p>
              <h3>{{ target.title }}</h3>
              <p>{{ target.description }}</p>
            </div>

            <InlineValidation v-if="!target.url" tone="info" :message="target.emptyMessage" />
            <InlineValidation
              v-else-if="!config.embedEnabled"
              tone="info"
              message="Embed mode is disabled by configuration. Use the direct link below to open Linear."
            />

            <div class="actions-tight">
              <a v-if="target.url" class="ghost-link" :href="target.url" target="_blank" rel="noreferrer">
                {{ target.linkLabel }}
              </a>
              <RouterLink v-else class="ghost-link" to="/schemas/library">Open Schema Studio</RouterLink>
            </div>

            <div v-if="target.url && config.embedEnabled" class="embed-shell">
              <div class="embed-banner">
                <p>
                  Embedded content depends on the target Linear page allowing framing. If the panel stays blank, use the
                  direct link above.
                </p>
              </div>
              <iframe
                class="linear-frame"
                :src="target.url"
                :title="`${target.title} via Linear`"
                loading="lazy"
                referrerpolicy="no-referrer"
              />
            </div>
          </article>
        </div>

        <article class="card">
          <div class="stack-sm">
            <h3>Customer-safety guardrail</h3>
            <p>
              Configure only public or customer-safe Linear pages here. Internal workspace administration views,
              triage-only boards, and non-customer-safe issue lists should not be exposed through this surface.
            </p>
          </div>
        </article>
      </div>
    </FormSection>
  </main>
</template>

<script setup lang="ts">
import { RouterLink } from 'vue-router'
import FormSection from '../components/ui/FormSection.vue'
import InlineValidation from '../components/ui/InlineValidation.vue'
import { getLinearPortalConfig, type LinearPortalConfig } from '../lib/linearAccess'

type LinearPortalTarget = {
  key: 'roadmap' | 'request'
  eyebrow: string
  title: string
  description: string
  linkLabel: string
  url: string | null
  emptyMessage: string
}

const config: LinearPortalConfig = getLinearPortalConfig(import.meta.env)

const targets: LinearPortalTarget[] = [
  {
    key: 'roadmap',
    eyebrow: 'Customer roadmap',
    title: 'See what is planned',
    description: 'Expose a customer-safe Linear roadmap so customers can review delivery direction from inside Darpan.',
    linkLabel: 'Open Roadmap',
    url: config.roadmapUrl,
    emptyMessage: 'Set VITE_DARPAN_LINEAR_ROADMAP_URL to enable the roadmap surface.',
  },
  {
    key: 'request',
    eyebrow: 'Customer requests',
    title: 'Open a new request',
    description: 'Route customers to a Linear request form or public intake page without sending them into internal tools.',
    linkLabel: 'Open Request Form',
    url: config.requestUrl,
    emptyMessage: 'Set VITE_DARPAN_LINEAR_REQUEST_URL to enable customer request intake.',
  },
]

const hasConfiguredSurface = targets.some((target) => target.url !== null)
</script>

<style scoped>
.portal-intro,
.setup-card,
.portal-card {
  display: grid;
  gap: var(--space-3);
}

.portal-config-list {
  margin: 0;
  padding-left: 1.2rem;
  display: grid;
  gap: var(--space-2);
  color: var(--text-soft);
}

.embed-shell {
  display: grid;
  border: 1px solid var(--border-soft);
  border-radius: var(--radius-md);
  overflow: hidden;
  background: var(--surface-2);
}

.embed-banner {
  padding: var(--space-2) var(--space-3);
  border-bottom: 1px solid var(--border-soft);
}

.embed-banner p {
  margin: 0;
  font-size: 0.82rem;
  color: var(--text-soft);
}

.linear-frame {
  width: 100%;
  min-height: 480px;
  border: 0;
  background: #ffffff;
}

@media (max-width: 768px) {
  .linear-frame {
    min-height: 360px;
  }
}
</style>
