// backend/controllers/validationController.js
const bc = require('../services/blockchainService');

function validateAll(req, res) {
  const issues = [];
  // 1. Department chains
  for (const dept of bc.state.departments) {
    const v = bc.validateChainObject(dept.chain);
    if (!v.valid) issues.push({ type: 'department', id: dept.id, reason: v.reason });
  }

  // 2. Class chains & genesis linkage
  for (const cls of Object.values(bc.state.classesIndex)) {
    // class chain validity
    const v = bc.validateChainObject(cls.chain);
    if (!v.valid) issues.push({ type: 'class', id: cls.id, reason: v.reason });
    // genesis prev_hash must equal latest dept hash
    const dept = bc.state.departments.find(d => d.id === cls.meta.departmentId);
    if (!dept) {
      issues.push({ type: 'class', id: cls.id, reason: 'parent department missing' });
    } else {
      const deptLatestHash = dept.chain[dept.chain.length-1].hash;
      if (cls.chain[0].prev_hash !== deptLatestHash) {
        issues.push({ type: 'class', id: cls.id, reason: 'class genesis prev_hash mismatch with department latest hash' });
      }
    }
  }

  // 3. Student chains & genesis linkage
  for (const s of Object.values(bc.state.studentsIndex)) {
    const v = bc.validateChainObject(s.chain);
    if (!v.valid) issues.push({ type: 'student', id: s.id, reason: v.reason });
    const cls = bc.state.classesIndex[s.meta.classId];
    if (!cls) {
      issues.push({ type: 'student', id: s.id, reason: 'parent class missing' });
    } else {
      const clsLatest = cls.chain[cls.chain.length-1].hash;
      if (s.chain[0].prev_hash !== clsLatest) {
        issues.push({ type: 'student', id: s.id, reason: 'student genesis prev_hash mismatch with class latest hash' });
      }
    }
  }

  const valid = issues.length === 0;
  res.json({ valid, issues });
}

module.exports = { validateAll };
