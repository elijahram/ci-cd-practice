/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_BUILD_SHA?: string;
  readonly VITE_BUILD_RUN_NUMBER?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
