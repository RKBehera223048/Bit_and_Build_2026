# Project Document: Karen's Ear - AI Emergency Dispatch Assistant

## 1. Project Overview

**Problem Statement:** "Karen's Ear" - AI Emergency Dispatch Assistant (AI/ML Category)
**Team:** Solo Developer
**Competition:** BIT N BUILD - ODISHA STATE QUALIFIER

### The Challenge
When emergencies strike, emergency response services are flooded with panicked, overlapping, and unstructured reports from various channels (calls, SMS, social media). Navigating this chaotic influx of data to identify the most critical incidents and dispatch heroes effectively is a significant challenge. By the time critical information is identified manually, it might be too late.

### The Solution
"Karen's Ear" is a live, explainable decision-support console that serves as an AI emergency dispatch assistant. It ingests a chaotic stream of multi-channel reports and automatically converts them into verified, structured incident clusters. By leveraging natural language processing (NLP), correlation algorithms, and deterministic triage scoring, the system acts as a "Spider-Sense" for dispatchers. It cuts through the noise to prioritize active incidents in real-time on a "Swing First" queue, ensuring that the right help reaches the most critical situations fastest. 

Importantly, the system is designed to support human dispatchers rather than replace them. Every recommendation is transparent, explainable, and fully auditable, allowing dispatchers to review, override, and manually route resources with full context.

## 2. Architecture

The system follows a modern, decoupled client-server architecture, built for real-time reactivity and resilience.

### System Components
1.  **Frontend Client (React/Vite):** A high-performance, dark-themed command center dashboard. It features three primary panels: a live report feed, an interactive geospatial map (Leaflet), and a ranked priority queue.
2.  **Backend Server (Express/Node.js):** The core engine handling data ingestion, NLP extraction, geospatial mapping, and triage scoring.
3.  **Real-Time Event Stream (SSE):** Server-Sent Events (SSE) provide a unidirectional, low-latency data stream pushing new reports and updated incidents to the client instantly.
4.  **Storage Layer:** Pluggable storage architecture. Designed for MongoDB (Mongoose), but equipped with a robust In-Memory Store fallback to ensure seamless local demonstrations and high availability even during database outages.

### Data Flow
1.  **Ingestion:** Simulated reports (from calls, SMS, social) hit the `/api/reports` REST endpoint.
2.  **Extraction:** The raw text is processed by the AI/NLP engine to extract `incidentType`, `locationText`, `landmark`, `peopleAtRisk`, `triageCategory`, and `hazards`.
3.  **Correlation:** The system checks active incidents. If the new report occurs within a set time window, geographical radius, and matches the incident type, it merges the report into an existing incident to increase its corroboration score.
4.  **Triage Scoring:** The incident's priority (0-100) is calculated based on base severity, people at risk, corroboration count, and manual escalations.
5.  **Broadcast:** The backend pushes the updated state to the frontend via SSE.
6.  **Visualization:** The React client updates the map markers and dynamically re-ranks the priority queue.

## 3. Approach

### Emphasizing Explainability over Black-Box AI
In emergency dispatch, trust is paramount. Instead of relying on a monolithic black-box LLM to make dispatch decisions, the approach was to separate extraction from decision-making. 
- **AI/NLP is used strictly for data extraction** (parsing messy text into structured fields).
- **Decision making is deterministic** (using a mathematical scoring formula based on the extracted fields).
This ensures that the dispatcher always understands *why* an incident is ranked #1 (e.g., "3 people trapped" + "Structure Fire" + "4 corroborating reports").

### Graceful Degradation
To ensure the system remains operational under constraints (e.g., API limits, database connection failures), the architecture incorporates fallback mechanisms:
- **Database Fallback:** An in-memory store automatically takes over if MongoDB is unavailable.
- **NLP Fallback:** If the external LLM API (e.g., Groq) rate limits or fails, a robust Rule-Based NLP engine (using regex and keyword matching) takes over to guarantee continuous extraction.

## 4. Methodology

The development followed an Agile, iterative methodology constrained within the 24-hour hackathon window:

