/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string
  readonly VITE_OTHER_KEY?: string
  // add more variables here...
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
