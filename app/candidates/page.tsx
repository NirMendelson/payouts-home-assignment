"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CheckCircle, ArrowLeft, Table, FileText } from 'lucide-react'

interface Candidate {
  filename: string
  column: string
  confidence: number
  reasoning: string
  columnId?: string
  fingerprint?: any
}

interface CSVData {
  filename: string
  headers: string[]
  sampleRows: string[][]
  columnFingerprints: any[]
}

export default function CandidatesPage() {
  const router = useRouter()
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [csvData, setCsvData] = useState<CSVData[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Get the analysis result from sessionStorage
    const analysisResult = sessionStorage.getItem('csvAnalysisResult')
    const csvDataResult = sessionStorage.getItem('csvData')
    
    if (analysisResult) {
      const result = JSON.parse(analysisResult)
      // Skip the first candidate (already shown) and get the rest
      const remainingCandidates = result.allCandidates?.slice(1) || []
      setCandidates(remainingCandidates)
      
      // If no remaining candidates, go directly to manual selection
      if (remainingCandidates.length === 0) {
        router.push('/manual')
        return
      }
    }
    
    if (csvDataResult) {
      const data = JSON.parse(csvDataResult)
      setCsvData(data)
    }
    
    setIsLoading(false)
  }, [router])

  const getTableData = (candidate: Candidate) => {
    const fileData = csvData.find(file => file.filename === candidate.filename)
    if (!fileData) return null
    
    const columnIndex = fileData.headers.indexOf(candidate.column)
    if (columnIndex === -1) return null
    
    return {
      headers: fileData.headers,
      rows: fileData.sampleRows.slice(0, 5), // Show first 5 rows
      highlightedColumn: columnIndex
    }
  }

  const handleApproveCandidate = (candidate: Candidate) => {
    // Save the mapping and show success
    const mapping = {
      column: candidate.column,
      columnId: candidate.columnId,
      filename: candidate.filename,
      confidence: candidate.confidence,
      fingerprint: candidate.fingerprint,
      timestamp: new Date().toISOString()
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

  const handleManualSelection = () => {
    // Navigate to manual selection page
    router.push('/manual')
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading candidates...</p>
        </div>
      </div>
    )
  }

  if (candidates.length === 0) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center">No More Candidates</CardTitle>
            <CardDescription className="text-center">
              No additional candidates found. Please choose manually.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Button 
                onClick={handleManualSelection} 
                className="w-full"
              >
                Choose Manually
              </Button>
              <Button 
                variant="outline"
                onClick={() => router.push('/')} 
                className="w-full"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Upload
              </Button>
            </div>
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
              onClick={() => router.push('/review')}
              className="mb-4"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Review
            </Button>
            <h1 className="text-3xl font-bold">Other Candidates</h1>
            <p className="text-muted-foreground mt-2">
              Here are the other potential billing approved fields. Click to approve one, or choose manually.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 mb-8">
            {candidates.map((candidate, index) => {
              const tableData = getTableData(candidate)
              
              return (
                <Card key={index} className="h-fit">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Table className="h-4 w-4" />
                      Candidate {index + 2}
                    </CardTitle>
                    <CardDescription>
                      <span className="font-mono text-primary">{candidate.column}</span> from {candidate.filename}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {tableData ? (
                      <div className="space-y-4">
                        <div className="overflow-x-auto">
                          <table className="w-full border-collapse border border-border table-fixed text-xs">
                            <thead>
                              <tr className="bg-muted">
                                {tableData.headers.map((header, headerIndex) => (
                                  <th
                                    key={headerIndex}
                                    className={`border border-border px-1 py-1 text-left font-medium ${
                                      headerIndex === tableData.highlightedColumn
                                        ? 'bg-primary text-primary-foreground'
                                        : 'text-foreground'
                                    }`}
                                    style={{ width: `${100 / tableData.headers.length}%` }}
                                  >
                                    <div className="truncate" title={header}>
                                      {header}
                                    </div>
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {tableData.rows.map((row, rowIndex) => (
                                <tr key={rowIndex} className="hover:bg-muted/50">
                                  {row.map((cell, cellIndex) => (
                                    <td
                                      key={cellIndex}
                                      className={`border border-border px-1 py-1 ${
                                        cellIndex === tableData.highlightedColumn
                                          ? 'bg-primary/10 font-medium'
                                          : ''
                                      }`}
                                      style={{ width: `${100 / tableData.headers.length}%` }}
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
                        
                        <Button 
                          onClick={() => handleApproveCandidate(candidate)}
                          className="w-full"
                          size="sm"
                        >
                          <CheckCircle className="mr-2 h-4 w-4" />
                          This is the correct field
                        </Button>
                      </div>
                    ) : (
                      <p className="text-muted-foreground text-sm">No data available</p>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>

          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <h3 className="text-lg font-semibold mb-2">None of these look right?</h3>
                <p className="text-muted-foreground mb-4">
                  Browse through all columns manually to find the correct billing approved field.
                </p>
                <Button 
                  onClick={handleManualSelection}
                  size="lg"
                  variant="outline"
                >
                  <FileText className="mr-2 h-5 w-5" />
                  Choose Manually
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
