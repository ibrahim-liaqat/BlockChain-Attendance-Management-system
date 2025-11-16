// backend/controllers/classController.js
const bc = require('../services/blockchainService');

function findDept(deptId) {
  return bc.state.departments.find(d => d.id === deptId);
}

function list(req, res) {
  const { deptId } = req.params;
  const dept = findDept(deptId);
  if (!dept) return res.status(404).json({ error: 'dept not found' });
  // classes under this department
  const classes = Object.values(bc.state.classesIndex).filter(c => c.meta.departmentId === deptId).map(c => ({ id: c.id, meta: c.meta, latest_hash: c.chain[c.chain.length-1].hash }));
  res.json(classes);
}

function create(req, res) {
  const { deptId } = req.params;
  const { name } = req.body;
  const dept = findDept(deptId);
  if (!dept) return res.status(404).json({ error: 'dept not found' });
  const id = bc.generateId('class_');
  const meta = { id, name: name || `Class ${id}`, departmentId: deptId, created_at: new Date().toISOString() };
  // genesis prev_hash must be latest hash of department chain
  const prev_hash = dept.chain[dept.chain.length-1].hash;
  const genesis = bc.createGenesisBlock({ kind: 'class_meta', meta }, prev_hash);
  const classObj = { id, chain: [genesis], meta };
  bc.state.classesIndex[id] = classObj;
  bc.saveData(bc.state);
  res.status(201).json({ id, meta });
}

function get(req, res) {
  const { classId } = req.params;
  const cls = bc.state.classesIndex[classId];
  if (!cls) return res.status(404).json({ error: 'not found' });
  res.json({ id: cls.id, meta: cls.meta, chain: cls.chain });
}

function update(req, res) {
  const { classId } = req.params;
  const updates = req.body;
  const cls = bc.state.classesIndex[classId];
  if (!cls) return res.status(404).json({ error: 'not found' });
  const tx = { kind: 'class_update', update: updates, timestamp: new Date().toISOString() };
  const newBlock = bc.createNextBlock(cls.chain[cls.chain.length-1], tx);
  cls.chain.push(newBlock);
  cls.meta = Object.assign({}, cls.meta, updates, { updated_at: new Date().toISOString() });
  bc.saveData(bc.state);
  res.json({ status: 'ok', newBlock });
}

function remove(req, res) {
  const { classId } = req.params;
  const cls = bc.state.classesIndex[classId];
  if (!cls) return res.status(404).json({ error: 'not found' });
  const tx = { kind: 'class_deleted', status: 'deleted', timestamp: new Date().toISOString() };
  const newBlock = bc.createNextBlock(cls.chain[cls.chain.length-1], tx);
  cls.chain.push(newBlock);
  cls.meta.status = 'deleted';
  bc.saveData(bc.state);
  res.json({ status: 'ok', newBlock });
}

module.exports = { list, create, get, update, remove };
