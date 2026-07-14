# M2 Design Lock — PRD-01 Patient Registration & Identity Management

> Milestone: M2 (Design freeze). Scope: matches the M1 sign-off (Gate: Sat 11 Jul 2026) —
> FR-1, FR-2, FR-3, FR-4 (recommended), FR-6, FR-7, FR-8, FR-13, FR-14.
> See `M1_Requirements.md` for the requirement/story pairs this design implements.

## 1. Purpose

Lock the screens, fields, roles, and rules for Phase-1 before build starts at M3, so nobody
is re-deciding UX mid-sprint. Anything not in this doc by the design-freeze gate is out of
scope for M3.

## Build Status Legend

- **[Built]** — implemented and working in the current prototype (`server.js` + `index.html`)
- **[Designed — M3]** — locked in this design doc, not yet implemented; scheduled for the M3 build phase

| Flow | Status |
|---|---|
| 5.1 Search / Duplicate-Avoidance | [Designed — M3] |
| 5.2 Standard Registration | [Built] |
| 5.3 ABHA Verification | [Built] (stubbed verification — real ABDM call pending sandbox access) |
| 5.4 Duplicate Warning | [Designed — M3] |
| 5.5 Merge & Audit | [Designed — M3] |
| 5.6 Insurance / Payer Capture | [Built] (stubbed PMJAY verification — real BIS call pending API access) |
| 5.7 DPDP Notice & Consent | [Designed — M3] |
| 5.8 MLC Flagging | [Designed — M3] |
| 5.9 Newborn Registration | [Built] |
| 5.10 Unknown/Unconscious Quick Path | [Built] |
| 5.11 Queue Token (generation) | [Designed — M3] |

## 2. Personas in Scope (Phase 1)

| Persona | Touches |
|---|---|
| Registrar | Search/duplicate-check, demographic capture, UHID issuance, ABHA verify, insurance capture, MLC flag, newborn/unknown quick paths |
| Patient | Provides identity data via ABHA QR or manual entry, DPDP notice recipient, grants consent |
| Emergency nurse | Quick registration for unknown/unconscious patients |
| MRD officer | Reviews duplicate-candidate flags, performs merges, reads audit trail |
| Billing officer | Reads insurance/payer details captured at registration |

*Out of scope for Phase 1*: photo capture, queue-token SMS delivery, offline/camp mode, self-registration kiosk, bulk registration API, AI-assisted features.

## 3. Design Principles

