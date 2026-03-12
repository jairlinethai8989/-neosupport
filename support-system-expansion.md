# Plan: Support System Expansion & Scalability

> **Task:** Expand NEO Support with Advanced Reporting, Escalation, AI, and Hospital Isolation.
> **Date:** 2026-03-12
> **Status:** ⏳ Pending User Approval

---

## 📋 Overview
This phase focuses on maturing the NEO Support platform from a basic ticketing system into a robust, scalable enterprise support solution. Key pillars include data-driven insights, cross-department coordination, AI efficiency, and strict multi-tenant security.

---

## 🎯 Success Criteria
- [x] **Task 3.1: Reporting Dashboard**
    - Interactive charts for Trends, Hospital Load, and Resolution Speed.
    - Page: `src/app/graph/page.tsx` (Enhanced).
- [x] **Task 3.2: Data Export**
    - API endpoint for Excel export using `xlsx`.
    - Route: `/api/reports/export`.
- [ ] **Department Escalation:** Support for "Programmer", "QA", and "Hardware" departments with handover tracking.
- [ ] **AI Automation:** Automatic categorization of incoming tickets and conversation summaries.
- [ ] **Secure Isolation:** RLS policies that ensure a user from Hospital A cannot see Hospital B's tickets.
- [ ] **Persistent Auth:** Session management optimized for "log in once, stay logged in" across hospital portals.

---

## 🛠️ Tech Stack
- **Frontend:** Next.js 15, Recharts (Visualization), SheetJS (xlsx export).
- **Backend:** Supabase (PostgreSQL), Edge Functions / Next API Routes.
- **AI:** OpenAI GPT-4o or Google Gemini 1.5 Pro.
- **Security:** PostgreSQL Row Level Security (RLS) with Hospital-based grouping.

---

## 📂 Proposed File Structure
```plaintext
src/
├── app/
│   ├── reports/
│   │   └── page.tsx             # Advanced analytics dashboard
│   ├── api/
│   │   ├── reports/
│   │   │   └── export/route.ts  # Excel export generator
│   │   └── ai/
│   │       ├── categorize/      # AI categorization webhook/endpoint
│   │       └── summarize/       # AI conversation summarizer
│   └── (auth)/
│       └── login/page.tsx       # Enhanced persistent login logic
supabase/
└── migrations/
    ├── 015_hospital_isolation.sql # Strict RLS implementation
    ├── 016_department_schema.sql  # Departments and escalation tracking
    └── 017_reporting_views.sql    # Optimized views for charts
```

---

## 📝 Task Breakdown

### Phase 1: Security & Isolation (Foundation)
| ID | Task | Agent | Skills | Priority |
|:---|:---|:---|:---|:---|
- [x] **Task 1.1: Strict Hospital RLS**
    - Implementation of hospital-specific RLS policies for `tickets` and `users`.
    - Migration: `015_hospital_isolation.sql`.
- [x] **Task 1.2: Enhanced Session Logic**
    - Audit `middleware.ts` and `supabase/middleware.ts` for session persistence.
    - Status: Standard `@supabase/ssr` logic verified; session lasts until manual logout by default.
ss cross-hospital navigation. | `backend-specialist` | `nodejs-best-practices` | P1 |

### Phase 2: Escalation & Workflow
| ID | Task | Agent | Skills | Priority |
|:---|:---|:---|:---|:---|
- [x] **Task 2.1: Department Schema**
    - Create `departments` lookup table.
    - Add `department_id` to `tickets`.
    - Migration: `016_department_schema.sql`.
- [x] **Task 2.2: Handover UI**
    - Add "Transfer Department" action in Ticket Details.
    - Require `handover_notes` for all transfers.
    - API: Update `/api/tickets/[id]/transfer`.
nd-design`| P1 |

### Phase 3: Advanced Reporting
| ID | Task | Agent | Skills | Priority |
|:---|:---|:---|:---|:---|
| 3.1 | Analytics Dashboard: Create `/reports` page with Recharts showing "Tickets by Status" and "Hospitals by Load". | `frontend-specialist` | `frontend-design` | P1 |
| 3.2 | Excel Export API: Implement `xlsx` service to download filtered ticket lists based on date range and hospital. | `backend-specialist` | `api-patterns` | P2 |

### Phase 4: AI & Automation
| ID | Task | Agent | Skills | Priority |
|:---|:---|:---|:---|:---
- [x] **Task 4.1: AI Categorization**
    - Simple LLM call (Gemini) to predict `issue_type` and `priority` from first message.
    - Integration: `src/app/api/line/webhook/route.ts`.
- [ ] **Task 4.2: AI Summarization**
    - UI feature to generate staff summary of long chat threads.
    - Integration: `src/app/api/ai/summarize/route.ts`. (Functionality exists, needs testing)
r: Add a button to "AI Summarize" long chat threads into the `ai_summary` field. | `frontend-specialist` | `frontend-design` | P3 |

---

## 🏁 Phase X: Verification
- [ ] Run `python .agent/scripts/verify_all.py .`
- [ ] Manual Check: Log in as Hospital A user; verify Hospital B tickets are invisible.
- [ ] Manual Check: Export 100+ tickets to Excel and verify data integrity.
- [ ] Security Scan: Ensure AI API keys are not exposed to client-side.
