import { useState, useEffect } from 'react'
import { 
  AppProvider, 
  Frame, 
  Navigation, 
  Page, 
  Layout, 
  Card, 
  Text, 
  Button,
  BlockStack,
  InlineStack,
  ProgressBar,
  Banner,
  DropZone,
  Modal,
  Spinner,
  Badge
} from '@shopify/polaris'
import { 
  ImageIcon, 
  ExportIcon, 
  ImportIcon,
  SettingsIcon,
  ChartLineIcon
} from '@shopify/polaris-icons'
import '@shopify/polaris/build/esm/styles.css'
import { getApiUrl } from './config/api'

interface JobStatus {
  jobId: string;
  status: 'processing' | 'completed' | 'failed' | 'completed_with_errors';
  progress: {
    completed: number;
    total: number;
    percentage: number;
    currentStep: string;
  };
  errors: {
    count: number;
    failedProductsUrl: string | null;
  };
}

function App() {
  const [activeTab, setActiveTab] = useState('dashboard')
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [currentJob, setCurrentJob] = useState<JobStatus | null>(null)
  const [showTemplateModal, setShowTemplateModal] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Navigation items for the sidebar
  const navigationMarkup = (
    <Navigation location="/">
      <Navigation.Section
        items={[
          {
            label: 'Dashboard',
            icon: ChartLineIcon,
            onClick: () => setActiveTab('dashboard'),
            selected: activeTab === 'dashboard',
          },
          {
            label: 'Image Uploader',
            icon: ImageIcon,
            onClick: () => setActiveTab('image-uploader'),
            selected: activeTab === 'image-uploader',
          },
          {
            label: 'Product Export',
            icon: ExportIcon,
            onClick: () => setActiveTab('export'),
            selected: activeTab === 'export',
          },
          {
            label: 'Product Import',
            icon: ImportIcon,
            onClick: () => setActiveTab('import'),
            selected: activeTab === 'import',
          },
        ]}
      />
      <Navigation.Section
        items={[
          {
            label: 'Settings',
            icon: SettingsIcon,
            onClick: () => setActiveTab('settings'),
            selected: activeTab === 'settings',
          },
        ]}
      />
    </Navigation>
  )



  const uploadCSV = async () => {
    if (!uploadedFile) return

    setIsUploading(true)
    setError(null)
    setSuccess(null)

    // Set initial job status immediately to show the pane
    const initialJobStatus = {
      jobId: 'preparing...',
      status: 'processing' as const,
      progress: {
        completed: 0,
        total: 0,
        percentage: 0,
        currentStep: 'Preparing upload...'
      },
      errors: {
        count: 0,
        failedProductsUrl: null
      }
    }
    setCurrentJob(initialJobStatus)

    try {
      const formData = new FormData()
      formData.append('file', uploadedFile)

      const response = await fetch(getApiUrl('imageUploader', 'uploadCsv'), {
        method: 'POST',
        body: formData,
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Upload failed')
      }

      const initialJobStatus = {
        jobId: result.jobId,
        status: result.status,
        progress: {
          completed: 0,
          total: result.totalProducts,
          percentage: 0,
          currentStep: 'Starting...'
        },
        errors: {
          count: 0,
          failedProductsUrl: null
        }
      }
      
      setCurrentJob(initialJobStatus)
      setUploadedFile(null)

      // Show success message after setting job status
      setSuccess(`Upload successful! Processing ${result.totalProducts} products.`)

      // Add a longer delay to show the initial "processing" state
      await new Promise(resolve => setTimeout(resolve, 500))

      // Do immediate status check first, then start polling if needed
      const isComplete = await checkJobStatus(result.jobId)
      if (!isComplete) {
        pollJobStatus(result.jobId)
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setIsUploading(false)
    }
  }

  const checkJobStatus = async (jobId: string) => {
    try {
      const response = await fetch(getApiUrl('imageUploader', 'jobStatus', { jobId }))
      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to get job status')
      }

      setCurrentJob(result)

      // If job is already complete, show appropriate message
      if (result.status === 'completed' || result.status === 'failed' || result.status === 'completed_with_errors') {
        if (result.status === 'completed') {
          setSuccess('Image upload completed successfully!')
        } else if (result.status === 'completed_with_errors') {
          if (result.errors.count > 0) {
            setError(`Upload completed with ${result.errors.count} errors. Check the failed products file for details.`)
          } else {
            setSuccess('Image upload completed successfully!')
          }
        } else {
          setError('Image upload failed. Please try again.')
        }
        return true // Job is complete, no need to poll
      }
      return false // Job is still running, continue polling
    } catch (err) {
      console.error('Error checking job status:', err)
      return false // Continue polling on error
    }
  }

  const pollJobStatus = async (jobId: string) => {
    const pollInterval = setInterval(async () => {
      try {
        const isComplete = await checkJobStatus(jobId)
        if (isComplete) {
          clearInterval(pollInterval)
        }
      } catch (err) {
        console.error('Error polling job status:', err)
        clearInterval(pollInterval)
      }
    }, 500) // Poll every 500ms for faster updates
  }

  const downloadFailedProducts = async () => {
    if (!currentJob?.errors.failedProductsUrl) return

    try {
      const response = await fetch(getApiUrl('imageUploader', 'downloadFailed', { jobId: currentJob.jobId }))
      const blob = await response.blob()
      
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `failed-products-${currentJob.jobId}.csv`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (err) {
      setError('Failed to download failed products file')
    }
  }

  const downloadTemplate = () => {
    const template = `Handle,Title,Image Src,Image Position,Image Alt Text,Variant Image,Variant SKU,Option1 Value,Option2 Value,Option3 Value
example-product,Example Product,https://example.com/image1.jpg,1,Product main image,https://example.com/variant1.jpg,SKU001,Red,,
example-product,Example Product,https://example.com/image2.jpg,2,Product secondary image,,,,
example-product,Example Product,,,,"https://example.com/variant2.jpg",SKU002,Blue,,`

    const blob = new Blob([template], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'image-upload-template.csv'
    document.body.appendChild(a)
    a.click()
    window.URL.revokeObjectURL(url)
    document.body.removeChild(a)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'success'
      case 'failed': return 'critical'
      case 'completed_with_errors': return 'warning'
      default: return 'info'
    }
  }

  const handleDropZoneDrop = (files: File[]) => {
    setUploadedFile(files[0])
  }



  // Content for different pages
  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <Layout>
            <Layout.Section>
              <Card>
                <BlockStack gap="400">
                  <Text variant="headingLg" as="h2">
                    Welcome to Shopify Automations
                  </Text>
                  <Text variant="bodyMd" as="p" tone="subdued">
                    Manage your product automations from this dashboard. Choose an automation from the sidebar to get started.
                  </Text>
                </BlockStack>
              </Card>
            </Layout.Section>
            <Layout.Section>
              <Layout>
                <Layout.Section>
                  <Card>
                    <BlockStack gap="400">
                      <Text variant="headingMd" as="h3">
                        Image Uploader
                      </Text>
                      <Text variant="bodyMd" as="p" tone="subdued">
                        Bulk upload and update product images
                      </Text>
                      <Button onClick={() => setActiveTab('image-uploader')}>
                        Open Image Uploader
                      </Button>
                    </BlockStack>
                  </Card>
                </Layout.Section>
                <Layout.Section>
                  <Card>
                    <BlockStack gap="400">
                      <Text variant="headingMd" as="h3">
                        Product Export
                      </Text>
                      <Text variant="bodyMd" as="p" tone="subdued">
                        Export your products to CSV format
                      </Text>
                      <Button onClick={() => setActiveTab('export')}>
                        Open Export
                      </Button>
                    </BlockStack>
                  </Card>
                </Layout.Section>
              </Layout>
            </Layout.Section>
          </Layout>
        )

      case 'image-uploader':
        return (
          <Layout>
            <Layout.Section>
              <Card>
                <BlockStack gap="400">
                  <Text variant="headingLg" as="h2">
                    Product Image Uploader
                  </Text>
                  <Text variant="bodyMd" as="p" tone="subdued">
                    Upload a CSV file to bulk update product images in your Shopify store.
                  </Text>
                  
                  {error && (
                    <Banner tone="critical" onDismiss={() => setError(null)}>
                      {error}
                    </Banner>
                  )}
                  
                  {success && (
                    <Banner tone="success" onDismiss={() => setSuccess(null)}>
                      {success}
                    </Banner>
                  )}

                  <BlockStack gap="300">
                    <InlineStack align="space-between">
                      <Text variant="headingMd" as="h3">
                        Upload CSV File
                      </Text>
                      <Button 
                        variant="plain" 
                        onClick={() => setShowTemplateModal(true)}
                      >
                        Download Template
                      </Button>
                    </InlineStack>
                    
                    <DropZone
                      accept=".csv"
                      type="file"
                      onDrop={handleDropZoneDrop}
                      allowMultiple={false}
                    >
                      <BlockStack gap="200">
                        <Text variant="bodyMd" as="p">
                          Upload a CSV file with product image data
                        </Text>
                        <Text variant="bodySm" as="p" tone="subdued">
                          Supported format: CSV with columns for Handle, Title, Image Src, etc.
                        </Text>
                      </BlockStack>
                    </DropZone>

                    {uploadedFile && (
                      <BlockStack gap="200">
                        <Text variant="bodyMd" as="p">
                          Selected file: {uploadedFile.name}
                        </Text>
                        <Button 
                          variant="primary" 
                          onClick={uploadCSV}
                          loading={isUploading}
                          disabled={isUploading}
                        >
                          {isUploading ? 'Uploading...' : 'Upload and Process'}
                        </Button>
                      </BlockStack>
                    )}
                  </BlockStack>
                </BlockStack>
              </Card>
            </Layout.Section>

            {currentJob && (
              <Layout.Section>
                <Card>
                  <BlockStack gap="400">
                    <InlineStack align="space-between">
                      <Text variant="headingMd" as="h3">
                        Job Status
                      </Text>
                      <Badge tone={getStatusColor(currentJob.status)}>
                        {currentJob.status.replace('_', ' ')}
                      </Badge>
                    </InlineStack>
                    
                    <BlockStack gap="300">
                      <Text variant="bodyMd" as="p">
                        Job ID: {currentJob.jobId}
                      </Text>
                      
                      <BlockStack gap="200">
                        <InlineStack align="space-between">
                                                  <Text variant="bodyMd" as="p">
                          Progress: {currentJob.progress.completed} / {currentJob.progress.total} products
                        </Text>
                        <Text variant="bodyMd" as="p">
                          {currentJob.progress.percentage}%
                        </Text>
                        <Text variant="bodySm" as="p" tone="subdued">
                          Status: {currentJob.status} | Step: {currentJob.progress.currentStep}
                        </Text>
                        </InlineStack>
                        <div style={{ 
                          width: '100%', 
                          height: '8px', 
                          backgroundColor: '#e1e3e5', 
                          borderRadius: '4px',
                          overflow: 'hidden'
                        }}>
                          <div style={{ 
                            width: `${currentJob.progress.percentage}%`, 
                            height: '100%', 
                            backgroundColor: '#008060',
                            transition: 'width 0.3s ease'
                          }} />
                        </div>

                      </BlockStack>
                      
                      <Text variant="bodyMd" as="p" tone="subdued">
                        Current step: {currentJob.progress.currentStep}
                      </Text>
                      
                      {currentJob.errors.count > 0 && (
                        <BlockStack gap="200">
                          <Text variant="bodyMd" as="p" tone="subdued">
                            {currentJob.errors.count} products failed to process
                          </Text>
                          {currentJob.errors.failedProductsUrl && (
                            <Button 
                              variant="secondary" 
                              onClick={downloadFailedProducts}
                            >
                              Download Failed Products
                            </Button>
                          )}
                        </BlockStack>
                      )}
                    </BlockStack>
                  </BlockStack>
                </Card>
              </Layout.Section>
            )}
          </Layout>
        )

      case 'export':
        return (
          <Layout>
            <Layout.Section>
              <Card>
                <BlockStack gap="400">
                  <Text variant="headingLg" as="h2">
                    Product Export
                  </Text>
                  <Text variant="bodyMd" as="p" tone="subdued">
                    Export your Shopify products to CSV format for analysis or backup.
                  </Text>
                  <Button variant="primary">
                    Export Products
                  </Button>
                </BlockStack>
              </Card>
            </Layout.Section>
          </Layout>
        )

      case 'import':
        return (
          <Layout>
            <Layout.Section>
              <Card>
                <BlockStack gap="400">
                  <Text variant="headingLg" as="h2">
                    Product Import
                  </Text>
                  <Text variant="bodyMd" as="p" tone="subdued">
                    Import products from CSV to your Shopify store.
                  </Text>
                  <Button variant="primary">
                    Import Products
                  </Button>
                </BlockStack>
              </Card>
            </Layout.Section>
          </Layout>
        )

      case 'settings':
        return (
          <Layout>
            <Layout.Section>
              <Card>
                <BlockStack gap="400">
                  <Text variant="headingLg" as="h2">
                    Settings
                  </Text>
                  <Text variant="bodyMd" as="p" tone="subdued">
                    Configure your automation settings and preferences.
                  </Text>
                </BlockStack>
              </Card>
            </Layout.Section>
          </Layout>
        )

      default:
        return null
    }
  }

  return (
    <AppProvider i18n={{}}>
      <Frame navigation={navigationMarkup}>
        <Page title="Shopify Automations Dashboard">
          {renderContent()}
        </Page>
      </Frame>
      
      <Modal
        open={showTemplateModal}
        onClose={() => setShowTemplateModal(false)}
        title="CSV Template"
        primaryAction={{
          content: 'Download Template',
          onAction: () => {
            downloadTemplate()
            setShowTemplateModal(false)
          }
        }}
        secondaryActions={[
          {
            content: 'Cancel',
            onAction: () => setShowTemplateModal(false)
          }
        ]}
      >
        <Modal.Section>
          <BlockStack gap="400">
            <Text variant="bodyMd" as="p">
              Download the CSV template to get started with image uploads.
            </Text>
            <Text variant="bodyMd" as="p" tone="subdued">
              The template includes all required columns and example data to help you format your CSV correctly.
            </Text>
          </BlockStack>
        </Modal.Section>
      </Modal>
    </AppProvider>
  )
}

export default App
