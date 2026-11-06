/**
 * Valuation Predictor - Interactive Simulator Logic
 * Premium Linear / Vercel style What-If Tool
 */

// Presets using verified stats inside the training distribution
const PRESETS = {
  haaland: {
    label: "Erling Haaland",
    position: "ST",
    age: 24,
    league: "5.0",
    club_tier: 4.0,
    minutes: 2736,
    goals: 22,
    assists: 3,
    xg: 22.0,
    xa: 3.0,
    shots: 104,
    key_passes: 29,
    progressive_carries: 24,
    progressive_passes: 20,
    tackles: 11,
    interceptions: 5,
    aerial_wins: 57,
    recoveries: 34,
    clean_sheets: 0
  },
  mbappe: {
    label: "Kylian Mbappé",
    position: "ST",
    age: 26,
    league: "4.8",
    club_tier: 4.0,
    minutes: 2600,
    goals: 24,
    assists: 5,
    xg: 21.0,
    xa: 4.5,
    shots: 110,
    key_passes: 40,
    progressive_carries: 65,
    progressive_passes: 45,
    tackles: 10,
    interceptions: 4,
    aerial_wins: 12,
    recoveries: 28,
    clean_sheets: 0
  },
  saka: {
    label: "Bukayo Saka",
    position: "WING",
    age: 23,
    league: "5.0",
    club_tier: 4.0,
    minutes: 2550,
    goals: 14,
    assists: 11,
    xg: 12.5,
    xa: 9.8,
    shots: 75,
    key_passes: 72,
    progressive_carries: 85,
    progressive_passes: 80,
    tackles: 45,
    interceptions: 18,
    aerial_wins: 22,
    recoveries: 50,
    clean_sheets: 0
  },
  bellingham: {
    label: "Jude Bellingham",
    position: "MID",
    age: 21,
    league: "4.8",
    club_tier: 4.0,
    minutes: 2400,
    goals: 12,
    assists: 7,
    xg: 10.2,
    xa: 6.5,
    shots: 55,
    key_passes: 45,
    progressive_carries: 75,
    progressive_passes: 110,
    tackles: 48,
    interceptions: 25,
    aerial_wins: 40,
    recoveries: 65,
    clean_sheets: 0
  },
  prospect: {
    label: "Young Prospect",
    position: "WING",
    age: 19,
    league: "4.7",
    club_tier: 3.0,
    minutes: 1450,
    goals: 7,
    assists: 5,
    xg: 6.2,
    xa: 4.8,
    shots: 42,
    key_passes: 35,
    progressive_carries: 58,
    progressive_passes: 40,
    tackles: 24,
    interceptions: 12,
    aerial_wins: 10,
    recoveries: 35,
    clean_sheets: 0
  },
  veteran: {
    label: "Veteran",
    position: "ST",
    age: 33,
    league: "4.7",
    club_tier: 3.0,
    minutes: 2100,
    goals: 15,
    assists: 3,
    xg: 14.0,
    xa: 2.8,
    shots: 68,
    key_passes: 24,
    progressive_carries: 22,
    progressive_passes: 26,
    tackles: 12,
    interceptions: 6,
    aerial_wins: 38,
    recoveries: 30,
    clean_sheets: 0
  }
};

let previousValuation = null;
let debounceTimer = null;
let ageChartInstance = null;
let currentScenario = 'A';
let scenarioA = null;
let scenarioB = null;
let compareMode = false;

document.addEventListener('DOMContentLoaded', () => {
  initPage('predictor');
  initPredictor();
});

function initPredictor() {
  setupEventListeners();
  loadFromUrlOrPreset();
}

