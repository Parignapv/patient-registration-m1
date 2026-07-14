# PRD-01 — Phase-1 (M1) API / Route List

Base URL: `/api`. All responses JSON. No auth layer in the M2 skeleton (flagged for M3).

Status column: `LIVE` = implemented and working in the walking-skeleton repo (M2 requires exactly
one end-to-end flow — **Patient Registration** was chosen). `STUB` = route registered/planned,
not yet wired. Scope matches the M1 sign-off (§5): FR-1, FR-2, FR-3, FR-4 (recommended), FR-6,
FR-7, FR-8, FR-13, FR-14. Photo capture, queue-token SMS, offline mode, kiosk/self-registration,
bulk API, and AI features are explicitly out of scope for this milestone.

## Patient registry (FR-1, FR-2) — end-to-end flow for M2

| Method | Route | Description | Status |
|---|---|---|---|
| POST | `/patients` | Register a standard patient. Validates fields, generates UHID (Luhn check-digit), saves record. | **LIVE** |
| GET | `/patients` | List all registered patients, most recent first. | **LIVE** |
| GET | `/patients/:uhid` | Get a single patient by UHID. | **LIVE** |
| GET | `/patients/search?q=` | Search by UHID, ABHA, or mobile (user story 1). | STUB |
| POST | `/patients/unknown` | Quick-register an unknown/unconscious patient (FR-14, user story 5) — no fields required. | **LIVE** |

## ABHA linking (FR-3)

| Method | Route | Description | Status |
|---|---|---|---|
| POST | `/verify/abha` | Verify an ABHA number and mark it linked against the current registration (user story 2). | **LIVE (stubbed verification)** — accepts any non-empty ABHA and returns `linked: true`; swap the handler body for a real ABDM Gateway call when sandbox credentials are available. |

## Duplicate detection (FR-4 — Recommended)

| Method | Route | Description | Status |
|---|---|---|---|
| POST | `/patients/check-duplicate` | Given name + DOB + mobile, return probable-match candidates before save (user story 3). | STUB |
| GET | `/duplicates` | List all open duplicate-candidate flags. | STUB |
| POST | `/duplicates/:id/merge` | Merge two records; writes an immutable `audit_log` entry (user story 4). | STUB |
| POST | `/duplicates/:id/dismiss` | Dismiss a candidate as not a duplicate. | STUB |

## Insurance / payer capture (FR-6, user story 6)

| Method | Route | Description | Status |
|---|---|---|---|
| POST | `/verify/pmjay` | Verify PMJAY beneficiary status. | **LIVE (stubbed verification)** — always returns `verified: true`; swap for a real PMJAY BIS call later. |
| GET | `/patients/:uhid/insurance` | Read payer/scheme details for a patient (billing officer access). | STUB |

## Consent logging (FR-7)

| Method | Route | Description | Status |
|---|---|---|---|
| GET | `/dpdp/notice` | Fetch the itemised DPDP notice text, by language. | STUB |
| POST | `/patients/:uhid/consent` | Log consent or legitimate-use basis with timestamp. | STUB |

## MLC flagging (FR-8)

| Method | Route | Description | Status |
|---|---|---|---|
| POST | `/patients/:uhid/mlc` | Flag a patient record as medico-legal. | STUB |
| GET | `/patients/mlc` | List all MLC-flagged records. | STUB |

## Queue tokens (generation only — SMS delivery out of scope)

| Method | Route | Description | Status |
|---|---|---|---|
| POST | `/patients/:uhid/queue-token` | Issue a queue token/department routing at end of registration. | STUB |

## Audit log

| Method | Route | Description | Status |
|---|---|---|---|
| GET | `/patients/:uhid/audit` | Read the audit trail for a patient (registrations, merges, MLC flags, consent changes). | STUB |

## Ops

| Method | Route | Description | Status |
|---|---|---|---|
| GET | `/health` | Liveness check. | STUB — add before M3 handoff. |

**M2 exit criteria met**: app boots, and the Patient Registration flow
(`POST /patients` → `GET /patients` → `GET /patients/:uhid`, plus `POST /patients/unknown`)
runs end-to-end against a JSON-file-backed store. All Phase-1 routes are enumerated above so
M3 (build checkpoint) has a fixed contract to build against.
