const API_BASE = "http://localhost:3000/api"; // Make sure your backend port matches

// Departments
async function getDepartments() {
    console.log("Fetching departments from", `${API_BASE}/departments`);
    return await fetch(`${API_BASE}/departments`).then(res => res.json());
}
async function addDepartmentApi(name) {
    return await fetch(`${API_BASE}/departments`, {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({ name })
    }).then(res => res.json());
}

// Classes
async function getClasses() {
    return await fetch(`${API_BASE}/classes`).then(res => res.json());
}
async function addClassApi(name, parentDept) {
    return await fetch(`${API_BASE}/classes`, {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({ name, parentDept })
    }).then(res => res.json());
}

// Students
async function getStudents() {
    return await fetch(`${API_BASE}/students`).then(res => res.json());
}
async function addStudentApi(name, roll, dept, cls) {
    return await fetch(`${API_BASE}/students`, {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({ name, roll, dept, cls })
    }).then(res => res.json());
}

// Attendance
async function markAttendanceApi(studentId, status) {
    return await fetch(`${API_BASE}/attendance`, {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({ studentId, status })
    }).then(res => res.json());
}

async function getAttendance(studentId) {
    return await fetch(`${API_BASE}/attendance/${studentId}`).then(res => res.json());
}