function setupEventListeners() {
  // Segmented Position Control
  document.querySelectorAll('.segmented-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.segmented-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const pos = btn.dataset.pos;
      document.getElementById('pos-value').value = pos;
      updatePositionSpecificFields(pos);
      onInputChanged();
    });
  });

  // Dual-bound Sliders & Number inputs
  bindSliderAndNumber('age', 'age-slider', 'age-num', 16, 40, false);
  bindSliderAndNumber('minutes', 'minutes-slider', 'minutes-num', 0, 3420, false);
  bindSliderAndNumber('goals', 'goals-slider', 'goals-num', 0, 50, false);
  bindSliderAndNumber('assists', 'assists-slider', 'assists-num', 0, 30, false);
  bindSliderAndNumber('xg', 'xg-slider', 'xg-num', 0, 45, true);
  bindSliderAndNumber('xa', 'xa-slider', 'xa-num', 0, 25, true);

  // Advanced fields inputs
  ['shots', 'key-passes', 'prog-carries', 'prog-passes', 'tackles', 'interceptions', 'aerial-wins', 'clean-sheets'].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('input', () => onInputChanged());
    }
  });

  // League selector
  const leagueSelect = document.getElementById('league-select');
  if (leagueSelect) {
    leagueSelect.addEventListener('change', () => {
      const opt = leagueSelect.options[leagueSelect.selectedIndex];
      const rating = opt.dataset.rating || '5.0';
      const badge = document.getElementById('league-badge');
      if (badge) badge.textContent = `${rating} ★`;
      onInputChanged();
    });
  }

  // Accordion toggle
  const accordionToggle = document.getElementById('accordion-toggle');
  if (accordionToggle) {
    accordionToggle.addEventListener('click', () => {
      const body = document.getElementById('accordion-body');
      const chevron = document.getElementById('accordion-chevron');
      if (body) {
        body.classList.toggle('open');
        chevron.classList.toggle('expanded');
      }
    });
  }

  // Card 3 Tabs
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      const targetPane = document.getElementById(btn.dataset.target);
      if (targetPane) targetPane.classList.add('active');
    });
  });

  // Compare Mode Toggle
  const compareBtn = document.getElementById('compare-btn');
  if (compareBtn) {
    compareBtn.addEventListener('click', toggleCompareMode);
  }

  // Copy Link
  const copyBtn = document.getElementById('copy-link-btn');
  if (copyBtn) {
    copyBtn.addEventListener('click', copyShareableLink);
  }

  // Reset
  const resetBtn = document.getElementById('reset-btn');
  if (resetBtn) {
    resetBtn.addEventListener('click', () => applyPreset('haaland'));
  }
}

function bindSliderAndNumber(key, sliderId, numId, min, max, isFloat) {
  const slider = document.getElementById(sliderId);
  const num = document.getElementById(numId);
  if (!slider || !num) return;

  slider.addEventListener('input', () => {
    num.value = isFloat ? parseFloat(slider.value).toFixed(1) : parseInt(slider.value, 10);
    updatePer90Calculations();
    onInputChanged();
  });

  num.addEventListener('input', () => {
    let val = isFloat ? parseFloat(num.value) : parseInt(num.value, 10);
    if (isNaN(val)) val = min;
    val = Math.max(min, Math.min(max, val));
    slider.value = val;
    updatePer90Calculations();
    onInputChanged();
  });
}

function updatePer90Calculations() {
  const minutes = Math.max(parseInt(document.getElementById('minutes-num').value, 10) || 0, 1);
  const n90 = minutes / 90.0;

  const g = parseFloat(document.getElementById('goals-num').value) || 0;
  const a = parseFloat(document.getElementById('assists-num').value) || 0;
  const xg = parseFloat(document.getElementById('xg-num').value) || 0;
  const xa = parseFloat(document.getElementById('xa-num').value) || 0;

  setHelperText('goals-helper', `${(g / n90).toFixed(2)} / 90`);
  setHelperText('assists-helper', `${(a / n90).toFixed(2)} / 90`);
  setHelperText('xg-helper', `${(xg / n90).toFixed(2)} / 90`);
  setHelperText('xa-helper', `${(xa / n90).toFixed(2)} / 90`);
}

function setHelperText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

function updatePositionSpecificFields(pos) {
  const isAttacker = ['ST', 'WING'].includes(pos);
  const isMid = pos === 'MID';
  const isDef = ['DEF', 'GK'].includes(pos);

  showField('field-shots', isAttacker || isMid);
  showField('field-key-passes', true);
  showField('field-prog-carries', true);
  showField('field-prog-passes', isMid || isDef);
  showField('field-tackles', isMid || isDef);
  showField('field-interceptions', isMid || isDef);
  showField('field-aerial-wins', isDef || pos === 'ST');
  showField('field-clean-sheets', isDef);
}

function showField(id, visible) {
  const el = document.getElementById(id);
  if (el) el.style.display = visible ? 'block' : 'none';
}

function onInputChanged() {
  clearTimeout(debounceTimer);
  updatePer90Calculations();
  syncToUrl();

  const heroCard = document.getElementById('hero-card');
  if (heroCard) heroCard.classList.add('hero-loading');

  debounceTimer = setTimeout(() => {
    executePrediction();
  }, 250);
}

