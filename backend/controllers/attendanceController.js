// backend/controllers/attendanceController.js
const bc = require('../services/blockchainService');

function markAttendance(req, res) {
  const { studentId } = req.params;
  const { status } = req.body; // Present | Absent | Leave
  if (!['Present','Absent','Leave'].includes(status)) {
    return res.status(400).json({ error: 'invalid status. Use Present, Absent or Leave' });
  }
  const s = bc.state.studentsIndex[studentId];
  if (!s) return res.status(404).json({ error: 'student not found' });
  const studentMeta = s.meta;
  const tx = {
    kind: 'attendance',
    studentId: studentMeta.id,
    studentName: studentMeta.name,
    roll: studentMeta.roll,
    departmentId: studentMeta.departmentId,
    classId: studentMeta.classId,
    status,
    timestamp: new Date().toISOString()
  };
  const newBlock = bc.createNextBlock(s.chain[s.chain.length-1], tx);
  s.chain.push(newBlock);
  bc.saveData(bc.state);
  res.json({ status: 'ok', block: newBlock });
}

function todayForSchool(req, res) {
  // gather attendance blocks with today's date (UTC date)
  const today = (new Date()).toISOString().slice(0,10);
  const records = [];
  for (const s of Object.values(bc.state.studentsIndex)) {
    for (const b of s.chain) {
      if (b.transaction && b.transaction.kind === 'attendance') {
        if (b.transaction.timestamp.slice(0,10) === today) records.push(b.transaction);
      }
    }
  }
  res.json(records);
}

function forDepartment(req, res) {
  const { deptId } = req.params;
  const records = [];
  for (const s of Object.values(bc.state.studentsIndex)) {
    if (s.meta.departmentId !== deptId) continue;
    for (const b of s.chain) {
      if (b.transaction && b.transaction.kind === 'attendance') records.push(b.transaction);
    }
  }
  res.json(records);
}

function forClass(req, res) {
  const { classId } = req.params;
  const records = [];
  for (const s of Object.values(bc.state.studentsIndex)) {
    if (s.meta.classId !== classId) continue;
    for (const b of s.chain) {
      if (b.transaction && b.transaction.kind === 'attendance') records.push(b.transaction);
    }
  }
  res.json(records);
}

module.exports = { markAttendance, todayForSchool, forDepartment, forClass };
