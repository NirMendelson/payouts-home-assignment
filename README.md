# Billing Approved Field Finder

**🌐 Live Demo**: [https://payouts-home-assignment.vercel.app](https://payouts-home-assignment.vercel.app)

A smart web application that helps agencies and businesses quickly identify the "billing approved" field in their CSV files using AI-powered analysis.

## 🎯 What It Does

Finding the right column that indicates whether a creator/influencer is ready to be paid can be time-consuming and error-prone, especially with messy CSV files. This tool uses an LLM to intelligently analyze your data and suggest the most likely candidates for the billing approved field, making onboarding much faster and more reliable.

## ✨ Key Features

- **AI-Powered Analysis**: Uses Azure OpenAI to intelligently identify potential billing approved fields
- **Smart Candidate Ranking**: Returns the top 4 most likely candidates with confidence scores
- **Interactive Review Process**: Step-by-step confirmation flow for easy decision making
- **Value Mapping**: Map specific field values to "Payment Approved" or "Not Approved"
- **Column Fingerprinting**: Persistent column identification even if field names change
- **Export Mapping**: Download complete field mappings as JSON files

## 🚀 How It Works

1. **Upload CSV Files**: Drag and drop or select your CSV files
2. **AI Analysis**: The LLM analyzes column headers and sample data to find billing-related fields
3. **Review Candidates**: Review the top candidate with highlighted data preview
4. **Map Values**: Define which values in the field mean "approved" vs "not approved"
5. **Export Mapping**: Save the complete field mapping for future use

## 🛠️ Tech Stack

- **Frontend**: Next.js 14, React, TypeScript
- **Styling**: Tailwind CSS, shadcn/ui components
- **CSV Processing**: Papa Parse (client-side)
- **AI**: Azure OpenAI API (GPT-4o-mini)
- **Storage**: Browser localStorage + JSON export

## 🚀 Quick Start

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Set up environment variables**:
   Create `.env.local` with your Azure OpenAI credentials:
   ```env
   AZURE_OPENAI_ENDPOINT=your_endpoint
   AZURE_OPENAI_API_KEY=your_api_key
   OPENAI_API_VERSION=2024-02-15-preview
   GPT_4O_MINI_DEPLOYMENT=your_deployment_name
   ```

3. **Run the development server**:
   ```bash
   npm run dev
   ```

4. **Open your browser**:
   Navigate to [http://localhost:3000](http://localhost:3000)

## 📁 Project Structure

```
├── app/
│   ├── page.tsx                 # Main upload page
│   ├── review/page.tsx          # Review top candidate
│   ├── candidates/page.tsx      # Review other candidates
│   ├── manual/page.tsx          # Manual field selection
│   ├── field-mapping/page.tsx   # Map field values
│   └── api/analyze-csv/         # LLM analysis API
├── components/
│   └── ui/                      # shadcn/ui components
├── lib/
│   ├── csv.ts                   # CSV parsing utilities
│   ├── fingerprint.ts           # Column fingerprinting
│   └── utils.ts                 # General utilities
└── README.md
```

## 🎯 Use Cases

- **Influencer Agencies**: Quickly identify payment approval fields across different campaign CSV exports
- **Freelance Platforms**: Map various approval status fields to standard payment workflows
- **Accounting Teams**: Standardize billing approval field identification across different data sources
- **Data Migration**: Identify and map approval fields when moving between systems

## 🔧 Configuration

The LLM analysis can be customized by modifying the prompt in `app/api/analyze-csv/route.ts`. The system looks for:

- Boolean fields (yes/no, true/false, 1/0)
- Status fields (approved, pending, rejected)
- Fields with approval-related names
- Fields with payment-related keywords

