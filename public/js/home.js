// ─── home.js — Home page logic ───────────────────────────────────────────────

const STORAGE_KEY = 'tcs_ipa_stats';

function getStats() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}; }
  catch { return {}; }
}

function renderGlobalStats(sections) {
  const stats = getStats();
  const attempted = sections.filter(s => stats[s.id]?.attempts > 0).length;
  const totalAttempts = sections.reduce((sum, s) => sum + (stats[s.id]?.attempts || 0), 0);

  const el = document.getElementById('globalStats');
  if (!el) return;
  el.innerHTML = `
    <div class="glass rounded-xl px-4 py-2 text-sm text-center">
      <span class="text-indigo-300 font-bold">${attempted}</span>
      <span class="text-slate-500 ml-1">/ ${sections.length} sections attempted</span>
    </div>
    <div class="glass rounded-xl px-4 py-2 text-sm text-center">
      <span class="text-cyan-400 font-bold">${totalAttempts}</span>
      <span class="text-slate-500 ml-1">total attempts</span>
    </div>
  `;
}

function renderSectionCards(sections) {
  const stats = getStats();
  const grid = document.getElementById('sectionGrid');
  grid.innerHTML = '';

  sections.forEach((section, i) => {
    const s = stats[section.id] || {};
    const attempts = s.attempts || 0;
    const best = s.bestScore;

    const bestLabel = best
      ? `<span class="text-emerald-400 font-semibold">${best.correct}/${best.total}</span> best`
      : `<span class="text-slate-500">Not attempted</span>`;

    const attemptBadge = attempts > 0
      ? `<span class="absolute top-3 right-3 bg-indigo-600/30 text-indigo-300 text-xs font-medium px-2 py-0.5 rounded-full border border-indigo-500/20">${attempts}×</span>`
      : '';

    // Stagger animation delay
    const delay = (i * 60) + 'ms';

    const card = document.createElement('div');
    card.className = 'section-card glass glass-hover rounded-2xl p-5 relative flex flex-col gap-3';
    card.style.animationDelay = delay;
    card.style.opacity = '0';
    card.style.animation = `slideUp 0.4s ease ${delay} forwards`;
    card.setAttribute('role', 'button');
    card.setAttribute('tabindex', '0');
    card.setAttribute('aria-label', `Start ${section.label} quiz`);
    card.dataset.sectionId = section.id;

    card.innerHTML = `
      ${attemptBadge}
      <div class="text-3xl">${section.icon}</div>
      <div>
        <h3 class="font-bold text-white text-base leading-tight">${section.label}</h3>
        <p class="text-slate-500 text-xs mt-1 leading-snug">${section.description}</p>
      </div>
      <div class="mt-auto flex items-center justify-between text-xs">
        <span class="score-badge px-2.5 py-1 rounded-lg">${bestLabel}</span>
        <span class="text-indigo-400 font-medium">Start →</span>
      </div>
    `;

    card.addEventListener('click', () => startSection(section.id));
    card.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') startSection(section.id); });

    grid.appendChild(card);
  });

  // Inject CSS classes that Tailwind CDN won't pre-scan
  const style = document.createElement('style');
  style.textContent = `
    @keyframes slideUp { from{opacity:0;transform:translateY(24px)} to{opacity:1;transform:translateY(0)} }
    .glass-hover:hover { background:rgba(255,255,255,0.07); border-color:rgba(99,102,241,0.4); transform:translateY(-4px); box-shadow:0 20px 40px rgba(99,102,241,0.15); }
    .score-badge { background: linear-gradient(135deg, rgba(99,102,241,0.2), rgba(34,211,238,0.1)); }
  `;
  document.head.appendChild(style);
}

function startSection(sectionId) {
  window.location.href = `/quiz.html?section=${sectionId}`;
}

// ─── Init ─────────────────────────────────────────────────────────────────────
async function init() {
  try {
    const res = await fetch('/api/sections');
    if (!res.ok) throw new Error('Failed to load sections');
    const sections = await res.json();
    renderGlobalStats(sections);
    renderSectionCards(sections);
  } catch (err) {
    document.getElementById('sectionGrid').innerHTML =
      `<div class="col-span-full text-center text-red-400 py-20">⚠️ ${err.message}</div>`;
  }
}

init();
