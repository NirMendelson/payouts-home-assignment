'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CheckCircle, ArrowLeft, FileText } from 'lucide-react'

interface FieldMapping {
  column: string
  columnId?: string
  filename: string
  confidence: number
  fingerprint?: any
}

interface CSVData {
  filename: string
  headers: string[]
  sampleRows: string[][]
  columnFingerprints: any[]
}

interface ValueMapping {
  value: string
  isApproved: boolean
  count: number
}

export default function FieldMappingPage() {
  const router = useRouter()
  const [fieldMapping, setFieldMapping] = useState<FieldMapping | null>(null)
  const [csvData, setCsvData] = useState<CSVData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [valueMappings, setValueMappings] = useState<ValueMapping[]>([])
  const [isComplete, setIsComplete] = useState(false)

  useEffect(() => {
    // Get the field mapping from sessionStorage
    const fieldMappingData = sessionStorage.getItem('fieldMapping')
    const csvDataResult = sessionStorage.getItem('csvData')
    
    if (fieldMappingData) {
      const mapping = JSON.parse(fieldMappingData)
      setFieldMapping(mapping)
      
      // Get all unique values from the selected field
      if (csvDataResult) {
        const data = JSON.parse(csvDataResult)
        setCsvData(data)
        
        const fileData = data.find((file: CSVData) => file.filename === mapping.filename)
        if (fileData) {
          const columnIndex = fileData.headers.indexOf(mapping.column)
          if (columnIndex !== -1) {
            // Get all values from this column and count occurrences
            const valueCounts = new Map<string, number>()
            fileData.sampleRows.forEach((row: string[]) => {
              const value = String(row[columnIndex] || '').trim()
              if (value) {
                valueCounts.set(value, (valueCounts.get(value) || 0) + 1)
              }
            })
            
            // Convert to array and sort by count (most common first)
            const values = Array.from(valueCounts.entries())
              .map(([value, count]) => ({ value, isApproved: false, count }))
              .sort((a, b) => b.count - a.count)
            
            setValueMappings(values)
            
            // Update fieldMapping with fingerprint if not already present
            if (!mapping.fingerprint && fileData.columnFingerprints[columnIndex]) {
              const updatedMapping = {
                ...mapping,
                fingerprint: fileData.columnFingerprints[columnIndex]
              }
              setFieldMapping(updatedMapping)
            }
          }
        }
      }
    }
    
    setIsLoading(false)
  }, [])


  const handleComplete = () => {
    if (!fieldMapping) return
    
    // Create the complete mapping
    const completeMapping = {
      ...fieldMapping,
      valueMappings: valueMappings.map(vm => ({
        value: vm.value,
        isApproved: vm.isApproved,
        count: vm.count
      })),
      timestamp: new Date().toISOString()
    }
    
    // Save to localStorage
    const existingMappings = JSON.parse(localStorage.getItem('billingFieldMappings') || '[]')
    existingMappings.push(completeMapping)
    localStorage.setItem('billingFieldMappings', JSON.stringify(existingMappings))
    
    // Download mapping file
    const blob = new Blob([JSON.stringify(completeMapping, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'billing-field-mapping.json'
    a.click()
    URL.revokeObjectURL(url)
    
    setIsComplete(true)
  }


  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading field mapping...</p>
        </div>
      </div>
    )
  }

  if (!fieldMapping) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center">No Field Selected</CardTitle>
            <CardDescription className="text-center">
              Please go back and select a field first.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={() => router.push('/')} 
              className="w-full"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Upload
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-6">
            <Button 
              variant="ghost" 
              onClick={() => router.back()}
              className="mb-4"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            <h1 className="text-3xl font-bold">Map Field Values</h1>
            <p className="text-muted-foreground mt-2">
              Select which values in the <span className="font-mono text-primary">{fieldMapping.column}</span> field mean "billing approved"
            </p>
          </div>

          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Value Mapping
              </CardTitle>
              <CardDescription>
                Map each value in <span className="font-mono text-primary">{fieldMapping.column}</span> to either "Payment Approved" or "Not Approved"
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {valueMappings.map((valueMapping, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-sm font-medium">{valueMapping.value}</span>
                      <span className="text-xs text-muted-foreground">
                        ({valueMapping.count} occurrence{valueMapping.count !== 1 ? 's' : ''})
                      </span>
                    </div>
                    <select
                      value={valueMapping.isApproved ? 'approved' : 'not-approved'}
                      onChange={(e) => {
                        const newMappings = [...valueMappings]
                        newMappings[index].isApproved = e.target.value === 'approved'
                        setValueMappings(newMappings)
                      }}
                      className="px-3 py-1 border rounded-md text-sm"
                    >
                      <option value="not-approved">Not Approved</option>
                      <option value="approved">Payment Approved</option>
                    </select>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {isComplete ? (
            <Card className="mb-6 border-green-200 bg-green-50">
              <CardContent className="pt-6">
                <div className="text-center">
                  <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-green-800 mb-2">
                    Perfect! Field Mapping Complete
                  </h3>
                  <p className="text-green-700 mb-4">
                    The billing approved field mapping has been saved and a mapping file has been downloaded.
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="flex gap-4 justify-center mb-6">
              <Button 
                onClick={handleComplete}
                size="lg"
                className="bg-green-600 hover:bg-green-700"
              >
                <CheckCircle className="mr-2 h-5 w-5" />
                Complete Mapping
              </Button>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
