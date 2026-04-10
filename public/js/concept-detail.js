// ─── concept-detail.js — Individual topic concept page ────────────────────────

const CONCEPTS_READ_KEY = 'tcs_ipa_concepts_read';
const params  = new URLSearchParams(window.location.search);
const topicId = params.get('topic');

function getReadSet() {
  try {
    const all = JSON.parse(localStorage.getItem(CONCEPTS_READ_KEY)) || {};
    return new Set(all[topicId] || []);
  } catch { return new Set(); }
}

function saveReadSet(set) {
  try {
    const all = JSON.parse(localStorage.getItem(CONCEPTS_READ_KEY)) || {};
    all[topicId] = [...set];
    localStorage.setItem(CONCEPTS_READ_KEY, JSON.stringify(all));
  } catch {}
}

let readSet    = getReadSet();
let totalSects = 0;

function updateProgressUI() {
  const readCount = readSet.size;
  document.getElementById('readCount').textContent  = readCount;
  document.getElementById('totalCount').textContent = totalSects;
  const pct = totalSects ? (readCount / totalSects) * 100 : 0;
  document.getElementById('readProgressBar').style.width = pct + '%';

  // Top progress strip
  document.getElementById('topProgressStrip').style.transform = `scaleX(${pct / 100})`;
}

function toggleReadState(sectionTitle, btn) {
  if (readSet.has(sectionTitle)) {
    readSet.delete(sectionTitle);
    btn.textContent = 'Mark read';
    btn.classList.remove('done');
  } else {
    readSet.add(sectionTitle);
    btn.textContent = '✓ Read';
    btn.classList.add('done');
  }
  saveReadSet(readSet);
  updateProgressUI();
}

function toggleAccordion(header, body, item) {
  const isOpen = body.classList.contains('open');
  // Close all
  document.querySelectorAll('.accordion-body.open').forEach(b => b.classList.remove('open'));
  document.querySelectorAll('.accordion-header.open').forEach(h => h.classList.remove('open'));
  document.querySelectorAll('.accordion-item.open').forEach(it => it.classList.remove('open'));
  // Open clicked if it was closed
  if (!isOpen) {
    body.classList.add('open');
    header.classList.add('open');
    item.classList.add('open');
  }
}

function expandAll() {
  document.querySelectorAll('.accordion-body').forEach(b => b.classList.add('open'));
  document.querySelectorAll('.accordion-header').forEach(h => h.classList.add('open'));
  document.querySelectorAll('.accordion-item').forEach(it => it.classList.add('open'));
}

function renderTopic(topic) {
  // Meta
  document.title = `${topic.label} — TCS IPA Concepts`;
  document.getElementById('topicTitle').textContent = topic.label;
  document.getElementById('topicIconBox').textContent = topic.icon;
  document.getElementById('breadcrumbTopic').textContent = `/ ${topic.label}`;
  totalSects = topic.sections.length;
  updateProgressUI();

  const list = document.getElementById('accordionList');
  list.innerHTML = '';

  topic.sections.forEach((section, i) => {
    const isRead   = readSet.has(section.title);
    const hasContent = section.content && section.content.trim().length > 0;

    const item = document.createElement('div');
    item.className = 'accordion-item glass';

    const header = document.createElement('button');
    header.className = 'accordion-header';
    header.setAttribute('aria-expanded', 'false');
    header.innerHTML = `
      <div class="flex items-center gap-3 flex-1 min-w-0">
        <span class="section-num">${i + 1}</span>
        <span class="font-semibold text-white text-sm truncate">${section.title}</span>
      </div>
      <div class="flex items-center gap-3 ml-3 flex-shrink-0">
        <button
          class="read-toggle ${isRead ? 'done' : ''}"
          onclick="event.stopPropagation(); toggleReadState('${section.title.replace(/'/g, "\\'")}', this)"
          aria-label="Mark ${section.title} as read"
        >${isRead ? '✓ Read' : 'Mark read'}</button>
        <svg class="chevron w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
        </svg>
      </div>
    `;

    const body = document.createElement('div');
    body.className = 'accordion-body';

    if (hasContent) {
      body.innerHTML = `<p class="content-text">${escapeHtml(section.content)}</p>`;
    } else {
      body.innerHTML = `
        <p class="content-empty">
          📝 Content coming soon — this section is being filled in.
        </p>`;
    }

    header.addEventListener('click', () => toggleAccordion(header, body, item));
    item.appendChild(header);
    item.appendChild(body);
    list.appendChild(item);

    // Stagger animation
    item.style.cssText = `opacity:0; animation: slideUp 0.35s ease ${i * 50}ms forwards;`;
  });
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// ─── Init ─────────────────────────────────────────────────────────────────────
async function init() {
  if (!topicId) {
    window.location.href = '/concepts.html';
    return;
  }

  try {
    const res = await fetch(`/api/concepts/${topicId}`);
    if (!res.ok) throw new Error('Topic not found');
    const topic = await res.json();
    renderTopic(topic);
  } catch (err) {
    document.getElementById('accordionList').innerHTML =
      `<div class="glass rounded-2xl p-8 text-center text-red-400">⚠️ ${err.message}</div>`;
  }
}

init();
