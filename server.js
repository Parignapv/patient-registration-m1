// server.js
// Backend API for PRD-01: Patient Registration & Identity Management
//
// M1/M2 (already built):
//   POST   /api/patients            -> register a new patient (generates UHID server-side)
//   GET    /api/patients            -> list all registered patients
//   GET    /api/patients/:uhid      -> get one patient by UHID
//   POST   /api/patients/unknown    -> quick-register an unknown/unconscious patient (FR-14)
//   POST   /api/verify/abha         -> stubbed ABHA verification (FR-3)
//   POST   /api/verify/pmjay        -> stubbed PMJAY beneficiary verification (FR-6)
//
// M3 (new in this build):
//   GET    /api/patients/search              -> 5.1 Search / duplicate-avoidance lookup
//   (built into POST /api/patients)          -> 5.4 Duplicate warning (409 unless overridden)
//   POST   /api/patients/merge               -> 5.5 Merge two records + audit trail
//   GET    /api/audit                        -> 5.5 Audit log viewer
//   GET    /api/consent/notice               -> 5.7 DPDP notice text/version
//   (consent captured on POST /api/patients) -> 5.7 DPDP consent
//   (mlc captured on POST /api/patients)     -> 5.8 MLC flagging
//   GET    /api/mlc                          -> 5.8 MLC register
//   POST   /api/queue/token                  -> 5.11 Queue token generation
//   GET    /api/queue                        -> 5.11 Current queue status (all/one department)
//
// Storage: simple JSON files under data/. Good enough for a demo/prototype;
// swap out the read*()/write*() functions for a real database later without
// touching any route logic.

const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'patients.json');
const AUDIT_FILE = path.join(DATA_DIR, 'audit.json');
const QUEUE_FILE = path.join(DATA_DIR, 'queue.json');
const HOSPITAL_CODE = 'AH';

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Serve the front desk console at the root URL (the file isn't named index.html)
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'patient_registration.html'));
});

// ---------- tiny JSON-file "database" helpers ----------
function readJSON(file, fallback) {
  if (!fs.existsSync(file)) return fallback;
  const raw = fs.readFileSync(file, 'utf-8').trim();
  if (!raw) return fallback;
  try {
    return JSON.parse(raw);
  } catch (e) {
    console.error(`Corrupt data file ${file}, starting fresh:`, e.message);
    return fallback;
  }
}
function writeJSON(file, data) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

const readDB = () => readJSON(DB_FILE, []);
const writeDB = (records) => writeJSON(DB_FILE, records);

const readAudit = () => readJSON(AUDIT_FILE, []);
const writeAudit = (log) => writeJSON(AUDIT_FILE, log);

const readQueue = () => readJSON(QUEUE_FILE, { date: '', counters: {}, tokens: [] });
const writeQueue = (q) => writeJSON(QUEUE_FILE, q);

function logAudit(action, details) {
  const log = readAudit();
  log.push({
    id: log.length + 1,
    action,
    details,
    at: new Date().toISOString()
  });
  writeAudit(log);
}

// ---------- UHID generation (Luhn check-digit) ----------
function luhnCheckDigit(numStr) {
  let sum = 0;
  let alt = true;
  for (let i = numStr.length - 1; i >= 0; i--) {
    let n = parseInt(numStr[i], 10);
    if (alt) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
    alt = !alt;
  }
  return (10 - (sum % 10)) % 10;
}

function generateUHID(existing) {
  const year = new Date().getFullYear().toString().slice(-2);
  let uhid;
  do {
    const seq = Math.floor(100000 + Math.random() * 900000);
    const check = luhnCheckDigit(seq.toString());
    uhid = `${HOSPITAL_CODE}-${year}-${seq}-${check}`;
  } while (existing.some(r => r.uhid === uhid)); // avoid collisions
  return uhid;
}

// ---------- validation helpers ----------
function isValidMobile(m) {
  return !m || /^[6-9]\d{9}$/.test(m);
}
function isValidPin(p) {
  return !p || /^\d{6}$/.test(p);
}

// ---------- 5.1 / 5.4: duplicate-avoidance helpers ----------
function normalizeName(n) {
  return (n || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

// Very small Levenshtein-based similarity so close spellings ("Lakshmi" vs "Laxmi")
// still surface as possible duplicates, without pulling in a dependency.
function levenshtein(a, b) {
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)]);
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j - 1], dp[i - 1][j], dp[i][j - 1]);
    }
  }
  return dp[m][n];
}
function nameSimilar(a, b) {
  const na = normalizeName(a), nb = normalizeName(b);
  if (!na || !nb) return false;
  if (na === nb) return true;
  const dist = levenshtein(na, nb);
  return dist <= Math.max(1, Math.floor(Math.min(na.length, nb.length) * 0.2));
}

