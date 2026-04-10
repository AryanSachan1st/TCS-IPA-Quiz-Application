// ─── quiz.js — Quiz page logic ───────────────────────────────────────────────

// ── State ─────────────────────────────────────────────────────────────────────
let questions   = [];
let currentIdx  = 0;
let selected    = new Set();   // indices of chosen options
let answered    = false;       // has current question been checked?
let results     = [];          // { question, options, correct, chosen, isCorrect, explanation }
let sectionId   = '';
let sectionLabel = '';
const STORAGE_KEY = 'tcs_ipa_stats';

// ── Helpers ───────────────────────────────────────────────────────────────────
function getStats() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}; }
  catch { return {}; }
}

function saveResult(sectionId, correct, total) {
  const stats = getStats();
  const prev = stats[sectionId] || { attempts: 0, bestScore: null, lastScore: null };
  prev.attempts += 1;
  prev.lastScore = { correct, total };
  if (!prev.bestScore || correct > prev.bestScore.correct) {
    prev.bestScore = { correct, total };
  }
  stats[sectionId] = prev;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(stats));
}

function isMultiAnswer(q) {
  return q.correct.length > 1;
}

function arraysEqual(a, b) {
  if (a.length !== b.length) return false;
  const sa = [...a].sort(), sb = [...b].sort();
  return sa.every((v, i) => v === sb[i]);
}

// ── Navigation ────────────────────────────────────────────────────────────────
function goHome() { window.location.href = '/practice.html'; }
function retrySection() { window.location.href = `/quiz.html?section=${sectionId}`; }

// ── Render progress ───────────────────────────────────────────────────────────
function updateProgress() {
  const pct = ((currentIdx) / questions.length) * 100;
  document.getElementById('progressBar').style.width = pct + '%';
  document.getElementById('qCounter').textContent = `Q ${currentIdx + 1} / ${questions.length}`;
}

// ── Render question ───────────────────────────────────────────────────────────
function renderQuestion() {
  const q = questions[currentIdx];
  const multi = isMultiAnswer(q);
  selected = new Set();
  answered = false;

  // Type badge
  const badge = document.getElementById('typeBadge');
  if (multi) {
    badge.textContent = '✦ Multiple correct answers';
    badge.className = 'self-start text-xs font-semibold px-3 py-1 rounded-full mb-4 bg-cyan-400/10 text-cyan-400 border border-cyan-400/20';
  } else {
    badge.textContent = '◆ Single correct answer';
    badge.className = 'self-start text-xs font-semibold px-3 py-1 rounded-full mb-4 bg-indigo-400/10 text-indigo-400 border border-indigo-400/20';
  }

  document.getElementById('questionText').textContent = q.question;

  // Options
  const list = document.getElementById('optionsList');
  list.innerHTML = '';
  q.options.forEach((opt, i) => {
    const btn = document.createElement('button');
    btn.className = 'option-btn rounded-xl px-4 py-3 text-left text-sm sm:text-base text-slate-200 flex items-start gap-3 w-full';
    btn.id = `opt-${i}`;
    btn.dataset.index = i;

    // Indicator (checkbox-style square for multi, circle for single)
    const indicator = multi
      ? `<span class="indicator mt-0.5 w-5 h-5 min-w-[1.25rem] rounded border border-slate-600 flex items-center justify-center text-xs font-bold"></span>`
      : `<span class="indicator mt-0.5 w-5 h-5 min-w-[1.25rem] rounded-full border border-slate-600 flex items-center justify-center"></span>`;

    btn.innerHTML = `
      ${indicator}
      <span class="option-label">${opt}</span>
    `;

    btn.addEventListener('click', () => toggleOption(i, multi));
    list.appendChild(btn);
  });

  // Reset feedback + button
  const fb = document.getElementById('feedbackMsg');
  fb.className = 'hidden glass rounded-xl px-4 py-3 mb-4 text-sm';
  fb.textContent = '';

  const submitBtn = document.getElementById('submitBtn');
  submitBtn.textContent = 'Check Answer';
  submitBtn.disabled = true;

  // Hide card briefly for re-animation
  const card = document.getElementById('questionCard');
  card.classList.remove('animate-slide-up');
  void card.offsetWidth; // reflow
  card.classList.add('animate-slide-up');
  card.classList.remove('hidden');
  card.classList.add('flex');

  updateProgress();
}

