import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import { buildAuthRedirect, ensureAuthenticated } from '../lib/auth'

const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'login',
    component: () => import('../pages/LoginPage.vue'),
    meta: { public: true },
  },
  {
    path: '/',
    name: 'hub',
    component: () => import('../pages/HomePage.vue'),
    meta: { requiresAuth: true, surfaceMode: 'static', staticPageLabel: 'Dashboard' },
  },
  {
    path: '/roadmap/reconciliation',
    name: 'roadmap-reconciliation',
    component: () => import('../pages/ReconciliationPlaceholderPage.vue'),
    meta: { requiresAuth: true, section: 'roadmap', staticPageLabel: 'Reconciliation Roadmap' },
  },
  {
    path: '/reconciliation/pilot-diff',
    name: 'reconciliation-pilot-diff',
    component: () => import('../pages/reconciliation/PilotGenericDiffPage.vue'),
    meta: { requiresAuth: true, section: 'reconciliation', surfaceMode: 'workflow' },
  },
  {
    path: '/reconciliation/run-result/:runScopeId/:outputFileName',
    name: 'reconciliation-run-result',
    component: () => import('../pages/reconciliation/ReconciliationRunResultPage.vue'),
    meta: { requiresAuth: true, section: 'reconciliation', surfaceMode: 'static', staticPageLabel: 'Run Result' },
  },
  {
    path: '/reconciliation/create',
    name: 'reconciliation-create',
    component: () => import('../pages/reconciliation/ReconciliationCreateFlowPage.vue'),
    meta: { requiresAuth: true, section: 'reconciliation', surfaceMode: 'workflow' },
  },
  {
    path: '/reconciliation/run-history/:runScopeId',
    name: 'reconciliation-run-history',
    component: () => import('../pages/reconciliation/ReconciliationRunHistoryPage.vue'),
    meta: { requiresAuth: true, section: 'reconciliation', surfaceMode: 'static', staticPageLabel: 'Run History' },
  },
  {
    path: '/connections',
    redirect: { name: 'settings-ai' },
  },
  {
    path: '/connections/llm',
    name: 'connections-llm',
    redirect: { name: 'settings-ai' },
  },
  {
    path: '/connections/sftp',
    name: 'connections-sftp',
    redirect: (to) => {
      if (String(to.query.focus ?? '') === 'create') {
        return { name: 'settings-sftp-create' }
      }
      return { name: 'settings-sftp' }
    },
  },
  {
    path: '/connections/netsuite/auth',
    name: 'connections-netsuite-auth',
    redirect: { name: 'settings-netsuite' },
  },
  {
    path: '/connections/netsuite/endpoints',
    name: 'connections-netsuite-endpoints',
    redirect: { name: 'settings-netsuite' },
  },
  {
    path: '/connections/netsuite',
    name: 'connections-netsuite',
    redirect: { name: 'settings-netsuite' },
  },
  {
    path: '/connections/runs',
    name: 'connections-runs',
    redirect: { name: 'settings-runs' },
  },
  {
    path: '/settings/ai',
    name: 'settings-ai',
    component: () => import('../pages/settings/LlmSettingsPage.vue'),
    meta: { requiresAuth: true, section: 'connections', surfaceMode: 'static', staticPageLabel: 'AI' },
  },
  {
    path: '/settings/ai/create',
    name: 'settings-ai-create',
    component: () => import('../pages/settings/LlmSettingsWorkflowPage.vue'),
    meta: { requiresAuth: true, section: 'connections', surfaceMode: 'workflow' },
  },
  {
    path: '/settings/ai/edit/:llmProvider',
    name: 'settings-ai-edit',
    component: () => import('../pages/settings/LlmSettingsWorkflowPage.vue'),
    props: true,
    meta: { requiresAuth: true, section: 'connections', surfaceMode: 'workflow' },
  },
  {
    path: '/settings/netsuite',
    name: 'settings-netsuite',
    component: () => import('../pages/settings/NetSuiteSettingsPage.vue'),
    meta: { requiresAuth: true, section: 'connections', surfaceMode: 'static', staticPageLabel: 'NetSuite' },
  },
  {
    path: '/settings/runs',
    name: 'settings-runs',
    component: () => import('../pages/settings/RunsSettingsPage.vue'),
    meta: { requiresAuth: true, section: 'connections', surfaceMode: 'static', staticPageLabel: 'Run Editor' },
  },
  {
    path: '/settings/runs/edit/:reconciliationMappingId',
    name: 'settings-runs-edit',
    component: () => import('../pages/settings/RunsSettingsWorkflowPage.vue'),
    props: true,
    meta: { requiresAuth: true, section: 'connections', surfaceMode: 'workflow' },
  },
  {
    path: '/settings/sftp',
    name: 'settings-sftp',
    component: () => import('../pages/settings/SftpServersPage.vue'),
    meta: { requiresAuth: true, section: 'connections', surfaceMode: 'static', staticPageLabel: 'SFTP Servers' },
  },
  {
    path: '/settings/sftp/create',
    name: 'settings-sftp-create',
    component: () => import('../pages/settings/SftpServerWorkflowPage.vue'),
    meta: { requiresAuth: true, section: 'connections', surfaceMode: 'workflow' },
  },
  {
    path: '/settings/sftp/edit/:sftpServerId',
    name: 'settings-sftp-edit',
    component: () => import('../pages/settings/SftpServerWorkflowPage.vue'),
    props: true,
    meta: { requiresAuth: true, section: 'connections', surfaceMode: 'workflow' },
  },
  {
    path: '/settings/netsuite/auth/create',
    name: 'settings-netsuite-auth-create',
    component: () => import('../pages/settings/NetSuiteAuthWorkflowPage.vue'),
    meta: { requiresAuth: true, section: 'connections', surfaceMode: 'workflow' },
  },
  {
    path: '/settings/netsuite/auth/edit/:nsAuthConfigId',
    name: 'settings-netsuite-auth-edit',
    component: () => import('../pages/settings/NetSuiteAuthWorkflowPage.vue'),
    props: true,
    meta: { requiresAuth: true, section: 'connections', surfaceMode: 'workflow' },
  },
  {
    path: '/settings/netsuite/endpoints/create',
    name: 'settings-netsuite-endpoints-create',
    component: () => import('../pages/settings/NetSuiteEndpointWorkflowPage.vue'),
    meta: { requiresAuth: true, section: 'connections', surfaceMode: 'workflow' },
  },
  {
    path: '/settings/netsuite/endpoints/edit/:nsRestletConfigId',
    name: 'settings-netsuite-endpoints-edit',
    component: () => import('../pages/settings/NetSuiteEndpointWorkflowPage.vue'),
    props: true,
    meta: { requiresAuth: true, section: 'connections', surfaceMode: 'workflow' },
  },
  {
    path: '/schemas',
    redirect: { name: 'schemas-library' },
  },
  {
    path: '/schemas/library',
    name: 'schemas-library',
    component: () => import('../pages/jsonschema/JsonSchemaBrowsePage.vue'),
    meta: { requiresAuth: true, section: 'schemas', surfaceMode: 'static', staticPageLabel: 'Schema Library' },
  },
  {
    path: '/schemas/create',
    name: 'schemas-create',
    component: () => import('../pages/jsonschema/JsonSchemaWizardPage.vue'),
    meta: { requiresAuth: true, section: 'schemas', surfaceMode: 'workflow' },
  },
  {
    path: '/schemas/infer',
    redirect: { name: 'schemas-create' },
  },
  {
    path: '/schemas/editor/:jsonSchemaId?',
    name: 'schemas-editor',
    component: () => import('../pages/jsonschema/JsonSchemaEditorPage.vue'),
    props: true,
    meta: { requiresAuth: true, section: 'schemas', surfaceMode: 'static', staticPageLabel: 'Schema Editor' },
  },
  {
    path: '/schemas/edit/:jsonSchemaId',
    redirect: (to) => ({
      name: 'schemas-editor',
      params: {
        jsonSchemaId: to.params.jsonSchemaId,
      },
    }),
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: { name: 'hub' },
  },
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
  scrollBehavior() {
    return { top: 0 }
  },
})

router.beforeEach(async (to) => {
  if (to.meta.public === true) return true
  if (to.meta.requiresAuth !== true) return true

  const authenticated = await ensureAuthenticated(true)
  if (authenticated) return true
  return buildAuthRedirect(to.fullPath)
})

export default router
