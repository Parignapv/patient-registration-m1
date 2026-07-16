#  Patient Registration & Identity Management System

![Node.js](https://img.shields.io/badge/Node.js-Express-green)
![Frontend](https://img.shields.io/badge/Frontend-HTML%2FCSS%2FJS-blue)
![Status](https://img.shields.io/badge/Status-M3%20Prototype-success)

A prototype Hospital Patient Registration & Identity Management System
that digitizes patient registration, generates UHIDs, supports newborn
and emergency registration, and demonstrates core hospital workflows.

------------------------------------------------------------------------

##  Features

-   New Patient Registration
-   Returning Patient Search
-   Automatic UHID Generation
-   ABHA Verification (Mock)
-   PMJAY Verification (Mock)
-   Newborn Registration linked to Mother's UHID
-   Unknown Patient Registration
-   Duplicate Detection with Override
-   DPDP Consent Logging
-   MLC Flagging
-   Audit Log
-   Input Validation

------------------------------------------------------------------------

##  System Architecture

``` mermaid
flowchart LR
User-->Frontend
Frontend-->Backend["Express.js Backend"]
Backend-->Validation
Validation-->JSON[(patients.json)]
Backend-->ABHA["ABHA (Mock)"]
Backend-->PMJAY["PMJAY (Mock)"]
JSON-->Audit["Audit Log"]
```

##  Registration Workflow

``` mermaid
flowchart TD
A(Start)-->B{New or Returning?}
B--New-->C[Enter Details]
B--Returning-->D[Search UHID]
C-->E[Validate]
E-->F[Generate UHID]
F-->G{ABHA?}
G--Yes-->H[Verify ABHA]
G--No-->I[Skip]
H-->J[Payer]
I-->J
J-->K[DPDP Consent]
K-->L{Newborn?}
L--Yes-->M[Link Mother's UHID]
L--No-->N{Unknown?}
M-->O[Register]
N--Yes-->P[Quick Register]
N--No-->O
P-->Q[Temp UHID]
O-->R[Save Record]
Q-->R
R-->S[Audit Log]
S-->T(End)
```

##  Tech Stack

-   HTML, CSS, JavaScript
-   Node.js
-   Express.js
-   JSON Storage

##  Structure

``` text
public/
data/
server.js
package.json
README.md
```

##  API Endpoints

  Method   Endpoint            Purpose
  -------- ------------------- ------------------
  POST     /patients           Register patient
  GET      /patients           List patients
  GET      /patients/:uhid     Get patient
  POST     /patients/unknown   Unknown patient
  POST     /verify/abha        Verify ABHA
  POST     /verify/pmjay       Verify PMJAY

##  Run

``` bash
npm install
node server.js
```

Open http://localhost:3000

##  Future Scope

-   Real ABDM APIs
-   Real PMJAY APIs
-   Queue Tokens
-   Advanced Duplicate Detection
-   Record Merge

##  Contributors

-   Parigna P V
-   Isha Gowda

##  License

Academic Project.
