const express = require('express');
const path = require('path');
const fs = require('fs');

// ─── Upstash Redis helper (uses fetch — no extra package required) ─────────────
const REDIS_URL   = process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

async function redis(command, ...args) {
  if (!REDIS_URL || !REDIS_TOKEN) return null;
  try {
    const res = await fetch(`${REDIS_URL}/${[command, ...args].map(encodeURIComponent).join('/')}`, {
      headers: { Authorization: `Bearer ${REDIS_TOKEN}` },
    });
    const json = await res.json();
    return json.result;
  } catch (e) {
    console.error('Redis error:', e.message);
    return null;
  }
}

const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files from /public
app.use(express.static(path.join(__dirname, 'public')));

// ─── API: Get questions for a section ────────────────────────────────────────
app.get('/api/questions/:section', (req, res) => {
  const { section } = req.params;

  // Sanitize input — only allow alphanumeric + underscores
  if (!/^[a-z0-9_]+$/.test(section)) {
    return res.status(400).json({ error: 'Invalid section name.' });
  }

  const filePath = path.join(__dirname, 'data', 'questions', `${section}.json`);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: `Section "${section}" not found.` });
  }

  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    const questions = JSON.parse(raw);

    // Fisher-Yates shuffle — randomize on every request
    for (let i = questions.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [questions[i], questions[j]] = [questions[j], questions[i]];
    }

    res.json(questions);
  } catch (err) {
    console.error(`Error reading ${section}.json:`, err);
    res.status(500).json({ error: 'Failed to load questions.' });
  }
});

// ─── API: Get all sections metadata ─────────────────────────────────────────
app.get('/api/sections', (req, res) => {
  const sections = [
    { id: 'know_your_tcs',     label: 'Know Your TCS',       icon: '🏢', description: 'TCS history, values & culture' },
    { id: 'bizskills',         label: 'BizSkills',            icon: '💼', description: 'Business communication & professional skills' },
    { id: 'ui',                label: 'UI',                   icon: '🖥️', description: 'User Interface design concepts' },
    { id: 'unix_linux',        label: 'Unix / Linux',         icon: '🐧', description: 'Shell commands & OS fundamentals' },
    { id: 'java',              label: 'Java',                 icon: '☕', description: 'Core Java programming concepts' },
    { id: 'python',            label: 'Python',               icon: '🐍', description: 'Python fundamentals & syntax' },
    { id: 'sql',               label: 'SQL',                  icon: '🗄️', description: 'Database queries & design' },
    { id: 'general_technical', label: 'General Technical',    icon: '⚙️', description: 'DS, Algorithms, Networking & more' },
  ];
  res.json(sections);
});

// ─── API: Get all concepts metadata (index list) ─────────────────────────────
app.get('/api/concepts', (req, res) => {
  const dir = path.join(__dirname, 'data', 'concepts');
  try {
    const files = fs.readdirSync(dir).filter(f => f.endsWith('.json'));
    const topics = files.map(f => {
      const raw = fs.readFileSync(path.join(dir, f), 'utf-8');
      return JSON.parse(raw);
    });
    // Return in a fixed order matching the sections order
    const order = ['know_your_tcs','bizskills','ui','unix_linux','java','python','sql','general_technical'];
    topics.sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));
    res.json(topics);
  } catch (err) {
    console.error('Error reading concepts:', err);
    res.status(500).json({ error: 'Failed to load concepts.' });
  }
});

// ─── API: Get single concept topic ───────────────────────────────────────────
app.get('/api/concepts/:topic', (req, res) => {
  const { topic } = req.params;
  if (!/^[a-z0-9_]+$/.test(topic)) {
    return res.status(400).json({ error: 'Invalid topic name.' });
  }
  const filePath = path.join(__dirname, 'data', 'concepts', `${topic}.json`);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: `Topic "${topic}" not found.` });
  }
  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    res.json(JSON.parse(raw));
  } catch (err) {
    console.error(`Error reading ${topic}.json:`, err);
    res.status(500).json({ error: 'Failed to load topic.' });
  }
});

// ─── API: Track a visit (called silently from every page) ────────────────────
app.post('/api/track-visit', async (req, res) => {
  const ip =
    (req.headers['x-forwarded-for'] || '').split(',')[0].trim() ||
    req.socket.remoteAddress ||
    'unknown';

  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const dayKey   = `visitors:${today}`;
  const totalKey = 'total_visitors';

  // Add IP to today's set (SADD returns 1 if new, 0 if already present)
  const isNewToday = await redis('SADD', dayKey, ip);

  // Expire day key after 35 days (keeps ~30 days of history)
  await redis('EXPIRE', dayKey, 35 * 24 * 60 * 60);

  // Track all-time unique visitors: use a separate lifetime set
  const isNewEver = await redis('SADD', 'all_visitors', ip);
  if (isNewEver === 1) {
    await redis('INCR', totalKey);
  }

  res.json({ ok: true, isNewToday: isNewToday === 1, isNewEver: isNewEver === 1 });
});

// ─── API: Stats dashboard data ───────────────────────────────────────────────
app.get('/api/stats', async (req, res) => {
  if (!REDIS_URL || !REDIS_TOKEN) {
    return res.status(503).json({ error: 'Redis not configured.' });
  }

  // Total unique visitors (all time)
  const total = (await redis('GET', 'total_visitors')) || 0;

  // Build last 14 days breakdown
  const days = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    const count = (await redis('SCARD', `visitors:${dateStr}`)) || 0;
    days.push({ date: dateStr, count: Number(count) });
  }

  const todayCount = days[days.length - 1].count;

  res.json({ total: Number(total), today: todayCount, days });
});

// ─── Fallback: serve index.html for any unknown HTML route ──────────────────
app.get('*', (req, res) => {
  // Only fall back for non-API, non-asset routes
  if (!req.path.startsWith('/api/') && !req.path.includes('.')) {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
  } else {
    res.status(404).send('Not found');
  }
});

app.listen(PORT, () => {
  console.log(`✅ TCS IPA Quiz running at http://localhost:${PORT}`);
});
