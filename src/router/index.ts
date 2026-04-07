import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import { ensureAuthenticated } from '../lib/auth'

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
    meta: { requiresAuth: true },
  },
  {
    path: '/roadmap/reconciliation',
    name: 'roadmap-reconciliation',
    component: () => import('../pages/ReconciliationPlaceholderPage.vue'),
    meta: { requiresAuth: true, section: 'roadmap' },
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
        meta: { section: 'connections' },
      },
      {
        path: 'sftp',
        name: 'connections-sftp',
        component: () => import('../pages/settings/SftpServersPage.vue'),
        meta: { section: 'connections' },
      },
      {
        path: 'netsuite/auth',
        name: 'connections-netsuite-auth',
        component: () => import('../pages/settings/NetSuiteAuthPage.vue'),
        meta: { section: 'connections' },
      },
      {
        path: 'netsuite/endpoints',
        name: 'connections-netsuite-endpoints',
        component: () => import('../pages/settings/NetSuiteEndpointsPage.vue'),
        meta: { section: 'connections' },
      },
      {
        path: 'read-db',
        name: 'connections-read-db',
        component: () => import('../pages/settings/HcReadDbPage.vue'),
        meta: { section: 'connections' },
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
        meta: { section: 'schemas' },
      },
      {
        path: 'infer',
        name: 'schemas-infer',
        component: () => import('../pages/jsonschema/JsonSchemaWizardPage.vue'),
        meta: { section: 'schemas' },
      },
      {
        path: 'editor/:jsonSchemaId?',
        name: 'schemas-editor',
        component: () => import('../pages/jsonschema/JsonSchemaEditorPage.vue'),
        props: true,
        meta: { section: 'schemas' },
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

  return {
    name: 'login',
    query: {
      redirect: to.fullPath,
    },
  }
})

export default router
