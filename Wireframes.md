
# M2 Wireframes – Patient Registration & Identity Management

## 1. Search Patient

```text
+------------------------------------------------------+
| Search by: [ UHID / ABHA / Mobile ] [ Search ]       |
+------------------------------------------------------+
| Matching Patients                                    |
| UHID | Name | Mobile | Action(View/Register)         |
+------------------------------------------------------+
```

**Purpose:** Search for an existing patient before creating a new record to avoid duplicates.

---

## 2. Standard Patient Registration

```text
+------------------------------------------------------+
| Patient Registration                                 |
| Name: ____________  DOB: ______  Gender: ____        |
| Mobile: _________   Address: _____________           |
| PIN: ______         Guardian: ____________           |
| [ Verify ABHA ]   [ Save ]                           |
+------------------------------------------------------+
```

**Purpose:** Register a new patient and generate a UHID.

---

## 3. ABHA Verification

```text
+--------------------------------------------+
| Enter/Scan ABHA Number                     |
| ABHA: ______________________               |
| [ Verify ]                                 |
| Status: Linked / Not Linked                |
+--------------------------------------------+
```

**Purpose:** Verify or link a patient's ABHA number.

---

## 4. Duplicate Warning

```text
+--------------------------------------------+
| Possible Duplicate Found                   |
| Existing UHID: UH12345                     |
| Name: __________________                   |
| [ Proceed ] [ Flag for MRD ] [ Cancel ]    |
+--------------------------------------------+
```

**Purpose:** Warn the registrar about possible duplicate records.

---

## 5. Merge & Audit

```text
+--------------------------------------------+
| Duplicate Records                          |
| Record A      Record B                     |
| [ Select Primary ]                         |
| [ Merge ]                                  |
| Audit Log Generated                        |
+--------------------------------------------+
```

**Purpose:** Allow the MRD officer to merge duplicate records while maintaining an audit trail.

---

## 6. Insurance / PMJAY

```text
+--------------------------------------------+
| Payer: Cash / PMJAY / ESI / Private        |
| PMJAY ID: __________                       |
| [ Verify ]                                 |
| [ Save ]                                   |
+--------------------------------------------+
```

**Purpose:** Capture insurance details and verify PMJAY eligibility.

---

## 7. DPDP Consent

```text
+--------------------------------------------+
| Privacy Notice                             |
| We collect your data for registration...   |
| [ ] I Agree                                |
| [ Continue ]                               |
+--------------------------------------------+
```

**Purpose:** Display the privacy notice and record patient consent.

---

## 8. MLC Flagging

```text
+--------------------------------------------+
| Medico-Legal Case                          |
| [ ] Mark as MLC                            |
| Remarks: __________________                |
| [ Save ]                                   |
+--------------------------------------------+
```

**Purpose:** Mark patients involved in medico-legal cases.

---

## 9. Newborn Registration

```text
+--------------------------------------------+
| Mother's UHID: __________                  |
| Baby Name: __________                      |
| DOB: __________                            |
| [ Register ]                               |
+--------------------------------------------+
```

**Purpose:** Register a newborn by linking to the mother's UHID.

---

## 10. Unknown Patient Registration

```text
+--------------------------------------------+
| Unknown / Unconscious Patient              |
| [ Generate UHID ]                          |
| Temporary Record Created                   |
+--------------------------------------------+
```

**Purpose:** Quickly register unidentified emergency patients.

---

## 11. Queue Token

```text
+--------------------------------------------+
| Registration Successful                    |
| Token: A-102                               |
| Department: OPD                            |
| [ Print ]                                  |
+--------------------------------------------+
```

**Purpose:** Generate a queue token after successful registration.
