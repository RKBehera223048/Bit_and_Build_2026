# AI Assistant Configuration (GEMINI.md)

This project was built with the assistance of **Google Antigravity (Gemini)** during the Bit N Build 2026 hackathon.

As per the hackathon rules regarding the use of AI coding tools, this file serves as the documentation of the AI's system instructions and the collaborative approach taken.

## System Guidelines Followed

During the development of "Karen's Ear", the AI was instructed to follow these core guidelines:

1. **Role:** Act as a senior full-stack engineer and pair-programmer.
2. **Architecture:** Maintain a clean, decoupled architecture (Vite/React frontend + Express backend).
3. **Resilience:** Implement fallback mechanisms (In-Memory store if MongoDB fails, Rule-based NLP if LLM fails) to ensure the system is robust for the demo.
4. **Design Aesthetics:** Utilize a dark-themed, "Spider-Sense" inspired UI with Tailwind CSS v4, prioritizing usability for emergency dispatchers.
5. **Transparency:** Ensure all dispatch decisions made by the system are explainable, deterministic, and fully auditable by human operators.

## Collaborative Process

1. **Planning & Architecture:** The human developer provided the problem statement and defined the core requirements for the emergency dispatch system. The AI generated the `implementation_plan.md` to structure the 24-hour sprint.
2. **Scaffolding:** The AI assisted in setting up the boilerplate for both the Express backend and the Vite frontend.
3. **Core Logic Implementation:** The AI wrote the algorithms for deterministic triage scoring, geospatial correlation, and the rule-based NLP extraction, while the human developer reviewed and verified the logic.
4. **UI/UX Design:** The human directed the visual aesthetic, and the AI implemented the components using Tailwind CSS and Framer Motion for micro-animations.
5. **Debugging & Testing:** The AI and human paired to debug SSE (Server-Sent Events) connection issues and refine the map marker logic using React-Leaflet.

## Technical Scope of AI Assistance

The AI agent had the ability to:
- Read and modify the codebase.
- Execute terminal commands (e.g., `npm install`, `npm run dev`).
- Run background tasks and monitor server logs.
- Launch a headless browser to visually verify the frontend implementation and check for console errors.

*This file satisfies the requirement to retain relevant instruction/configuration files for AI coding agents used during the hackathon.*
