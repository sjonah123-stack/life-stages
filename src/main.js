// Firebase v10 modular SDK — direct imports.
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import {
  getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect,
  getRedirectResult, signOut as fbSignOut, onAuthStateChanged
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import {
  getFirestore, doc, setDoc, getDoc, serverTimestamp
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

// App config + data tables + utilities live in their own modules.
import {
  LIFESPAN, SLIDER_MAX, DEFAULT_DOB, DEFAULT_SEX, DEFAULT_THEME,
  FIREBASE_CONFIG, PRIVATE_URL_PARAMS, MOOD_OPTIONS
} from './config.js';
import {
  COUNTRY_NOTES, CAREER_FIELDS, PARTNERSHIP_NOTES,
  RELATION_LABEL, PROMPTS, FREQ_LABEL, STAGES, getStage
} from './data.js';
import {
  daysBetween, ageInYears, ageOnDate, parseDOB, formatDOB, prettyDOB,
  formatNum, escapeHtml, readLS, writeLS
} from './utils.js';

  // ---- State ----
  let BIRTHDATE, todayAge, daysLived, weeksLived;
  let sex, country, partnership, kids, careerField, retirementAge, theme;
  // Private (localStorage only)
  let smoker, exerciseLevel, sleepHours, familyLongevity;
  let milestones = [];
  let journal = {}; // {YYYY-MM-DD : entry text}
  // Wave 3
  let priorities = []; // up to 3 dim keys: career, love, health, money, growth
  let bestYear = 0;     // 0 means unset
  let hardestYear = 0;  // 0 means unset
  let letters = {};     // {40: text, 60: text, 80: text}
  let places = [];      // [{name, displayName, lat, lng, year, note}]
  // Phase A modules
  let people = [];      // [{name, relation, dob (YYYY-MM-DD or ''), note}]
  let books = [];       // [{title, author, age, takeaway}]
  let rituals = [];     // [{name, frequency (per year)}]
  // Auth/sync (Phase 1) — Firebase
  let fbAuth = null;
  let fbDB = null;
  let currentUser = null;
  let saveTimer = null;
  let lastCloudVersion = 0;
  function getCareerCallout(age) {
    if (!careerField || !CAREER_FIELDS[careerField]) return null;
    const bucket = age < 30 ? 'young' : (age < 55 ? 'mid' : 'late');
    return CAREER_FIELDS[careerField][bucket];
  }

  // ---- Personal expected horizon ----
  function computePersonalHorizon() {
    let base = 90;
    if (country && COUNTRY_NOTES[country]) {
      const exp = COUNTRY_NOTES[country].lifeExp;
      base = sex === 'female' ? exp.female : exp.male;
    }
    let adj = 0;
    if (smoker === 'current') adj -= 9;
    else if (smoker === 'quit') adj -= 2;
    if (exerciseLevel === 'never') adj -= 2;
    else if (exerciseLevel === 'regularly') adj += 4;
    else if (exerciseLevel === 'often') adj += 6;
    if (sleepHours) {
      if (sleepHours < 6) adj -= 2;
      else if (sleepHours < 7) adj -= 1;
      else if (sleepHours >= 9) adj += 1;
    }
    if (familyLongevity) {
      const off = familyLongevity - 80;
      adj += Math.max(-5, Math.min(5, off / 4));
    }
    const result = Math.round(base + adj);
    return Math.max(40, Math.min(110, result)); // sanity clamp
  }
  function updateHorizonDisplay() {
    const horizon = computePersonalHorizon();
    document.getElementById('horizonNum').textContent = horizon;
    return horizon;
  }
  function getLoveCallout(age) {
    const parts = [];
    if (partnership && PARTNERSHIP_NOTES[partnership]) parts.push(PARTNERSHIP_NOTES[partnership]);
    if (kids > 0) {
      // Approximate kid age at the selected age, assuming kids born around current age
      const kidAgeNow = 0; // We don't ask for kid age; assume newborn-ish for now
      const kidAgeAtSelected = (age - todayAge) + kidAgeNow;
      if (kidAgeAtSelected >= 0 && kidAgeAtSelected <= 100) {
        const kidCount = kids === 1 ? "your child" : `your ${kids} kids`;
        if (age <= todayAge) {
          parts.push(`With ${kids} kid${kids>1?'s':''}, the next chapters of life have a different shape — equal parts harder and richer in ways that aren't captured in averages.`);
        } else {
          parts.push(`If your kid${kids>1?'s are':' is'} small now, ${kidCount} will be roughly ${kidAgeAtSelected} when you're ${age}. The years go faster than anyone tells you.`);
        }
      }
    }
    return parts.join(" ");
  }

  function recomputePersonal(dob) {
    BIRTHDATE = dob;
    const now = new Date();
    todayAge = ageInYears(now, dob);
    daysLived = daysBetween(dob, now);
    weeksLived = Math.floor(daysLived / 7);
  }
  // ---- Slider wiring ----
  const slider = document.getElementById('ageSlider');
  const subtitle = document.getElementById('subtitle');
  const dobInput = document.getElementById('dobInput');
  const copyBtn = document.getElementById('copyShare');
  const sexButtons = document.querySelectorAll('.sex-toggle button');
  const themeButtons = document.querySelectorAll('.theme-picker button');
  const countryInput = document.getElementById('countryInput');
  const partnershipInput = document.getElementById('partnershipInput');
  const kidsInput = document.getElementById('kidsInput');
  const careerInput = document.getElementById('careerInput');
  const retirementInput = document.getElementById('retirementInput');
  dobInput.max = formatDOB(new Date());

  function markerPosition(age) {
    const pct = Math.max(0, Math.min(100, (age / SLIDER_MAX) * 100));
    return `calc(${pct}% + ${(0.5 - pct/100) * 28}px)`;
  }
  function setNowMarker() {
    const marker = document.getElementById('nowMarker');
    if (todayAge < 0 || todayAge > SLIDER_MAX) { marker.style.display = 'none'; return; }
    marker.style.display = '';
    marker.style.left = markerPosition(todayAge);
  }
  function setRetirementMarker() {
    const marker = document.getElementById('retirementMarker');
    if (!retirementAge || retirementAge < 1 || retirementAge > SLIDER_MAX) {
      marker.style.display = 'none'; return;
    }
    marker.style.display = '';
    marker.style.left = markerPosition(retirementAge);
  }
  function applyTheme(t) {
    theme = t || DEFAULT_THEME;
    document.body.classList.remove('theme-sunrise', 'theme-ocean', 'theme-forest');
    document.body.classList.add('theme-' + theme);
    themeButtons.forEach(b => b.classList.toggle('active', b.dataset.theme === theme));
  }

  function update() {
    const age = parseInt(slider.value, 10);
    const stage = getStage(age);
    const isToday = age === todayAge;
    const isPast = age < todayAge;

    document.getElementById('ageNum').textContent = age;
    document.getElementById('stagePill').textContent = stage.name;
    document.getElementById('poeticLine').textContent = stage.poetic || "";

    let ageLabel, pastLabel, ahead1Label, ahead2Label;
    if (isToday) {
      ageLabel = "Right now"; pastLabel = "Sunrises witnessed";
      ahead1Label = "Weekends ahead"; ahead2Label = "Seasons ahead";
    } else if (isPast) {
      ageLabel = "Age (past)"; pastLabel = "Sunrises by then";
      ahead1Label = "Weekends that lay ahead"; ahead2Label = "Seasons that lay ahead";
    } else {
      ageLabel = "Age (future)"; pastLabel = "Sunrises by then";
      ahead1Label = "Weekends still ahead"; ahead2Label = "Seasons still ahead";
    }
    document.getElementById('stat-label-age').textContent = ageLabel;
    document.getElementById('stat-label-past').textContent = pastLabel;
    document.getElementById('stat-label-ahead1').textContent = ahead1Label;
    document.getElementById('stat-label-ahead2').textContent = ahead2Label;

    const horizon = updateHorizonDisplay();
    const sunrises = age * 365;
    const aheadYears = Math.max(0, horizon - age);
    const weekendsAhead = aheadYears * 52;
    const seasonsAhead = aheadYears * 4;

    document.getElementById('stat-age').innerHTML = age + '<span class="unit">yrs</span>';
    document.getElementById('stat-past').innerHTML = formatNum(sunrises);
    document.getElementById('stat-ahead1').innerHTML = formatNum(weekendsAhead);
    document.getElementById('stat-ahead2').innerHTML = formatNum(seasonsAhead);

    // Texture
    const textureTitle = document.getElementById('texture-title');
    if (isPast) textureTitle.textContent = "What you'd already gathered by then";
    else if (isToday) textureTitle.textContent = "What's still ahead from right now";
    else textureTitle.textContent = "What's still ahead at this age";
    const items = computeTexture(age, isPast, horizon);
    document.getElementById('textureGrid').innerHTML = items.map(it => `
      <div class="texture-item">
        <div class="texture-emoji">${it.emoji}</div>
        <div>
          <div class="texture-num">~${formatNum(it.num)}</div>
          <div class="texture-desc">${it.desc}</div>
        </div>
      </div>`).join('');

    // Cards
    document.querySelectorAll('.card').forEach(card => {
      const key = card.dataset.dim;
      let data;
      if (key === 'health') {
        const h = stage.health;
        data = h[sex] || h.common;
      } else {
        data = stage[key];
      }
      card.querySelector('[data-field=headline]').textContent = data.h;
      card.querySelector('[data-field=body]').textContent = data.b;
      // Callouts (career & love only)
      const callout = card.querySelector('[data-field=callout]');
      if (callout) {
        let text = '';
        if (key === 'career') text = getCareerCallout(age) || '';
        else if (key === 'love') text = getLoveCallout(age) || '';
        const span = callout.querySelector('[data-field=callout-text]');
        if (text) {
          span.textContent = text;
          callout.classList.remove('empty');
        } else {
          callout.classList.add('empty');
        }
      }
    });

    document.getElementById('goodNewsText').textContent = stage.goodNews;

    // Priority cards: highlight & re-order
    document.querySelectorAll('.card').forEach(card => {
      card.classList.toggle('priority', priorities.includes(card.dataset.dim));
    });

    // Year tag callout
    const yearCallout = document.getElementById('yearTagCallout');
    if (bestYear && age === bestYear) {
      document.getElementById('yearTagEmoji').textContent = '✨';
      document.getElementById('yearTagText').innerHTML =
        `<strong>You named this your best year so far.</strong> Whatever made it shine — the people, the place, what you were doing — that was the recipe. Worth remembering.`;
      yearCallout.hidden = false;
    } else if (hardestYear && age === hardestYear) {
      document.getElementById('yearTagEmoji').textContent = '💪';
      document.getElementById('yearTagText').innerHTML =
        `<strong>You named this your hardest year — and you made it.</strong> Look at that. The version of you that came out the other side is the one reading this.`;
      yearCallout.hidden = false;
    } else {
      yearCallout.hidden = true;
    }

    // Future-self letter display (when slider lands within ±1 of 40, 60, 80)
    const letterDisplay = document.getElementById('letterDisplay');
    const milestone = [40, 60, 80].find(a => Math.abs(a - age) <= 1);
    if (milestone && letters[milestone]) {
      document.getElementById('letterDisplayAge').textContent = milestone;
      document.getElementById('letterDisplayText').textContent = letters[milestone];
      letterDisplay.hidden = false;
    } else {
      letterDisplay.hidden = true;
    }

    const livedPct = (Math.min(age, SLIDER_MAX) / SLIDER_MAX) * 100;
    slider.style.setProperty('--lived-pct', `${livedPct}%`);

    updateWeeks(age);
  }

  function computeTexture(age, isPast, horizon) {
    const aheadYears = Math.max(0, (horizon || SLIDER_MAX) - age);
    if (isPast) {
      return [
        { emoji: '🌅', num: age * 365, desc: 'sunrises witnessed' },
        { emoji: '📚', num: Math.max(0, age - 6) * 12, desc: 'books finished, give or take' },
        { emoji: '🎵', num: age * 365 * 1.5, desc: 'songs heard for the first time' },
        { emoji: '😄', num: age * 365 * 15, desc: 'belly laughs (humans avg ~15/day)' },
      ];
    }
    return [
      { emoji: '🌄', num: aheadYears * 365, desc: 'mornings still to come' },
      { emoji: '📅', num: aheadYears * 52, desc: 'weekends to fill' },
      { emoji: '🍂', num: aheadYears * 4, desc: 'season changes ahead' },
      { emoji: '🎂', num: aheadYears, desc: 'birthday cakes still to blow out' },
    ];
  }

  // ---- Weeks grid ----
  const weeksGrid = document.getElementById('weeksGrid');
  const weekEls = [];
  for (let y = 0; y < LIFESPAN; y++) {
    for (let w = 0; w < 52; w++) {
      const el = document.createElement('div');
      el.className = 'week';
      el.dataset.year = y;
      weeksGrid.appendChild(el);
      weekEls.push(el);
    }
  }
  function paintWeeksByDOB() {
    weekEls.forEach((el, i) => {
      el.classList.remove('lived', 'now');
      if (i < weeksLived) el.classList.add('lived');
      else if (i === weeksLived) el.classList.add('now');
    });
  }
  let lastSelectedYear = -1;
  function updateWeeks(age) {
    if (lastSelectedYear === age) return;
    if (lastSelectedYear !== -1) {
      for (let w = 0; w < 52; w++) {
        const el = weekEls[lastSelectedYear * 52 + w];
        if (el) el.classList.remove('selected-stage');
      }
    }
    if (age >= 0 && age < LIFESPAN) {
      for (let w = 0; w < 52; w++) {
        const el = weekEls[age * 52 + w];
        if (el) el.classList.add('selected-stage');
      }
    }
    lastSelectedYear = age;
  }

  // ---- Milestones ----
  function loadMilestones() {
    const url = new URL(window.location.href).searchParams.get('m');
    if (url) {
      try {
        return url.split(',').map(s => {
          const parts = s.split(':');
          const age = parseInt(parts[0], 10);
          // Last segment may be 0/1 completion flag — if it's '0' or '1' treat as flag
          let completed = false;
          let labelParts = parts.slice(1);
          if (labelParts.length > 1 && (labelParts[labelParts.length - 1] === '0' || labelParts[labelParts.length - 1] === '1')) {
            completed = labelParts.pop() === '1';
          }
          return { age, label: decodeURIComponent(labelParts.join(':')), completed };
        }).filter(m => !isNaN(m.age) && m.label);
      } catch (e) {}
    }
    try {
      const raw = localStorage.getItem('lifeStages.milestones');
      if (raw) {
        const arr = JSON.parse(raw);
        return arr.map(m => ({ age: m.age, label: m.label, completed: !!m.completed }));
      }
    } catch (e) {}
    return [];
  }
  function saveMilestones() {
    try { localStorage.setItem('lifeStages.milestones', JSON.stringify(milestones)); } catch (e) {}
  }
  function renderMilestones() {
    const list = document.getElementById('milestoneList');
    if (milestones.length === 0) {
      list.innerHTML = '<div class="milestone-empty">Nothing yet — what are you looking forward to?</div>';
    } else {
      list.innerHTML = milestones.map((m, i) => `
        <span class="milestone-chip${m.completed ? ' done' : ''}">
          <span class="age">${m.age}</span>
          <span class="label">${escapeHtml(m.label)}</span>
          <button class="remove" data-idx="${i}" title="Remove">×</button>
        </span>`).join('');
      list.querySelectorAll('.remove').forEach(btn => {
        btn.addEventListener('click', () => {
          milestones.splice(parseInt(btn.dataset.idx, 10), 1);
          saveMilestones(); syncURL(); renderMilestones(); renderMilestonePins();
        });
      });
    }
  }
  // ---- Journal ----
  const JOURNAL_KEY = 'lifeStages.journal';
  function loadJournal() {
    try {
      const raw = localStorage.getItem(JOURNAL_KEY);
      journal = raw ? (JSON.parse(raw) || {}) : {};
    } catch (e) { journal = {}; }
  }
  function saveJournalToLS() {
    try { localStorage.setItem(JOURNAL_KEY, JSON.stringify(journal)); } catch (e) {}
  }
  function weekStartDate(weekIndex) {
    if (!BIRTHDATE) return new Date();
    return new Date(BIRTHDATE.getTime() + weekIndex * 7 * 86400000);
  }
  function weekKey(weekIndex) { return formatDOB(weekStartDate(weekIndex)); }
  function weekRangeStr(weekIndex) {
    const start = weekStartDate(weekIndex);
    const end = new Date(start.getTime() + 6 * 86400000);
    const sameYear = start.getFullYear() === end.getFullYear();
    const startOpts = { month: 'short', day: 'numeric' };
    const endOpts = { month: 'short', day: 'numeric', year: 'numeric' };
    return `${start.toLocaleDateString(undefined, startOpts)} – ${end.toLocaleDateString(undefined, sameYear ? endOpts : endOpts)}`;
  }
  function ageAtWeek(weekIndex) {
    const d = weekStartDate(weekIndex);
    return ageInYears(d, BIRTHDATE);
  }
  function paintJournalDots() {
    if (!BIRTHDATE) return;
    weekEls.forEach((el, i) => {
      const k = weekKey(i);
      const e = getEntry(k);
      const has = !!(e.text && e.text.trim()) || !!e.photo;
      el.classList.toggle('has-entry', has && !!(e.text && e.text.trim()));
      el.classList.toggle('has-photo', !!e.photo);
    });
  }
  // Filter state for the entries feed
  let feedYearFilter = 'all';
  let feedMoodFilter = 'all';
  let feedSearchQuery = '';  function renderRecentJournal() {
    const feed = document.getElementById('entriesFeed');
    const countLabel = document.getElementById('journalCount');
    const feedCount = document.getElementById('feedCount');
    const yearFilterEl = document.getElementById('yearFilter');
    const moodFilterEl = document.getElementById('moodFilter');
    if (!feed || !BIRTHDATE) return;
    const allEntries = Object.entries(journal)
      .map(([k, v]) => [k, getEntry(k)])
      .filter(([k, e]) => (e.text && e.text.trim()) || e.photo)
      .sort((a, b) => b[0].localeCompare(a[0]));
    const total = Object.keys(journal).length;
    if (countLabel) countLabel.textContent = `${total} ${total === 1 ? 'entry' : 'entries'}`;
    // Year filter chips
    const yearsSet = new Set();
    allEntries.forEach(([k]) => {
      const d = parseDOB(k);
      if (d) yearsSet.add(d.getFullYear());
    });
    const years = [...yearsSet].sort((a, b) => b - a);
    if (yearFilterEl) {
      yearFilterEl.innerHTML = (years.length > 1)
        ? [`<button class="year-chip${feedYearFilter==='all'?' active':''}" data-year="all">All</button>`]
            .concat(years.map(y => `<button class="year-chip${String(feedYearFilter)===String(y)?' active':''}" data-year="${y}">${y}</button>`))
            .join('')
        : '';
      yearFilterEl.querySelectorAll('.year-chip').forEach(btn => {
        btn.addEventListener('click', () => {
          feedYearFilter = btn.dataset.year === 'all' ? 'all' : parseInt(btn.dataset.year, 10);
          renderRecentJournal();
        });
      });
    }
    // Mood filter chips — only show if at least 2 entries have moods
    const moodsPresent = new Set();
    allEntries.forEach(([k, e]) => { if (e.mood) moodsPresent.add(e.mood); });
    if (moodFilterEl) {
      if (moodsPresent.size >= 2 || (feedMoodFilter !== 'all')) {
        const moodsToShow = MOOD_OPTIONS.filter(m => moodsPresent.has(m));
        moodFilterEl.innerHTML = [`<button class="year-chip${feedMoodFilter==='all'?' active':''}" data-mood="all">Any mood</button>`]
          .concat(moodsToShow.map(m => `<button class="year-chip${feedMoodFilter===m?' active':''}" data-mood="${m}">${m}</button>`))
          .join('');
        moodFilterEl.querySelectorAll('.year-chip').forEach(btn => {
          btn.addEventListener('click', () => {
            feedMoodFilter = btn.dataset.mood === 'all' ? 'all' : btn.dataset.mood;
            renderRecentJournal();
          });
        });
      } else {
        moodFilterEl.innerHTML = '';
      }
    }
    // Apply filters
    const q = feedSearchQuery.trim().toLowerCase();
    const visibleEntries = allEntries.filter(([k, e]) => {
      if (feedYearFilter !== 'all') {
        const d = parseDOB(k);
        if (!d || d.getFullYear() !== feedYearFilter) return false;
      }
      if (feedMoodFilter !== 'all' && e.mood !== feedMoodFilter) return false;
      if (q && !(e.text || '').toLowerCase().includes(q)) return false;
      return true;
    });
    if (feedCount) feedCount.textContent = visibleEntries.length;
    if (visibleEntries.length === 0) {
      let msg;
      if (total === 0) {
        msg = 'No entries yet. Write your first one above — even a single sentence becomes precious in 10 years.';
      } else if (q) {
        msg = `No entries match "${escapeHtml(q)}". Try another search.`;
      } else {
        msg = 'No entries match those filters. Try resetting them.';
      }
      feed.innerHTML = `<div class="entries-empty">${msg}</div>`;
      return;
    }
    feed.innerHTML = visibleEntries.map(([key, e]) => {
      const d = parseDOB(key);
      const weekIdx = Math.floor((d - BIRTHDATE) / (7 * 86400000));
      const age = ageInYears(d, BIRTHDATE);
      const dateStr = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
      const photoHTML = e.photo
        ? `<img class="photo-thumb" src="${e.photo}" alt="" />`
        : `<div class="photo-placeholder">📝</div>`;
      const previewText = e.text && e.text.trim()
        ? escapeHtml(e.text)
        : '(photo only)';
      const previewClass = (e.text && e.text.trim()) ? '' : ' italic';
      const moodHTML = e.mood ? `<span class="mood-emoji" title="Mood">${e.mood}</span>` : '';
      return `<div class="entry-card" data-key="${key}">
        ${photoHTML}
        <div class="body">
          <div class="meta">
            <span class="date">${dateStr}</span>
            <span class="age-pill">Age ${age}</span>
            ${moodHTML}
          </div>
          <div class="preview${previewClass}">${previewText}</div>
        </div>
        <div class="actions">
          <button class="edit" data-key="${key}" title="Edit this entry">Edit</button>
          <button class="delete" data-key="${key}" title="Delete this entry">Delete</button>
        </div>
      </div>`;
    }).join('');
    // Edit button → load into composer
    feed.querySelectorAll('.entry-card .edit').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const key = btn.dataset.key;
        const d = parseDOB(key);
        if (d) composerLoadForDate(d, true);
      });
    });
    // Delete button → confirm then remove
    feed.querySelectorAll('.entry-card .delete').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const key = btn.dataset.key;
        if (!confirm('Delete this entry permanently? This can\'t be undone.')) return;
        delete journal[key];
        saveJournalToLS();
        paintJournalDots();
        renderRecentJournal();
        renderJournalPulse();
        scheduleCloudSave();
        // If composer was showing this entry, reset it
        const composerDate = document.getElementById('composerDate');
        if (composerDate && composerDate.value === key) {
          composerLoadForDate(new Date(), false);
        }
      });
    });
    // Click anywhere on card body (not buttons) → also edit
    feed.querySelectorAll('.entry-card').forEach(el => {
      el.addEventListener('click', (e) => {
        if (e.target.closest('.actions')) return;
        const key = el.dataset.key;
        const d = parseDOB(key);
        if (d) composerLoadForDate(d, true);
      });
    });
  }
  let lastPromptIdx = -1;
  function pickPrompt() {
    if (PROMPTS.length === 0) return '';
    let idx;
    do { idx = Math.floor(Math.random() * PROMPTS.length); }
    while (PROMPTS.length > 1 && idx === lastPromptIdx);
    lastPromptIdx = idx;
    return PROMPTS[idx];
  }
  function refreshPrompt() {
    const span = document.getElementById('promptText');
    if (span) span.textContent = pickPrompt();
  }
  function updatePromptVisibility() {
    const chip = document.getElementById('composerPromptChip');
    const text = document.getElementById('composerText');
    if (!chip || !text) return;
    chip.hidden = !!text.value.trim();
  }

  // ---- Word count + read time ----
  function updateWordCount() {
    const text = document.getElementById('composerText');
    const meter = document.getElementById('composerMeter');
    if (!text || !meter) return;
    const value = text.value.trim();
    if (!value) {
      meter.style.display = 'none';
      meter.textContent = '';
      return;
    }
    const words = value.split(/\s+/).filter(Boolean).length;
    const minutes = Math.max(1, Math.round(words / 220));
    meter.style.display = '';
    meter.textContent = `${words} ${words === 1 ? 'word' : 'words'} · ${minutes} min read`;
  }

  // ---- Streak ----
  function computeStreak() {
    if (!BIRTHDATE) return { current: 0, best: 0 };
    const todayWeekIdx = currentWeekIndex();
    const hasEntry = (i) => {
      if (i < 0) return false;
      const e = getEntry(weekKey(i));
      return !!(e.text && e.text.trim());
    };
    // Current streak: count back from current week, but give grace if current week empty
    let current = 0;
    let i = todayWeekIdx;
    if (!hasEntry(i)) i--; // grace: skip the current week if blank
    while (hasEntry(i)) { current++; i--; }
    // Best: scan all weeks
    let best = 0, run = 0;
    for (let j = 0; j <= todayWeekIdx; j++) {
      if (hasEntry(j)) {
        run++;
        if (run > best) best = run;
      } else {
        run = 0;
      }
    }
    return { current, best };
  }

  // ---- Anniversary lookup ----
  function findOldestAnniversary() {
    if (!BIRTHDATE) return null;
    const todayWeekStart = dateToWeekStart(new Date());
    const yearsToCheck = [10, 5, 2, 1];
    for (const y of yearsToCheck) {
      const target = new Date(todayWeekStart);
      target.setFullYear(target.getFullYear() - y);
      const ws = dateToWeekStart(target);
      const days = Math.floor((ws - BIRTHDATE) / 86400000);
      const weekIdx = Math.floor(days / 7);
      if (weekIdx < 0) continue;
      const key = weekKey(weekIdx);
      const e = getEntry(key);
      if ((e.text && e.text.trim()) || e.photo) {
        return { yearsAgo: y, key, entry: e, weekIdx, date: ws };
      }
    }
    return null;
  }

  // ---- Pulse banner: streak + anniversary ----
  function renderJournalPulse() {
    const pulse = document.getElementById('journalPulse');
    if (!pulse || !BIRTHDATE) return;
    const { current, best } = computeStreak();
    const ann = findOldestAnniversary();
    let html = '';
    if (current === 0) {
      html += `<div class="streak-card">
        <span class="streak-icon">✨</span>
        <div>
          <div class="streak-label">Start a streak</div>
          <div class="streak-meta">Any entry this week begins it.</div>
        </div>
      </div>`;
    } else {
      const bestLine = best > current ? `Best: ${best} ${best === 1 ? 'week' : 'weeks'}` : `New best!`;
      html += `<div class="streak-card">
        <span class="streak-icon">🔥</span>
        <div>
          <div class="streak-label">${current} week streak</div>
          <div class="streak-meta">${bestLine}</div>
        </div>
      </div>`;
    }
    if (ann) {
      const age = ageInYears(ann.date, BIRTHDATE);
      const dateStr = ann.date.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' });
      const raw = (ann.entry.text && ann.entry.text.trim()) ? ann.entry.text : '(photo entry)';
      const cap = 160;
      const preview = raw.length > cap ? raw.slice(0, cap) + '…' : raw;
      const yLabel = ann.yearsAgo === 1 ? '1 year ago this week' : `${ann.yearsAgo} years ago this week`;
      html += `<div class="anniversary-card" data-key="${ann.key}">
        <div class="years-ago">${yLabel}</div>
        <div class="anniversary-meta">${dateStr} · Age ${age}</div>
        <div class="anniversary-preview">"${escapeHtml(preview)}"</div>
      </div>`;
    } else {
      html += `<div class="anniversary-card" style="cursor:default;opacity:0.7">
        <div class="years-ago">No anniversaries yet</div>
        <div class="anniversary-meta">In a year, an entry from this week will surface here.</div>
        <div class="anniversary-preview">Keep writing — the magic compounds.</div>
      </div>`;
    }
    pulse.innerHTML = html;
    const annEl = pulse.querySelector('.anniversary-card[data-key]');
    if (annEl) {
      annEl.addEventListener('click', () => {
        const d = parseDOB(annEl.dataset.key);
        if (d) composerLoadForDate(d, true);
      });
    }
  }

  // ---- Mood selector UI ----
  function updateMoodUI() {
    document.querySelectorAll('#composerMood button').forEach(btn => {
      btn.classList.toggle('selected', btn.dataset.mood === composerMood);
    });
  }

  // ---- Auto-save (debounced) ----
  let composerAutoSaveTimer = null;
  let composerDirty = false;
  function markComposerDirty() {
    composerDirty = true;
    const saveBtn = document.getElementById('composerSave');
    if (saveBtn) {
      saveBtn.textContent = 'Save now';
      saveBtn.classList.remove('saved');
    }
  }
  function scheduleAutoSave() {
    if (composerAutoSaveTimer) clearTimeout(composerAutoSaveTimer);
    const text = document.getElementById('composerText').value.trim();
    if (!text && !composerPhoto && !composerMood) return; // don't save empty
    markComposerDirty();
    composerAutoSaveTimer = setTimeout(() => {
      composerAutoSaveTimer = null;
      composerSave({ silent: true });
    }, 1500);
  }

  // ---- Composer ----
  let composerPhoto = '';
  let composerMood = '';
  function dateToWeekStart(d) {
    if (!BIRTHDATE) return d;
    // Snap any date to the start-of-week date relative to user's BIRTHDATE
    const days = Math.floor((d - BIRTHDATE) / 86400000);
    return new Date(BIRTHDATE.getTime() + Math.floor(days / 7) * 7 * 86400000);
  }
  function composerLoadForDate(d, scrollIntoView) {
    if (!d) d = new Date();
    // cancel any pending auto-save before swapping entries
    if (composerAutoSaveTimer) { clearTimeout(composerAutoSaveTimer); composerAutoSaveTimer = null; }
    composerDirty = false;
    const weekStart = dateToWeekStart(d);
    const dateInput = document.getElementById('composerDate');
    if (!dateInput) return;
    dateInput.value = formatDOB(weekStart);
    const days = Math.floor((weekStart - BIRTHDATE) / 86400000);
    const weekIdx = Math.floor(days / 7);
    document.getElementById('composerWeekRange').textContent = weekRangeStr(weekIdx);
    const age = ageAtWeek(weekIdx);
    document.getElementById('composerAge').textContent = age >= 0 && age <= 110 ? `Age ${age}` : '—';
    const key = weekKey(weekIdx);
    const entry = getEntry(key);
    document.getElementById('composerText').value = entry.text || '';
    composerPhoto = entry.photo || '';
    composerMood = entry.mood || '';
    setComposerPhotoUI(composerPhoto);
    updateMoodUI();
    updatePromptVisibility();
    updateWordCount();
    const isExisting = !!(entry.text || entry.photo || entry.mood);
    document.getElementById('composerEditingTag').hidden = !isExisting;
    document.getElementById('composerDelete').hidden = !isExisting;
    const saveBtn = document.getElementById('composerSave');
    saveBtn.textContent = isExisting ? 'Saved ✓' : 'Save entry';
    saveBtn.classList.toggle('saved', isExisting);
    const composer = document.getElementById('journalComposer');
    composer.classList.toggle('editing', isExisting);
    // If chip is visible (text empty), refresh prompt for a new nudge
    if (!entry.text) refreshPrompt();
    if (scrollIntoView) {
      composer.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setTimeout(() => document.getElementById('composerText').focus(), 300);
    }
  }
  function setComposerPhotoUI(photo) {
    const preview = document.getElementById('composerPhotoPreview');
    const label = document.getElementById('composerPhotoLabel');
    const remove = document.getElementById('composerPhotoRemove');
    if (photo) {
      preview.src = photo;
      preview.style.display = 'block';
      label.textContent = 'Change photo';
      remove.hidden = false;
    } else {
      preview.src = '';
      preview.style.display = 'none';
      label.textContent = 'Add photo';
      remove.hidden = true;
    }
  }
  function composerSave(opts) {
    opts = opts || {};
    if (!BIRTHDATE) return;
    if (composerAutoSaveTimer) { clearTimeout(composerAutoSaveTimer); composerAutoSaveTimer = null; }
    const dateStr = document.getElementById('composerDate').value;
    const d = parseDOB(dateStr);
    if (!d) return;
    const days = Math.floor((dateToWeekStart(d) - BIRTHDATE) / 86400000);
    const weekIdx = Math.floor(days / 7);
    const key = weekKey(weekIdx);
    const text = document.getElementById('composerText').value.trim();
    setEntry(key, { text, photo: composerPhoto, mood: composerMood });
    saveJournalToLS();
    paintJournalDots();
    renderRecentJournal();
    renderJournalPulse();
    scheduleCloudSave();
    composerDirty = false;
    const saveBtn = document.getElementById('composerSave');
    if (saveBtn) {
      saveBtn.textContent = 'Saved ✓';
      saveBtn.classList.add('saved');
    }
    const status = document.getElementById('composerStatus');
    if (status) {
      status.textContent = opts.silent ? 'Auto-saved' : 'Saved ✓';
      setTimeout(() => { if (status) status.textContent = ''; }, 1600);
    }
    // Update editing-tag / delete visibility without resetting form contents
    const isExisting = !!(text || composerPhoto || composerMood);
    document.getElementById('composerEditingTag').hidden = !isExisting;
    document.getElementById('composerDelete').hidden = !isExisting;
    document.getElementById('journalComposer').classList.toggle('editing', isExisting);
  }
  function composerDelete() {
    if (!BIRTHDATE) return;
    const dateStr = document.getElementById('composerDate').value;
    const d = parseDOB(dateStr);
    if (!d) return;
    if (!confirm('Delete this entry?')) return;
    const days = Math.floor((dateToWeekStart(d) - BIRTHDATE) / 86400000);
    const weekIdx = Math.floor(days / 7);
    const key = weekKey(weekIdx);
    delete journal[key];
    saveJournalToLS();
    paintJournalDots();
    renderRecentJournal();
    scheduleCloudSave();
    composerLoadForDate(d, false);
  }
  function composerReset() {
    composerLoadForDate(new Date(), false);
  }

  // This-week inline panel
  function currentWeekIndex() {
    return Math.floor(daysLived / 7);
  }
  // Replaced by composerLoadForDate. Kept as a no-op shim so old call sites work.
  function refreshThisWeekPanel() { composerLoadForDate(new Date()); }

  // Modal
  let modalWeek = -1;
  let modalPhoto = '';
  function openJournalModal(weekIndex) {
    modalWeek = weekIndex;
    const key = weekKey(weekIndex);
    const entry = getEntry(key);
    document.getElementById('journalWeekNum').textContent = formatNum(weekIndex + 1);
    document.getElementById('journalWeekRange').textContent = weekRangeStr(weekIndex);
    const age = ageAtWeek(weekIndex);
    const ageStr = age < 0 ? `Before you were born` :
                   age > LIFESPAN ? `Far ahead — age ${age}` :
                   `Age ${age}`;
    document.getElementById('journalWeekAge').textContent = ageStr;
    const ta = document.getElementById('journalModalText');
    ta.value = entry.text;
    modalPhoto = entry.photo || '';
    document.getElementById('journalCharCount').textContent = `${ta.value.length} chars`;
    document.getElementById('journalModalDelete').style.display = (entry.text || entry.photo) ? '' : 'none';
    setModalPhotoUI(modalPhoto);
    document.getElementById('journalModal').hidden = false;
    setTimeout(() => ta.focus(), 50);
  }
  function setModalPhotoUI(photo) {
    const area = document.getElementById('photoUploadArea');
    const prompt = document.getElementById('uploadPrompt');
    const img = document.getElementById('photoPreview');
    const ctrls = document.getElementById('photoControls');
    if (photo) {
      img.src = photo;
      img.style.display = 'block';
      prompt.style.display = 'none';
      area.classList.add('has-photo');
      ctrls.style.display = '';
    } else {
      img.style.display = 'none';
      img.src = '';
      prompt.style.display = '';
      area.classList.remove('has-photo');
      ctrls.style.display = 'none';
    }
  }
  function closeJournalModal() {
    document.getElementById('journalModal').hidden = true;
    modalWeek = -1;
    modalPhoto = '';
  }
  function saveModalEntry() {
    if (modalWeek < 0) return;
    const text = document.getElementById('journalModalText').value.trim();
    const key = weekKey(modalWeek);
    setEntry(key, { text, photo: modalPhoto });
    saveJournalToLS();
    paintJournalDots();
    renderRecentJournal();
    if (modalWeek === currentWeekIndex()) refreshThisWeekPanel();
    scheduleCloudSave();
    closeJournalModal();
  }
  function deleteModalEntry() {
    if (modalWeek < 0) return;
    delete journal[weekKey(modalWeek)];
    saveJournalToLS();
    paintJournalDots();
    renderRecentJournal();
    if (modalWeek === currentWeekIndex()) refreshThisWeekPanel();
    scheduleCloudSave();
    closeJournalModal();
  }

  function renderMilestonePins() {
    const wrap = document.getElementById('milestonePins');
    const milestoneHTML = milestones.map(m => {
      const pct = Math.max(0, Math.min(100, (m.age / SLIDER_MAX) * 100));
      const left = `calc(${pct}% + ${(0.5 - pct/100) * 28}px)`;
      const icon = m.completed ? '✓' : '📍';
      return `<div class="milestone-pin" style="left:${left}">
        <span class="pin-tip">${escapeHtml(m.label)} (age ${m.age}${m.completed ? ' • done' : ''})</span>${icon}
      </div>`;
    }).join('');
    const tags = [];
    if (bestYear) tags.push({ age: bestYear, emoji: '✨', label: 'Best year so far' });
    if (hardestYear) tags.push({ age: hardestYear, emoji: '💪', label: 'Hardest year — you made it' });
    const tagHTML = tags.map(t => {
      const pct = Math.max(0, Math.min(100, (t.age / SLIDER_MAX) * 100));
      const left = `calc(${pct}% + ${(0.5 - pct/100) * 28}px)`;
      return `<div class="year-tag-marker" style="left:${left}" title="${escapeHtml(t.label)} (age ${t.age})">${t.emoji}</div>`;
    }).join('');
    wrap.innerHTML = milestoneHTML + tagHTML;
  }

  // ---- Apply state ----
  function applyState(opts) {
    opts = opts || {};
    if (opts.dob) {
      recomputePersonal(opts.dob);
      writeLS('lifeStages.dob', formatDOB(opts.dob));
    }
    if (opts.sex) sex = opts.sex;
    if ('country' in opts) country = opts.country;
    if ('partnership' in opts) partnership = opts.partnership;
    if ('kids' in opts) kids = opts.kids;
    if ('careerField' in opts) careerField = opts.careerField;
    if ('retirementAge' in opts) retirementAge = opts.retirementAge;
    if (opts.theme) applyTheme(opts.theme);
    if ('smoker' in opts) smoker = opts.smoker;
    if ('exerciseLevel' in opts) exerciseLevel = opts.exerciseLevel;
    if ('sleepHours' in opts) sleepHours = opts.sleepHours;
    if ('familyLongevity' in opts) familyLongevity = opts.familyLongevity;
    if ('priorities' in opts) priorities = (opts.priorities || []).slice(0, 3);
    if ('bestYear' in opts) bestYear = opts.bestYear;
    if ('hardestYear' in opts) hardestYear = opts.hardestYear;

    if (BIRTHDATE) dobInput.value = formatDOB(BIRTHDATE);
    sexButtons.forEach(b => b.classList.toggle('active', b.dataset.sex === sex));
    countryInput.value = country || '';
    partnershipInput.value = partnership || '';
    kidsInput.value = (kids || kids === 0) ? kids : '';
    careerInput.value = careerField || '';
    retirementInput.value = retirementAge || '';

    document.getElementById('smokerInput').value = smoker || '';
    document.getElementById('exerciseInput').value = exerciseLevel || '';
    document.getElementById('sleepInput').value = sleepHours || '';
    document.getElementById('longevityInput').value = familyLongevity || '';
    document.getElementById('bestYearInput').value = bestYear || '';
    document.getElementById('hardestYearInput').value = hardestYear || '';
    document.querySelectorAll('.priority-chip').forEach(c => {
      c.classList.toggle('selected', priorities.includes(c.dataset.dim));
    });

    if (BIRTHDATE) {
      subtitle.textContent =
        `Slide through the years ahead. Anchored to ${prettyDOB(BIRTHDATE)} — every age is yours to walk through.`;
      paintWeeksByDOB();
      paintJournalDots();
      setNowMarker();
      refreshThisWeekPanel();
      renderJournalPulse();
    }
    setRetirementMarker();
    renderMilestonePins();
    updateHorizonDisplay();
    if (opts.snapToToday !== false && BIRTHDATE) {
      slider.value = Math.max(0, Math.min(SLIDER_MAX, todayAge));
    }
    update();
    if (opts.syncURLOnApply !== false) syncURL();
  }
  // Privacy: the URL never carries personal data. Real data lives in localStorage
  // (per-device) and Firestore (per-account, isolated by security rules).
  // PRIVATE_URL_PARAMS is imported from ./config.js.
  function syncURL() {
    const u = new URL(window.location.href);
    let changed = false;
    PRIVATE_URL_PARAMS.forEach(p => {
      if (u.searchParams.has(p)) { u.searchParams.delete(p); changed = true; }
    });
    if (changed) window.history.replaceState(null, '', u);
  }

  // ---- Phase 2: Places + Map ----
  let leafletMap = null;
  let placeMarkers = [];

  function initMap() {
    if (typeof L === 'undefined') return; // Leaflet not loaded yet
    if (leafletMap) return;
    leafletMap = L.map('placesMap', { worldCopyJump: true }).setView([20, 0], 2);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap',
      maxZoom: 18
    }).addTo(leafletMap);
    renderPlacesOnMap();
  }
  function renderPlacesOnMap() {
    if (!leafletMap) return;
    placeMarkers.forEach(m => leafletMap.removeLayer(m));
    placeMarkers = [];
    places.forEach(p => {
      const marker = L.marker([p.lat, p.lng]);
      const note = p.note ? `<br><em>${escapeHtml(p.note)}</em>` : '';
      marker.bindPopup(`<strong>${escapeHtml(p.name)}</strong><br>Age ${p.year}${note}`);
      marker.addTo(leafletMap);
      placeMarkers.push(marker);
    });
    if (places.length > 0) {
      const group = L.featureGroup(placeMarkers);
      try { leafletMap.fitBounds(group.getBounds().pad(0.2), { maxZoom: 6 }); } catch (e) {}
    }
  }
  function renderPlacesList(highlightAge) {
    const list = document.getElementById('placesList');
    const stats = document.getElementById('placesStats');
    const countries = new Set(places.map(p => p.displayName?.split(',').pop()?.trim()).filter(Boolean));
    stats.innerHTML = `
      <span><span class="stat-num">${places.length}</span>place${places.length===1?'':'s'}</span>
      <span><span class="stat-num">${countries.size}</span>${countries.size===1?'country':'countries'}</span>`;
    if (places.length === 0) {
      list.innerHTML = '<div class="milestone-empty">No places yet — add a city you\'ve loved.</div>';
      return;
    }
    list.innerHTML = places.map((p, i) => {
      const hi = (highlightAge !== undefined && p.year === highlightAge) ? ' highlighted' : '';
      return `<span class="place-chip${hi}" data-idx="${i}">
        <span class="age">${p.year}</span>
        <span>${escapeHtml(p.name)}</span>
        <button class="remove" data-idx="${i}" title="Remove">×</button>
      </span>`;
    }).join('');
    list.querySelectorAll('.place-chip').forEach(chip => {
      chip.addEventListener('click', (e) => {
        if (e.target.classList.contains('remove')) return;
        const idx = parseInt(chip.dataset.idx, 10);
        const p = places[idx];
        if (p && leafletMap) leafletMap.flyTo([p.lat, p.lng], 8, { duration: 0.8 });
      });
    });
    list.querySelectorAll('.remove').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const idx = parseInt(btn.dataset.idx, 10);
        places.splice(idx, 1);
        savePlaces();
        renderPlacesList();
        renderPlacesOnMap();
        scheduleCloudSave();
      });
    });
  }
  function savePlaces() {
    writeLS('lifeStages.places', JSON.stringify(places));
  }
  function loadPlaces() {
    try { places = JSON.parse(readLS('lifeStages.places') || '[]') || []; }
    catch (e) { places = []; }
  }
  // ---- Phase A: People / Reading / Rituals ----
  function loadModuleArrays() {
    try { people = JSON.parse(readLS('lifeStages.people') || '[]') || []; } catch (e) { people = []; }
    try { books = JSON.parse(readLS('lifeStages.books') || '[]') || []; } catch (e) { books = []; }
    try { rituals = JSON.parse(readLS('lifeStages.rituals') || '[]') || []; } catch (e) { rituals = []; }
  }
  function savePeople() { writeLS('lifeStages.people', JSON.stringify(people)); }
  function saveBooks() { writeLS('lifeStages.books', JSON.stringify(books)); }
  function saveRituals() { writeLS('lifeStages.rituals', JSON.stringify(rituals)); }

  function lastInteraction(person) {
    if (!person.interactions || !person.interactions.length) return null;
    const sorted = [...person.interactions].sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    return sorted[0];
  }
  function daysAgo(dateStr) {
    if (!dateStr) return null;
    const d = parseDOB(dateStr);
    if (!d) return null;
    const today = new Date(); today.setHours(0,0,0,0);
    return Math.max(0, Math.floor((today - d) / 86400000));
  }
  function freshnessLabel(dateStr) {
    const days = daysAgo(dateStr);
    if (days === null) return { text: 'Never logged a chat', cls: 'stale' };
    if (days === 0) return { text: 'Last chat: today ✓', cls: 'fresh' };
    if (days === 1) return { text: 'Last chat: yesterday', cls: 'fresh' };
    if (days < 14) return { text: `Last chat: ${days} days ago`, cls: 'fresh' };
    if (days < 60) return { text: `Last chat: ${days} days ago`, cls: 'ok' };
    if (days < 180) return { text: `Last chat: ${Math.floor(days/30)} months ago`, cls: 'stale' };
    return { text: `Last chat: ${Math.floor(days/365 * 10)/10}+ years ago`, cls: 'stale' };
  }
  function renderPeople(currentSliderAge) {
    const list = document.getElementById('peopleList');
    const stats = document.getElementById('peopleStats');
    if (!list || !stats) return;
    const totalChats = people.reduce((sum, p) => sum + ((p.interactions || []).length), 0);
    stats.innerHTML = `
      <span><span class="stat-num">${people.length}</span>${people.length === 1 ? 'person' : 'people'} tracked</span>
      <span><span class="stat-num">${totalChats}</span>chats logged</span>`;
    if (people.length === 0) {
      list.innerHTML = '<div class="milestone-empty">No one yet — start with the people who matter most.</div>';
      return;
    }
    const today = new Date();
    list.innerHTML = people.map((p, i) => {
      const dob = p.dob ? parseDOB(p.dob) : null;
      const ageNow = dob ? ageOnDate(dob, today) : null;
      const initial = (p.name?.[0] || '?').toUpperCase();
      const relation = RELATION_LABEL[p.relation] || (p.relation || '');
      const last = lastInteraction(p);
      const fresh = freshnessLabel(last?.date);
      let ageThenLine = '';
      if (dob && BIRTHDATE && currentSliderAge !== undefined) {
        const userAtSelected = new Date(BIRTHDATE.getTime());
        userAtSelected.setFullYear(userAtSelected.getFullYear() + currentSliderAge);
        const personAtThen = ageOnDate(dob, userAtSelected);
        if (personAtThen >= 0 && currentSliderAge !== todayAge) {
          ageThenLine = `<span class="age-then" style="color: var(--accent); font-weight: 600;">At your ${currentSliderAge}: they're ${personAtThen}</span>`;
        }
      }
      const interactionsHTML = (p.interactions || []).length === 0
        ? '<div class="interactions-empty">No chats logged yet. The first time you log one, you start a record you\'ll be glad you have.</div>'
        : `<div class="interactions-list">${
            [...p.interactions].sort((a, b) => (b.date || '').localeCompare(a.date || '')).map((it, j) => `
              <div class="interaction">
                <span class="date">${it.date ? new Date(it.date).toLocaleDateString(undefined, {month:'short', day:'numeric', year:'2-digit'}) : '—'}</span>
                <span class="topic">${escapeHtml(it.topic || '')}</span>
                <button class="remove-int" data-pidx="${i}" data-iidx="${j}" title="Remove">×</button>
              </div>`).join('')
          }</div>`;
      return `<div class="person-row" data-idx="${i}">
        <div class="person-summary">
          <div class="person-avatar">${escapeHtml(initial)}</div>
          <div class="person-text">
            <div class="person-name-line">
              <span class="name">${escapeHtml(p.name)}</span>
              ${relation ? `<span class="relation">${escapeHtml(relation)}</span>` : ''}
            </div>
            <div class="person-meta">
              ${ageNow !== null ? `<span>${ageNow} yrs</span>` : ''}
              <span class="${fresh.cls}">${fresh.text}</span>
              ${ageThenLine}
            </div>
          </div>
          <div class="person-actions">
            <button class="log-chat-btn" data-idx="${i}" title="Log a chat">+ Chat</button>
            <button class="remove" data-idx="${i}" title="Remove">×</button>
          </div>
        </div>
        <div class="person-details">
          <div class="person-details-inner">
            ${interactionsHTML}
            <div class="interaction-form" data-pidx="${i}">
              <input type="date" class="int-date" max="${formatDOB(new Date())}" value="${formatDOB(new Date())}" />
              <input type="text" class="int-topic" placeholder="What did you talk about?" maxlength="120" />
              <button type="button" class="add-int" data-pidx="${i}">Save chat</button>
            </div>
          </div>
        </div>
      </div>`;
    }).join('');
    // Click summary toggles expand
    list.querySelectorAll('.person-summary').forEach(s => {
      s.addEventListener('click', (e) => {
        if (e.target.closest('button')) return;
        s.parentElement.classList.toggle('expanded');
      });
    });
    // Log chat button: open expansion + focus topic
    list.querySelectorAll('.log-chat-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const row = btn.closest('.person-row');
        row.classList.add('expanded');
        const ti = row.querySelector('.int-topic');
        if (ti) ti.focus();
      });
    });
    // Remove person
    list.querySelectorAll('.person-actions .remove').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (!confirm('Remove this person and all their chat history?')) return;
        people.splice(parseInt(btn.dataset.idx, 10), 1);
        savePeople(); renderPeople(parseInt(slider.value, 10)); scheduleCloudSave();
      });
    });
    // Add interaction
    list.querySelectorAll('.add-int').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const pidx = parseInt(btn.dataset.pidx, 10);
        const form = btn.closest('.interaction-form');
        const date = form.querySelector('.int-date').value;
        const topic = form.querySelector('.int-topic').value.trim();
        if (!topic) return;
        if (!people[pidx].interactions) people[pidx].interactions = [];
        people[pidx].interactions.push({ date, topic });
        savePeople();
        renderPeople(parseInt(slider.value, 10));
        scheduleCloudSave();
        // Re-expand row
        setTimeout(() => {
          const row = document.querySelector(`.person-row[data-idx="${pidx}"]`);
          if (row) row.classList.add('expanded');
        }, 0);
      });
    });
    // Remove a single interaction
    list.querySelectorAll('.remove-int').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const pidx = parseInt(btn.dataset.pidx, 10);
        const iidx = parseInt(btn.dataset.iidx, 10);
        // Re-derive index from sort order: easier to remove by date+topic match
        const sorted = [...people[pidx].interactions].sort((a, b) => (b.date || '').localeCompare(a.date || ''));
        const target = sorted[iidx];
        people[pidx].interactions = people[pidx].interactions.filter(it => !(it.date === target.date && it.topic === target.topic));
        savePeople();
        renderPeople(parseInt(slider.value, 10));
        scheduleCloudSave();
        setTimeout(() => {
          const row = document.querySelector(`.person-row[data-idx="${pidx}"]`);
          if (row) row.classList.add('expanded');
        }, 0);
      });
    });
  }
  function renderReading() {
    const list = document.getElementById('readingList');
    const stats = document.getElementById('readingStats');
    const total = books.length;
    const thisYear = todayAge !== undefined ? books.filter(b => b.age === todayAge).length : 0;
    stats.innerHTML = `
      <span><span class="stat-num">${total}</span>${total === 1 ? 'book' : 'books'} read</span>
      <span><span class="stat-num">${thisYear}</span>this year</span>`;
    if (books.length === 0) {
      list.innerHTML = '<div class="milestone-empty">No books logged yet. The first one is the hardest.</div>';
      return;
    }
    // Group by age, descending
    const byAge = {};
    books.forEach((b, i) => { (byAge[b.age] = byAge[b.age] || []).push({ ...b, _idx: i }); });
    const ages = Object.keys(byAge).map(Number).sort((a, b) => b - a);
    list.innerHTML = ages.map(age => {
      const group = byAge[age];
      return `<div class="reading-year-group">
        <div class="reading-year-label">
          <span class="age-tag">Age ${age}</span>
          <span class="count">· ${group.length} ${group.length === 1 ? 'book' : 'books'}</span>
        </div>
        ${group.map(b => `<div class="book-row">
          <div class="book-info">
            <div class="book-title">${escapeHtml(b.title)}</div>
            ${b.author ? `<div class="book-author">${escapeHtml(b.author)}</div>` : ''}
            ${b.takeaway ? `<div class="book-takeaway">"${escapeHtml(b.takeaway)}"</div>` : ''}
          </div>
          <button class="remove" data-idx="${b._idx}" title="Remove">×</button>
        </div>`).join('')}
      </div>`;
    }).join('');
    list.querySelectorAll('.remove').forEach(btn => {
      btn.addEventListener('click', () => {
        books.splice(parseInt(btn.dataset.idx, 10), 1);
        saveBooks(); renderReading(); scheduleCloudSave();
      });
    });
  }
  function renderRituals() {
    const list = document.getElementById('ritualsList');
    const stats = document.getElementById('ritualsStats');
    stats.innerHTML = `<span><span class="stat-num">${rituals.length}</span>${rituals.length === 1 ? 'ritual' : 'rituals'} worth keeping</span>`;
    if (rituals.length === 0) {
      list.innerHTML = '<div class="milestone-empty">Add one. Even a small annual thing — a hike, a dinner, a phone call — becomes deeply meaningful when you can count remaining occurrences.</div>';
      return;
    }
    const horizon = computePersonalHorizon();
    const yearsAhead = todayAge !== undefined ? Math.max(0, horizon - todayAge) : 0;
    const FREQ_LABEL = {1: 'yearly', 2: 'twice a year', 4: 'quarterly', 12: 'monthly'};
    list.innerHTML = rituals.map((r, i) => {
      const remaining = Math.round(yearsAhead * (r.frequency || 1));
      return `<div class="ritual-row">
        <div class="ritual-info">
          <div class="ritual-name">${escapeHtml(r.name)}</div>
          <div class="ritual-meta">${FREQ_LABEL[r.frequency] || 'yearly'}</div>
        </div>
        <div class="ritual-remaining">~${remaining} more times</div>
        <button class="remove" data-idx="${i}" title="Remove">×</button>
      </div>`;
    }).join('');
    list.querySelectorAll('.remove').forEach(btn => {
      btn.addEventListener('click', () => {
        rituals.splice(parseInt(btn.dataset.idx, 10), 1);
        saveRituals(); renderRituals(); scheduleCloudSave();
      });
    });
  }

  async function geocode(query) {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`;
    const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
    if (!res.ok) throw new Error('Geocoder error');
    const data = await res.json();
    if (!data || data.length === 0) throw new Error('No results');
    return {
      lat: parseFloat(data[0].lat),
      lng: parseFloat(data[0].lon),
      displayName: data[0].display_name
    };
  }

  // ---- Phase 3: Photo per week ----
  // Journal entries: { text, photo, mood }. Backward compat for string and {text,photo} entries.
  function getEntry(key) {
    const raw = journal[key];
    if (raw == null) return { text: '', photo: '', mood: '' };
    if (typeof raw === 'string') return { text: raw, photo: '', mood: '' };
    return { text: raw.text || '', photo: raw.photo || '', mood: raw.mood || '' };
  }
  function setEntry(key, entry) {
    if (!entry.text && !entry.photo && !entry.mood) {
      delete journal[key];
    } else {
      journal[key] = {
        text: entry.text || '',
        photo: entry.photo || '',
        mood: entry.mood || ''
      };
    }
  }
  function entryHasText(key) {
    const e = getEntry(key);
    return !!(e.text && e.text.trim());
  }
  function entryHasPhoto(key) {
    return !!getEntry(key).photo;
  }
  // Resize image to max 800px on long edge, JPEG quality 0.82
  async function resizeImage(file) {
    const dataUrl = await new Promise((res, rej) => {
      const r = new FileReader();
      r.onload = e => res(e.target.result);
      r.onerror = rej;
      r.readAsDataURL(file);
    });
    const img = await new Promise((res, rej) => {
      const i = new Image();
      i.onload = () => res(i);
      i.onerror = rej;
      i.src = dataUrl;
    });
    const MAX = 800;
    const scale = Math.min(1, MAX / Math.max(img.width, img.height));
    const w = Math.round(img.width * scale);
    const h = Math.round(img.height * scale);
    const canvas = document.createElement('canvas');
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, w, h);
    return canvas.toDataURL('image/jpeg', 0.82);
  }

  // ---- Phase 1: Firebase auth + Firestore sync ----
  function firebaseConfigured() {
    return !!(FIREBASE_CONFIG.apiKey && FIREBASE_CONFIG.projectId);
  }
  function initFirebase() {
    if (!firebaseConfigured()) {
      renderAuthSlot(null, true);
      return;
    }
    const app = initializeApp(FIREBASE_CONFIG);
    fbAuth = getAuth(app);
    fbDB = getFirestore(app);

    // Handle redirect-flow result (in case popup was blocked and we used redirect)
    getRedirectResult(fbAuth).catch(err => {
      if (err && err.code !== 'auth/no-redirect-operation') {
        setSyncStatus('error', `Sign-in error: ${err.message}`);
      }
    });

    onAuthStateChanged(fbAuth, (user) => {
      currentUser = user || null;
      renderAuthSlot(currentUser, false);
      if (currentUser) loadFromCloud();
    });
  }
  function renderAuthSlot(user, notConfigured) {
    const slot = document.getElementById('authSlot');
    if (notConfigured) {
      slot.innerHTML = '';
      return;
    }
    if (!user) {
      slot.innerHTML = `<button class="signin-btn" id="signInBtn"><span class="g-icon"></span>Sign in with Google</button>`;
      document.getElementById('signInBtn').addEventListener('click', signInWithGoogle);
    } else {
      // Firebase user fields: displayName, email, photoURL
      const avatar = user.photoURL || '';
      const fullName = user.displayName || user.email || 'You';
      const firstName = fullName.includes('@') ? fullName.split('@')[0] : fullName.split(' ')[0];
      const initial = (firstName[0] || 'Y').toUpperCase();
      const avatarHTML = avatar
        ? `<img src="${escapeHtml(avatar)}" alt="" referrerpolicy="no-referrer" />`
        : `<span class="avatar-fallback">${escapeHtml(initial)}</span>`;
      slot.innerHTML = `
        <span class="auth-pill">
          ${avatarHTML}
          <span>${escapeHtml(firstName)}</span>
          <button class="signout" id="signOutBtn" title="Sign out">×</button>
        </span>`;
      document.getElementById('signOutBtn').addEventListener('click', signOut);
    }
  }
  async function signInWithGoogle() {
    if (!fbAuth) return;
    const provider = new GoogleAuthProvider();
    provider.addScope('profile');
    provider.addScope('email');
    provider.setCustomParameters({ prompt: 'select_account' });
    try {
      await signInWithPopup(fbAuth, provider);
    } catch (err) {
      // Popup blocked or unsupported — fall back to redirect
      if (err.code === 'auth/popup-blocked' || err.code === 'auth/popup-closed-by-user' || err.code === 'auth/cancelled-popup-request') {
        try { await signInWithRedirect(fbAuth, provider); }
        catch (err2) { setSyncStatus('error', `Sign-in error: ${err2.message}`); }
      } else {
        setSyncStatus('error', `Sign-in error: ${err.message}`);
      }
    }
  }
  async function signOut() {
    if (!fbAuth) return;
    await fbSignOut(fbAuth);
    currentUser = null;
    renderAuthSlot(null, false);
    setSyncStatus('', '');
  }
  function setSyncStatus(cls, text) {
    const el = document.getElementById('syncStatus');
    el.className = 'sync-status' + (cls ? ' ' + cls : '');
    el.textContent = text;
  }
  function collectStateForCloud() {
    return {
      v: 2,
      sex, country, partnership, kids, careerField, retirementAge, theme,
      smoker, exerciseLevel, sleepHours, familyLongevity,
      priorities, bestYear, hardestYear,
      milestones, journal, letters, places,
      people, books, rituals,
      dob: BIRTHDATE ? formatDOB(BIRTHDATE) : null,
      updated: Date.now(),
    };
  }
  function applyCloudState(cloud) {
    if (!cloud || typeof cloud !== 'object') return;
    if (cloud.journal) journal = cloud.journal;
    if (cloud.letters) letters = cloud.letters;
    if (cloud.places) places = cloud.places;
    if (cloud.milestones) milestones = cloud.milestones;
    if (cloud.people) people = cloud.people;
    if (cloud.books) books = cloud.books;
    if (cloud.rituals) rituals = cloud.rituals;
    // Persist locally so the data is durable
    saveJournalToLS();
    writeLS('lifeStages.letters', JSON.stringify(letters));
    savePlaces();
    saveMilestones();
    savePeople();
    saveBooks();
    saveRituals();
    // Persist all the other settings via writeLS
    if (cloud.theme) writeLS('lifeStages.theme', cloud.theme);
    if (cloud.sex) writeLS('lifeStages.sex', cloud.sex);
    if (cloud.country !== undefined) writeLS('lifeStages.country', cloud.country || '');
    if (cloud.partnership !== undefined) writeLS('lifeStages.partnership', cloud.partnership || '');
    if (cloud.kids !== undefined) writeLS('lifeStages.kids', String(cloud.kids || 0));
    if (cloud.careerField !== undefined) writeLS('lifeStages.career', cloud.careerField || '');
    if (cloud.retirementAge !== undefined) writeLS('lifeStages.retirementAge', String(cloud.retirementAge || 0));
    if (cloud.smoker !== undefined) writeLS('lifeStages.smoker', cloud.smoker || '');
    if (cloud.exerciseLevel !== undefined) writeLS('lifeStages.exercise', cloud.exerciseLevel || '');
    if (cloud.sleepHours !== undefined) writeLS('lifeStages.sleep', String(cloud.sleepHours || 0));
    if (cloud.familyLongevity !== undefined) writeLS('lifeStages.familyLongevity', String(cloud.familyLongevity || 0));
    if (cloud.priorities) writeLS('lifeStages.priorities', JSON.stringify(cloud.priorities));
    if (cloud.bestYear !== undefined) writeLS('lifeStages.bestYear', String(cloud.bestYear || 0));
    if (cloud.hardestYear !== undefined) writeLS('lifeStages.hardestYear', String(cloud.hardestYear || 0));
    const dob = cloud.dob ? parseDOB(cloud.dob) : BIRTHDATE;
    applyState({
      dob,
      sex: cloud.sex,
      theme: cloud.theme,
      country: cloud.country,
      partnership: cloud.partnership,
      kids: cloud.kids,
      careerField: cloud.careerField,
      retirementAge: cloud.retirementAge,
      smoker: cloud.smoker,
      exerciseLevel: cloud.exerciseLevel,
      sleepHours: cloud.sleepHours,
      familyLongevity: cloud.familyLongevity,
      priorities: cloud.priorities,
      bestYear: cloud.bestYear,
      hardestYear: cloud.hardestYear,
      syncURLOnApply: false,
    });
    renderMilestones();
    renderMilestonePins();
    renderRecentJournal();
    renderPlacesList();
    renderPlacesOnMap();
    renderPeople(parseInt(slider.value, 10));
    renderReading();
    renderRituals();
    refreshLetterMeta();
    document.querySelectorAll('textarea[data-letter-age]').forEach(ta => {
      ta.value = letters[parseInt(ta.dataset.letterAge, 10)] || '';
    });
  }
  async function loadFromCloud() {
    if (!fbDB || !currentUser) return;
    setSyncStatus('syncing', 'Loading from cloud…');
    try {
      const ref = doc(fbDB, 'users', currentUser.uid);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        const cloudDoc = snap.data();
        if (cloudDoc && cloudDoc.data) {
          applyCloudState(cloudDoc.data);
          lastCloudVersion = cloudDoc.data.updated || 0;
        }
        setSyncStatus('synced', 'Synced ✓');
      } else {
        // First sign-in: push current local state up
        setSyncStatus('synced', 'Synced ✓');
        saveToCloud();
      }
    } catch (err) {
      setSyncStatus('error', `Load failed: ${err.message}`);
    }
  }
  async function saveToCloud() {
    if (!fbDB || !currentUser) return;
    setSyncStatus('syncing', 'Saving…');
    const payload = collectStateForCloud();
    try {
      const ref = doc(fbDB, 'users', currentUser.uid);
      await setDoc(ref, { data: payload, updated_at: serverTimestamp() }, { merge: true });
      lastCloudVersion = payload.updated;
      setSyncStatus('synced', 'Synced ✓');
    } catch (err) {
      setSyncStatus('error', `Save failed: ${err.message}`);
    }
  }
  function scheduleCloudSave() {
    if (!fbAuth || !currentUser) return;
    if (saveTimer) clearTimeout(saveTimer);
    setSyncStatus('syncing', 'Saving in 2s…');
    saveTimer = setTimeout(() => { saveToCloud(); saveTimer = null; }, 2000);
  }

  // ---- Init ----

  // Personal data loads from localStorage only. URL params are ignored (and
  // stripped on first save) so old shared links can't leak data.
  const initialDOB = parseDOB(readLS('lifeStages.dob') || DEFAULT_DOB) || parseDOB(DEFAULT_DOB);
  const initialSex = readLS('lifeStages.sex') || DEFAULT_SEX;
  const initialTheme = readLS('lifeStages.theme') || DEFAULT_THEME;
  const initialCountry = readLS('lifeStages.country') || '';
  const initialPartnership = readLS('lifeStages.partnership') || '';
  const initialKids = parseInt(readLS('lifeStages.kids') || '0', 10) || 0;
  const initialCareer = readLS('lifeStages.career') || '';
  const initialRetire = parseInt(readLS('lifeStages.retirementAge') || '0', 10) || 0;
  // Private (localStorage only — never URL)
  const initialSmoker = readLS('lifeStages.smoker') || '';
  const initialExercise = readLS('lifeStages.exercise') || '';
  const initialSleep = parseFloat(readLS('lifeStages.sleep') || '0') || 0;
  const initialLongevity = parseInt(readLS('lifeStages.familyLongevity') || '0', 10) || 0;
  const initialPriorities = (() => {
    try { return JSON.parse(readLS('lifeStages.priorities') || '[]') || []; }
    catch (e) { return []; }
  })();
  const initialBestYear = parseInt(readLS('lifeStages.bestYear') || '0', 10) || 0;
  const initialHardestYear = parseInt(readLS('lifeStages.hardestYear') || '0', 10) || 0;
  // Strip any pre-existing URL params on load (cleans up old shared links)
  syncURL();
  // Letters: localStorage only (could be long, sensitive)
  try { letters = JSON.parse(readLS('lifeStages.letters') || '{}') || {}; } catch (e) { letters = {}; }
  // Hydrate letter textareas + meta
  document.querySelectorAll('[data-letter-age]').forEach(el => {
    const ageKey = parseInt(el.dataset.letterAge, 10);
    if (el.tagName === 'TEXTAREA') el.value = letters[ageKey] || '';
  });
  function refreshLetterMeta() {
    document.querySelectorAll('[data-meta]').forEach(el => {
      const ageKey = parseInt(el.dataset.meta, 10);
      const text = letters[ageKey] || '';
      el.textContent = text ? `${text.length} chars` : 'empty';
    });
  }
  refreshLetterMeta();
  milestones = loadMilestones();
  loadJournal();
  loadPlaces();
  loadModuleArrays();
  applyState({
    dob: initialDOB,
    sex: initialSex,
    theme: initialTheme,
    country: initialCountry,
    partnership: initialPartnership,
    kids: initialKids,
    careerField: initialCareer,
    retirementAge: initialRetire,
    smoker: initialSmoker,
    exerciseLevel: initialExercise,
    sleepHours: initialSleep,
    familyLongevity: initialLongevity,
    priorities: initialPriorities,
    bestYear: initialBestYear,
    hardestYear: initialHardestYear,
    syncURLOnApply: false,
  });
  renderMilestones();
  renderMilestonePins();
  renderRecentJournal();
  renderPlacesList();
  renderPeople(todayAge);
  renderReading();
  renderRituals();

  // ---- Wiring ----
  slider.addEventListener('input', update);
  dobInput.addEventListener('change', () => {
    const d = parseDOB(dobInput.value);
    if (d) applyState({ dob: d });
  });
  sexButtons.forEach(b => b.addEventListener('click', () => {
    writeLS('lifeStages.sex', b.dataset.sex);
    applyState({ sex: b.dataset.sex });
  }));
  themeButtons.forEach(b => b.addEventListener('click', () => {
    writeLS('lifeStages.theme', b.dataset.theme);
    applyState({ theme: b.dataset.theme, snapToToday: false });
  }));
  countryInput.addEventListener('change', () => {
    writeLS('lifeStages.country', countryInput.value);
    applyState({ country: countryInput.value, snapToToday: false });
  });
  partnershipInput.addEventListener('change', () => {
    writeLS('lifeStages.partnership', partnershipInput.value);
    applyState({ partnership: partnershipInput.value, snapToToday: false });
  });
  kidsInput.addEventListener('change', () => {
    const n = parseInt(kidsInput.value, 10) || 0;
    writeLS('lifeStages.kids', String(n));
    applyState({ kids: n, snapToToday: false });
  });
  careerInput.addEventListener('change', () => {
    writeLS('lifeStages.career', careerInput.value);
    applyState({ careerField: careerInput.value, snapToToday: false });
  });
  retirementInput.addEventListener('change', () => {
    const n = parseInt(retirementInput.value, 10) || 0;
    writeLS('lifeStages.retirementAge', String(n));
    applyState({ retirementAge: n, snapToToday: false });
  });

  // Private fields — localStorage only, never URL
  document.getElementById('smokerInput').addEventListener('change', (e) => {
    writeLS('lifeStages.smoker', e.target.value);
    applyState({ smoker: e.target.value, snapToToday: false });
  });
  document.getElementById('exerciseInput').addEventListener('change', (e) => {
    writeLS('lifeStages.exercise', e.target.value);
    applyState({ exerciseLevel: e.target.value, snapToToday: false });
  });
  document.getElementById('sleepInput').addEventListener('change', (e) => {
    const n = parseFloat(e.target.value) || 0;
    writeLS('lifeStages.sleep', String(n));
    applyState({ sleepHours: n, snapToToday: false });
  });
  document.getElementById('longevityInput').addEventListener('change', (e) => {
    const n = parseInt(e.target.value, 10) || 0;
    writeLS('lifeStages.familyLongevity', String(n));
    applyState({ familyLongevity: n, snapToToday: false });
  });

  // Journal — week click handlers (open in composer, navigate to journal page)
  weekEls.forEach((el, i) => {
    el.addEventListener('click', () => {
      const d = weekStartDate(i);
      // Navigate to journal page if not there
      if (currentPage() !== 'journal') {
        window.location.hash = '#/journal';
        // Wait for page transition then load
        setTimeout(() => composerLoadForDate(d, true), 100);
      } else {
        composerLoadForDate(d, true);
      }
    });
  });

  // Composer (replaces this-week inline panel)
  const composerDateInput = document.getElementById('composerDate');
  if (composerDateInput) {
    composerDateInput.max = formatDOB(new Date());
    composerDateInput.addEventListener('change', () => {
      const d = parseDOB(composerDateInput.value);
      if (d) composerLoadForDate(d, false);
    });
  }
  const composerPhotoInput = document.getElementById('composerPhotoInput');
  if (composerPhotoInput) {
    composerPhotoInput.addEventListener('change', async (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file || !file.type.startsWith('image/')) return;
      try {
        composerPhoto = await resizeImage(file);
        setComposerPhotoUI(composerPhoto);
        scheduleAutoSave();
      } catch (err) {
        alert('Could not read that image.');
      }
      composerPhotoInput.value = '';
    });
  }
  const composerPhotoRemove = document.getElementById('composerPhotoRemove');
  if (composerPhotoRemove) {
    composerPhotoRemove.addEventListener('click', () => {
      composerPhoto = '';
      setComposerPhotoUI('');
      scheduleAutoSave();
    });
  }
  const composerSaveBtn = document.getElementById('composerSave');
  if (composerSaveBtn) composerSaveBtn.addEventListener('click', () => composerSave({ silent: false }));
  const composerCancelBtn = document.getElementById('composerCancel');
  if (composerCancelBtn) composerCancelBtn.addEventListener('click', composerReset);
  const composerDeleteBtn = document.getElementById('composerDelete');
  if (composerDeleteBtn) composerDeleteBtn.addEventListener('click', composerDelete);

  // Composer textarea: input → word count, prompt visibility, auto-save
  const composerTextEl = document.getElementById('composerText');
  if (composerTextEl) {
    composerTextEl.addEventListener('input', () => {
      updateWordCount();
      updatePromptVisibility();
      // If user just emptied the textarea, refresh the prompt for a new nudge
      if (!composerTextEl.value.trim()) refreshPrompt();
      scheduleAutoSave();
    });
    composerTextEl.addEventListener('keydown', (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        composerSave({ silent: false });
      }
    });
    // Save on blur if dirty (covers tab away / page hide)
    composerTextEl.addEventListener('blur', () => {
      if (composerDirty) composerSave({ silent: true });
    });
  }

  // Mood picker
  document.querySelectorAll('#composerMood button').forEach(btn => {
    btn.addEventListener('click', () => {
      const m = btn.dataset.mood;
      composerMood = (composerMood === m) ? '' : m;
      updateMoodUI();
      scheduleAutoSave();
    });
  });

  // Prompt reroll
  const rerollBtn = document.getElementById('composerPromptReroll');
  if (rerollBtn) rerollBtn.addEventListener('click', refreshPrompt);

  // Search input
  const searchInput = document.getElementById('entrySearchInput');
  const searchClear = document.getElementById('entrySearchClear');
  if (searchInput) {
    let searchTimer = null;
    searchInput.addEventListener('input', () => {
      if (searchTimer) clearTimeout(searchTimer);
      searchTimer = setTimeout(() => {
        feedSearchQuery = searchInput.value;
        if (searchClear) searchClear.hidden = !searchInput.value;
        renderRecentJournal();
      }, 200);
    });
    if (searchClear) {
      searchClear.addEventListener('click', () => {
        searchInput.value = '';
        feedSearchQuery = '';
        searchClear.hidden = true;
        renderRecentJournal();
        searchInput.focus();
      });
    }
  }

  // Save before page unload (just in case)
  window.addEventListener('beforeunload', () => {
    if (composerDirty && composerAutoSaveTimer) {
      clearTimeout(composerAutoSaveTimer);
      composerSave({ silent: true });
    }
  });

  // Journal modal handlers
  const journalModal = document.getElementById('journalModal');
  const journalModalText = document.getElementById('journalModalText');
  journalModal.querySelectorAll('[data-close]').forEach(el => {
    el.addEventListener('click', closeJournalModal);
  });
  document.getElementById('journalModalSave').addEventListener('click', saveModalEntry);
  document.getElementById('journalModalDelete').addEventListener('click', deleteModalEntry);
  journalModalText.addEventListener('input', () => {
    document.getElementById('journalCharCount').textContent = `${journalModalText.value.length} chars`;
  });
  journalModalText.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      saveModalEntry();
    }
  });

  // Export / Import journal
  document.getElementById('exportJournal').addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(journal, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `life-journal-${formatDOB(new Date())}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  });
  document.getElementById('importJournalFile').addEventListener('change', (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result);
        if (typeof data !== 'object' || Array.isArray(data)) throw new Error('Bad format');
        const importedCount = Object.keys(data).length;
        // Merge: imported entries override existing on key collision
        journal = { ...journal, ...data };
        saveJournalToLS();
        paintJournalDots();
        renderRecentJournal();
        refreshThisWeekPanel();
        alert(`Imported ${importedCount} entries.`);
      } catch (err) {
        alert('Could not parse that file. Make sure it\'s a previously-exported journal JSON.');
      }
      e.target.value = ''; // reset for next import
    };
    reader.readAsText(file);
  });
  copyBtn.addEventListener('click', async () => {
    syncURL(); // strips any leftover params
    // Always copy the bare app URL — never any personal params
    const cleanUrl = window.location.origin + window.location.pathname;
    try {
      await navigator.clipboard.writeText(cleanUrl);
      const original = copyBtn.textContent;
      copyBtn.textContent = 'Copied — friends see a blank app';
      copyBtn.classList.add('copied');
      setTimeout(() => { copyBtn.textContent = original; copyBtn.classList.remove('copied'); }, 2200);
    } catch (e) {
      window.prompt('Copy this link:', cleanUrl);
    }
  });
  document.getElementById('milestoneForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const label = document.getElementById('msLabel').value.trim();
    const ageVal = parseInt(document.getElementById('msAge').value, 10);
    const completedBox = document.getElementById('msCompleted');
    const completed = completedBox.checked || (ageVal <= todayAge);
    if (!label || isNaN(ageVal) || ageVal < 0 || ageVal > SLIDER_MAX) return;
    milestones.push({ age: ageVal, label, completed });
    milestones.sort((a, b) => a.age - b.age);
    saveMilestones(); syncURL(); renderMilestones(); renderMilestonePins();
    document.getElementById('msLabel').value = '';
    document.getElementById('msAge').value = '';
    completedBox.checked = false;
  });

  // Priority chips
  document.querySelectorAll('.priority-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const dim = chip.dataset.dim;
      const idx = priorities.indexOf(dim);
      if (idx >= 0) {
        priorities.splice(idx, 1);
      } else {
        if (priorities.length >= 3) return; // max 3
        priorities.push(dim);
      }
      writeLS('lifeStages.priorities', JSON.stringify(priorities));
      applyState({ priorities, snapToToday: false });
    });
  });

  // Year tags
  document.getElementById('bestYearInput').addEventListener('change', (e) => {
    const n = parseInt(e.target.value, 10) || 0;
    writeLS('lifeStages.bestYear', String(n));
    applyState({ bestYear: n, snapToToday: false });
  });
  document.getElementById('hardestYearInput').addEventListener('change', (e) => {
    const n = parseInt(e.target.value, 10) || 0;
    writeLS('lifeStages.hardestYear', String(n));
    applyState({ hardestYear: n, snapToToday: false });
  });

  // Future-self letters (textareas, save on blur)
  document.querySelectorAll('textarea[data-letter-age]').forEach(ta => {
    ta.addEventListener('input', () => {
      const ageKey = parseInt(ta.dataset.letterAge, 10);
      const text = ta.value;
      if (text) letters[ageKey] = text; else delete letters[ageKey];
      writeLS('lifeStages.letters', JSON.stringify(letters));
      refreshLetterMeta();
      scheduleCloudSave();
      const currentAge = parseInt(slider.value, 10);
      if (Math.abs(ageKey - currentAge) <= 1) update();
    });
  });

  // Photo upload (Phase 3) — file input + drag/drop
  const photoArea = document.getElementById('photoUploadArea');
  const photoInput = document.getElementById('photoInput');
  photoInput.addEventListener('change', async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('Please pick an image file.');
      return;
    }
    try {
      modalPhoto = await resizeImage(file);
      setModalPhotoUI(modalPhoto);
    } catch (err) {
      alert('Could not read that image.');
    }
    photoInput.value = '';
  });
  photoArea.addEventListener('dragover', (e) => { e.preventDefault(); photoArea.style.borderColor = 'var(--accent)'; });
  photoArea.addEventListener('dragleave', () => { photoArea.style.borderColor = ''; });
  photoArea.addEventListener('drop', async (e) => {
    e.preventDefault();
    photoArea.style.borderColor = '';
    const file = e.dataTransfer.files && e.dataTransfer.files[0];
    if (!file || !file.type.startsWith('image/')) return;
    try { modalPhoto = await resizeImage(file); setModalPhotoUI(modalPhoto); } catch (err) {}
  });
  document.getElementById('removePhoto').addEventListener('click', () => {
    modalPhoto = '';
    setModalPhotoUI('');
  });

  // Places form (Phase 2)
  const placesForm = document.getElementById('placesForm');
  const placeAddBtn = document.getElementById('placeAddBtn');
  const geoStatus = document.getElementById('geoStatus');
  placesForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const query = document.getElementById('placeQuery').value.trim();
    const ageVal = parseInt(document.getElementById('placeYear').value, 10);
    const note = document.getElementById('placeNote').value.trim();
    if (!query || isNaN(ageVal) || ageVal < 0 || ageVal > SLIDER_MAX) return;
    placeAddBtn.disabled = true;
    geoStatus.textContent = 'Looking up location…';
    try {
      const result = await geocode(query);
      places.push({
        name: query,
        displayName: result.displayName,
        lat: result.lat,
        lng: result.lng,
        year: ageVal,
        note
      });
      places.sort((a, b) => a.year - b.year);
      savePlaces();
      renderPlacesList(parseInt(slider.value, 10));
      renderPlacesOnMap();
      scheduleCloudSave();
      document.getElementById('placeQuery').value = '';
      document.getElementById('placeYear').value = '';
      document.getElementById('placeNote').value = '';
      geoStatus.textContent = '';
    } catch (err) {
      geoStatus.textContent = `Couldn't find "${query}". Try with country name.`;
    } finally {
      placeAddBtn.disabled = false;
    }
  });

  // Trigger cloud save on existing UI changes by piggy-backing on existing handlers
  // (We've added scheduleCloudSave() calls above for photos & letters & places already.)
  // Add it to the personalize fields, milestones, year tags, priorities, sex, theme, journal.
  ['change', 'input'].forEach(evt => {
    [dobInput, countryInput, partnershipInput, kidsInput, careerInput, retirementInput,
     document.getElementById('smokerInput'), document.getElementById('exerciseInput'),
     document.getElementById('sleepInput'), document.getElementById('longevityInput'),
     document.getElementById('bestYearInput'), document.getElementById('hardestYearInput')]
      .forEach(el => el && el.addEventListener(evt, scheduleCloudSave));
  });
  sexButtons.forEach(b => b.addEventListener('click', scheduleCloudSave));
  themeButtons.forEach(b => b.addEventListener('click', scheduleCloudSave));
  document.querySelectorAll('.priority-chip').forEach(c => c.addEventListener('click', scheduleCloudSave));
  document.getElementById('milestoneForm').addEventListener('submit', () => setTimeout(scheduleCloudSave, 50));

  // Slide-to-highlight matching places + repaint people "ages then"
  slider.addEventListener('input', () => {
    const ageNow = parseInt(slider.value, 10);
    renderPlacesList(ageNow);
    renderPeople(ageNow);
  });

  // People form
  document.getElementById('personDob').max = formatDOB(new Date());
  document.getElementById('peopleForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('personName').value.trim();
    const relation = document.getElementById('personRelation').value;
    const dob = document.getElementById('personDob').value;
    if (!name) return;
    people.push({ name, relation, dob });
    savePeople();
    renderPeople(parseInt(slider.value, 10));
    scheduleCloudSave();
    document.getElementById('personName').value = '';
    document.getElementById('personRelation').value = '';
    document.getElementById('personDob').value = '';
  });

  // Reading form
  document.getElementById('readingForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const title = document.getElementById('bookTitle').value.trim();
    const author = document.getElementById('bookAuthor').value.trim();
    const ageVal = parseInt(document.getElementById('bookAge').value, 10);
    const takeaway = document.getElementById('bookTakeaway').value.trim();
    if (!title || isNaN(ageVal) || ageVal < 0 || ageVal > SLIDER_MAX) return;
    books.push({ title, author, age: ageVal, takeaway });
    saveBooks();
    renderReading();
    scheduleCloudSave();
    document.getElementById('bookTitle').value = '';
    document.getElementById('bookAuthor').value = '';
    document.getElementById('bookAge').value = '';
    document.getElementById('bookTakeaway').value = '';
  });

  // Rituals form
  document.getElementById('ritualsForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('ritualName').value.trim();
    const frequency = parseInt(document.getElementById('ritualFrequency').value, 10) || 1;
    if (!name) return;
    rituals.push({ name, frequency });
    saveRituals();
    renderRituals();
    scheduleCloudSave();
    document.getElementById('ritualName').value = '';
  });

  // Init Leaflet map + Firebase auth (after CDNs load)
  function startMapWhenReady() {
    if (typeof L === 'undefined') { setTimeout(startMapWhenReady, 200); return; }
    initMap();
  }
  startMapWhenReady();
  initFirebase();

  // PWA: register service worker for offline + installable
  if ('serviceWorker' in navigator && location.protocol === 'https:') {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js').catch(() => {/* ignore */});
    });
  }

  // ---- Page routing ----
  const PAGES = ['today', 'journal', 'people', 'places', 'reading', 'goals', 'settings'];
  function currentPage() {
    const m = /^#\/(\w+)/.exec(window.location.hash);
    const p = m && PAGES.includes(m[1]) ? m[1] : 'today';
    return p;
  }
  function showPage(page) {
    document.querySelectorAll('section.page').forEach(sec => {
      sec.classList.toggle('active', sec.dataset.page === page);
    });
    document.querySelectorAll('.nav-tab').forEach(tab => {
      tab.classList.toggle('active', tab.dataset.tab === page);
    });
    // Re-render lazy bits when switching to a page that needs current state
    if (page === 'people') renderPeople(parseInt(slider.value, 10));
    if (page === 'journal') {
      renderJournalPulse();
      updatePromptVisibility();
      updateWordCount();
    }
    if (page === 'places' && leafletMap) {
      // Leaflet needs a kick when its container becomes visible
      setTimeout(() => leafletMap.invalidateSize(), 50);
    }
    window.scrollTo({ top: 0, behavior: 'instant' });
  }
  window.addEventListener('hashchange', () => showPage(currentPage()));
  showPage(currentPage());
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !journalModal.hidden) { closeJournalModal(); return; }
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;
    if (e.key === 'Home') { slider.value = 0; update(); }
    if (e.key === 'End') { slider.value = SLIDER_MAX; update(); }
    if (e.key === 't' || e.key === 'T') { slider.value = todayAge; update(); }
  });
