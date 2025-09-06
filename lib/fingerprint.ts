import { createHash } from 'crypto'

export interface ColumnFingerprint {
  id: string
  name: string
  position: number
  sampleValues: string[]
  dataType: 'boolean' | 'string' | 'number' | 'mixed'
  uniqueValues: number
  nullCount: number
}

export function createColumnFingerprint(
  columnName: string,
  columnIndex: number,
  allValues: string[]
): ColumnFingerprint {
  // Clean and normalize values
  const cleanValues = allValues
    .map(val => String(val || '').trim().toLowerCase())
    .filter(val => val !== '')

  // Determine data type
  const dataType = determineDataType(cleanValues)
  
  // Get unique values count
  const uniqueValues = new Set(cleanValues).size
  
  // Count nulls/empty values
  const nullCount = allValues.length - cleanValues.length
  
  // Get sample values (first 10 unique values)
  const sampleValues = Array.from(new Set(cleanValues)).slice(0, 10)
  
  // Create fingerprint ID based on column characteristics
  const fingerprintData = {
    name: columnName.toLowerCase(),
    position: columnIndex,
    dataType,
    sampleValues: sampleValues.sort(),
    uniqueValues,
    nullCount
  }
  
  const fingerprintString = JSON.stringify(fingerprintData, Object.keys(fingerprintData).sort())
  const id = createHash('sha256').update(fingerprintString).digest('hex').substring(0, 16)
  
  return {
    id,
    name: columnName,
    position: columnIndex,
    sampleValues,
    dataType,
    uniqueValues,
    nullCount
  }
}

function determineDataType(values: string[]): 'boolean' | 'string' | 'number' | 'mixed' {
  if (values.length === 0) return 'string'
  
  const booleanPatterns = /^(yes|no|true|false|1|0|y|n|approved|rejected|pending)$/i
  const numberPattern = /^-?\d+(\.\d+)?$/
  
  let booleanCount = 0
  let numberCount = 0
  
  for (const value of values) {
    if (booleanPatterns.test(value)) {
      booleanCount++
    } else if (numberPattern.test(value)) {
      numberCount++
    }
  }
  
  const total = values.length
  const booleanRatio = booleanCount / total
  const numberRatio = numberCount / total
  
  if (booleanRatio > 0.8) return 'boolean'
  if (numberRatio > 0.8) return 'number'
  if (booleanRatio > 0.3 || numberRatio > 0.3) return 'mixed'
  
  return 'string'
}

export function findColumnByFingerprint(
  targetFingerprint: ColumnFingerprint,
  csvData: { headers: string[], sampleRows: string[][] }[]
): { filename: string, column: string, match: number } | null {
  let bestMatch = null
  let bestScore = 0
  
  for (const file of csvData) {
    for (let i = 0; i < file.headers.length; i++) {
      const columnValues = file.sampleRows.map(row => row[i] || '')
      const fingerprint = createColumnFingerprint(file.headers[i], i, columnValues)
      
      // Calculate match score
      const score = calculateFingerprintMatch(targetFingerprint, fingerprint)
      
      if (score > bestScore && score > 0.7) { // 70% match threshold
        bestMatch = {
          filename: file.headers[0] || 'unknown', // This should be the actual filename
          column: file.headers[i],
          match: score
        }
        bestScore = score
      }
    }
  }
  
  return bestMatch
}

function calculateFingerprintMatch(
  target: ColumnFingerprint,
  candidate: ColumnFingerprint
): number {
  let score = 0
  
  // Name similarity (30% weight)
  const nameSimilarity = calculateStringSimilarity(target.name, candidate.name)
  score += nameSimilarity * 0.3
  
  // Data type match (20% weight)
  if (target.dataType === candidate.dataType) {
    score += 0.2
  } else if (target.dataType === 'mixed' || candidate.dataType === 'mixed') {
    score += 0.1
  }
  
  // Sample values overlap (30% weight)
  const sampleOverlap = calculateArrayOverlap(target.sampleValues, candidate.sampleValues)
  score += sampleOverlap * 0.3
  
  // Position similarity (10% weight) - columns in similar positions are more likely to be the same
  const positionDiff = Math.abs(target.position - candidate.position)
  const positionScore = Math.max(0, 1 - positionDiff / 10) // Normalize to 0-1
  score += positionScore * 0.1
  
  // Unique values ratio (10% weight)
  const uniqueRatio = Math.min(target.uniqueValues, candidate.uniqueValues) / 
                     Math.max(target.uniqueValues, candidate.uniqueValues)
  score += uniqueRatio * 0.1
  
  return Math.min(1, score)
}

function calculateStringSimilarity(str1: string, str2: string): number {
  const longer = str1.length > str2.length ? str1 : str2
  const shorter = str1.length > str2.length ? str2 : str1
  
  if (longer.length === 0) return 1.0
  
  const editDistance = levenshteinDistance(longer, shorter)
  return (longer.length - editDistance) / longer.length
}

function calculateArrayOverlap(arr1: string[], arr2: string[]): number {
  const set1 = new Set(arr1)
  const set2 = new Set(arr2)
  const intersection = new Set(Array.from(set1).filter(x => set2.has(x)))
  const union = new Set([...Array.from(set1), ...Array.from(set2)])
  
  return intersection.size / union.size
}

function levenshteinDistance(str1: string, str2: string): number {
  const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null))
  
  for (let i = 0; i <= str1.length; i++) matrix[0][i] = i
  for (let j = 0; j <= str2.length; j++) matrix[j][0] = j
  
  for (let j = 1; j <= str2.length; j++) {
    for (let i = 1; i <= str1.length; i++) {
      const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1,
        matrix[j - 1][i] + 1,
        matrix[j - 1][i - 1] + indicator
      )
    }
  }
  
  return matrix[str2.length][str1.length]
}