function getPayload() {
  const leagueSelect = document.getElementById('league-select');
  const opt = leagueSelect ? leagueSelect.options[leagueSelect.selectedIndex] : null;
  const leagueStr = opt ? parseFloat(opt.dataset.rating || '5.0') : 5.0;
  const clubTier = opt ? parseFloat(opt.dataset.tier || '3.0') : 3.0;

  return {
    position: document.getElementById('pos-value').value || 'ST',
    age: parseInt(document.getElementById('age-num').value, 10) || 24,
    league_strength: leagueStr,
    club_tier: clubTier,
    minutes: parseInt(document.getElementById('minutes-num').value, 10) || 2400,
    goals: parseInt(document.getElementById('goals-num').value, 10) || 0,
    assists: parseInt(document.getElementById('assists-num').value, 10) || 0,
    xg: parseFloat(document.getElementById('xg-num').value) || 0.0,
    xa: parseFloat(document.getElementById('xa-num').value) || 0.0,
    shots: parseFloat(document.getElementById('shots').value) || 0.0,
    key_passes: parseFloat(document.getElementById('key-passes').value) || 0.0,
    progressive_carries: parseFloat(document.getElementById('prog-carries').value) || 0.0,
    progressive_passes: parseFloat(document.getElementById('prog-passes').value) || 0.0,
    tackles: parseFloat(document.getElementById('tackles').value) || 0.0,
    interceptions: parseFloat(document.getElementById('interceptions').value) || 0.0,
    aerial_wins: parseFloat(document.getElementById('aerial-wins').value) || 0.0,
    recoveries: 30.0,
    clean_sheets: parseInt(document.getElementById('clean-sheets').value, 10) || 0
  };
}

async function executePrediction() {
  const payload = getPayload();
  const heroCard = document.getElementById('hero-card');

  const postApi = async (url) => {
    return await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  };

  try {
    let res;
    try {
      res = await postApi('/api/model/predict');
      if (!res.ok && res.status !== 422) {
        throw new Error('Local failed');
      }
    } catch (e) {
      res = await postApi('https://playervalue.up.railway.app/api/model/predict');
    }

    if (!res.ok) throw new Error('Prediction API error');
    const data = await res.json();

    if (heroCard) heroCard.classList.remove('hero-loading');
    renderPredictionResults(data);

    if (compareMode) {
      if (currentScenario === 'A') scenarioA = data;
      else scenarioB = data;
      renderCompareBanner();
    }
  } catch (err) {
    console.error(err);
    if (heroCard) heroCard.classList.remove('hero-loading');
    const numEl = document.getElementById('hero-val-num');
    if (numEl) numEl.textContent = 'Retry';
  }
}

function renderPredictionResults(data) {
  const val = data.predicted_value_eur;
  const numElem = document.getElementById('hero-val-num');

  // 1. Hero count-up animation
  animateHeroValue(numElem, val);

  // Milestone check (>€100M)
  const heroContainer = document.getElementById('hero-val-container');
  if (heroContainer) {
    if (val >= 100000000) {
      heroContainer.classList.add('milestone');
    } else {
      heroContainer.classList.remove('milestone');
    }
  }

  // 2. Delta Chip vs previous state
  renderDeltaChip(val);
  previousValuation = val;

  // 3. 80% Quantile Range Bar
  renderRangeBar(data.confidence_range_eur.low, val, data.confidence_range_eur.high);

  // 4. Confidence indicator
  renderConfidenceBadge(data.confidence_level, data.confidence_reason);

  // 5. Tree-SHAP Waterfall Chart
  renderWaterfallChart(data.baseline_value_eur, data.top_factors, val);

  // 6. Tabs
  renderAgeCurve(data.age_curve, data.predicted_value_eur);
  renderPercentiles(data.percentiles);
  renderComparables(data.comparable_players);

  // Mobile bottom sheet update
  const mobVal = document.getElementById('mob-sheet-val');
  const mobRange = document.getElementById('mob-sheet-range');
  if (mobVal) mobVal.textContent = formatM(val);
  if (mobRange) mobRange.textContent = `${formatM(data.confidence_range_eur.low)} – ${formatM(data.confidence_range_eur.high)} (80% CI)`;
}

