# M3 Wireframes — As Built

> Companion to `Wireframes.md` (M2 design wireframes) and `M2_Design.md` (design lock,
> updated post-build). This doc shows the actual single-page front-desk console as it
> was built (`public/patient_registration.html`), screen-region by screen-region, so it's
> easy to diff against the original 11 design wireframes.
>
> **Biggest structural difference:** the original wireframes assumed separate
> screens/modals per flow. The build is one continuous two-column console —
> registration form on the left, live status panels on the right — with several
> flows (search, ABHA, PMJAY, newborn, MLC, consent) folded inline into the form
> instead of living on their own screen.

---

## Layout overview

```text
+----------------------------------------------------------------------------+
| UHID Registration Desk                     Hospital code: AH  |  Date      |
+----------------------------------------------------------------+-----------+
|  LEFT COLUMN                                | RIGHT COLUMN                 |
|  - Registration form (1, 2, 3, 6, 7, 8, 9)  | - Registered today (table)   |
|  - Unknown/Unconscious quick box (10)       | - Queue status (11)         |
|                                              | - Merge duplicate records(5)|
|                                              | - MLC register (8)          |
|                                              | - Audit log (5)             |
+----------------------------------------------------------------------------+
```

---

## 1. Search / Duplicate-Avoidance — *inline, not a separate screen*

```text
+------------------------------------------------------+
| Full name                                             |
| [ Lakshmi Narayan___________________________ ]        |
| +----------------------------------------------------+ |
| | Possible existing records                          | |
| | AH-26-100042-3 — Lakshmi Narayan (34/F, Mobile     | |
| |   match, DOB match)        [ Use this record ]     | |
| +----------------------------------------------------+ |
+------------------------------------------------------+
```

**As built:** live suggestions appear under the Name field as the registrar types
(debounced, name/mobile/DOB). No dedicated "Search by UHID/ABHA/Mobile" screen exists —
searching *is* starting to fill the form. **Gap vs. design:** no direct "paste a UHID,
jump straight to that record" lookup; matching is by name/mobile/DOB/ABHA similarity only.

---

## 2. Standard Patient Registration

```text
+------------------------------------------------------+
| New / Returning Patient Registration                  |
| Name: ________________________________________       |
| DOB: __________        Age (auto): ______             |
| Sex: [Select v]         Mobile: ______________         |
| Address: ______________________________________       |
| PIN: ______             Guardian: ______________       |
+------------------------------------------------------+
```

**As built:** matches design 1:1, plus an auto-calculated Age field (read-only,
derived from DOB) that wasn't in the original wireframe.

---

## 3. ABHA Verification — *inline row, not a separate screen*

```text
+------------------------------------------------------+
| ABHA (National Health ID)                             |
| [ 14-digit ABHA number____ ] [Verify ABHA] (Not linked)|
| ABHA is optional — care is never denied for refusal.   |
+------------------------------------------------------+
```

**As built:** same behaviour as designed (enter/scan → verify → Linked/Not linked pill),
just embedded as a row inside the main form instead of its own screen.

---

## 4. Duplicate Warning — *shown, but with 2 actions not 3*

```text
+------------------------------------------------------+
| ⚠ Possible existing record(s) found                    |
| +----------------------------------------------------+ |
| | AH-26-100042-3 — Lakshmi Narayan, 34/F               |
| |   Mobile match, DOB match     [ Use this UHID ]    | |
| +----------------------------------------------------+ |
| [ Register as new anyway ]   [ Cancel & review ]      |
+------------------------------------------------------+
```

**Gap vs. design:** the original wireframe has three actions — Proceed / **Flag for
MRD** / Cancel. The build only has two — Register anyway / Cancel. There is no
"flag for MRD review" action, and no worklist feeding MRD a queue of flagged
duplicates to work through later (see #5 below — this is the same gap, seen from
the other end).

---

## 5. Merge & Audit — *direct merge, no MRD worklist*

```text
+------------------------------------------------------+
| Merge duplicate records                               |
| Primary UHID (keep): ____________                      |
| Duplicate UHID (merge in): ____________                |
| [ Merge records ]                                      |
+------------------------------------------------------+

+------------------------------------------------------+
| Audit log                                    [refresh] |
| When            | Action             | Details         |
| 16 Jul, 10:07 AM | merge              | primaryUhid:... |
| 16 Jul, 10:07 AM | duplicate_override | uhid: AH-26-... |
+------------------------------------------------------+
```

