"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CheckCircle, XCircle, ArrowLeft, FileText, Table } from 'lucide-react'

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

export default function ReviewPage() {
  const router = useRouter()
  const [candidate, setCandidate] = useState<Candidate | null>(null)
  const [allCandidates, setAllCandidates] = useState<Candidate[]>([])
  const [csvData, setCsvData] = useState<CSVData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [userDecision, setUserDecision] = useState<'yes' | 'no' | null>(null)

  useEffect(() => {
    // Get the analysis result from sessionStorage
    const analysisResult = sessionStorage.getItem('csvAnalysisResult')
    const csvDataResult = sessionStorage.getItem('csvData')
    
    if (analysisResult) {
      const result = JSON.parse(analysisResult)
      setCandidate(result.topCandidate)
      setAllCandidates(result.allCandidates || [])
      
      // If no high-confidence candidates, go directly to manual selection
      if (!result.hasHighConfidenceCandidates) {
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

  const handleDecision = (decision: 'yes' | 'no') => {
    if (decision === 'yes') {
      setUserDecision(decision)
      
      // Save the mapping and show success
      const mapping = {
        column: candidate?.column,
        columnId: candidate?.columnId,
        filename: candidate?.filename,
        confidence: candidate?.confidence,
        fingerprint: candidate?.fingerprint,
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
    } else {
      // Go directly to candidates page
      router.push('/candidates')
    }
  }


  const getTableData = () => {
    if (!candidate || !csvData.length) return null
    
    const fileData = csvData.find(file => file.filename === candidate.filename)
    if (!fileData) return null
    
    const columnIndex = fileData.headers.indexOf(candidate.column)
    if (columnIndex === -1) return null
    
    return {
      headers: fileData.headers,
      rows: fileData.sampleRows.slice(0, 8), // Show first 8 rows
      highlightedColumn: columnIndex
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading analysis results...</p>
        </div>
      </div>
    )
  }

  if (!candidate) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center">No Analysis Results</CardTitle>
            <CardDescription className="text-center">
              No analysis results found. Please go back and upload some CSV files.
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
              onClick={() => router.push('/')}
              className="mb-4"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Upload
            </Button>
            <h1 className="text-3xl font-bold">Review Billing Field</h1>
            <p className="text-muted-foreground mt-2">
              We found a potential "billing approved" field. Please confirm if this is correct.
            </p>
          </div>

          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Table className="h-5 w-5" />
                Data Preview
              </CardTitle>
              <CardDescription>
                Highlighted column: <span className="font-mono text-primary">{candidate.column}</span> from {candidate.filename}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {(() => {
                const tableData = getTableData()
                if (!tableData) return <p className="text-muted-foreground">No data available</p>
                
                return (
                  <div className="w-full">
                    <table className="w-full border-collapse border border-border table-fixed">
                      <thead>
                        <tr className="bg-muted">
                          {tableData.headers.map((header, index) => (
                            <th
                              key={index}
                              className={`border border-border px-2 py-2 text-left font-medium ${
                                index === tableData.highlightedColumn
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
                                className={`border border-border px-2 py-2 text-sm ${
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
                )
              })()}
            </CardContent>
          </Card>

          {userDecision === null && (
            <div className="flex gap-4 justify-center mb-6">
              <Button 
                size="lg" 
                onClick={() => handleDecision('yes')}
                className="bg-green-600 hover:bg-green-700"
              >
                <CheckCircle className="mr-2 h-5 w-5" />
                Yes, this is correct
              </Button>
              <Button 
                size="lg" 
                variant="destructive"
                onClick={() => handleDecision('no')}
              >
                <XCircle className="mr-2 h-5 w-5" />
                No, this is wrong
              </Button>
            </div>
          )}

          {userDecision === 'yes' && (
            <Card className="mb-6 border-green-200 bg-green-50">
              <CardContent className="pt-6">
                <div className="text-center">
                  <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-green-800 mb-2">
                    Perfect! Field Mapping Saved
                  </h3>
                  <p className="text-green-700 mb-4">
                    The billing approved field has been saved and a mapping file has been downloaded.
                  </p>
                  <Button onClick={() => router.push('/')}>
                    Upload More Files
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