function animateHeroValue(element, target) {
  if (!element) return;
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReducedMotion) {
    element.textContent = (target / 1e6).toFixed(1) + 'M';
    return;
  }

  const start = previousValuation !== null ? previousValuation : target * 0.8;
  const duration = 400; // 400ms ease-out
  const startTime = performance.now();

  function update(now) {
    const elapsed = now - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const easeOut = 1 - Math.pow(1 - progress, 3);
    const current = start + (target - start) * easeOut;

    element.textContent = (current / 1e6).toFixed(1) + 'M';

    if (progress < 1) {
      requestAnimationFrame(update);
    } else {
      element.textContent = (target / 1e6).toFixed(1) + 'M';
    }
  }

  requestAnimationFrame(update);
}

function renderDeltaChip(val) {
  const chip = document.getElementById('delta-chip');
  if (!chip) return;

  if (previousValuation === null || previousValuation === val) {
    chip.style.display = 'none';
    return;
  }

  const diff = val - previousValuation;
  chip.style.display = 'inline-flex';
  chip.classList.remove('positive', 'negative', 'fade-out');

  const sign = diff >= 0 ? '+' : '';
  chip.textContent = `${sign}€${(diff / 1e6).toFixed(1)}M`;
  chip.classList.add(diff >= 0 ? 'positive' : 'negative');

  setTimeout(() => {
    chip.classList.add('fade-out');
  }, 1500);
}

function renderRangeBar(low, mid, high) {
  const bar = document.getElementById('range-active-bar');
  const point = document.getElementById('range-point');
  const labelLow = document.getElementById('range-label-low');
  const labelHigh = document.getElementById('range-label-high');

  const minScale = Math.max(0, low * 0.7);
  const maxScale = high * 1.25;
  const total = maxScale - minScale;

  const leftPct = Math.max(0, Math.min(100, ((low - minScale) / total) * 100));
  const rightPct = Math.max(0, Math.min(100, ((high - minScale) / total) * 100));
  const pointPct = Math.max(0, Math.min(100, ((mid - minScale) / total) * 100));

  if (bar) {
    bar.style.left = `${leftPct}%`;
    bar.style.width = `${rightPct - leftPct}%`;
  }
  if (point) {
    point.style.left = `${pointPct}%`;
  }

  if (labelLow) labelLow.textContent = formatM(low);
  if (labelHigh) labelHigh.textContent = formatM(high);
}

function renderConfidenceBadge(level, reason) {
  const dot = document.getElementById('confidence-dot');
  const text = document.getElementById('confidence-text');
  if (!dot || !text) return;

  dot.className = `confidence-dot ${level}`;
  text.textContent = level === 'high' ? 'High Confidence (1,800+ mins)' :
                     (level === 'medium' ? 'Standard Sample' : 'Low Confidence (<900 mins or extreme)');
  text.title = reason;
}

function renderWaterfallChart(baseline, topFactors, finalVal) {
  const container = document.getElementById('waterfall-list');
  if (!container) return;

  const maxAbs = Math.max(baseline, finalVal, ...topFactors.map(f => Math.abs(f.contribution_eur)));

  let html = `
    <div class="waterfall-row">
      <span class="waterfall-label">Baseline Value</span>
      <div class="waterfall-bar-container">
        <div class="waterfall-bar baseline" style="width: ${Math.min(100, (baseline / maxAbs) * 100)}%;"></div>
      </div>
      <span class="waterfall-val neutral">${formatM(baseline)}</span>
    </div>
  `;

  topFactors.forEach(factor => {
    const isPos = factor.direction === 'positive';
    const absVal = Math.abs(factor.contribution_eur);
    const widthPct = Math.max(6, Math.min(100, (absVal / maxAbs) * 100));
    const sign = isPos ? '+' : '-';

    html += `
      <div class="waterfall-row" title="${factor.feature}: ${sign}${formatM(absVal)} (SHAP log contribution: ${factor.log_contribution})">
        <span class="waterfall-label">${factor.feature}</span>
        <div class="waterfall-bar-container">
          <div class="waterfall-bar ${isPos ? 'positive' : 'negative'}" style="width: ${widthPct}%;"></div>
        </div>
        <span class="waterfall-val ${isPos ? 'positive' : 'negative'}">${sign}${formatM(absVal)}</span>
      </div>
    `;
  });

  html += `
    <div class="waterfall-row" style="border-top: 1px solid var(--pv-border); padding-top: 6px; margin-top: 4px;">
      <span class="waterfall-label" style="font-weight: 600; color: var(--pv-text);">Final Value</span>
      <div class="waterfall-bar-container">
        <div class="waterfall-bar positive" style="width: ${Math.min(100, (finalVal / maxAbs) * 100)}%;"></div>
      </div>
      <span class="waterfall-val positive" style="font-size: 13px;">${formatM(finalVal)}</span>
    </div>
  `;

  container.innerHTML = html;
}

