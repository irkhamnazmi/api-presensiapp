require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { loadSheets, saveSheet } = require('./utils/driverUploader');

const app = express();
const PORT = process.env.PORT || 3000;
const now = new Date().toISOString();

function formatTime(date) {
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

app.use(cors());
app.use(bodyParser.json());

app.post('/api/login', async (req, res) => {
  const result = await loadSheets();
  const sheets = result.sheets;
  const { email, password } = req.body;
  const user = sheets.teachers.find(g => g.email === email && g.password === password);
  if (user) return res.json({ success: true, user });
  return res.status(401).json({ success: false, message: 'Login gagal' });
});

app.get('/api/teachers', async (req, res) => {
  const result = await loadSheets();
  res.json(result.sheets.teachers);
});

app.post('/api/teachers', async (req, res) => {
  const result = await loadSheets();
  const sheets = result.sheets;
  const newTeacher = req.body;
  newTeacher.id = `G${Date.now()}`;
  newTeacher.created_at = now;
  newTeacher.updated_at = "";
  sheets.teachers.push(newTeacher);
  const saveResult = await saveSheet('teachers', sheets.teachers);
  res.status(201).json({ success: true, message: 'Guru berhasil ditambahkan', data: newTeacher, saved: saveResult });
});

app.put('/api/teachers/:id', async (req, res) => {
  const result = await loadSheets();
  const sheets = result.sheets;
  const id = req.params.id;
  const index = sheets.teachers.findIndex(g => g.id === id);
  if (index >= 0) {
    sheets.teachers[index] = { ...sheets.teachers[index], ...req.body };
    const saveResult = await saveSheet('teachers', sheets.teachers);
    return res.json({ success: true, message: 'Guru diperbarui', saved: saveResult });
  }
  res.status(404).json({ success: false, message: 'Guru tidak ditemukan' });
});

app.delete('/api/teachers/:id', async (req, res) => {
  const result = await loadSheets();
  const sheets = result.sheets;
  const filtered = sheets.teachers.filter(g => g.id !== req.params.id);
  const saveResult = await saveSheet('teachers', filtered);
  res.json({ success: true, message: 'Guru dihapus', saved: saveResult });
});

app.get('/api/students', async (req, res) => {
  const result = await loadSheets();
  res.json(result.sheets.students);
});

app.get('/api/students/:id', async (req, res) => {
  const result = await loadSheets();
  const student = result.sheets.students.find(s => s.id === req.params.id);
  if (student) return res.json(student);
  res.status(404).json({ success: false });
});

app.get('/api/students', async (req, res) => {
  const query = req.query.query?.toLowerCase() || "";

  const result = await loadSheets();
  const students = result.sheets.students;

  // Filter berdasarkan nama atau nisn yang mengandung query
  const filtered = students.filter(s =>
    s.nama?.toLowerCase().includes(query) || s.nisn?.includes(query)
  );

  res.json(filtered);
});

app.post('/api/students', async (req, res) => {
  const result = await loadSheets();
  const sheets = result.sheets;
  const newStudent = req.body;
  newStudent.id = `S${Date.now()}`;
  newStudent.created_at = now;
  newStudent.updated_at = "";
  sheets.students.push(newStudent);
  const saveResult = await saveSheet('students', sheets.students);
  res.status(201).json({ success: true, data: newStudent, saved: saveResult });
});

app.put('/api/students/:id', async (req, res) => {
  const result = await loadSheets();
  const sheets = result.sheets;
  const index = sheets.students.findIndex(s => s.id === req.params.id);
  if (index >= 0) {
    sheets.students[index] = { ...sheets.students[index], ...req.body };
    const saveResult = await saveSheet('students', sheets.students);
    return res.json({ success: true, saved: saveResult });
  }
  res.status(404).json({ success: false });
});

app.delete('/api/students/:id', async (req, res) => {
  const result = await loadSheets();
  const sheets = result.sheets;
  const filtered = sheets.students.filter(s => s.id !== req.params.id);
  const saveResult = await saveSheet('students', filtered);
  res.json({ success: true, saved: saveResult });
});

app.get('/api/presences', async (req, res) => {
  const result = await loadSheets();
  const { presences = [], students = [] } = result.sheets;
  const combined = presences.map(p => {
    const student = students.find(s => s.id === p.student_id) || {};
    return { ...p, student: { id: student.id, name: student.name, class: student.class, role: student.role } };
  });
  res.json(combined);
});

app.post('/api/presences', async (req, res) => {
  const result = await loadSheets();
  const sheets = result.sheets;
  const newPresence = req.body;
  newPresence.id = `P${Date.now()}`;
  newPresence.time = formatTime(new Date());

  const onTime = new Date();
  onTime.setHours(7, 0, 0, 0);

  const nowTime = new Date();
  newPresence.status = nowTime > onTime ? 'Terlambat' : 'Tepat';
  newPresence.created_at = now;
  newPresence.updated_at = "";
  sheets.presences.push(newPresence);
  const saveResult = await saveSheet('presences', sheets.presences);
  res.json({ success: true, data: newPresence, saved: saveResult });
});

app.get('/api/presences/summary-by-student', async (req, res) => {
  const result = await loadSheets();
  const { presences = [], students = [] } = result.sheets;

  // Gabungkan presence dengan data student
  const combined = presences.map(p => {
    const student = students.find(s => s.id === p.student_id) || {};
    return {
      ...p,
      student: {
        id: student.id,
        nisn: student.nisn,
        name: student.name,
        class: student.class,
        birth_place: student.birth_place,
        birth_date: student.birth_date,
        phone_number: student.phone_number,
      }
    };
  });

  // Group by student ID + hitung status
  const grouped = combined.reduce((acc, presence) => {
    const studentId = presence.student?.id || 'unknown';
    if (!acc[studentId]) {
      acc[studentId] = {
        student: presence.student,
        presences: [],
        summary: {
          present: 0,
          permission: 0,
          sick: 0,
          absent: 0,
        }
      };
    }

    acc[studentId].presences.push(presence);

    // Hitung berdasarkan status
    const status = (presence.status || '').toLowerCase();
    if (status === 'masuk') acc[studentId].summary.present++;
    else if (status === 'izin') acc[studentId].summary.permission++;
    else if (status === 'sakit') acc[studentId].summary.sick++;
    else if (status === 'alpa') acc[studentId].summary.absent++;
    else acc[studentId].summary.lainnya++;

    return acc;
  }, {});

  res.json(grouped);
});


app.delete('/api/presences/:id', async (req, res) => {
  const result = await loadSheets();
  const sheets = result.sheets;
  const filtered = sheets.presences.filter(s => s.id !== req.params.id);
  const saveResult = await saveSheet('presences', filtered);
  res.json({ success: true, saved: saveResult });
});

app.listen(PORT, () => console.log(`🚀 Server berjalan di http://localhost:${PORT}`));