- Hard blocks (invalid mobile/PIN, missing guardian for a minor, non-existent mother's UHID) stop the save; ABHA and PMJAY verification are never hard blocks — registration must never be blocked by ABDM downtime (NFR: Availability).
- Duplicate warnings (FR-4) are soft — they inform the registrar before save but don't prevent registration outright; a merge is a separate, deliberate MRD action, never automatic.
- Every screen distinguishes the **quick path** (unknown/unconscious patient) from the **standard path** — the quick-path record must always be visually flagged as unreconciled.

## 4. Design Lock Deliverables

| Deliverable | What it should contain |
|---|---|
| Workflow map | End-to-end journey: arrival → search/new → demographics → UHID → duplicate check → insurance & consent → complete → queue token |
| Screen inventory | List of all screens and sub-states in Phase 1 |
| Wireframes/mockups | Main, empty, error, duplicate-warning, and quick-path states |
| Field dictionary | Every field, type, required/optional flag, source, and validation |
| Role-action matrix | Which persona can create, verify, flag, merge, or view |
| Validation rules sheet | Save rules, verification rules, hard stops |
| Exception-state sheet | Invalid mobile/PIN, missing guardian, unknown mother's UHID, probable duplicate found |
| Review log | Comment tracker and final decisions |

## 5. Phase 1 User Flows to Lock

### 5.1 Search / Duplicate-Avoidance Flow (user story 1) — [Designed — M3]
- Registrar searches by UHID, ABHA, or mobile before starting a new registration
- An exact match on UHID or ABHA returns the existing record instead of allowing a new one

### 5.2 Standard Registration Flow (FR-1, FR-2) — [Built]
- Registrar (or patient via ABHA QR) enters/prefills name, DOB, sex, mobile, address, PIN
- Guardian name becomes required only if calculated age < 18
- On save, a duplicate check runs against name + DOB + mobile

### 5.3 ABHA Verification Flow (FR-3, user story 2) — [Built] (stubbed verification)
- ABHA number entered or scanned via QR
- Verify action resolves to Linked / Not linked
- If linked, demographic fields are prefilled for the patient to review, not silently overwritten
- ABHA remains optional throughout; save is never blocked by an unlinked or blank ABHA

### 5.4 Duplicate Warning Flow (FR-4, user story 3) — [Designed — M3]
- On save, if a probable match is found (name + DOB + mobile), a warning lists the candidate(s)
- Registrar can proceed with a new record anyway, or flag it for MRD review
- This is a soft warning — it never blocks the save outright

### 5.5 Merge & Audit Flow (user story 4) — [Designed — M3]
- MRD officer reviews open duplicate-candidate flags
- Confirms a merge, selecting which record is primary
- An immutable audit_log entry is written: who merged, when, which two records
- Audit entry remains readable independently of any later edits to the merged record

### 5.6 Insurance / Payer Capture Flow (FR-6, user story 6) — [Built] (stubbed PMJAY verification)
- Registrar selects payer type (Cash/PMJAY/CGHS/ECHS/ESI/Private TPA/Corporate)
- If PMJAY, a beneficiary-verify action is available
- Payer/scheme details are saved even if verification hasn't run, so billing can read them without re-entry

### 5.7 DPDP Notice & Consent Flow (FR-7) — [Designed — M3]
- Patient is shown an itemised notice (language-selectable) before/at save
- Patient grants consent, or registration proceeds on a legitimate-use basis
- Choice and timestamp are logged; consent is asked once per purpose, not re-served each visit

### 5.8 MLC Flagging Flow (FR-8) — [Designed — M3]
- Registrar toggles "Medico-legal case" during or after registration
- Flag is logged with who/when and visibly marked in any list/detail view

### 5.9 Newborn Registration Flow (FR-13) — [Built]
- Registrar checks "Register as newborn," enters the mother's existing UHID
- Save is rejected if that UHID doesn't correspond to an existing patient

### 5.10 Unknown/Unconscious Patient Quick Flow (FR-14, user story 5) — [Built]
- Emergency nurse selects a single "Quick-register unknown patient" action
- No fields required — UHID generated instantly, record flagged for later reconciliation

### 5.11 Queue Token Flow (generation only) — [Designed — M3]
- On registration completion, a queue token is generated and department-routed
- SMS delivery of the token is out of scope for this milestone

## 6. Field Dictionary (Phase 1)

| Screen | Field | Type | Required | Source | Validation | Status |
|---|---|---|---|---|---|---|
| Search | UHID / ABHA / mobile | text | — | manual entry | exact match returns existing record | [Designed — M3] |
| Registration | Name | text | Yes | manual entry / ABHA prefill | non-empty | [Built] |
| Registration | DOB | date | No | manual entry / ABHA prefill | drives auto-calculated age | [Built] |
| Registration | Sex | enum | No | manual entry / ABHA prefill | male\|female\|other | [Built] |
| Registration | Mobile | text | No | manual entry | 10 digits, starts 6–9 | [Built] |
| Registration | Address + PIN | text | No | manual entry / ABHA prefill | PIN exactly 6 digits | [Built] |
| Registration | Guardian name | text | Conditional | manual entry | required if age < 18 | [Built] |
| ABHA | ABHA number | text | No | manual entry / QR scan | verified via `/verify/abha` | [Built] (stub) |
| Duplicate check | Match candidates | list | — | system (name+DOB+mobile) | shown as warning, not a block | [Designed — M3] |
| Insurance | Payer type | enum | Yes (defaults Cash) | manual entry | cash\|pmjay\|cghs\|echs\|esi\|private_tpa\|corporate | [Built] |
| Consent | Consent basis | enum | Yes | manual entry | consent\|legitimate_use | [Designed — M3] |
| MLC | MLC flag | boolean | No | manual entry | system-set timestamp on toggle | [Designed — M3] |
| Newborn | Mother's UHID | reference | Conditional | patients table | must exist if "newborn" checked | [Built] |
| Quick path | (none) | — | — | system | UHID auto-generated, `record_type = unknown` | [Built] |
| Queue | Token number | text | — | system | auto-generated, department-routed | [Designed — M3] |

## 7. Role-Action Matrix (Phase 1)

| Action | Registrar | Patient | Emergency nurse | MRD officer | Billing officer |
|---|:---:|:---:|:---:|:---:|:---:|
| Search existing patient | Y | — | — | — | — |
| Create standard registration | Y | — | — | — | — |
| Verify ABHA | Y | Y (via QR) | — | — | — |
| Review duplicate warning | Y | — | — | — | — |
| Confirm merge | — | — | — | Y | — |
| Capture/verify insurance | Y | — | — | — | Y (read) |
| Log consent | Y | Y | — | — | — |
| Set MLC flag | Y | — | — | — | — |
| Register newborn | Y | — | — | — | — |
| Quick-register unknown patient | — | — | Y | — | — |
| View audit trail | — | — | — | Y | — |

## 8. Validation Rules Sheet

- **Save rules**: standard registration can't save with an invalid mobile or PIN, or a missing guardian for age < 18; newborn registration can't save without a mother's UHID that exists in the system.
- **Duplicate rule**: a probable match (name + DOB + mobile) surfaces a warning at save time but does not block the save — the registrar decides whether to proceed or flag for MRD review.
- **Verification rules**: ABHA and PMJAY verification are asynchronous and non-blocking — save must succeed whether verification is pending, failed, or skipped.
- **Merge rule**: only an MRD officer can confirm a merge; every merge writes an immutable audit_log entry.

## 9. Exception-State Sheet

| Exception | Trigger | Behaviour |
|---|---|---|
| Invalid mobile number | Entered value isn't 10 digits starting 6–9 | `400` — inline field error, save rejected |
| Invalid PIN | Entered value isn't exactly 6 digits | `400` — inline field error, save rejected |
| Missing guardian for minor | Age < 18 and guardian field empty | `400` — inline field error, save rejected |
| Unknown mother's UHID | Newborn flow submitted with a UHID not on file | `400` — "No existing patient found with this UHID" |
| Probable duplicate found | Name+DOB+mobile match an existing record | Warning shown with candidate(s); save still allowed |
| ABDM/PMJAY gateway down | Verification call fails or times out | Registration proceeds; verification status stays "pending" |
| Unreconciled quick-path record | Unknown patient registered, identity still unknown | Flagged and surfaced on MRD worklist until reconciled |

## 10. Review Log

| Date | Reviewer | Comment | Decision |
|---|---|---|---|
| — | — | — | *(fill in as the team reviews this doc — not yet reviewed)* |
