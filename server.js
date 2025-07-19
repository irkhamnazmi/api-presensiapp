
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { loadSheets, saveSheet } = require('./utils/driverUploader');

const app = express();
const PORT = 3000;
const now = new Date().toISOString();

function formatTime(date) {
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

app.use(cors());
app.use(bodyParser.json());

async function startServer() {
  try {
    const result = await loadSheets();
    const sheets = result.sheets;

    /* ========== LOGIN ========== */
    app.post('/api/login', (req, res) => {
      const { email, password } = req.body;
      const user = sheets.teachers.find(g => g.email === email && g.password === password);
      if (user) return res.json({ success: true, user });
      return res.status(401).json({ success: false, message: 'Login gagal' });
    });

    /* ========== CRUD Teacher ========== */
    app.get('/api/teachers', (req, res) => {
      res.json(sheets.teachers);
    });

    app.post('/api/teachers', (req, res) => {
      const newTeacher = req.body;
      newTeacher.id = `G${Date.now()}`;
      newTeacher.created_at = now;
      newTeacher.updated_at = "";
      sheets.teachers.push(newTeacher);
      saveSheet('teachers', sheets.teachers);
      res.status(201).json({ success: true });
    });

    app.put('/api/teachers/:id', (req, res) => {
      const id = req.params.id;
      const index = sheets.teachers.findIndex(g => g.id === id);
      if (index >= 0) {
        sheets.teachers[index] = { ...sheets.teachers[index], ...req.body };
        saveSheet('teachers', sheets.teachers);
        return res.json({ success: true });
      }
      res.status(404).json({ success: false });
    });

    app.delete('/api/teachers/:id', (req, res) => {
      const filtered = sheets.teachers.filter(g => g.id !== req.params.id);
      saveSheet('teachers', filtered);
      res.status(204).json({ success: true });
    });

    /* ========== CRUD students ========== */
    app.get('/api/students', (req, res) => {
      res.json(sheets.students);
    });

    app.get('/api/students/:id', (req, res) => {
      const id = req.params.id;
      const index = sheets.students.findIndex(s => s.id === id);
      if (index >= 0) return res.json(sheets.students[index]);
      return res.status(404).json({ success: false });
    });

    app.post('/api/students', (req, res) => {
      const newStudent = req.body;
      newStudent.id = `S${Date.now()}`;
      newStudent.created_at = now;
      newStudent.updated_at = "";
      sheets.students.push(newStudent);
      saveSheet('students', sheets.students);
      res.status(201).json({ success: true });
    });

    app.put('/api/students/:id', (req, res) => {
      const id = req.params.id;
      const index = sheets.students.findIndex(s => s.id === id);
      if (index >= 0) {
        sheets.students[index] = { ...sheets.students[index], ...req.body };
        saveSheet('students', sheets.students);
        return res.json({ success: true });
      }
      res.status(404).json({ success: false });
    });

    app.delete('/api/students/:id', (req, res) => {
      const filtered = sheets.students.filter(s => s.id !== req.params.id);
      saveSheet('students', filtered);
      res.status(204).json({ success: true });
    });

    /* ========== Presences students ========== */
    app.get('/api/presences', (req, res) => {
      const presensi = sheets.presences || [];
      const students = sheets.students || [];

      const combined = presensi.map((p) => {
        const student = students.find((s) => s.id === p.student_id) || {};
        return {
          ...p,
          student: {
            id: student.id,
            name: student.name,
            class: student.class,
            role: student.role,
          },
        };
      });

      res.json(combined);
    });

    app.post('/api/presences', (req, res) => {
      const newPresence = req.body;
      newPresence.id = `P${Date.now()}`;
      newPresence.student_id = req.body.student_id;
      newPresence.time = formatTime(new Date());

      const onTime = new Date();
      onTime.setHours(7, 0, 0, 0);

      const inTime = new Date();
      inTime.setHours(new Date().getHours(), new Date().getMinutes(), 0, 0);

      newPresence.status = inTime > onTime ? 'Terlambat' : 'Tepat';
      newPresence.created_at = now;
      newPresence.updated_at = "";
      sheets.presences.push(newPresence);
      saveSheet('presences', sheets.presences);
      res.json({ success: true });
    });

    app.delete('/api/presences/:id', (req, res) => {
      const filtered = sheets.presences.filter(s => s.id !== req.params.id);
      saveSheet('presences', filtered);
      res.status(204).json({ success: true });
    });

    app.listen(PORT, () => console.log(`🚀 Server berjalan di http://localhost:${PORT}`));
  } catch (err) {
    console.error('❌ Gagal memulai server:', err.message || err);
  }
}

startServer();
