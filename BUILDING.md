# Billing Approved Field Finder

A super-simple web app that helps an influencer agency (or anyone with messy CSVs) quickly find which column represents **"billing approved"** — the flag that means a creator is ready to be paid.

The goal is to **ship fast** (under 2 hours of dev time), so the stack and flow are intentionally minimal.

---

## 🚀 Features

1. **CSV Upload**  
   Drag & drop or click to upload one or more CSV files directly in the browser.  

2. **LLM Ranking**  
   The app parses each file client-side, extracts headers + top 10–20 sample values per column, and sends this compact summary to an API route.  
   - The API calls an LLM (e.g., OpenAI) with heuristics.  
   - Returns the top 4 candidate columns that might mean *billing approved*.  

3. **User Confirmation Flow**
   - Show the top candidate: *"Is this the field that tells us we can pay the creator?"*  
   - If **Yes**, save mapping and done.  
   - If **No**, show the other 3 candidates.  
   - If none are correct, open the full CSV browser for manual selection.  

4. **Field Mapping**
   - Once approved, a **fingerprint** of the column is saved (so even if the column name changes later, you can still match it).  
   - Mapping is saved in **localStorage** and also offered as a **downloadable `mapping.json`** file.  

---

## 🛠️ Tech Stack

- **Frontend:** Next.js (React), TailwindCSS, shadcn/ui (optional, for nicer components)  
- **CSV Parsing:** [Papa Parse](https://www.papaparse.com/) (in the browser)  
- **Backend:** Next.js API routes (runs on Node)  
- **LLM:** OpenAI API  
- **Deployment:** Vercel (single app, frontend + API)  
- **Storage:** None (no DB). Everything is local or in the downloaded JSON.  

---

## 📂 Project Structure

**App Directory**
- `/app`
  - `page.tsx` — Upload page
  - `review/page.tsx` — Confirm top candidate
  - `manual/page.tsx` — Manual column browser
  - `api/rank-candidates/` — LLM + heuristic scoring

**Library Code**
- `/lib`
  - `csv.ts` — CSV parsing + type inference
  - `heuristics.ts` — Simple rule-based scoring
  - `fingerprint.ts` — Column fingerprint util
  - `normalize.ts` — Yes/No token normalization

**Components**
- `/components`
  - `Dropzone.tsx`
  - `CandidateCard.tsx`
  - `DataPreview.tsx`
  - `ColumnBrowser.tsx`

---



## ✅ Workflow Recap

1. **Upload CSV(s)**
2. **Process Data**
   - Extract top 10–20 rows per column
   - Send to LLM + heuristics
3. **Review Results**
   - Get top 4 candidate fields
   - User confirms or selects manually
4. **Save & Export**
   - Save fingerprint
   - Export `mapping.json`
