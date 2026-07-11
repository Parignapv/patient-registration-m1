# 🏥 Patient Registration & Identity Management (PRD-01)

A Product Requirements Document (PRD) for the Patient Registration & Identity Management module of a Hospital Information System.

---

## Patient Registration Workflow

```mermaid
flowchart TD

A[Patient Arrives] --> B{Existing Patient?}

B -- Yes --> C[Search by UHID / ABHA / Mobile]
B -- No --> D[New Registration]

C --> E[Verify Patient Details]

D --> F[Capture Demographics]
F --> G[Generate UHID]
G --> H[Duplicate Check]
H --> I[Capture Insurance Details]

E --> J[Patient Registration Complete]
I --> J

J --> K[Generate Queue Token]
K --> L[Proceed to Consultation]
```

---

## Repository Contents

| File | Description |
|------|-------------|
| Patient_Registration_Requirements.docx | Complete Product Requirements Document |
| README.md | Repository overview |

---

## Objectives

- Standardize patient registration
- Generate UHID
- Prevent duplicate patient records
- Support ABHA integration
- Capture insurance details
- Improve registration workflow

---

## Status

🚧 Under Development