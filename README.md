# Karen's Ear 🕷️

> AI Emergency Dispatch Console — Turning chaotic citizen reports into verified, actionable incident clusters for first responders.

*Built for Bit and Build 2026.*

## 🌟 Overview

Karen's Ear is a live, explainable emergency-triage console designed for a fictional New York City. It ingests a stream of messy reports from calls, SMS, and social media, turns each into structured incident evidence, merges corroborating reports, and recommends the next place Spider-Man should go based on a deterministic triage scoring system.

**The product is a decision-support system, not an autonomous dispatcher.** A human dispatcher is always kept in the loop and can review, override, and audit every recommendation.

## ✨ Features

- **Live Report Ingestion:** Streams incoming reports from various sources.
- **Rule-Based NLP Extraction:** Automatically extracts incident type, location, triage severity, and hazards.
- **Correlation Engine:** Deduplicates reports by merging corroborating ones based on time, type, and location.
- **Triage Priority Scoring:** Ranks incidents dynamically on a 0-100 scale using a deterministic weighted formula.
- **"Swing First" Queue:** Displays the most critical active incidents at the top.
- **Interactive Map:** Live map of NYC plotting all incidents and corroboration density.
- **Full Audit Trail:** Every decision and override is recorded transparently in the system.

## 🛠️ Tech Stack

### Frontend (`/karen-ear-client`)
- **React 19 + Vite**
- **TypeScript**
- **Tailwind CSS v4**
- **Zustand** (State Management)
- **Framer Motion** (Animations)
- **Leaflet & React-Leaflet** (Interactive Maps)
- **Lucide React** (Icons)

### Backend (`/karen-ear-server`)
- **Node.js + Express.js**
- **TypeScript**
- **Server-Sent Events (SSE)** (Real-time push updates)
- **In-Memory Store** (Fallback when MongoDB is disabled, for easy local dev/demo)
- **Rule-based NLP & Simulation Services**

## 🚀 Getting Started

To run the full stack locally without any external API keys or databases:

### 1. Start the Backend Server
```bash
cd karen-ear-server
npm install
npm run dev
# Or run with tsx: npx tsx src/index.ts
```
*The backend will run on `http://localhost:3001`.*

### 2. Start the Frontend Client
```bash
cd karen-ear-client
npm install
npm run dev
```
*The frontend will run on `http://localhost:5173`.*

### 3. Run the Demo Feed
Once both are running, open your browser to `http://localhost:5173` and click the **▶ Start Feed** button in the top right to watch simulated reports stream in real-time.

## 📁 Architecture Overview

- **Reports:** Raw incoming data (Call, SMS, Social).
- **Extractions:** Structured interpretation of reports (Location, Hazards, Triage Category).
- **Incidents:** A verified event formed by one or more correlating reports.
- **Audit Logs:** Immutable trail of state changes and dispatcher actions.

---
*Developed by a solo developer for Bit and Build 2026.*
