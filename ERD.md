# PRD-01 — Phase-1 (M1) ERD

Scope: matches the Data Model Draft (§7) from `M1_Requirements_Signoff_Patient_Registration.docx` —
`patients`, `visits`, `insurance`, `consents`, `queue_tokens`, `audit_log`. Photo capture, SMS
delivery, offline mode, kiosk/self-registration, bulk API, and AI features are out of scope.

```mermaid
erDiagram
    PATIENTS ||--o{ VISITS : has
    PATIENTS ||--o{ INSURANCE : covered_by
    PATIENTS ||--o{ CONSENTS : grants
    PATIENTS ||--o{ QUEUE_TOKENS : issued
    PATIENTS ||--o{ AUDIT_LOG : tracked_by
    PATIENTS |o--o| PATIENTS : newborn_linked_to
    PATIENTS ||--o{ DUPLICATE_CANDIDATES : flagged_as

    PATIENTS {
        int id PK
        text uhid
        text abha_number
        int abha_linked
        text name
        text dob
        text sex
        text mobile
        text address
        text pin
        text guardian_name
        int mother_patient_id FK
        text record_type
        int mlc_flag
        text created_at
    }
    VISITS {
        int id PK
        int patient_id FK
        text visit_type
        text department
        text created_at
    }
    INSURANCE {
        int id PK
        int patient_id FK
        text payer_type
        text scheme_id
        int verified
    }
    CONSENTS {
        int id PK
        int patient_id FK
        text purpose
        text basis
        text language
        text logged_at
    }
    QUEUE_TOKENS {
        int id PK
        int patient_id FK
        text token_number
        text department
        text issued_at
    }
    AUDIT_LOG {
        int id PK
        int patient_id FK
        text action
        text performed_by
        text performed_at
        text details
    }
    DUPLICATE_CANDIDATES {
        int id PK
        int patient_id FK
        int candidate_patient_id FK
        text match_basis
        text status
    }
```

## Design notes
- `patients.mother_patient_id` is a self-referencing FK, used only when `record_type = 'newborn'` (user story 5's sibling requirement, FR-13) — enforced at the API layer today (write rejected if the referenced UHID doesn't exist).
- `duplicate_candidates` supports both user story 1 (search by UHID/ABHA/mobile) and user story 3 (duplicate warning before save): a row is created when a probable match is found, and `status` tracks whether the registrar dismissed it, confirmed a merge, or left it pending.
- `audit_log` exists as its own table (not inline history on `patients`) specifically so merge actions (user story 4) remain independently auditable even if a patient record is later modified — this satisfies the MRD officer's "complete audit trail for merged records" requirement.
- `insurance` maps directly to user story 6 (billing officer needs payer/policy details without re-entry) — `verified` is set by the PMJAY/BIS check where applicable.
- `queue_tokens` covers generation only, per the M1 scope note — SMS delivery of the token is explicitly out of scope for this milestone.
- Field-level detail for `patients` (mobile/PIN format, guardian requirement, etc.) mirrors the working prototype's validation rules — see `API_ROUTES.md`.
