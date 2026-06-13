const express = require('express');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Enable JSON parsing with large limits to handle base64 image/pdf data URLs
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Serve frontend static files
app.use(express.static(path.join(__dirname, 'public')));

// Import handlers (same files used in Vercel Serverless Functions)
const registerHandler = require('./api/register');
const loginHandler = require('./api/admin/login');
const registrationsHandler = require('./api/admin/registrations');
const exportHandler = require('./api/admin/export');

// API Routes
app.post('/api/register', registerHandler);
app.post('/api/admin/login', loginHandler);
app.get('/api/admin/registrations', registrationsHandler);
app.get('/api/admin/export', exportHandler);

// Fallback to index.html for root path and other client routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// Start Server
app.listen(PORT, () => {
  console.log(`==================================================`);
  console.log(` CHAMPIONS CUP LOCAL SERVER RUNNING`);
  console.log(` Access Frontend:  http://localhost:${PORT}`);
  console.log(` Access Admin Panel: http://localhost:${PORT}/admin`);
  console.log(` Local Database:  registrations.json`);
  console.log(`==================================================`);
});
