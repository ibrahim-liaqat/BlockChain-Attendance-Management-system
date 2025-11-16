/* script.js — frontend for your backend implementation (soft delete only) */
const API_BASE = "https://attendancemanage-six.vercel.app/api";
const TIMEOUT_MS = 20000;

function el(id){ return document.getElementById(id); }
function qAll(sel){ return Array.from(document.querySelectorAll(sel)); }

const HIDDEN_STORAGE_KEY = 'bams_hidden';
let hiddenDepartments = new Set();
let hiddenClasses = new Set();
let hiddenStudents = new Set();

function loadHiddenState() {
  try {
    const raw = localStorage.getItem(HIDDEN_STORAGE_KEY);
    if (!raw) return;
    const obj = JSON.parse(raw);
    hiddenDepartments = new Set(obj.departments || []);
    hiddenClasses = new Set(obj.classes || []);
    hiddenStudents = new Set(obj.students || []);
  } catch (e) { console.warn('Failed to load hidden state', e); }
}
function saveHiddenState() {
  try {
    const obj = {
      departments: Array.from(hiddenDepartments),
      classes: Array.from(hiddenClasses),
      students: Array.from(hiddenStudents)
    };
    localStorage.setItem(HIDDEN_STORAGE_KEY, JSON.stringify(obj));
  } catch(e){ console.warn('Failed to save hidden state', e); }
}
loadHiddenState();

async function fetchWithError(url, options){
  try {
    const controller = new AbortController();
    const id = setTimeout(()=> controller.abort(), TIMEOUT_MS);
    const res = await fetch(url, { signal: controller.signal, ...options });
    clearTimeout(id);
    if(!res.ok) {
      const txt = await res.text().catch(()=>res.statusText);
      throw new Error(`${res.status} ${res.statusText} - ${txt}`);
    }
    return await res.json();
  } catch(err){
    console.error("Fetch error:", err);
    alert(`API fetch failed: ${err.message}`);
    return null;
  }
}

/* ---------- UI helpers ---------- */
function showSection(name){
  qAll('.panel').forEach(p => p.classList.remove('active'));
  const s = el(name);
  if (s) s.classList.add('active');
}

/* ---------- Startup: wire nav ---------- */
qAll('.nav-btn').forEach(b => {
  b.addEventListener('click', ()=> {
    const sec = b.getAttribute('data-section');
    showSection(sec);
    if(sec === 'dashboard') { refreshSummary(); loadDashboardTree(); }
    if(sec === 'departments') loadDepartments();
    if(sec === 'classes') loadClasses();
    if(sec === 'students') loadStudents();
    if(sec === 'attendance') loadAttendancePage();
  });
});

/* ---------- SUMMARY ---------- */
async function refreshSummary(){
  const depts = await fetchWithError(`${API_BASE}/departments`);
  const students = await fetchWithError(`${API_BASE}/students`);
  let classCount = 0;
  if(Array.isArray(depts)){
    for(const d of depts){
      if(hiddenDepartments.has(d.id)) continue;
      const cl = await fetchWithError(`${API_BASE}/departments/${d.id}/classes`);
      if(Array.isArray(cl)) {
        for(const c of cl) {
          const key = `${d.id}-${c.id}`;
          if (!hiddenClasses.has(key)) classCount++;
        }
      }
    }
  }
  const visibleStudentsCount = Array.isArray(students)
    ? students.filter(s => !hiddenStudents.has(s.id)).length
    : 0;

  el('summary-depts').textContent = `Depts: ${Array.isArray(depts)? depts.filter(d => !hiddenDepartments.has(d.id)).length : 0}`;
  el('summary-classes').textContent = `Classes: ${classCount}`;
  el('summary-students').textContent = `Students: ${visibleStudentsCount}`;
}

/* ------------------- DEPARTMENTS ------------------- */
el('addDeptBtn').addEventListener('click', async ()=> {
  const name = el('deptName').value.trim();
  if(!name) return alert('Enter department name');
  const r = await fetchWithError(`${API_BASE}/departments`, {
    method: 'POST',
    headers: {'Content-Type':'application/json'},
    body: JSON.stringify({ name })
  });
  if(r) { el('deptName').value=''; loadDepartments(); refreshSummary(); }
});

el('refreshDeptBtn').addEventListener('click', loadDepartments);

