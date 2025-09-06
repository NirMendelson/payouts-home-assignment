"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CheckCircle, XCircle, ArrowLeft, Table, FileText } from 'lucide-react'

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
  const [userDecision, setUserDecision] = useState<'yes' | 'no' | null>(null)
  const [selectedCandidate, setSelectedCandidate] = useState<number | null>(null)

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

  const handleSelectCandidate = (index: number) => {
    setSelectedCandidate(index)
  }

  const handleChooseSelected = () => {
    if (selectedCandidate === null) return
    
    const candidate = candidates[selectedCandidate]
    setUserDecision('yes')
    
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
  }

  const handleNoneAreFields = () => {
    router.push('/manual')
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

           <div className="grid grid-cols-1 gap-6 mb-8">
             {candidates.map((candidate, index) => {
               const tableData = getTableData(candidate)
               const isSingleCandidate = candidates.length === 1
               const isSelected = selectedCandidate === index
               
               return (
                 <Card 
                   key={index} 
                   className={`h-fit cursor-pointer transition-all ${
                     isSelected 
                       ? 'ring-2 ring-primary border-primary shadow-lg' 
                       : 'hover:shadow-md'
                   }`}
                   onClick={() => handleSelectCandidate(index)}
                 >
                  <CardHeader>
                    <CardTitle className={`flex items-center gap-2 ${isSingleCandidate ? 'text-2xl' : 'text-lg'}`}>
                      <Table className={isSingleCandidate ? 'h-5 w-5' : 'h-4 w-4'} />
                      {isSingleCandidate ? 'Alternative Candidate' : `Candidate ${index + 2}`}
                    </CardTitle>
                    <CardDescription className={isSingleCandidate ? 'text-base' : 'text-sm'}>
                      <span className="font-mono text-primary">{candidate.column}</span> from {candidate.filename}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {tableData ? (
                      <div className="space-y-4">
                        <div className="overflow-x-auto">
                          <table className="w-full border-collapse border border-border table-auto text-sm">
                           <thead>
                             <tr className="bg-muted">
                               {tableData.headers.map((header, headerIndex) => (
                                  <th
                                    key={headerIndex}
                                    className={`border border-border px-3 py-2 text-left font-medium whitespace-nowrap ${
                                      headerIndex === tableData.highlightedColumn
                                        ? 'bg-primary text-primary-foreground'
                                        : 'text-foreground'
                                    }`}
                                  >
                                   <div className="text-sm" title={header}>
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
                                       className={`border border-border px-3 py-2 whitespace-nowrap ${
                                         cellIndex === tableData.highlightedColumn
                                           ? 'bg-primary/10 font-medium'
                                           : ''
                                       }`}
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
                        
                      </div>
                    ) : (
                      <p className="text-muted-foreground text-sm">No data available</p>
                    )}
                  </CardContent>
                </Card>
              )
            })}
           </div>

           {userDecision === null && (
             <div className="flex gap-4 justify-center mb-6">
               <Button 
                 onClick={handleChooseSelected}
                 size="lg"
                 disabled={selectedCandidate === null}
                 className="bg-green-600 hover:bg-green-700 disabled:opacity-50"
               >
                 <CheckCircle className="mr-2 h-5 w-5" />
                 Choose Selected Field
               </Button>
               <Button 
                 onClick={handleNoneAreFields}
                 size="lg"
                 variant="destructive"
               >
                 <XCircle className="mr-2 h-5 w-5" />
                 None are the fields
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
                 </div>
               </CardContent>
             </Card>
           )}

         </div>
       </div>
     </div>
   )
 }
