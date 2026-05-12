import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import { initTheme } from './composables/useTheme'
import { setApiCacheReset } from './lib/api/facade'
import { useReferenceDataStore } from './stores/referenceData'
import { useRunResultsStore } from './stores/runResults'
import './style.css'

initTheme()

const pinia = createPinia()

// Wire the API cache-reset coordinator. `clearApiResponseCache()` (called by
// auth.ts on login / logout / tenant switch) will now reset every prefetch
// cache via this hook.
setApiCacheReset(() => {
  useReferenceDataStore(pinia).reset()
  useRunResultsStore(pinia).reset()
})

createApp(App)
  .use(pinia)
  .use(router)
  .mount('#app')
