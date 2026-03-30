/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_DARPAN_LINEAR_ROADMAP_URL?: string
  readonly VITE_DARPAN_LINEAR_REQUEST_URL?: string
  readonly VITE_DARPAN_LINEAR_EMBED_ENABLED?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