async function loadDepartments(){
  const list = el('deptList');
  const detail = el('deptDetail');
  list.innerHTML = 'Loading...';
  const depts = await fetchWithError(`${API_BASE}/departments`);
  list.innerHTML = '';
  detail.innerHTML = 'Select a department to view details';
  if(!depts) { list.innerHTML = '<li class="err">Failed to load</li>'; return; }
  for(const d of depts){
    if (hiddenDepartments.has(d.id)) continue;
    const li = document.createElement('li');
    li.className = 'list-row';
    li.innerHTML = `<div class="item-main"><strong>${d.meta.name}</strong><small class="muted">id: ${d.id}</small></div>`;
    const actions = document.createElement('div');
    actions.className = 'item-actions';
    const view = document.createElement('button'); view.textContent='View'; view.onclick = ()=> showDept(d);
    const edit = document.createElement('button'); edit.textContent='Edit'; edit.onclick = ()=> editDept(d);
    const del = document.createElement('button'); del.textContent='Delete'; del.onclick = ()=> deleteDept(d.id);
    actions.append(view, edit, del);
    li.appendChild(actions);
    list.appendChild(li);
  }
  populateDeptSelects();
}

function showDept(d){
  el('deptDetail').innerHTML = `
    <div><strong>${d.meta.name}</strong></div>
    <div class="muted">Created: ${d.meta.created_at || '—'}</div>
    <div>Latest hash: <code>${d.latest_hash || '—'}</code></div>
  `;
  populateDeptSelects();
}

async function editDept(d){
  const newName = prompt('New department name', d.meta.name);
  if(newName === null) return;
  const r = await fetchWithError(`${API_BASE}/departments/${d.id}`, {
    method:'PUT',
    headers:{'Content-Type':'application/json'},
    body: JSON.stringify({ name: newName })
  });
  if(r) { loadDepartments(); refreshSummary(); }
}

function deleteDept(id){
  if(!confirm('Delete this department from UI? (Blockchain remains unchanged)')) return;
  hiddenDepartments.add(id);
  saveHiddenState();
  loadDepartments();
  refreshSummary();
}

/* ------------------- CLASSES ------------------- */
el('addClassBtn').addEventListener('click', async ()=> {
  const name = el('className').value.trim();
  const deptId = el('classDeptSelect').value;
  if(!name || !deptId) return alert('Enter class name and select department');
  const r = await fetchWithError(`${API_BASE}/departments/${deptId}/classes`, {
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body: JSON.stringify({ name })
  });
  if(r) { el('className').value=''; loadClasses(); refreshSummary(); }
});

el('refreshClassBtn').addEventListener('click', loadClasses);

async function loadClasses(){
  await populateDeptSelects();
  const deptId = el('classDeptSelect').value;
  const list = el('classList');
  list.innerHTML = 'Loading...';
  if(!deptId){ list.innerHTML = '<li class="err">Select a department</li>'; return; }
  const classes = await fetchWithError(`${API_BASE}/departments/${deptId}/classes`);
  list.innerHTML = '';
  if(!classes) { list.innerHTML='<li class="err">Failed to load</li>'; return; }
  for(const c of classes){
    const key = `${deptId}-${c.id}`;
    if(hiddenClasses.has(key)) continue;
    const li = document.createElement('li');
    li.className = 'list-row';
    li.innerHTML = `<div class="item-main"><strong>${c.meta.name}</strong><small class="muted">id: ${c.id}</small></div>`;
    const actions = document.createElement('div'); actions.className='item-actions';
    const view = document.createElement('button'); view.textContent='View'; view.onclick=()=> showClass(c);
    const edit = document.createElement('button'); edit.textContent='Edit'; edit.onclick=()=> editClass(c);
    const del = document.createElement('button'); del.textContent='Delete'; del.onclick=()=> deleteClass(deptId, c.id);
    actions.append(view, edit, del);
    li.appendChild(actions);
    list.appendChild(li);
  }
  populateStudentDeptClassSelect();
}

function showClass(c){
  el('classDetail').innerHTML = `
    <div><strong>${c.meta.name}</strong></div>
    <div class="muted">Created: ${c.meta.created_at || '—'}</div>
    <div>Latest hash: <code>${c.latest_hash || '—'}</code></div>
  `;
  populateStudentDeptClassSelect();
}

async function editClass(c){
  const newName = prompt('New class name', c.meta.name);
  if(newName === null) return;
  const deptId = el('classDeptSelect').value;
  const r = await fetchWithError(`${API_BASE}/departments/${deptId}/classes/${c.id}`, {
    method:'PUT',
    headers:{'Content-Type':'application/json'},
    body: JSON.stringify({ name: newName })
  });
  if(r) loadClasses();
}

