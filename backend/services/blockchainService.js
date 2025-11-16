// backend/services/blockchainService.js
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, '..', 'data.json');

function saveData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}
function loadData() {
  if (!fs.existsSync(DATA_FILE)) {
    return null;
  }
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE));
  } catch (e) {
    return null;
  }
}

function generateId(prefix = '') {
  // simple unique id
  return prefix + Date.now().toString(36) + Math.random().toString(36).slice(2,8);
}

function sha256(s) {
  return crypto.createHash('sha256').update(s).digest('hex');
}

function calculateHashForBlock(block) {
  // must include timestamp, transaction payload, prev_hash, nonce
  const payload = JSON.stringify(block.transaction);
  return sha256(block.timestamp + payload + block.prev_hash + block.nonce);
}

function mineBlock(block, difficultyPrefix = '0000') {
  let nonce = 0;
  while (true) {
    block.nonce = nonce;
    block.hash = calculateHashForBlock(block);
    if (block.hash.startsWith(difficultyPrefix)) {
      return block;
    }
    nonce++;
  }
}

function createGenesisBlock(transaction, prev_hash = '0') {
  const block = {
    index: 0,
    timestamp: new Date().toISOString(),
    transaction,
    prev_hash,
    nonce: 0,
    hash: ''
  };
  return mineBlock(block);
}

function createNextBlock(prevBlock, transaction) {
  const block = {
    index: prevBlock.index + 1,
    timestamp: new Date().toISOString(),
    transaction,
    prev_hash: prevBlock.hash,
    nonce: 0,
    hash: ''
  };
  return mineBlock(block);
}

function validateChain(chain, difficultyPrefix = '0000') {
  if (!Array.isArray(chain)) return { valid: false, reason: 'chain not array' };
  for (let i = 0; i < chain.length; i++) {
    const b = chain[i];
    // recompute hash
    const recomputed = sha256(b.timestamp + JSON.stringify(b.transaction) + b.prev_hash + b.nonce);
    if (recomputed !== b.hash) {
      return { valid: false, reason: `block ${i} hash mismatch` };
    }
    if (!b.hash.startsWith(difficultyPrefix)) {
      return { valid: false, reason: `block ${i} POW invalid` };
    }
    if (i > 0 && b.prev_hash !== chain[i-1].hash) {
      return { valid: false, reason: `block ${i} prev_hash mismatch` };
    }
  }
  return { valid: true };
}

function initDefaultStructure() {
  // create two departments, each with 5 classes, each with 35 students
  const data = { departments: [], classesIndex: {}, studentsIndex: {} };

  const deptNames = ['School of Computing', 'School of Software Engineering'];
  deptNames.forEach((dn) => {
    const deptId = generateId('dept_');
    const deptMeta = { id: deptId, name: dn, created_at: new Date().toISOString() };
    // genesis block for department (metadata)
    const genesis = createGenesisBlock({ kind: 'department_meta', meta: deptMeta }, '0');
    const deptChain = [genesis];

    // create 5 classes
    const classes = [];
    for (let c = 1; c <= 5; c++) {
      const classId = generateId('class_');
      const clsMeta = { id: classId, name: `Class ${c}`, departmentId: deptId, created_at: new Date().toISOString() };
      const classGenesis = createGenesisBlock({ kind: 'class_meta', meta: clsMeta }, deptChain[deptChain.length-1].hash);
      const classChain = [classGenesis];
      classes.push({ id: classId, chain: classChain, meta: clsMeta });

      // create 35 students
      for (let s = 1; s <= 35; s++) {
        const studentId = generateId('stu_');
        const studentMeta = {
          id: studentId,
          name: `Student ${s}`,
          roll: `${c}${String(s).padStart(3,'0')}`,
          departmentId: deptId,
          classId: classId,
          created_at: new Date().toISOString()
        };
        const studentGenesis = createGenesisBlock({ kind: 'student_meta', meta: studentMeta }, classChain[classChain.length-1].hash);
        // student chain contains genesis only for now
        data.studentsIndex[studentId] = { id: studentId, chain: [studentGenesis], meta: studentMeta };
      }
      data.classesIndex[classId] = { id: classId, chain: classChain, meta: clsMeta };
    }

    data.departments.push({ id: deptId, chain: deptChain, meta: deptMeta });
  });

  saveData(data);
  return data;
}

function loadOrInitData() {
  let d = loadData();
  if (!d) {
    d = initDefaultStructure();
  }
  return d;
}

const state = loadOrInitData();

// Exports - functions to interact with the hierarchical chains
module.exports = {
  state,
  saveData,
  generateId,
  createGenesisBlock,
  createNextBlock,
  calculateHashForBlock,
  validateChain,
  validateChainObject: validateChain,
  mineBlock,
  initDefaultStructure,
  loadOrInitData
};
