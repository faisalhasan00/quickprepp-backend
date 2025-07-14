/* ──────────────────────────────────────────────────────────────────
   server.js – Unified Express Entry Point (Production-Ready)
   ────────────────────────────────────────────────────────────────── */

const express      = require('express');
const dotenv       = require('dotenv');
const cors         = require('cors');
const morgan       = require('morgan');
const helmet       = require('helmet');
const compression  = require('compression');
const rateLimit    = require('express-rate-limit');
const connectDB    = require('./config/db');

// 🌍 Load environment variables
dotenv.config();

// ✅ Required Environment Variables Check
const requiredEnv = ['CLIENT_URL', 'PORT', 'MONGO_URI'];
requiredEnv.forEach((key) => {
  if (!process.env[key]) {
    console.error(`❌ Missing required environment variable: ${key}`);
    process.exit(1);
  }
});

// 🔗 Connect to MongoDB
connectDB(); // exits on failure

// 🚀 Initialize App
const app = express();

// 🌐 Global Middleware
app.use(helmet());

const allowedOrigins = [
  'http://localhost:5173',
  'https://quickprepp-frontend.vercel.app',
];

app.use(cors({
  origin: function (origin, callback) {
    // allow requests with no origin (like mobile apps, curl, etc.)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    } else {
      return callback(new Error(`CORS error: ${origin} not allowed`), false);
    }
  },
  credentials: true,
}));


app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(compression());

// 🛡️ Basic API Rate Limiting
app.use('/api', rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // per IP
  message: { success: false, error: 'Too many requests. Try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
}));

// 🧭 Route Imports
const authRoutes         = require('./routes/authRoutes');
const questionRoutes     = require('./routes/questions');
const speechToTextRoutes = require('./routes/speechToText');
const aiFeedbackRoutes   = require('./routes/aiFeedback');
const followupRoutes     = require('./routes/followup');
const studyPlanRoutes    = require('./routes/studyPlanRoutes');
const matchResumeRoutes  = require('./routes/matchResumeRoutes');

const courseRoutes       = require('./routes/courseRoutes');
const progressRoutes     = require('./routes/progressRoutes');
const videoRoutes        = require('./routes/videoRoutes');

// 📦 Mount Routes
app.use('/api/auth',           authRoutes);
app.use('/api/questions',      questionRoutes);
app.use('/api/speech-to-text', speechToTextRoutes);
app.use('/api/ai-feedback',    aiFeedbackRoutes);
app.use('/api/followup',       followupRoutes);
app.use('/api/study-plan',     studyPlanRoutes);
app.use('/api',                matchResumeRoutes);
app.use('/api/courses',        courseRoutes);
app.use('/api/progress',       progressRoutes);
app.use('/api/videos',         videoRoutes);

// 🩺 Health Check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', uptime: process.uptime() });
});

// ❌ Fallback: 404 Not Found
app.use((req, res) => {
  res.status(404).json({ success: false, error: 'Route not found' });
});

// 🛠️ Global Error Handler
app.use((err, req, res, next) => {
  console.error('[Global Error]', err.stack);
  res.status(500).json({ success: false, error: 'Internal Server Error' });
});

// 🚀 Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running in ${process.env.NODE_ENV || 'development'} on port ${PORT}`);
});