// Candidate-match scoring used by both the live search box (5.1) and the
// server-side duplicate check on registration (5.4).
function findCandidates(records, { name, dob, mobile, abha }, excludeUhid) {
  return records
    .filter(r => r.uhid !== excludeUhid && r.type !== 'merged')
    .map(r => {
      let score = 0;
      const reasons = [];
      if (abha && r.abha && abha.trim() === r.abha.trim()) { score += 100; reasons.push('ABHA match'); }
      if (mobile && r.mobile && mobile.trim() === r.mobile.trim()) { score += 60; reasons.push('Mobile match'); }
      if (dob && r.dob && dob === r.dob) { score += 30; reasons.push('DOB match'); }
      if (name && r.name && nameSimilar(name, r.name)) { score += 25; reasons.push('Similar name'); }
      return { record: r, score, reasons };
    })
    .filter(c => c.score > 0)
    .sort((a, b) => b.score - a.score);
}

// ---------- 5.7 DPDP consent notice ----------
const DPDP_NOTICE = {
  version: 'v1.0',
  effectiveFrom: '2025-01-01',
  purposes: [
    'Registration & identity management (UHID)',
    'Clinical care, treatment & continuity of care',
    'Billing, insurance & government scheme (e.g. PMJAY) processing',
    'Statutory & regulatory reporting (e.g. MLC intimation to police/public health authorities)'
  ],
  text:
    'This hospital collects your personal and demographic data under the Digital ' +
    'Personal Data Protection (DPDP) Act, 2023, solely for the purposes listed. ' +
    'Consent is not required to receive emergency or life-saving treatment. You ' +
    'may withdraw consent for non-essential processing (e.g. scheme linkage) at ' +
    'any time at the front desk without affecting your care.'
};

// ---------- routes: patients ----------

// List all patients (most recent first)
app.get('/api/patients', (req, res) => {
  const records = readDB();
  res.json(records.slice().reverse());
});

// 5.1 Search / duplicate-avoidance — live lookup used before/while filling the form
app.get('/api/patients/search', (req, res) => {
  const { name = '', mobile = '', dob = '', abha = '' } = req.query;
  if (!name.trim() && !mobile.trim() && !dob.trim() && !abha.trim()) {
    return res.json({ query: req.query, matches: [] });
  }
  const records = readDB();
  const candidates = findCandidates(records, { name, dob, mobile, abha });
  res.json({
    query: req.query,
    matches: candidates.slice(0, 8).map(c => ({
      uhid: c.record.uhid,
      name: c.record.name,
      dob: c.record.dob,
      age: c.record.age,
      sex: c.record.sex,
      mobile: c.record.mobile,
      abha: c.record.abha,
      type: c.record.type,
      score: c.score,
      reasons: c.reasons
    }))
  });
});

// Get one patient by UHID
app.get('/api/patients/:uhid', (req, res) => {
  const records = readDB();
  const record = records.find(r => r.uhid === req.params.uhid);
  if (!record) return res.status(404).json({ error: 'Patient not found' });
  res.json(record);
});

