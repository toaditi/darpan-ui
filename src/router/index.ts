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
    path: '/auth-required',
    name: 'auth-required',
    component: () => import('../pages/AuthRequiredPage.vue'),
    meta: { public: true },
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
    path: '/reconciliation/run-result/:reconciliationMappingId/:outputFileName',
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
    path: '/reconciliation/run-history/:reconciliationMappingId',
    name: 'reconciliation-run-history',
    component: () => import('../pages/reconciliation/ReconciliationRunHistoryPage.vue'),
    meta: { requiresAuth: true, section: 'reconciliation', surfaceMode: 'static', staticPageLabel: 'Run History' },
  },
  {
    path: '/connections',
    component: () => import('../pages/settings/SettingsLayoutPage.vue'),
    meta: { requiresAuth: true, section: 'connections' },
    children: [
      {
        path: '',
        redirect: { name: 'connections-llm' },
      },
      {
        path: 'llm',
        name: 'connections-llm',
        component: () => import('../pages/settings/LlmSettingsPage.vue'),
        meta: { section: 'connections', staticPageLabel: 'LLM Settings' },
      },
      {
        path: 'sftp',
        name: 'connections-sftp',
        component: () => import('../pages/settings/SftpServersPage.vue'),
        meta: { section: 'connections', staticPageLabel: 'SFTP Servers' },
      },
      {
        path: 'netsuite/auth',
        name: 'connections-netsuite-auth',
        component: () => import('../pages/settings/NetSuiteAuthPage.vue'),
        meta: { section: 'connections', staticPageLabel: 'NetSuite Auth' },
      },
      {
        path: 'netsuite/endpoints',
        name: 'connections-netsuite-endpoints',
        component: () => import('../pages/settings/NetSuiteEndpointsPage.vue'),
        meta: { section: 'connections', staticPageLabel: 'NetSuite Endpoints' },
      },
    ],
  },
  {
    path: '/schemas',
    component: () => import('../pages/jsonschema/JsonSchemaLayoutPage.vue'),
    meta: { requiresAuth: true, section: 'schemas' },
    children: [
      {
        path: '',
        redirect: { name: 'schemas-library' },
      },
      {
        path: 'library',
        name: 'schemas-library',
        component: () => import('../pages/jsonschema/JsonSchemaBrowsePage.vue'),
        meta: { section: 'schemas', staticPageLabel: 'Schema Library' },
      },
      {
        path: 'infer',
        name: 'schemas-infer',
        component: () => import('../pages/jsonschema/JsonSchemaWizardPage.vue'),
        meta: { section: 'schemas', staticPageLabel: 'Schema Infer' },
      },
      {
        path: 'editor/:jsonSchemaId?',
        name: 'schemas-editor',
        component: () => import('../pages/jsonschema/JsonSchemaEditorPage.vue'),
        props: true,
        meta: { section: 'schemas', staticPageLabel: 'Schema Editor' },
      },
    ],
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
