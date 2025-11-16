// backend/controllers/studentController.js
const bc = require('../services/blockchainService');

function listAll(req, res) {
  const list = Object.values(bc.state.studentsIndex).map(s => ({ id: s.id, meta: s.meta, latest_hash: s.chain[s.chain.length-1].hash }));
  res.json(list);
}

function create(req, res) {
  const { deptId, classId } = req.params;
  const { name, roll } = req.body;
  const cls = bc.state.classesIndex[classId];
  if (!cls) return res.status(404).json({ error: 'class not found' });
  // create student id and genesis block with prev_hash = latest class hash
  const id = bc.generateId('stu_');
  const meta = { id, name: name || `Student ${id}`, roll: roll || `R${id}`, departmentId: deptId, classId, created_at: new Date().toISOString() };
  const prev_hash = cls.chain[cls.chain.length-1].hash;
  const genesis = bc.createGenesisBlock({ kind: 'student_meta', meta }, prev_hash);
  bc.state.studentsIndex[id] = { id, chain: [genesis], meta };
  bc.saveData(bc.state);
  res.status(201).json({ id, meta });
}

function get(req, res) {
  const { studentId } = req.params;
  const s = bc.state.studentsIndex[studentId];
  if (!s) return res.status(404).json({ error: 'not found' });
  // return interpreted latest meta (by applying chain updates)
  res.json({ id: s.id, meta: s.meta, chain: s.chain });
}

function update(req, res) {
  const { studentId } = req.params;
  const updates = req.body;
  const s = bc.state.studentsIndex[studentId];
  if (!s) return res.status(404).json({ error: 'not found' });
  const tx = { kind: 'student_update', update: updates, timestamp: new Date().toISOString() };
  const newBlock = bc.createNextBlock(s.chain[s.chain.length-1], tx);
  s.chain.push(newBlock);
  s.meta = Object.assign({}, s.meta, updates, { updated_at: new Date().toISOString() });
  bc.saveData(bc.state);
  res.json({ status: 'ok', newBlock });
}

function remove(req, res) {
  const { studentId } = req.params;
  const s = bc.state.studentsIndex[studentId];
  if (!s) return res.status(404).json({ error: 'not found' });
  const tx = { kind: 'student_deleted', status: 'deleted', timestamp: new Date().toISOString() };
  const newBlock = bc.createNextBlock(s.chain[s.chain.length-1], tx);
  s.chain.push(newBlock);
  s.meta.status = 'deleted';
  bc.saveData(bc.state);
  res.json({ status: 'ok', newBlock });
}

function getChain(req, res) {
  const { studentId } = req.params;
  const s = bc.state.studentsIndex[studentId];
  if (!s) return res.status(404).json({ error: 'not found' });
  res.json({ chain: s.chain });
}

module.exports = { listAll, create, get, update, remove, getChain };