// Register a new standard patient
app.post('/api/patients', (req, res) => {
  const {
    name, dob, age, sex, mobile, address, pin,
    guardian, abha, abhaLinked, payer, payerVerified,
    isNewborn, motherUhid,
    consent,          // 5.7 { acknowledged, purposes: [], mode }
    mlc,              // 5.8 { isMLC, mlcType, broughtBy, informedPolice, stationName, intimationNumber, remarks }
    department,       // 5.11 department the patient is being sent to for queue token
    confirmDuplicate  // 5.4 set true once the front desk has reviewed the duplicate warning
  } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Name is required.' });
  }
  if (!isValidMobile(mobile)) {
    return res.status(400).json({ error: 'Mobile must be a 10-digit number starting 6-9.' });
  }
  if (!isValidPin(pin)) {
    return res.status(400).json({ error: 'PIN must be exactly 6 digits.' });
  }
  if (age && parseInt(age, 10) < 18 && !guardian) {
    return res.status(400).json({ error: 'Guardian name is required for patients under 18.' });
  }
  if (isNewborn && !motherUhid) {
    return res.status(400).json({ error: "Mother's UHID is required for newborn registration." });
  }

  // 5.7 DPDP: the notice must at least have been shown/acknowledged before we
  // process data. Care is never withheld — this only gates the *optional*
  // consent flags we store, never the registration itself.
  if (!consent || !consent.acknowledged) {
    return res.status(400).json({ error: 'DPDP notice must be shown and acknowledged before registration.' });
  }

  // 5.8 MLC: if flagged, a case type is mandatory for the MLC register to be usable.
  if (mlc && mlc.isMLC && !mlc.mlcType) {
    return res.status(400).json({ error: 'MLC case type is required when flagging a Medico-Legal Case.' });
  }

  const records = readDB();

  // If newborn, confirm the mother's UHID actually exists (basic referential check)
  if (isNewborn && !records.some(r => r.uhid === motherUhid)) {
    return res.status(400).json({ error: `No existing patient found with UHID ${motherUhid}.` });
  }

  // 5.4 Duplicate warning — block silent double-registration unless the
  // front desk has explicitly reviewed and confirmed "register anyway".
  if (!confirmDuplicate) {
    const candidates = findCandidates(records, { name, dob, mobile, abha });
    const strong = candidates.filter(c => c.score >= 25);
    if (strong.length > 0) {
      return res.status(409).json({
        duplicateWarning: true,
        message: 'Possible existing record(s) found. Confirm to register a new UHID anyway, or use the existing one.',
        matches: strong.slice(0, 5).map(c => ({
          uhid: c.record.uhid, name: c.record.name, dob: c.record.dob,
          age: c.record.age, sex: c.record.sex, mobile: c.record.mobile,
          reasons: c.reasons, score: c.score
        }))
      });
    }
  }

  const uhid = generateUHID(records);
  const record = {
    uhid,
    name: name.trim(),
    dob: dob || '',
    age: age || '',
    sex: sex || '',
    mobile: mobile || '',
    address: (address || '').trim(),
    pin: pin || '',
    guardian: guardian || '',
    abha: (abha || '').trim(),
    abhaLinked: !!abhaLinked,
    payer: payer || 'Cash',
    payerVerified: !!payerVerified,
    isNewborn: !!isNewborn,
    motherUhid: isNewborn ? motherUhid : null,
    type: 'standard',
    consent: {
      acknowledged: true,
      version: DPDP_NOTICE.version,
      purposes: Array.isArray(consent.purposes) ? consent.purposes : [],
      mode: consent.mode || 'digital',
      consentedAt: new Date().toISOString()
    },
    mlc: mlc && mlc.isMLC ? {
      isMLC: true,
      mlcType: mlc.mlcType,
      broughtBy: mlc.broughtBy || '',
      informedPolice: !!mlc.informedPolice,
      stationName: mlc.stationName || '',
      intimationNumber: mlc.intimationNumber || '',
      remarks: mlc.remarks || '',
      flaggedAt: new Date().toISOString()
    } : { isMLC: false },
    department: department || 'General OPD',
    createdAt: new Date().toISOString()
  };

  records.push(record);
  writeDB(records);

  if (confirmDuplicate) {
    logAudit('duplicate_override', { uhid, name: record.name, note: 'Registered as new despite possible duplicate match.' });
  }
  if (record.mlc.isMLC) {
    logAudit('mlc_flagged', { uhid, mlcType: record.mlc.mlcType });
  }

  // 5.11 Queue token — auto-issue an OPD token as part of standard registration.
  const token = issueQueueToken(record.department, uhid, record.name);

  res.status(201).json({ ...record, queueToken: token });
});

// Quick-register an unknown/unconscious patient (FR-14)
app.post('/api/patients/unknown', (req, res) => {
  const records = readDB();
  const uhid = generateUHID(records);
  const record = {
    uhid,
    name: 'Unknown',
    dob: '', age: '', sex: '', mobile: '', address: '', pin: '', guardian: '',
    abha: '', abhaLinked: false,
    payer: 'Pending', payerVerified: false,
    isNewborn: false, motherUhid: null,
    type: 'unknown',
    consent: { acknowledged: false, version: DPDP_NOTICE.version, purposes: [], mode: 'deferred', consentedAt: null },
    mlc: { isMLC: false },
    department: 'Emergency',
    createdAt: new Date().toISOString()
  };
  records.push(record);
  writeDB(records);
  const token = issueQueueToken(record.department, uhid, record.name);
  res.status(201).json({ ...record, queueToken: token });
});

// ---------- 5.5 Merge & Audit ----------

