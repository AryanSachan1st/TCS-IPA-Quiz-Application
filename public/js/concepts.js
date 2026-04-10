// ─── concepts.js — Concepts listing page ──────────────────────────────────────

const CONCEPTS_READ_KEY = 'tcs_ipa_concepts_read';

const ACCENT_MAP = {
  indigo:  { border: 'rgba(99,102,241,0.3)',  tag: 'text-indigo-300' },
  purple:  { border: 'rgba(168,85,247,0.3)',  tag: 'text-purple-300' },
  pink:    { border: 'rgba(236,72,153,0.3)',  tag: 'text-pink-300' },
  yellow:  { border: 'rgba(234,179,8,0.3)',   tag: 'text-yellow-300' },
  orange:  { border: 'rgba(249,115,22,0.3)',  tag: 'text-orange-300' },
  green:   { border: 'rgba(34,197,94,0.3)',   tag: 'text-green-300' },
  blue:    { border: 'rgba(59,130,246,0.3)',  tag: 'text-blue-300' },
  cyan:    { border: 'rgba(6,182,212,0.3)',   tag: 'text-cyan-300' },
};

function getReadData() {
  try { return JSON.parse(localStorage.getItem(CONCEPTS_READ_KEY)) || {}; }
  catch { return {}; }
}

function openTopic(id) {
  window.location.href = `/concept-detail.html?topic=${id}`;
}

function renderTopicCards(topics) {
  const readData = getReadData();
  const grid = document.getElementById('topicGrid');
  grid.innerHTML = '';

  let totalStarted = 0;

  topics.forEach((topic, i) => {
    const totalSections = topic.sections.length;
    const readSections  = (readData[topic.id] || []).length;
    const pct           = totalSections ? Math.round((readSections / totalSections) * 100) : 0;
    const accent        = ACCENT_MAP[topic.color] || ACCENT_MAP.indigo;
    const isStarted     = readSections > 0;
    if (isStarted) totalStarted++;

    const delay = (i * 60) + 'ms';

    const card = document.createElement('div');
    card.className = `topic-card glass rounded-2xl p-5 flex flex-col gap-4 accent-${topic.color}`;
    card.style.cssText = `opacity:0; animation: slideUp 0.4s ease ${delay} forwards; border-color: ${pct > 0 ? accent.border : 'rgba(255,255,255,0.08)'};`;
    card.setAttribute('role', 'button');
    card.setAttribute('tabindex', '0');
    card.setAttribute('aria-label', `Open ${topic.label} concepts`);

    const statusBadge = pct === 100
      ? `<span class="text-xs font-semibold text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 rounded-full px-2 py-0.5">✓ Complete</span>`
      : pct > 0
        ? `<span class="text-xs font-semibold ${accent.tag} opacity-80 bg-white/5 rounded-full px-2 py-0.5">${readSections}/${totalSections} read</span>`
        : `<span class="text-xs text-slate-600 bg-white/4 rounded-full px-2 py-0.5">Not started</span>`;

    card.innerHTML = `
      <div class="flex items-start justify-between gap-2">
        <div class="icon-box w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0">
          ${topic.icon}
        </div>
        ${statusBadge}
      </div>

      <div class="flex-1">
        <h3 class="font-bold text-white text-base leading-tight mb-1">${topic.label}</h3>
        <p class="text-slate-500 text-xs">${totalSections} sections</p>
      </div>

      <div>
        <div class="progress-bar-track mb-3">
          <div class="progress-bar-fill" style="width: ${pct}%;"></div>
        </div>
        <div class="flex items-center justify-between">
          <div class="flex flex-wrap gap-1">
            ${topic.sections.slice(0,2).map(s =>
              `<span class="topic-tag text-xs px-2 py-0.5 rounded-full border" style="font-size:10px;">${s.title}</span>`
            ).join('')}
            ${topic.sections.length > 2 ? `<span class="text-slate-600 text-xs">+${topic.sections.length - 2} more</span>` : ''}
          </div>
          <span class="text-indigo-400 font-semibold text-sm whitespace-nowrap">Open <span class="card-arrow">→</span></span>
        </div>
      </div>
    `;

    card.addEventListener('click', () => openTopic(topic.id));
    card.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') openTopic(topic.id); });
    grid.appendChild(card);
  });

  // Update overall progress
  const pct = Math.round((totalStarted / topics.length) * 100);
  const progressEl = document.getElementById('overallProgress');
  if (progressEl && totalStarted > 0) {
    progressEl.classList.remove('hidden');
    document.getElementById('progressLabel').textContent = `${totalStarted} / ${topics.length} topics started`;
    document.getElementById('overallFill').style.width = pct + '%';
  }
}

// ─── Init ─────────────────────────────────────────────────────────────────────
async function init() {
  try {
    const res = await fetch('/api/concepts');
    if (!res.ok) throw new Error('Failed to load topics');
    const topics = await res.json();
    renderTopicCards(topics);
  } catch (err) {
    document.getElementById('topicGrid').innerHTML =
      `<div class="col-span-full text-center text-red-400 py-20">⚠️ ${err.message}</div>`;
  }
}

init();
