/* ═══════════════════════════════════════════════
   UK VISA LETTER WRITER — LEARN READY
   app.js  —  All client-side logic
═══════════════════════════════════════════════ */

'use strict';

/* ══════════════════════════════════════
   STATE
══════════════════════════════════════ */
let selectedType = '';
let lastLetter   = '';
let lastTips     = [];

/* ══════════════════════════════════════
   DOM HELPERS
══════════════════════════════════════ */
const $ = (id) => document.getElementById(id);

function getVal(id) {
  return ($( id ).value || '').trim() || 'Not provided';
}

function getRadio(name) {
  const el = document.querySelector(`input[name="${name}"]:checked`);
  return el ? el.value : 'Not specified';
}

/* ══════════════════════════════════════
   FORM VALIDATION
══════════════════════════════════════ */
function checkReady() {
  const name = $('fullName').value.trim();
  const visa = $('visaType').value;
  const ties = $('ties').value.trim();
  $('generateBtn').disabled = !(selectedType && name && visa && ties);
}

// Watch required fields
['fullName', 'visaType', 'ties'].forEach((id) => {
  $(id).addEventListener('input',  checkReady);
  $(id).addEventListener('change', checkReady);
});

/* ══════════════════════════════════════
   LETTER TYPE SELECTION
══════════════════════════════════════ */
function selectType(el) {
  document.querySelectorAll('.type-card').forEach((c) => {
    c.classList.remove('selected');
    c.setAttribute('aria-pressed', 'false');
  });
  el.classList.add('selected');
  el.setAttribute('aria-pressed', 'true');
  selectedType = el.dataset.value;
  checkReady();
}

/* ══════════════════════════════════════
   GENERATE LETTER
══════════════════════════════════════ */
async function generateLetter() {
  // Build prompt
  const userPrompt = `Please write a ${selectedType} for the following applicant:

Full Name: ${getVal('fullName')}
Nationality: ${getVal('nationality')}
Current Location: ${getVal('location')}
Occupation: ${getVal('occupation')}
Employer / School: ${getVal('employer')}
Monthly Income: ${getVal('income')}
Visa Type: ${getVal('visaType')}
Purpose of Visit: ${getVal('purpose')}
Travel Dates: ${getVal('travelDates')}
Duration of Stay: ${getVal('duration')}
UK Accommodation: ${getVal('accommodation')}
UK Contact Person: ${getVal('ukContact')}
Ties to Home Country: ${getVal('ties')}
Sponsor Details: ${getVal('sponsor')}
Previous UK Visits: ${getRadio('prevVisit')}
Previous Visa Refusals: ${getRadio('refusal')}
Additional Context: ${getVal('additional')}

Write a powerful, professional letter that gives this applicant the best possible chance of UKVI approval.`;

  // Show loading state
  $('formSection').hidden  = true;
  $('resultArea').hidden   = true;
  $('loadingWrap').hidden  = false;
  window.scrollTo({ top: 0, behavior: 'smooth' });

  // Animate loading steps
  animateLoadingSteps();

  try {
    const res = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: userPrompt }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Server error: ${res.status}`);
    }

    const data = await res.json();
    const raw  = data.letter || '';

    // Parse letter and tips
    const splitIndex = raw.indexOf('LEARN_READY_TIPS:');
    const letterText = splitIndex > -1
      ? raw.substring(0, splitIndex).trim()
      : raw.trim();
    const tipsText = splitIndex > -1
      ? raw.substring(splitIndex + 'LEARN_READY_TIPS:'.length)
      : '';

    const tips = tipsText
      .split('TIP:')
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    lastLetter = letterText;
    lastTips   = tips;

    showResult(letterText, tips);
  } catch (e) {
    resetLoadingSteps();
    $('loadingWrap').hidden  = true;
    $('formSection').hidden  = false;
    showError(`Could not generate letter. Please try again.\n\nError: ${e.message}`);
  }
}

/* ══════════════════════════════════════
   SHOW RESULT
══════════════════════════════════════ */
function showResult(letter, tips) {
  const wordCount = letter.split(/\s+/).filter((w) => w.length > 0).length;

  $('rBadgeType').textContent  = `✉️ ${selectedType}`;
  $('rBadgeVisa').textContent  = `🇬🇧 ${$('visaType').value || 'UK Visa'}`;
  $('rBadgeWords').textContent = `📝 ~${wordCount} words`;
  $('rName').textContent       = $('fullName').value || 'Applicant';

  $('letterOutput').textContent = letter;

  $('tipsList').innerHTML = tips
    .map(
      (tip, i) => `
      <div class="tip-item">
        <div class="tip-num">${i + 1}</div>
        <div>${escapeHTML(tip)}</div>
      </div>`
    )
    .join('');

  $('loadingWrap').hidden = true;
  $('resultArea').hidden  = false;
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* ══════════════════════════════════════
   ACTIONS
══════════════════════════════════════ */
function copyLetter() {
  if (!lastLetter) return;
  navigator.clipboard.writeText(lastLetter).then(() => {
    const msg = $('copiedMsg');
    msg.textContent = '✓ Letter copied to clipboard!';
    setTimeout(() => { msg.textContent = ''; }, 3000);
  });
}

function downloadLetter() {
  if (!lastLetter) return;
  const visaType = $('visaType').value.replace(/\s+/g, '_') || 'Visa';
  const filename = `LearnReady_${selectedType.replace(/\s+/g, '_')}_${visaType}.txt`;
  const blob = new Blob([lastLetter], { type: 'text/plain' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

async function regenerateLetter() {
  resetLoadingSteps();
  $('resultArea').hidden = true;
  await generateLetter();
}

function restartTool() {
  document.querySelectorAll('.form-input, .form-select, .form-textarea').forEach(
    (el) => { el.value = ''; }
  );
  document.querySelectorAll('input[type=radio]').forEach((r) => { r.checked = false; });
  document.querySelectorAll('.type-card').forEach((c) => {
    c.classList.remove('selected');
    c.setAttribute('aria-pressed', 'false');
  });

  resetLoadingSteps();
  selectedType = '';
  lastLetter   = '';
  lastTips     = [];

  $('generateBtn').disabled = true;
  $('resultArea').hidden    = true;
  $('formSection').hidden   = false;
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* ══════════════════════════════════════
   LOADING ANIMATION
══════════════════════════════════════ */
function animateLoadingSteps() {
  const steps = ['ls1', 'ls2', 'ls3', 'ls4'];
  let s = 0;

  function nextStep() {
    if (s > 0) {
      const prev = $(steps[s - 1]);
      prev.classList.remove('visible');
      prev.classList.add('done');
    }
    if (s < steps.length) {
      $(steps[s]).classList.add('visible');
      s++;
      setTimeout(nextStep, 900);
    }
  }

  nextStep();
}

function resetLoadingSteps() {
  ['ls1', 'ls2', 'ls3', 'ls4'].forEach((id) => {
    $(id).classList.remove('visible', 'done');
  });
}

/* ══════════════════════════════════════
   UTILITIES
══════════════════════════════════════ */
function escapeHTML(str) {
  return str
    .replace(/&/g,  '&amp;')
    .replace(/</g,  '&lt;')
    .replace(/>/g,  '&gt;')
    .replace(/"/g,  '&quot;')
    .replace(/'/g,  '&#039;');
}

function showError(msg) {
  // Simple accessible error — replace with a modal if desired
  alert(msg);
}