function renderAgeCurve(ageCurve, currentVal) {
  const canvas = document.getElementById('age-chart-canvas');
  if (!canvas || !window.Chart) return;

  const labels = ageCurve.map(pt => pt.age);
  const values = ageCurve.map(pt => pt.value_eur / 1e6);

  if (ageChartInstance) {
    ageChartInstance.destroy();
  }

  const isDark = document.documentElement.getAttribute('data-theme') !== 'light';
  const textColor = isDark ? '#8B919A' : '#6B7280';
  const gridColor = isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)';

  ageChartInstance = new Chart(canvas, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: 'Projected Value (€M)',
        data: values,
        borderColor: '#34D399',
        borderWidth: 2,
        fill: {
          target: 'origin',
          above: 'rgba(52, 211, 153, 0.08)'
        },
        pointBackgroundColor: ageCurve.map(pt => pt.is_current ? '#FFFFFF' : (pt.is_peak ? '#34D399' : 'transparent')),
        pointBorderColor: ageCurve.map(pt => pt.is_current ? '#34D399' : '#34D399'),
        pointRadius: ageCurve.map(pt => pt.is_current ? 6 : (pt.is_peak ? 4 : 0)),
        pointHoverRadius: 6,
        tension: 0.35
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#000000',
          titleColor: '#FFFFFF',
          bodyColor: '#34D399',
          padding: 8,
          displayColors: false,
          callbacks: {
            label: (ctx) => `€${ctx.parsed.y.toFixed(1)}M at age ${ctx.label}`
          }
        }
      },
      scales: {
        x: {
          grid: { color: gridColor },
          ticks: { color: textColor, font: { size: 11 } }
        },
        y: {
          grid: { color: gridColor },
          ticks: {
            color: textColor,
            font: { size: 11 },
            callback: (v) => `€${v}M`
          }
        }
      }
    }
  });
}

function renderPercentiles(percentiles) {
  setPercentile('p-finish', percentiles.finishing);
  setPercentile('p-create', percentiles.creation);
  setPercentile('p-prog', percentiles.progression);
  setPercentile('p-def', percentiles.defending);
}

function setPercentile(key, val) {
  const fill = document.getElementById(`${key}-fill`);
  const label = document.getElementById(`${key}-val`);
  if (fill) fill.style.width = `${val}%`;
  if (label) label.textContent = `${val}th %ile`;
}

function renderComparables(comparables) {
  const container = document.getElementById('comparables-list');
  if (!container) return;

  if (!comparables || comparables.length === 0) {
    container.innerHTML = '<div style="font-size:12px; color:var(--pv-muted); padding:10px 0;">No direct match found in dataset.</div>';
    return;
  }

  container.innerHTML = comparables.map(c => {
    const avatarHtml = typeof createPlayerAvatar === 'function' ?
      createPlayerAvatar(c.name, c.position, 'comparable-avatar') :
      `<div class="comparable-avatar">${c.name.slice(0, 2).toUpperCase()}</div>`;

    return `
      <div class="comparable-row">
        <div class="comparable-player-info">
          ${avatarHtml}
          <div>
            <div class="comparable-name">${c.name}</div>
            <div class="comparable-sub">${c.club} · Age ${c.age} · ${c.position}</div>
          </div>
        </div>
        <div class="comparable-right">
          <div class="comparable-val">€${(c.market_value_eur / 1e6).toFixed(1)}M</div>
          <div class="similarity-badge">${c.similarity_percent}% Match</div>
        </div>
      </div>
    `;
  }).join('');
}