function deleteClass(deptId, classId){
  if(!confirm('Delete this class from UI?')) return;
  const key = `${deptId}-${classId}`;
  hiddenClasses.add(key);
  saveHiddenState();
  loadClasses();
  refreshSummary();
}

/* ------------------- STUDENTS ------------------- */
el('addStudentBtn').addEventListener('click', async ()=> {
  const name = el('studentName').value.trim();
  const roll = el('studentRoll').value.trim();
  const deptId = el('studentDeptSelect').value;
  const classId = el('studentClassSelect').value;
  if(!name || !roll || !deptId || !classId) return alert('Enter all student details');
  const r = await fetchWithError(`${API_BASE}/students`, {
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body: JSON.stringify({ name, roll, deptId, classId })
  });
  if(r){ el('studentName').value=''; el('studentRoll').value=''; loadStudents(); refreshSummary();}
});

el('refreshStudentBtn').addEventListener('click', loadStudents);

async function loadStudents(){
  await populateStudentDeptClassSelect();
  const list = el('studentList');
  list.innerHTML = 'Loading...';
  const students = await fetchWithError(`${API_BASE}/students`);
  list.innerHTML = '';
  if(!students){ list.innerHTML='<li class="err">Failed to load</li>'; return; }
  for(const s of students){
    if(hiddenStudents.has(s.id)) continue;
    const li = document.createElement('li');
    li.className='list-row';
    li.innerHTML = `<div class="item-main"><strong>${s.meta.name}</strong><small class="muted">id: ${s.id}</small></div>`;
    const actions = document.createElement('div'); actions.className='item-actions';
    const view = document.createElement('button'); view.textContent='View'; view.onclick=()=> showStudent(s);
    const edit = document.createElement('button'); edit.textContent='Edit'; edit.onclick=()=> editStudent(s);
    const del = document.createElement('button'); del.textContent='Delete'; del.onclick=()=> deleteStudent(s.id);
    actions.append(view, edit, del);
    li.appendChild(actions);
    list.appendChild(li);
  }
}

function showStudent(s){
  el('studentDetail').innerHTML = `
    <div><strong>${s.meta.name}</strong> (${s.meta.roll || '—'})</div>
    <div class="muted">Dept: ${s.meta.deptId}, Class: ${s.meta.classId}</div>
    <div>Latest hash: <code>${s.latest_hash || '—'}</code></div>
  `;
}

async function editStudent(s){
  const newName = prompt('New student name', s.meta.name);
  if(newName===null) return;
  const newRoll = prompt('New roll number', s.meta.roll || '');
  const r = await fetchWithError(`${API_BASE}/students/${s.id}`,{
    method:'PUT',
    headers:{'Content-Type':'application/json'},
    body: JSON.stringify({ name:newName, roll:newRoll })
  });
  if(r) loadStudents();
}

function deleteStudent(id){
  if(!confirm('Delete this student from UI?')) return;
  hiddenStudents.add(id);
  saveHiddenState();
  loadStudents();
  refreshSummary();
}

/* ---------- SELECT POPULATE ---------- */
async function populateDeptSelects(){
  const depts = await fetchWithError(`${API_BASE}/departments`);
  const dSelects = [el('classDeptSelect'), el('studentDeptSelect')];
  if(!depts) return;
  for(const sel of dSelects){
    const val = sel.value;
    sel.innerHTML = '<option value="">Select department</option>';
    depts.filter(d=>!hiddenDepartments.has(d.id)).forEach(d=>{
      const o = document.createElement('option'); o.value=d.id; o.textContent=d.meta.name;
      sel.appendChild(o);
    });
    sel.value = val || '';
  }
  populateStudentDeptClassSelect();
}

async function populateStudentDeptClassSelect(){
  const deptId = el('studentDeptSelect').value;
  const cSelect = el('studentClassSelect');
  cSelect.innerHTML = '<option value="">Select class</option>';
  if(!deptId) return;
  const classes = await fetchWithError(`${API_BASE}/departments/${deptId}/classes`);
  if(!classes) return;
  classes.forEach(c=>{
    const key = `${deptId}-${c.id}`;
    if(hiddenClasses.has(key)) return;
    const o = document.createElement('option'); o.value=c.id; o.textContent=c.meta.name;
    cSelect.appendChild(o);
  });
}