// ── Toggle option selection ───────────────────────────────────────────────────
function toggleOption(idx, multi) {
  if (answered) return;

  if (!multi) {
    // Single: deselect all others first
    selected.forEach(prev => {
      const prevBtn = document.getElementById(`opt-${prev}`);
      if (prevBtn) {
        prevBtn.classList.remove('selected');
        prevBtn.querySelector('.indicator').innerHTML = '';
        prevBtn.querySelector('.indicator').className =
          'indicator mt-0.5 w-5 h-5 min-w-[1.25rem] rounded-full border border-slate-600 flex items-center justify-center';
      }
    });
    selected.clear();
  }

  const btn = document.getElementById(`opt-${idx}`);
  if (selected.has(idx)) {
    // Deselect
    selected.delete(idx);
    btn.classList.remove('selected');
    const ind = btn.querySelector('.indicator');
    if (multi) {
      ind.innerHTML = '';
      ind.className = 'indicator mt-0.5 w-5 h-5 min-w-[1.25rem] rounded border border-slate-600 flex items-center justify-center text-xs font-bold';
    } else {
      ind.innerHTML = '';
      ind.className = 'indicator mt-0.5 w-5 h-5 min-w-[1.25rem] rounded-full border border-slate-600 flex items-center justify-center';
    }
  } else {
    // Select
    selected.add(idx);
    btn.classList.add('selected');
    const ind = btn.querySelector('.indicator');
    if (multi) {
      ind.innerHTML = '✓';
      ind.className = 'indicator mt-0.5 w-5 h-5 min-w-[1.25rem] rounded border border-indigo-500 bg-indigo-500 flex items-center justify-center text-xs font-bold text-white';
    } else {
      ind.innerHTML = '<span class="w-2.5 h-2.5 rounded-full bg-indigo-400"></span>';
      ind.className = 'indicator mt-0.5 w-5 h-5 min-w-[1.25rem] rounded-full border border-indigo-500 flex items-center justify-center';
    }
  }

  document.getElementById('submitBtn').disabled = selected.size === 0;
}

// ── Check answer / advance ────────────────────────────────────────────────────
function handleSubmitOrNext() {
  if (!answered) {
    checkAnswer();
  } else {
    nextQuestion();
  }
}

function checkAnswer() {
  const q = questions[currentIdx];
  const chosenArr = [...selected];
  const isCorrect = arraysEqual(chosenArr, q.correct);
  answered = true;

  // Lock all options + highlight
  q.options.forEach((_, i) => {
    const btn = document.getElementById(`opt-${i}`);
    btn.classList.add('locked');
    btn.removeEventListener('click', () => {});

    const isUserChoice = selected.has(i);
    const isRightAnswer = q.correct.includes(i);

    if (isRightAnswer) {
      btn.classList.add('correct-ans');
      const ind = btn.querySelector('.indicator');
      const multi = isMultiAnswer(q);
      if (multi) {
        ind.innerHTML = '✓';
        ind.className = 'indicator mt-0.5 w-5 h-5 min-w-[1.25rem] rounded border border-emerald-500 bg-emerald-500 flex items-center justify-center text-xs font-bold text-white';
      } else {
        ind.innerHTML = '<span class="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>';
        ind.className = 'indicator mt-0.5 w-5 h-5 min-w-[1.25rem] rounded-full border border-emerald-500 flex items-center justify-center';
      }
    } else if (isUserChoice && !isRightAnswer) {
      btn.classList.add('wrong-ans');
    }
  });

  // Record result
  results.push({ question: q.question, options: q.options, correct: q.correct, chosen: chosenArr, isCorrect, explanation: q.explanation || null });

  // Feedback message
  const fb = document.getElementById('feedbackMsg');
  fb.classList.remove('hidden');
  if (isCorrect) {
    fb.className = 'glass rounded-xl px-4 py-3 mb-4 text-sm border border-emerald-500/30 bg-emerald-500/10 text-emerald-300';
    fb.innerHTML = '✅ Correct!';
  } else {
    const correctLabels = q.correct.map(i => `<strong>${q.options[i]}</strong>`).join(', ');
    fb.className = 'glass rounded-xl px-4 py-3 mb-4 text-sm border border-red-500/30 bg-red-500/10 text-red-300';
    fb.innerHTML = `❌ Incorrect. Correct: ${correctLabels}`;
  }

  // Button label
  const submitBtn = document.getElementById('submitBtn');
  submitBtn.disabled = false;
  submitBtn.textContent = currentIdx < questions.length - 1 ? 'Next Question →' : 'See Results';
}

function nextQuestion() {
  currentIdx++;
  if (currentIdx < questions.length) {
    renderQuestion();
  } else {
    showResults();
  }
}

