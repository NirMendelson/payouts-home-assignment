import Papa from 'papaparse'
import { createColumnFingerprint, ColumnFingerprint } from './fingerprint'

export interface ParsedCSV {
  filename: string
  headers: string[]
  sampleRows: string[][]
  totalRows: number
  columnFingerprints: ColumnFingerprint[]
}

export function parseCSVFile(file: File): Promise<ParsedCSV> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.errors.length > 0) {
          reject(new Error(`CSV parsing error: ${results.errors[0].message}`))
          return
        }

        const data = results.data as Record<string, any>[]
        if (data.length === 0) {
          reject(new Error('CSV file is empty'))
          return
        }

        const headers = Object.keys(data[0])
        const sampleRows = data.slice(0, 10).map(row => 
          headers.map(header => String(row[header] || ''))
        )

        // Create fingerprints for each column
        const columnFingerprints = headers.map((header, index) => {
          const columnValues = data.map(row => String(row[header] || ''))
          return createColumnFingerprint(header, index, columnValues)
        })

        resolve({
          filename: file.name,
          headers,
          sampleRows,
          totalRows: data.length,
          columnFingerprints
        })
      },
      error: (error) => {
        reject(new Error(`Failed to parse CSV: ${error.message}`))
      }
    })
  })
}

export function parseMultipleCSVFiles(files: File[]): Promise<ParsedCSV[]> {
  return Promise.all(files.map(file => parseCSVFile(file)))
}
