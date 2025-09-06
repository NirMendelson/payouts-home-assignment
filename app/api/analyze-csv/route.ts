import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

// Initialize Azure OpenAI client
const openai = new OpenAI({
  apiKey: process.env.AZURE_OPENAI_API_KEY,
  baseURL: `${process.env.AZURE_OPENAI_ENDPOINT}/openai/deployments/${process.env.GPT_4O_MINI_DEPLOYMENT}`,
  defaultQuery: { 'api-version': process.env.OPENAI_API_VERSION },
  defaultHeaders: {
    'api-key': process.env.AZURE_OPENAI_API_KEY,
  },
})

interface CSVData {
  filename: string
  headers: string[]
  sampleRows: string[][]
  columnFingerprints: any[]
}

export async function POST(request: NextRequest) {
  try {
    // Debug: Log environment variables (without exposing the actual values)
    console.log('Environment check:')
    console.log('AZURE_OPENAI_ENDPOINT:', process.env.AZURE_OPENAI_ENDPOINT ? 'Set' : 'Missing')
    console.log('AZURE_OPENAI_API_KEY:', process.env.AZURE_OPENAI_API_KEY ? 'Set' : 'Missing')
    console.log('OPENAI_API_VERSION:', process.env.OPENAI_API_VERSION || 'Missing')
    console.log('GPT_4O_MINI_DEPLOYMENT:', process.env.GPT_4O_MINI_DEPLOYMENT || 'Missing')

    const { csvData }: { csvData: CSVData[] } = await request.json()

    if (!csvData || csvData.length === 0) {
      return NextResponse.json({ error: 'No CSV data provided' }, { status: 400 })
    }

    // Prepare data for LLM analysis
    const analysisData = csvData.map(file => ({
      filename: file.filename,
      headers: file.headers,
      sampleData: file.sampleRows.slice(0, 5), // First 5 rows for analysis
      columnFingerprints: file.columnFingerprints
    }))

    const prompt = `
You are analyzing CSV files to find the column that represents "billing approved" - a field that indicates whether a creator/influencer is ready to be paid.

For each CSV file, I'll provide:
- Filename
- Column headers
- Sample data (first 5 rows)

Please analyze each file and return the top 4 most likely candidates for the "billing approved" field.

IMPORTANT: Each candidate must be a DIFFERENT column. Do not repeat the same column multiple times.

STRICT CRITERIA - Only consider columns that DIRECTLY indicate billing approval:
- Boolean approval fields (yes/no, true/false, 1/0, approved/rejected)
- Status fields that indicate payment readiness (approved, pending, rejected, ready_to_pay)
- Fields with names containing: "approved", "billing", "payment", "status", "ready"
- Fields with values like: "Yes/No", "True/False", "Approved/Rejected", "Ready/Not Ready"

DO NOT consider these as billing approved fields (confidence should be 0-10%):
- ID fields (campaign_id, user_id, etc.) - these are identifiers, not approval status
- Count fields (followers_count, likes_count, etc.) - these are metrics, not approval status
- Role fields (role, position, title) - these describe job functions, not approval status
- Date fields (created_at, updated_at, due_date) - these are timestamps, not approval status
- Name fields (name, email, username) - these are identifiers, not approval status
- Amount fields (amount, price, cost) - these are financial values, not approval status

Confidence scoring guidelines:
- 90-100%: Clear boolean approval field with yes/no values
- 70-89%: Strong approval-related field name with appropriate values
- 50-69%: Moderate approval-related field with some uncertainty
- 30-49%: Weak approval-related field with mixed signals
- 10-29%: Very weak connection to approval
- 0-9%: No clear connection to billing approval

Return ONLY a JSON object with this exact structure:
{
  "candidates": [
    {
      "filename": "filename.csv",
      "column": "column_name_1",
      "confidence": 0.95,
      "reasoning": "Brief explanation of why this column likely represents billing approved status"
    },
    {
      "filename": "filename.csv", 
      "column": "column_name_2",
      "confidence": 0.85,
      "reasoning": "Brief explanation for second candidate"
    },
    {
      "filename": "filename.csv",
      "column": "column_name_3", 
      "confidence": 0.75,
      "reasoning": "Brief explanation for third candidate"
    },
    {
      "filename": "filename.csv",
      "column": "column_name_4",
      "confidence": 0.65,
      "reasoning": "Brief explanation for fourth candidate"
    }
  ]
}

Files to analyze:
${JSON.stringify(analysisData, null, 2)}
`

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are an expert at analyzing CSV data to identify billing and payment-related fields. Always respond with valid JSON only.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.1,
      max_tokens: 2000
    })

    const response = completion.choices[0]?.message?.content
    if (!response) {
      throw new Error('No response from OpenAI')
    }

    // Parse the JSON response
    let analysisResult
    try {
      analysisResult = JSON.parse(response)
      
      // Remove duplicate columns and log the results
      const uniqueCandidates = []
      const seenColumns = new Set()
      
      if (analysisResult.candidates && analysisResult.candidates.length > 0) {
        for (const candidate of analysisResult.candidates) {
          const columnKey = `${candidate.filename}:${candidate.column}`
          if (!seenColumns.has(columnKey)) {
            uniqueCandidates.push(candidate)
            seenColumns.add(columnKey)
          }
        }
        
        // Update the analysis result with unique candidates
        analysisResult.candidates = uniqueCandidates
      }
      
      // Log the full LLM response with all candidates
      console.log('\n🤖 LLM Analysis Results:')
      console.log('=' .repeat(50))
      if (uniqueCandidates.length > 0) {
        uniqueCandidates.forEach((candidate: any, index: number) => {
          console.log(`\n${index + 1}. ${candidate.filename} - Column: "${candidate.column}"`)
          console.log(`   Confidence: ${Math.round(candidate.confidence * 100)}%`)
          console.log(`   Reasoning: ${candidate.reasoning}`)
        })
        console.log('\n' + '=' .repeat(50))
        console.log(`✅ Top candidate: "${uniqueCandidates[0].column}" (${Math.round(uniqueCandidates[0].confidence * 100)}%)`)
        console.log(`📊 Found ${uniqueCandidates.length} unique candidates`)
      } else {
        console.log('❌ No candidates found in LLM response')
      }
      console.log('=' .repeat(50) + '\n')
      
    } catch (parseError) {
      console.error('Failed to parse OpenAI response:', response)
      throw new Error('Invalid response format from OpenAI')
    }

    // Filter candidates by confidence threshold (50%+)
    const highConfidenceCandidates = (analysisResult.candidates || []).filter(
      (candidate: any) => candidate.confidence >= 0.5
    )
    
    // Return the top candidate (first in the list) with column fingerprint
    const topCandidate = highConfidenceCandidates[0] || null
    
    // Find the column fingerprint for the top candidate
    let candidateWithFingerprint = topCandidate
    if (topCandidate) {
      const fileData = csvData.find(file => file.filename === topCandidate.filename)
      if (fileData) {
        const columnIndex = fileData.headers.indexOf(topCandidate.column)
        if (columnIndex !== -1) {
          candidateWithFingerprint = {
            ...topCandidate,
            columnId: fileData.columnFingerprints[columnIndex]?.id,
            fingerprint: fileData.columnFingerprints[columnIndex]
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      topCandidate: candidateWithFingerprint,
      allCandidates: highConfidenceCandidates,
      hasHighConfidenceCandidates: highConfidenceCandidates.length > 0
    })

  } catch (error: any) {
    console.error('Error analyzing CSV:', error)
    
    // Check for specific Azure OpenAI errors
    if (error.code === 'DeploymentNotFound') {
      return NextResponse.json(
        { 
          error: 'Azure OpenAI deployment not found. Please check your GPT_4O_MINI_DEPLOYMENT environment variable.',
          details: 'The deployment name might be incorrect or the deployment might not exist.'
        },
        { status: 400 }
      )
    }
    
    if (error.status === 401) {
      return NextResponse.json(
        { 
          error: 'Azure OpenAI authentication failed. Please check your API key and endpoint.',
          details: 'Verify your AZURE_OPENAI_API_KEY and AZURE_OPENAI_ENDPOINT environment variables.'
        },
        { status: 401 }
      )
    }
    
    return NextResponse.json(
      { 
        error: 'Failed to analyze CSV files',
        details: error.message || 'Unknown error occurred'
      },
      { status: 500 }
    )
  }
}