// ── Results screen ────────────────────────────────────────────────────────────
function showResults() {
  const correct = results.filter(r => r.isCorrect).length;
  const total = results.length;
  const pct = Math.round((correct / total) * 100);
  const pass = pct >= 60;

  saveResult(sectionId, correct, total);

  // Switch views
  document.getElementById('quizView').classList.add('hidden');
  document.getElementById('resultsView').classList.remove('hidden');

  document.getElementById('resultSectionLabel').textContent = sectionLabel;
  document.getElementById('scoreDisplay').textContent = `${correct}/${total}`;
  document.getElementById('scoreSubtitle').textContent = `${pct}% — ${correct} correct out of ${total} questions`;

  // Pass/fail badge
  const badge = document.getElementById('passBadge');
  if (pass) {
    badge.className = 'inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-semibold mb-2 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30';
    badge.textContent = '🎯 Passed';
  } else {
    badge.className = 'inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-semibold mb-2 bg-red-500/20 text-red-400 border border-red-500/30';
    badge.textContent = '📚 Needs Practice';
  }

  // Animate score ring
  setTimeout(() => {
    const circumference = 364;
    const offset = circumference - (pct / 100) * circumference;
    document.getElementById('scoreRing').style.strokeDashoffset = offset;
  }, 100);

  // Progress bar full
  document.getElementById('progressBar').style.width = '100%';

  // Wrong answers review
  const wrong = results.filter(r => !r.isCorrect);
  if (wrong.length === 0) {
    document.getElementById('perfectMsg').classList.remove('hidden');
  } else {
    document.getElementById('reviewSection').classList.remove('hidden');
    const reviewList = document.getElementById('reviewList');
    reviewList.innerHTML = '';

    wrong.forEach((r, i) => {
      const correctLabels = r.correct.map(ci => r.options[ci]);
      const chosenLabels  = r.chosen.map(ci => r.options[ci]);

      const card = document.createElement('div');
      card.className = 'glass rounded-xl overflow-hidden';
      card.innerHTML = `
        <div class="review-header flex items-start justify-between gap-3 px-4 py-3 text-sm"
             onclick="toggleReview(this)" aria-expanded="false">
          <span class="text-slate-200 font-medium leading-snug">${i + 1}. ${r.question}</span>
          <svg class="chevron w-4 h-4 text-slate-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
          </svg>
        </div>
        <div class="review-body px-4 pb-4">
          <div class="border-t border-white/5 pt-3 flex flex-col gap-2 text-sm">
            <div class="flex flex-wrap gap-2">
              <span class="text-slate-500 text-xs w-full">Your answer:</span>
              ${chosenLabels.map(l => `<span class="px-2.5 py-1 rounded-lg bg-red-500/15 text-red-300 border border-red-500/25 text-xs">${l}</span>`).join('')}
            </div>
            <div class="flex flex-wrap gap-2">
              <span class="text-slate-500 text-xs w-full">Correct answer${correctLabels.length > 1 ? 's' : ''}:</span>
              ${correctLabels.map(l => `<span class="px-2.5 py-1 rounded-lg bg-emerald-500/15 text-emerald-300 border border-emerald-500/25 text-xs">${l}</span>`).join('')}
            </div>
            ${r.explanation ? `<p class="text-slate-400 text-xs mt-1 leading-relaxed border-t border-white/5 pt-2">💡 ${r.explanation}</p>` : ''}
          </div>
        </div>
      `;
      reviewList.appendChild(card);
    });
  }
}

function toggleReview(header) {
  const body = header.nextElementSibling;
  const isOpen = body.classList.contains('open');
  body.classList.toggle('open', !isOpen);
  header.classList.toggle('open', !isOpen);
  header.setAttribute('aria-expanded', !isOpen);
}

// ── Load questions & init ─────────────────────────────────────────────────────
async function init() {
  const params = new URLSearchParams(window.location.search);
  sectionId = params.get('section') || '';

  if (!sectionId) { goHome(); return; }

  try {
    // Fetch section metadata for label
    const sectRes = await fetch('/api/sections');
    const sections = await sectRes.json();
    const meta = sections.find(s => s.id === sectionId);
    sectionLabel = meta ? `${meta.icon}  ${meta.label}` : sectionId;
    document.getElementById('sectionLabel').textContent = sectionLabel;
    document.title = `${meta?.label || sectionId} Quiz — TCS IPA`;

    // Fetch (shuffled) questions
    const qRes = await fetch(`/api/questions/${sectionId}`);
    if (!qRes.ok) throw new Error('Section not found.');
    questions = await qRes.json();

    if (!questions.length) throw new Error('No questions available for this section.');

    document.getElementById('loadingView').classList.add('hidden');
    renderQuestion();
  } catch (err) {
    document.getElementById('loadingView').innerHTML =
      `<p class="text-red-400 text-sm">⚠️ ${err.message}</p>
       <button onclick="goHome()" class="mt-4 px-4 py-2 glass rounded-xl text-sm text-slate-300 hover:text-white transition">← Back to Home</button>`;
  }
}

init();
