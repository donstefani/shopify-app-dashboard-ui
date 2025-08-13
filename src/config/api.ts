// API Configuration for different automation apps
export const API_CONFIG = {
  imageUploader: {
    baseUrl: import.meta.env.VITE_IMAGE_UPLOADER_API_URL || 'https://63h826pqe0.execute-api.us-east-2.amazonaws.com/dev',
    endpoints: {
      uploadCsv: '/upload-csv',
      jobStatus: '/status/{jobId}',
      downloadFailed: '/download-failed/{jobId}'
    }
  },
  productExport: {
    baseUrl: import.meta.env.VITE_PRODUCT_EXPORT_API_URL || 'https://blwqmc8yh7.execute-api.us-east-2.amazonaws.com/dev',
    endpoints: {
      startExport: '/start-export',
      jobStatus: '/status',
      downloadResults: '/download'
    }
  },
  productImport: {
    baseUrl: import.meta.env.VITE_PRODUCT_IMPORT_API_URL || 'https://your-product-import-api.amazonaws.com/dev',
    endpoints: {
      uploadCsv: '/upload-csv',
      jobStatus: '/status',
      downloadFailed: '/download-failed'
    }
  }
}

// Helper function to get API URL for a specific app and endpoint
export const getApiUrl = (app: keyof typeof API_CONFIG, endpoint: string, pathParams?: Record<string, string>): string => {
  const appConfig = API_CONFIG[app]
  const endpointPath = appConfig.endpoints[endpoint as keyof typeof appConfig.endpoints]
  
  if (!endpointPath) {
    throw new Error(`Endpoint '${endpoint}' not found for app '${app}'`)
  }
  
  let url = `${appConfig.baseUrl}${endpointPath}`
  
  // Replace path parameters if provided
  if (pathParams) {
    Object.entries(pathParams).forEach(([key, value]) => {
      url = url.replace(`{${key}}`, value)
    })
  }
  
  return url
}

// Helper function to get base URL for a specific app
export const getApiBaseUrl = (app: keyof typeof API_CONFIG): string => {
  return API_CONFIG[app].baseUrl
}
