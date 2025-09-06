"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, CheckCircle, FileText } from 'lucide-react'

interface CSVData {
  filename: string
  headers: string[]
  sampleRows: string[][]
  columnFingerprints: any[]
}

export default function ManualPage() {
  const router = useRouter()
  const [csvData, setCsvData] = useState<CSVData[]>([])
  const [selectedColumn, setSelectedColumn] = useState<{filename: string, column: string} | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const csvDataResult = sessionStorage.getItem('csvData')
    
    if (csvDataResult) {
      const data = JSON.parse(csvDataResult)
      setCsvData(data)
    }
    
    setIsLoading(false)
  }, [])

  const handleSelectColumn = (filename: string, column: string) => {
    setSelectedColumn({ filename, column })
  }

  const handleConfirmSelection = () => {
    if (!selectedColumn) return
    
    // Find the file data to get fingerprint
    const fileData = csvData.find(file => file.filename === selectedColumn.filename)
    if (!fileData) return
    
    const columnIndex = fileData.headers.indexOf(selectedColumn.column)
    if (columnIndex === -1) return
    
    const fingerprint = fileData.columnFingerprints[columnIndex]
    
    // Save the mapping
    const mapping = {
      column: selectedColumn.column,
      columnId: fingerprint?.id,
      filename: selectedColumn.filename,
      confidence: 1.0, // Manual selection gets 100% confidence
      fingerprint: fingerprint,
      timestamp: new Date().toISOString(),
      selectedManually: true
    }
    
    // Save to localStorage
    const existingMappings = JSON.parse(localStorage.getItem('billingFieldMappings') || '[]')
    existingMappings.push(mapping)
    localStorage.setItem('billingFieldMappings', JSON.stringify(existingMappings))
    
    // Download mapping file
    const blob = new Blob([JSON.stringify(mapping, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'billing-field-mapping.json'
    a.click()
    URL.revokeObjectURL(url)
    
    // Navigate back to upload page
    router.push('/')
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading data...</p>
        </div>
      </div>
    )
  }

  if (csvData.length === 0) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center">No Data Available</CardTitle>
            <CardDescription className="text-center">
              No CSV data found. Please go back and upload some files.
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
              onClick={() => router.push('/candidates')}
              className="mb-4"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Candidates
            </Button>
            <h1 className="text-3xl font-bold">Manual Column Selection</h1>
            <p className="text-muted-foreground mt-2">
              Click on any column header to select it as your billing approved field.
            </p>
          </div>

          {csvData.map((file, fileIndex) => (
            <Card key={fileIndex} className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  {file.filename}
                </CardTitle>
                <CardDescription>
                  Click on any column header to select it
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse border border-border table-fixed">
                    <thead>
                      <tr className="bg-muted">
                        {file.headers.map((header, index) => (
                          <th
                            key={index}
                            className={`border border-border px-3 py-2 text-left font-medium cursor-pointer hover:bg-primary/10 transition-colors ${
                              selectedColumn?.filename === file.filename && selectedColumn?.column === header
                                ? 'bg-primary text-primary-foreground'
                                : 'text-foreground'
                            }`}
                            style={{ width: `${100 / file.headers.length}%` }}
                            onClick={() => handleSelectColumn(file.filename, header)}
                          >
                            <div className="truncate" title={header}>
                              {header}
                            </div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {file.sampleRows.slice(0, 5).map((row, rowIndex) => (
                        <tr key={rowIndex} className="hover:bg-muted/50">
                          {row.map((cell, cellIndex) => (
                            <td
                              key={cellIndex}
                              className={`border border-border px-3 py-2 text-sm ${
                                selectedColumn?.filename === file.filename && selectedColumn?.column === file.headers[cellIndex]
                                  ? 'bg-primary/10 font-medium'
                                  : ''
                              }`}
                              style={{ width: `${100 / file.headers.length}%` }}
                            >
                              <div className="truncate" title={cell || '-'}>
                                {cell || '-'}
                              </div>
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          ))}

          {selectedColumn && (
            <Card className="border-primary bg-primary/5">
              <CardContent className="pt-6">
                <div className="text-center">
                  <h3 className="text-lg font-semibold mb-2">Selected Column</h3>
                  <p className="text-muted-foreground mb-4">
                    <span className="font-mono text-primary">{selectedColumn.column}</span> from {selectedColumn.filename}
                  </p>
                  <Button 
                    onClick={handleConfirmSelection}
                    size="lg"
                  >
                    <CheckCircle className="mr-2 h-5 w-5" />
                    Confirm This Field
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