1.  **Planning & Design (Hours 1-2):** Defined the data models (`Report`, `Extraction`, `Incident`, `AuditLog`), the scoring algorithm, and the frontend layout (Feed | Map | Queue).
2.  **Backend Core (Hours 3-6):** Implemented the Express server, the rule-based NLP extractor, the correlation engine, and the priority scoring logic. Built the in-memory data store and the SSE broadcasting system.
3.  **Frontend Scaffold & State (Hours 7-10):** Set up the Vite/React app, configured Tailwind CSS, and implemented global state management using Zustand to handle the incoming SSE stream.
4.  **UI/UX Implementation (Hours 11-16):** Built the interactive map with React-Leaflet, the animated live feed, the priority queue, and the detailed Incident Drawer with override controls.
5.  **Integration & Simulation (Hours 17-20):** Created a `FeedSimulator` with 20 realistic NYC emergency scenarios to simulate a live influx of data. Ensured seamless data flow from backend to frontend.
6.  **Testing & Refinement (Hours 21-24):** Polished the UI (Spider-Man branding, dark theme, micro-animations) and fixed edge cases in the correlation engine.

## 5. Implementation

### Core Algorithms

**1. Triage Scoring Algorithm:**
The priority score (0-100) is calculated dynamically:
-   **Base Score:** Assigned by category (CAT1_PURPLE = 70, CAT2_RED = 50, etc.).
-   **Risk Multiplier:** +5 points for every person at risk (capped at +20).
-   **Corroboration Bonus:** +3 points for every additional report confirming the incident (capped at +15).
-   **Confidence Penalty:** If NLP confidence is low, the score is slightly reduced, flagging it for human review.

**2. Correlation Engine:**
When a new report is extracted, it is compared against active incidents:
-   **Time Constraint:** Must be within 15 minutes of the existing incident.
-   **Type Match:** The `incidentType` (e.g., `fire`, `medical`) must match.
-   **Location Match:** The extracted landmark or geographic coordinates must fall within a 400-meter radius.
If conditions are met, the report is appended to the incident's `reportIds`, bumping its corroboration score rather than creating a duplicate on the map.

## 6. Technologies Used

*   **Frontend Framework:** React 19, Vite
*   **Language:** TypeScript (Strict typing across the stack)
*   **Styling:** Tailwind CSS v4, clsx, tailwind-merge
*   **State Management:** Zustand
*   **Animations:** Framer Motion
*   **Mapping:** Leaflet, React-Leaflet, Stadia Maps (Dark Theme Tiles)
*   **Icons:** Lucide React
*   **Backend Server:** Node.js, Express.js
*   **Real-time Communication:** Server-Sent Events (SSE)
*   **Data Validation:** UUID (for unique identifiers)

## 7. Relevant Technical Decisions

1.  **Server-Sent Events (SSE) over WebSockets:** 
    For a dashboard that primarily consumes data (receiving live reports and incident updates) with minimal client-to-server messaging, SSE is more lightweight, easier to implement, and handles automatic reconnection gracefully compared to WebSockets.
2.  **Zustand over Redux:**
    Zustand provided a frictionless, boilerplate-free way to manage the rapidly updating global state (live reports, incident lists) driven by the SSE stream, maintaining high performance without the overhead of Redux.
3.  **Rule-Based NLP as Primary Extractor (for Demo):**
    While LLMs are powerful, network latency and API rate limits can ruin a live demo. Implementing a robust RegExp/Keyword-based extractor ensured instantaneous, predictable results for the simulation, with the architecture allowing for easy swapping to an LLM via the `processExtraction` interface later.
4.  **In-Memory Store:**
    To guarantee the project is easily runnable by judges without requiring them to set up MongoDB or environment variables, an in-memory data store was implemented. It perfectly mimics the database layer for the scope of a 24-hour hackathon demo.
5.  **Dark Theme & "Spider-Sense" Aesthetics:**
    The UI was designed not just for function, but for cognitive ease during stressful situations. The dark background reduces glare, while neon triage colors (Purple for immediate, Red for emergency) draw the eye instantly to critical information, simulating an intuitive "Spider-Sense" for the dispatcher.

---
*End of Document*