**As built:** merge works (fills blank fields on primary, keeps duplicate as a
`merged` record, writes a full before/after snapshot to the audit log) — but it's a
manual two-textbox form, not a worklist. **Gap vs. design:** there's no screen listing
"records flagged for MRD review, waiting to be merged" — an MRD officer needs to
already know both UHIDs (which, per the gap in #4, nothing currently supplies).

---

## 6. Insurance / PMJAY — *inline, no dedicated ID field*

```text
+------------------------------------------------------+
| Payer / scheme: [Cash v]     Department: [General OPD v]|
| [ Verify PMJAY Beneficiary ]   (Not verified)          |
+------------------------------------------------------+
```

**As built:** payer select + verify + status pill match the design. **Gap vs.
design:** no separate "PMJAY ID" text input — the stub verifies without collecting
a beneficiary ID number. A Department field was added (not in original wireframe)
to route the queue token in §11.

---

## 7. DPDP Consent — *split into two toggles, not one*

```text
+------------------------------------------------------+
| DPDP Notice & Consent                                  |
| DPDP Notice v1.0 (effective 2025-01-01)                |
| This hospital collects your data under the DPDP Act... |
|  • Registration & identity management (UHID)           |
|  • Clinical care, treatment & continuity of care        |
|  • Billing, insurance & government scheme processing    |
|  • Statutory & regulatory reporting                      |
| [x] Notice read/shown to patient and acknowledged       |
| [x] Patient additionally consents to scheme/insurance   |
|     data sharing (optional)                              |
+------------------------------------------------------+
```

**As built:** more granular than the single "[ ] I Agree" checkbox in the design —
notice acknowledgement (required to save) is separated from optional consent to
non-essential processing (can be declined independently, doesn't block registration).

---

## 8. MLC Flagging — *richer fields than designed*

```text
+------------------------------------------------------+
| Medico-Legal Case (MLC)                                |
| [ ] Flag as a Medico-Legal Case                         |
| +----------------------------------------------------+ |
| | Case type: [Select v]      Brought in by: _______   | |
| | [ ] Police already informed                          |
| | Police station: _______   Intimation/FIR no.: ____  | |
| | Remarks: ________________________________________   | |
| +----------------------------------------------------+ |
+------------------------------------------------------+
```

```text
+------------------------------------------------------+
| MLC register                                 [refresh] |
| UHID          | Name       | Type   | Police           |
| AH-26-779163-5| RTA Victim | RTA    | Pending           |
+------------------------------------------------------+
```

**As built:** design called for a checkbox + remarks. Build adds case type
(required once flagged), brought-by, police-informed status, station, and FIR
number — plus a dedicated MLC register table, which wasn't in the original
wireframes at all.

---

## 9. Newborn Registration — *inline, folded into main form*

```text
+------------------------------------------------------+
| Newborn registration                                   |
| [ ] This is a newborn — link to mother's record        |
| Mother's UHID: ____________                             |
+------------------------------------------------------+
```

**As built:** matches design intent (mother's UHID required, validated against
existing records) — baby's own name/DOB are just the Name/DOB fields already at
the top of the form, rather than a repeated set of fields on a separate screen.

---

## 10. Unknown / Unconscious Patient — *matches design*

```text
+------------------------------------------------------+
| ⚠ Unknown / Unconscious Patient — Quick Registration   |
| Skips all fields. Issues a temporary UHID and queue    |
| token immediately.                                     |
| [ Quick-register unknown patient ]                     |
+------------------------------------------------------+
```

**As built:** matches design — single button, no fields, instant UHID. Also
auto-issues a queue token (Emergency department), which the original wireframe
for this screen didn't call out but #11 (Queue Token) implies should happen anyway.

---

## 11. Queue Token — *status table, no Print button*

```text
+------------------------------------------------------+
| ✓ Registered — UHID: AH-26-779163-5                    |
| Queue token issued: EME-1 (Emergency)                  |
+------------------------------------------------------+

+------------------------------------------------------+
| Queue status                                 [refresh] |
| Token   | Dept.      | Patient      | UHID             |
| GEN-1   | General OPD| Lakshmi N.   | AH-26-100042-3   |
| EME-1   | Emergency  | RTA Victim   | AH-26-779163-5   |
+------------------------------------------------------+
```

**As built:** token + department shown inline on successful registration, plus a
live queue-status table on the right. **Gap vs. design:** no **Print** action —
the token is displayed on screen only, nothing sends it to a physical/label
printer (out of scope was noted for SMS delivery, but the design wireframe still
showed a Print button, which wasn't carried through).

---

## Summary — gaps worth a team decision before final sign-off

| # | Gap | Impact |
|---|---|---|
| 4 & 5 | No "Flag for MRD" action and no MRD worklist screen | MRD merge only works if someone already has both UHIDs in hand — the triage step from the design is missing |
| 1 | No direct UHID/ABHA lookup screen | Search only works via name/mobile/DOB fuzzy match, not exact ID lookup |
| 6 | No PMJAY beneficiary ID field | Verification stub runs without ever collecting an ID to verify against |
| 11 | No Print action | Token is view-only; nothing feeds a printer |

Everything else is either an exact match or a build that's *more* detailed than the
design (extra consent granularity, richer MLC fields), which isn't a functional gap —
just worth noting so it doesn't look like scope crept in silently.