// Merge a duplicate record into a primary record. The duplicate is kept
// (never deleted) but marked as merged, so the audit trail stays intact.
app.post('/api/patients/merge', (req, res) => {
  const { primaryUhid, duplicateUhid, mergedBy } = req.body;
  if (!primaryUhid || !duplicateUhid) {
    return res.status(400).json({ error: 'Both primaryUhid and duplicateUhid are required.' });
  }
  if (primaryUhid === duplicateUhid) {
    return res.status(400).json({ error: 'Cannot merge a record into itself.' });
  }

  const records = readDB();
  const primary = records.find(r => r.uhid === primaryUhid);
  const duplicate = records.find(r => r.uhid === duplicateUhid);
  if (!primary) return res.status(404).json({ error: `Primary UHID ${primaryUhid} not found.` });
  if (!duplicate) return res.status(404).json({ error: `Duplicate UHID ${duplicateUhid} not found.` });
  if (duplicate.type === 'merged') {
    return res.status(400).json({ error: `${duplicateUhid} has already been merged elsewhere.` });
  }

  const before = { primary: { ...primary }, duplicate: { ...duplicate } };

  // Fill any blank field on the primary using the duplicate's data (primary wins on conflicts).
  const fillableFields = ['dob', 'age', 'sex', 'mobile', 'address', 'pin', 'guardian', 'abha', 'payer'];
  fillableFields.forEach(f => {
    if (!primary[f] && duplicate[f]) primary[f] = duplicate[f];
  });
  primary.abhaLinked = primary.abhaLinked || duplicate.abhaLinked;
  primary.payerVerified = primary.payerVerified || duplicate.payerVerified;
  primary.mergedFrom = [...(primary.mergedFrom || []), duplicateUhid];

  duplicate.type = 'merged';
  duplicate.mergedInto = primaryUhid;
  duplicate.mergedAt = new Date().toISOString();

  writeDB(records);

  logAudit('merge', {
    primaryUhid, duplicateUhid,
    mergedBy: mergedBy || 'front-desk',
    before, after: { primary: { ...primary }, duplicate: { ...duplicate } }
  });

  res.json({ primary, duplicate });
});

// 5.5 Audit log viewer (most recent first)
app.get('/api/audit', (req, res) => {
  const log = readAudit();
  res.json(log.slice().reverse());
});

// ---------- 5.7 DPDP notice ----------
app.get('/api/consent/notice', (req, res) => {
  res.json(DPDP_NOTICE);
});

// ---------- 5.8 MLC register ----------
app.get('/api/mlc', (req, res) => {
  const records = readDB();
  const mlcCases = records
    .filter(r => r.mlc && r.mlc.isMLC)
    .map(r => ({
      uhid: r.uhid, name: r.name, age: r.age, sex: r.sex,
      department: r.department, createdAt: r.createdAt, ...r.mlc
    }))
    .reverse();
  res.json(mlcCases);
});

// ---------- 5.11 Queue token generation ----------
function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function issueQueueToken(department, uhid, name) {
  let q = readQueue();
  const today = todayStr();
  if (q.date !== today) {
    q = { date: today, counters: {}, tokens: [] }; // reset counters each day
  }
  const dept = department || 'General OPD';
  q.counters[dept] = (q.counters[dept] || 0) + 1;
  const token = {
    tokenNo: q.counters[dept],
    department: dept,
    uhid,
    name,
    issuedAt: new Date().toISOString(),
    status: 'waiting'
  };
  q.tokens.push(token);
  writeQueue(q);
  return token;
}

// Manually issue/re-issue a token (e.g. patient already registered, sent to a new department)
app.post('/api/queue/token', (req, res) => {
  const { uhid, department } = req.body;
  if (!uhid) return res.status(400).json({ error: 'uhid is required.' });
  const records = readDB();
  const patient = records.find(r => r.uhid === uhid);
  if (!patient) return res.status(404).json({ error: `Patient ${uhid} not found.` });
  const token = issueQueueToken(department || patient.department, uhid, patient.name);
  res.status(201).json(token);
});

// Current queue status — optionally filtered by department
app.get('/api/queue', (req, res) => {
  const q = readQueue();
  if (q.date !== todayStr()) {
    return res.json({ date: todayStr(), department: req.query.department || null, tokens: [] });
  }
  const { department } = req.query;
  const tokens = department ? q.tokens.filter(t => t.department === department) : q.tokens;
  res.json({ date: q.date, department: department || null, tokens: tokens.slice().reverse() });
});

// ---------- verification stubs ----------

// Stubbed ABHA verification (FR-3) — swap this body out for a real ABDM Gateway call later
app.post('/api/verify/abha', (req, res) => {
  const { abha } = req.body;
  if (!abha || !abha.trim()) {
    return res.status(400).json({ error: 'ABHA number is required to verify.' });
  }
  setTimeout(() => {
    res.json({ linked: true, abha: abha.trim(), verifiedAt: new Date().toISOString() });
  }, 400);
});

// Stubbed PMJAY beneficiary verification (FR-6) — swap out for real BIS API call later
app.post('/api/verify/pmjay', (req, res) => {
  setTimeout(() => {
    res.json({ verified: true, verifiedAt: new Date().toISOString() });
  }, 400);
});

app.listen(PORT, () => {
  console.log(`UHID Registration backend running at http://localhost:${PORT}`);
});
