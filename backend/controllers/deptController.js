// backend/controllers/deptController.js
const bc = require('../services/blockchainService');

function list(req, res) {
  const depts = bc.state.departments.map(d => ({ id: d.id, meta: d.meta, latest_hash: d.chain[d.chain.length-1].hash }));
  res.json(depts);
}

function create(req, res) {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'name required' });
  const id = bc.generateId('dept_');
  const meta = { id, name, created_at: new Date().toISOString() };
  const genesis = bc.createGenesisBlock({ kind: 'department_meta', meta }, '0');
  const dept = { id, chain: [genesis], meta };
  bc.state.departments.push(dept);
  bc.saveData(bc.state);
  res.status(201).json({ id, meta });
}

function get(req, res) {
  const { deptId } = req.params;
  const dept = bc.state.departments.find(d => d.id === deptId);
  if (!dept) return res.status(404).json({ error: 'not found' });
  res.json({ id: dept.id, meta: dept.meta, chain: dept.chain });
}

function update(req, res) {
  const { deptId } = req.params;
  const updates = req.body;
  const dept = bc.state.departments.find(d => d.id === deptId);
  if (!dept) return res.status(404).json({ error: 'not found' });
  // Append block that contains update info (no mutation)
  const tx = { kind: 'department_update', update: updates, timestamp: new Date().toISOString() };
  const newBlock = bc.createNextBlock(dept.chain[dept.chain.length-1], tx);
  dept.chain.push(newBlock);
  // update interpreted meta to latest for convenience
  dept.meta = Object.assign({}, dept.meta, updates, { updated_at: new Date().toISOString() });
  bc.saveData(bc.state);
  res.json({ status: 'ok', newBlock });
}

function remove(req, res) {
  const { deptId } = req.params;
  const dept = bc.state.departments.find(d => d.id === deptId);
  if (!dept) return res.status(404).json({ error: 'not found' });
  const tx = { kind: 'department_deleted', status: 'deleted', timestamp: new Date().toISOString() };
  const newBlock = bc.createNextBlock(dept.chain[dept.chain.length-1], tx);
  dept.chain.push(newBlock);
  dept.meta.status = 'deleted';
  bc.saveData(bc.state);
  res.json({ status: 'ok', newBlock });
}

module.exports = { list, create, get, update, remove };