/* ------------------- DASHBOARD TREE ------------------- */
async function loadDashboardTree(){
  const treeEl = el('deptTree');
  treeEl.innerHTML = 'Loading...';
  try {
    const depts = await fetchWithError(`${API_BASE}/departments`);
    const students = await fetchWithError(`${API_BASE}/students`);
    if(!depts || !students){ treeEl.innerHTML='<li>Failed to load</li>'; return; }
    treeEl.innerHTML = '';
    for(const d of depts){
      if(hiddenDepartments.has(d.id)) continue;
      const deptLi = document.createElement('li');
      const deptSpan = document.createElement('span'); deptSpan.textContent=d.meta.name;
      deptLi.appendChild(deptSpan);
      const classes = await fetchWithError(`${API_BASE}/departments/${d.id}/classes`);
      if(Array.isArray(classes) && classes.length){
        const classUl = document.createElement('ul');
        for(const c of classes){
          const key = `${d.id}-${c.id}`;
          if(hiddenClasses.has(key)) continue;
          const classLi = document.createElement('li');
          const classSpan = document.createElement('span'); classSpan.textContent=c.meta.name;
          classLi.appendChild(classSpan);
          const classStudents = students.filter(s => s.meta.classId===c.id && !hiddenStudents.has(s.id));
          if(classStudents.length){
            const studUl = document.createElement('ul');
            for(const s of classStudents){
              const stuLi = document.createElement('li'); stuLi.textContent=s.meta.name;
              studUl.appendChild(stuLi);
            }
            classLi.appendChild(studUl);
          }
          classUl.appendChild(classLi);
        }
        deptLi.appendChild(classUl);
      }
      treeEl.appendChild(deptLi);
    }
  } catch(err){
    console.error('Dashboard tree error', err);
    treeEl.innerHTML = '<li>Error loading tree</li>';
  }
}

/* Collapsible tree click */
document.addEventListener('click', e=>{
  if(e.target.tagName==='SPAN' && e.target.parentElement.querySelector('ul')){
    e.target.parentElement.classList.toggle('open');
  }
});

/* ------------------- ATTENDANCE ------------------- */
el('markAttBtn').addEventListener('click', async ()=>{
  const studentId = el('attStudentSelect').value;
  const status = el('attStatus').value;
  if(!studentId) return alert('Select a student');
  const r = await fetchWithError(`${API_BASE}/students/${studentId}/attendance`, {
    method: 'POST',
    headers: {'Content-Type':'application/json'},
    body: JSON.stringify({ status })
  });
  if(r) { loadAttendanceHistory(); refreshSummary(); }
});

el('refreshAttBtn').addEventListener('click', ()=>{
  loadAttendancePage();
});

async function loadAttendancePage(){
  await populateAttendanceStudentSelect();
  loadAttendanceHistory();
}

async function populateAttendanceStudentSelect(){
  const sel = el('attStudentSelect');
  sel.innerHTML = '<option value="">Select a student</option>';
  const students = await fetchWithError(`${API_BASE}/students`);
  if(!students){ sel.innerHTML = '<option value="">Failed to load</option>'; return; }
  for(const s of students){
    if(hiddenStudents.has(s.id)) continue;
    const o = document.createElement('option');
    o.value = s.id;
    o.textContent = `${s.meta.name} (${s.meta.roll || '—'})`;
    sel.appendChild(o);
  }
}

async function loadAttendanceHistory(){
  const studentId = el('attStudentSelect').value;
  const list = el('attendanceList');
  list.innerHTML = 'Loading...';
  if(!studentId){ list.innerHTML = '<li class="err">Select a student</li>'; return; }
  const data = await fetchWithError(`${API_BASE}/students/${studentId}/chain`);
  list.innerHTML = '';
  if(!data || !data.chain){ list.innerHTML = '<li class="err">Failed to load</li>'; return; }
  for(const blk of data.chain){
    if(blk.transaction && blk.transaction.kind==='attendance'){
      const li = document.createElement('li');
      li.innerHTML = `<div><strong>${blk.transaction.status}</strong> <span class="muted">(${blk.timestamp})</span></div>
                      <div class="muted small">prev_hash: ${blk.prev_hash}</div>
                      <div class="muted small">hash: ${blk.hash}</div>`;
      list.appendChild(li);
    }
  }
  el('chainView').textContent = JSON.stringify(data.chain, null, 2);
}

el('attStudentSelect').addEventListener('change', loadAttendanceHistory);

/* ---------- INITIALIZE ---------- */
(async function init(){
  showSection('dashboard');
  await refreshSummary();
  await loadDashboardTree();
})();
