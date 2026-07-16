# UHID Registration — Backend + Frontend

Backend for PRD-01 (Patient Registration & Identity Management). Node.js + Express, with a JSON-file datastore. All M1/M2 flows plus the M3 flows below are built and wired end-to-end.

## Folder structure
```
backend/
├── server.js           ← Express API (all routes + UHID generation)
├── package.json
├── data/
│   ├── patients.json   ← patient records — starts empty, fills up as you register patients
│   ├── audit.json      ← audit trail (duplicate overrides, merges, MLC flags)
│   └── queue.json      ← today's OPD queue tokens (resets daily)
└── public/
    └── patient_registration.html  ← the frontend, wired to call the backend
```

## How to run (VS Code / terminal)

1. Open the `backend` folder in VS Code.
2. Open a terminal (`Terminal → New Terminal`) and run:
   ```
   npm install
   npm start
   ```
3. You'll see: `UHID Registration backend running at http://localhost:3000`
4. Open your browser to **http://localhost:3000** — the frontend is served automatically from `public/`, calling the same backend.

## Flow status (matches the M1→M3 tracker)

| Flow | Status |
|---|---|
| 5.1 Search / Duplicate-Avoidance | **Built** |
| 5.2 Standard Registration | Built (M1) |
| 5.3 ABHA Verification | Built (M1, stubbed) |
| 5.4 Duplicate Warning | **Built** |
| 5.5 Merge & Audit | **Built** |
| 5.6 Insurance / Payer Capture | Built (M1, stubbed) |
| 5.7 DPDP Notice & Consent | **Built** |
| 5.8 MLC Flagging | **Built** |
| 5.9 Newborn Registration | Built (M1) |
| 5.10 Unknown/Unconscious Quick Path | Built (M1) |
| 5.11 Queue Token (generation) | **Built** |

## API endpoints

| Method | Route | Purpose |
|---|---|---|
| `POST` | `/api/patients` | Register a standard patient. Validates fields, runs the 5.4 duplicate check, requires 5.7 consent acknowledgement, captures 5.8 MLC data if flagged, auto-issues a 5.11 queue token, generates the UHID (Luhn check-digit), and saves the record. |
| `GET` | `/api/patients` | List all registered patients (most recent first). |
| `GET` | `/api/patients/:uhid` | Get a single patient by UHID. |
| `GET` | `/api/patients/search?name=&mobile=&dob=&abha=` | **5.1** Live duplicate-avoidance lookup. Scores candidates by ABHA/mobile/DOB exact match and fuzzy name similarity; returns the top matches so the front desk can spot an existing UHID before registering. |
| `POST` | `/api/patients/unknown` | Quick-register an unknown/unconscious patient (FR-14) — no fields required; still gets a queue token. |
| `POST` | `/api/patients/merge` | **5.5** Merge a duplicate UHID into a primary UHID. Body: `{ primaryUhid, duplicateUhid, mergedBy }`. Fills blank fields on the primary from the duplicate, marks the duplicate `type: "merged"` (never deleted), and writes a full before/after snapshot to the audit log. |
| `GET` | `/api/audit` | **5.5** Audit log (most recent first) — duplicate overrides, merges, and MLC flags. |
| `GET` | `/api/consent/notice` | **5.7** Current DPDP notice text, version, and processing purposes, for display at the front desk. |
| `GET` | `/api/mlc` | **5.8** MLC register — every patient flagged as a Medico-Legal Case, with case type and police-intimation status. |
| `POST` | `/api/queue/token` | **5.11** Manually issue/re-issue a queue token for an already-registered patient. Body: `{ uhid, department }`. |
| `GET` | `/api/queue?department=` | **5.11** Current day's queue tokens, optionally filtered by department. Resets automatically each day. |
| `POST` | `/api/verify/abha` | Stubbed ABHA verification (FR-3). Body: `{ "abha": "..." }`. Replace the inside of this route with a real ABDM Gateway call later — nothing else needs to change. |
| `POST` | `/api/verify/pmjay` | Stubbed PMJAY beneficiary verification (FR-6). Replace the inside with a real BIS API call later. |

## How the 5.4 duplicate-warning flow works
`POST /api/patients` runs a candidate match (same logic as 5.1 search) before creating a record. If a strong match is found (mobile/ABHA/DOB exact match, or a close name match) and the request doesn't already include `confirmDuplicate: true`, the server responds `409` with the matched records instead of creating a new one. The frontend shows these matches with two choices: "Use this UHID" (abandon the new registration) or "Register as new anyway" (resubmits with `confirmDuplicate: true`, which is logged to the audit trail as a `duplicate_override`).

## How 5.7 DPDP consent is enforced
Every standard registration must include `consent.acknowledged: true` — this only confirms the notice was shown/read, and gates nothing about the treatment itself (care is never withheld for consent refusal). A second, optional flag (`billing_scheme` purpose) covers non-essential processing like scheme/insurance data sharing, which the patient can decline independently. The current notice text/version is served from `/api/consent/notice` so it's edited in one place.

## How 5.8 MLC flagging works
If `mlc.isMLC` is true on registration, `mlc.mlcType` is mandatory (400 error otherwise). Flagged cases are written to the patient record and logged to the audit trail, and appear in the `/api/mlc` register regardless of payer, ABHA status, or identification state (an MLC can even be flagged on an unknown/unconscious patient once they're identified via `/api/patients/merge`).

## How 5.11 queue tokens work
Every successful registration (standard, duplicate-override, or unknown/unconscious) auto-issues a per-department, per-day sequential token via `issueQueueToken()`. Counters live in `data/queue.json` and reset automatically the first time a token is issued on a new calendar day. `POST /api/queue/token` lets the front desk issue an additional token later (e.g. patient referred to a second department).

## What's validated server-side
- Name is required
- Mobile: exactly 10 digits, starting 6–9
- PIN: exactly 6 digits
- Guardian name required if age < 18
- Newborn registration requires an existing mother's UHID (checked against the database — rejects if the UHID doesn't exist)
- DPDP notice acknowledgement required (5.7)
- MLC case type required if flagged as MLC (5.8)
- Duplicate registration blocked unless explicitly confirmed (5.4)

## Swapping in real ABHA/PMJAY later
Both `/api/verify/abha` and `/api/verify/pmjay` in `server.js` are intentionally isolated — when your ABDM sandbox credentials come through, replace the `setTimeout(...)` stub logic inside those two route handlers with real `fetch()` calls to the ABDM/PMJAY APIs. The frontend and the rest of the backend don't need to change at all.

## Swapping the JSON files for a real database later
`readDB()`/`writeDB()`, `readAudit()`/`writeAudit()`, and `readQueue()`/`writeQueue()` in `server.js` are the only functions touching storage. Point them at Postgres/MongoDB/whatever your team picks later, and every route keeps working unchanged.
