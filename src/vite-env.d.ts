/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_IMAGE_UPLOADER_API_URL: string
  readonly VITE_PRODUCT_EXPORT_API_URL: string
  readonly VITE_PRODUCT_IMPORT_API_URL: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
