const express = require('express');
const cors = require('cors');
const path = require('path');
const config = require('./config');

const healthRoutes = require('./routes/health');
const authRoutes = require('./routes/auth');
const rombelRoutes = require('./routes/rombel');
const studentRoutes = require('./routes/student');
const attendanceRoutes = require('./routes/attendance'); // <--- Tambahan

const errorHandler = require('./middleware/errorHandler');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../public')));

// Register Routes
app.use('/api/health', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/rombels', rombelRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/attendance', attendanceRoutes); // <--- Tambahan

app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) return next();
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

app.use(errorHandler);

app.listen(config.port, () => {
  console.log('====================================================');
  console.log(` PresensiSiswa V1.0.0 - Server Started`);
  console.log(` Environment : ${config.nodeEnv}`);
  console.log(` Server URL  : http://localhost:${config.port}`);
  console.log(` Health Check: http://localhost:${config.port}/api/health`);
  console.log('====================================================');
});