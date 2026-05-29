const express = require('express');
const nodemailer = require('nodemailer');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

const ALLOWED_ORIGINS = [
  'https://cajaxlogistics.com',
  'https://www.cajaxlogistics.com',
];

if (process.env.NODE_ENV !== 'production') {
  ALLOWED_ORIGINS.push(
    'http://localhost:3000',
    'http://localhost:5173',
    'http://127.0.0.1:5173',
  );
}

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || ALLOWED_ORIGINS.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(null, false);
    },
    methods: ['GET', 'POST', 'OPTIONS'],
  }),
);
app.use(express.json());

app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Cajax backend is running',
    endpoints: {
      health: 'GET /api/health',
      contact: 'POST /api/contact',
    },
  });
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    emailConfigured: Boolean(
      process.env.EMAIL_USER && process.env.EMAIL_PASS,
    ),
  });
});

app.get('/api/contact', (req, res) => {
  res.status(405).json({
    message: 'This endpoint accepts POST only. Send JSON with name, email, and message.',
  });
});

function escapeHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function getTransporter() {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    throw new Error('EMAIL_USER and EMAIL_PASS must be set');
  }

  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
}

app.post('/api/contact', async (req, res) => {
  const { name, email, phone, company, message } = req.body;

  if (!name?.trim() || !email?.trim() || !message?.trim()) {
    return res.status(400).json({
      message: 'Name, email, and message are required',
    });
  }

  try {
    const transporter = getTransporter();

    await transporter.sendMail({
      from: `"Cajax Contact" <${process.env.EMAIL_USER}>`,
      replyTo: email,
      to: process.env.EMAIL_USER,
      subject: `New contact from ${name}`,
      html: `
        <h2>New contact form submission</h2>
        <p><strong>Name:</strong> ${escapeHtml(name)}</p>
        <p><strong>Email:</strong> ${escapeHtml(email)}</p>
        <p><strong>Phone:</strong> ${escapeHtml(phone || '—')}</p>
        <p><strong>Company:</strong> ${escapeHtml(company || '—')}</p>
        <p><strong>Message:</strong></p>
        <p>${escapeHtml(message).replace(/\n/g, '<br>')}</p>
      `,
    });

    res.status(200).json({ message: 'Message sent successfully!' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error sending message' });
  }
});

if (!process.env.VERCEL) {
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}

module.exports = app;
