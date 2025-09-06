"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Dropzone from '@/components/Dropzone'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { parseMultipleCSVFiles } from '@/lib/csv'
import { Loader2 } from 'lucide-react'

export default function Home() {
  const router = useRouter()
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleFilesSelected = (files: File[]) => {
    setSelectedFiles(files)
    setError(null)
  }

  const handleProcessFiles = async () => {
    if (selectedFiles.length === 0) return
    
    setIsProcessing(true)
    setError(null)
    
    try {
      // Parse CSV files
      const parsedData = await parseMultipleCSVFiles(selectedFiles)
      
      // Send to API for analysis
      const response = await fetch('/api/analyze-csv', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ csvData: parsedData }),
      })
      
      if (!response.ok) {
        throw new Error('Failed to analyze CSV files')
      }
      
      const result = await response.json()
      
      if (!result.success) {
        const errorMessage = result.error || 'Analysis failed'
        const errorDetails = result.details ? `\n\nDetails: ${result.details}` : ''
        throw new Error(`${errorMessage}${errorDetails}`)
      }
      
      // Store result and CSV data in sessionStorage and navigate to review page
      sessionStorage.setItem('csvAnalysisResult', JSON.stringify(result))
      sessionStorage.setItem('csvData', JSON.stringify(parsedData))
      router.push('/review')
      
    } catch (err) {
      console.error('Error processing files:', err)
      setError(err instanceof Error ? err.message : 'Failed to process files')
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold tracking-tight mb-4">
              Billing Approved Field Finder
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Upload your CSV files and we'll help you find which column represents "billing approved" 
              — the flag that means a creator is ready to be paid.
            </p>
          </div>

          <div className="mb-8">
            <Dropzone 
              onFilesSelected={handleFilesSelected}
              maxFiles={8}
              maxSize={8}
            />
          </div>

          {selectedFiles.length > 0 && (
            <Card className="mb-8">
              <CardHeader>
                <CardTitle>Ready to Process</CardTitle>
                <CardDescription>
                  {selectedFiles.length} file{selectedFiles.length > 1 ? 's' : ''} selected. 
                  Click the button below to analyze and find the billing approved field.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {error && (
                  <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-red-800 text-sm">{error}</p>
                  </div>
                )}
                <Button 
                  onClick={handleProcessFiles}
                  size="lg"
                  className="w-full"
                  disabled={isProcessing}
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Analyzing CSV files...
                    </>
                  ) : (
                    'Process Files & Find Billing Field'
                  )}
                </Button>
              </CardContent>
            </Card>
          )}

          <div className="grid md:grid-cols-3 gap-6 mt-12">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">1. Upload</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Drag & drop or click to upload one or more CSV files directly in your browser.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">2. AI Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Our AI analyzes column headers and sample data to identify the most likely billing approved field.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">3. Confirm</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Review the top candidate and confirm if it's correct, or browse manually if needed.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
