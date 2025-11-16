// backend/routes/api.js
const express = require('express');
const router = express.Router();

const deptController = require('../controllers/deptController');
const classController = require('../controllers/classController');
const studentController = require('../controllers/studentController');
const attendanceController = require('../controllers/attendanceController');
const validationController = require('../controllers/validationController');

/* Department */
router.get('/departments', deptController.list);
router.post('/departments', deptController.create);
router.get('/departments/:deptId', deptController.get);
router.put('/departments/:deptId', deptController.update); // append update block
router.delete('/departments/:deptId', deptController.remove); // append deleted block

/* Classes */
router.get('/departments/:deptId/classes', classController.list);
router.post('/departments/:deptId/classes', classController.create);
router.get('/departments/:deptId/classes/:classId', classController.get);
router.put('/departments/:deptId/classes/:classId', classController.update);
router.delete('/departments/:deptId/classes/:classId', classController.remove);

/* Students */
router.get('/students', studentController.listAll);
router.post('/departments/:deptId/classes/:classId/students', studentController.create);
router.get('/students/:studentId', studentController.get);
router.put('/students/:studentId', studentController.update);
router.delete('/students/:studentId', studentController.remove);
router.get('/students/:studentId/chain', studentController.getChain);

/* Attendance */
router.post('/students/:studentId/attendance', attendanceController.markAttendance);
router.get('/attendance/today', attendanceController.todayForSchool);
router.get('/attendance/department/:deptId', attendanceController.forDepartment);
router.get('/attendance/class/:classId', attendanceController.forClass);

/* Validation */
router.get('/validate', validationController.validateAll);

module.exports = router;
