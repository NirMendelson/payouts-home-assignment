import { NextResponse } from 'next/server'

export async function GET() {
  const envCheck = {
    AZURE_OPENAI_ENDPOINT: process.env.AZURE_OPENAI_ENDPOINT ? 'Set' : 'Missing',
    AZURE_OPENAI_API_KEY: process.env.AZURE_OPENAI_API_KEY ? 'Set' : 'Missing',
    OPENAI_API_VERSION: process.env.OPENAI_API_VERSION || 'Missing',
    GPT_4O_MINI_DEPLOYMENT: process.env.GPT_4O_MINI_DEPLOYMENT || 'Missing',
  }

  return NextResponse.json({
    message: 'Environment variables check',
    env: envCheck,
    instructions: {
      missing: 'If any variables show "Missing", create a .env.local file with your Azure OpenAI credentials',
      example: {
        AZURE_OPENAI_ENDPOINT: 'https://your-resource.openai.azure.com',
        AZURE_OPENAI_API_KEY: 'your-api-key-here',
        OPENAI_API_VERSION: '2024-02-15-preview',
        GPT_4O_MINI_DEPLOYMENT: 'your-deployment-name-here'
      }
    }
  })
}