function applyPreset(key) {
  const p = PRESETS[key];
  if (!p) return;

  document.querySelectorAll('.preset-chip').forEach(c => {
    c.classList.toggle('active', c.dataset.preset === key);
  });

  // Segmented position
  document.querySelectorAll('.segmented-btn').forEach(btn => {
    const isMatch = btn.dataset.pos === p.position;
    btn.classList.toggle('active', isMatch);
  });
  document.getElementById('pos-value').value = p.position;
  updatePositionSpecificFields(p.position);

  // League
  const leagueSelect = document.getElementById('league-select');
  if (leagueSelect) {
    for (let i = 0; i < leagueSelect.options.length; i++) {
      if (leagueSelect.options[i].dataset.rating === p.league) {
        leagueSelect.selectedIndex = i;
        break;
      }
    }
    const opt = leagueSelect.options[leagueSelect.selectedIndex];
    document.getElementById('league-badge').textContent = `${opt.dataset.rating} ★`;
  }

  // Inputs
  setInputValue('age', p.age);
  setInputValue('minutes', p.minutes);
  setInputValue('goals', p.goals);
  setInputValue('assists', p.assists);
  setInputValue('xg', p.xg);
  setInputValue('xa', p.xa);

  setField('shots', p.shots);
  setField('key-passes', p.key_passes);
  setField('prog-carries', p.progressive_carries);
  setField('prog-passes', p.progressive_passes);
  setField('tackles', p.tackles);
  setField('interceptions', p.interceptions);
  setField('aerial-wins', p.aerial_wins);
  setField('clean-sheets', p.clean_sheets);

  updatePer90Calculations();
  syncToUrl();
  executePrediction();
}

function setInputValue(key, val) {
  const s = document.getElementById(`${key}-slider`);
  const n = document.getElementById(`${key}-num`);
  if (s) s.value = val;
  if (n) n.value = val;
}

function setField(id, val) {
  const el = document.getElementById(id);
  if (el) el.value = val;
}

function formatM(val) {
  if (!val && val !== 0) return '€--M';
  return `€${(val / 1e6).toFixed(1)}M`;
}

// URL Persistence
function syncToUrl() {
  const p = getPayload();
  const params = new URLSearchParams({
    pos: p.position,
    age: p.age,
    lg: p.league_strength,
    min: p.minutes,
    g: p.goals,
    a: p.assists,
    xg: p.xg,
    xa: p.xa
  });
  const newUrl = `${window.location.pathname}?${params.toString()}`;
  window.history.replaceState({}, '', newUrl);
}

function loadFromUrlOrPreset() {
  const params = new URLSearchParams(window.location.search);
  if (params.has('pos')) {
    const pos = params.get('pos');
    document.getElementById('pos-value').value = pos;
    document.querySelectorAll('.segmented-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.pos === pos);
    });
    updatePositionSpecificFields(pos);

    if (params.has('age')) setInputValue('age', parseInt(params.get('age'), 10));
    if (params.has('min')) setInputValue('minutes', parseInt(params.get('min'), 10));
    if (params.has('g')) setInputValue('goals', parseInt(params.get('g'), 10));
    if (params.has('a')) setInputValue('assists', parseInt(params.get('a'), 10));
    if (params.has('xg')) setInputValue('xg', parseFloat(params.get('xg')));
    if (params.has('xa')) setInputValue('xa', parseFloat(params.get('xa')));

    updatePer90Calculations();
    executePrediction();
  } else {
    applyPreset('haaland');
  }
}

function copyShareableLink() {
  syncToUrl();
  navigator.clipboard.writeText(window.location.href).then(() => {
    showToast('✓ Link copied to clipboard');
  }).catch(() => {
    showToast('Copied scenario link');
  });
}

function showToast(msg) {
  let toast = document.getElementById('pv-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'pv-toast';
    toast.className = 'pv-toast';
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => {
    toast.classList.remove('show');
  }, 2200);
}

// Compare A/B Mode
function toggleCompareMode() {
  compareMode = !compareMode;
  const btn = document.getElementById('compare-btn');
  const banner = document.getElementById('compare-banner');

  if (btn) btn.classList.toggle('active', compareMode);
  if (banner) banner.classList.toggle('active', compareMode);

  if (compareMode) {
    currentScenario = 'A';
    scenarioA = null;
    scenarioB = null;
    showToast('Compare mode enabled: Scenario A vs B');
    executePrediction();
  }
}

function switchScenario(which) {
  currentScenario = which;
  document.getElementById('scen-btn-a').classList.toggle('active', which === 'A');
  document.getElementById('scen-btn-b').classList.toggle('active', which === 'B');
  executePrediction();
}

function renderCompareBanner() {
  if (!scenarioA || !scenarioB) return;
  const diffElem = document.getElementById('compare-diff-chip');
  if (!diffElem) return;

  const diff = scenarioA.predicted_value_eur - scenarioB.predicted_value_eur;
  const pct = ((diff / scenarioB.predicted_value_eur) * 100).toFixed(1);
  const sign = diff >= 0 ? '+' : '';
  diffElem.textContent = `Scenario A is ${sign}€${(diff / 1e6).toFixed(1)}M (${sign}${pct}%) vs B`;
}
