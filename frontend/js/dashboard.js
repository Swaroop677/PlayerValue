/**
 * Homepage Dashboard Logic
 * Minimalist framing: "Which players is the market getting wrong?"
 * Cmd+K Quick Search, Live Market Board, Spotlight Player, and Honest Trust Strip
 */

let activeLeagueFilter = 'all';

document.addEventListener('DOMContentLoaded', () => {
  initPage('dashboard');
  setupKeyboardShortcut();
  setupSearchAutocomplete();
  setupLeaguePills();
  loadMarketBoard();
  loadSpotlightPlayer();
  loadTrustMetrics();
});

// Cmd+K / Ctrl+K keyboard shortcut
function setupKeyboardShortcut() {
  document.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      const input = document.getElementById('home-search-input');
      if (input) {
        input.focus();
        input.select();
      }
    }
  });
}

function setupSearchAutocomplete() {
  const input = document.getElementById('home-search-input');
  const dropdown = document.getElementById('home-search-dropdown');
  if (!input || !dropdown) return;

  let timer = null;

  input.addEventListener('input', () => {
    clearTimeout(timer);
    const q = input.value.trim();
    if (!q || q.length < 2) {
      dropdown.classList.remove('active');
      return;
    }

    timer = setTimeout(async () => {
      try {
        let res;
        try {
          res = await fetch(`/api/players?name=${encodeURIComponent(q)}&page=1&page_size=6`);
          if (!res.ok) throw new Error('Local failed');
        } catch (e) {
          res = await fetch(`https://playervalue.up.railway.app/api/players?name=${encodeURIComponent(q)}&page=1&page_size=6`);
        }
        const data = await res.json();
        const items = data.items || [];

        if (items.length > 0) {
          dropdown.innerHTML = items.map(p => {
            const name = typeof safeText === 'function' ? safeText(p.name, 'Player') : (p.name || 'Player');
            const club = typeof safeText === 'function' ? safeText(p.club_name, '') : (p.club_name || '');
            const pos = typeof safeText === 'function' ? safeText(p.primary_position, '—') : (p.primary_position || '—');
            const ageStr = p.age ? `Age ${p.age}` : '';
            const metaParts = [club, pos, ageStr].filter(Boolean).join(' · ') || '—';
            const mvStr = typeof formatCurrency === 'function' ? formatCurrency(p.market_value_eur) : `€${((p.market_value_eur || 0) / 1e6).toFixed(1)}M`;
            const pvStr = typeof formatCurrency === 'function' ? formatCurrency(p.predicted_value_eur) : `€${((p.predicted_value_eur || 0) / 1e6).toFixed(1)}M`;

            const avatarHtml = typeof createPlayerAvatar === 'function' ?
              createPlayerAvatar(name, pos, 'avatar-sm') :
              `<div class="player-avatar">${name.slice(0, 2)}</div>`;

            return `
              <a href="player.html?id=${p.id}" class="home-search-item">
                <div style="display:flex; align-items:center; gap:10px;">
                  ${avatarHtml}
                  <div>
                    <div style="font-weight:600; font-size:13px; color:var(--pv-text);">${name}</div>
                    <div style="font-size:11.5px; color:var(--pv-muted);">${metaParts}</div>
                  </div>
                </div>
                <div style="text-align:right;">
                  <div style="font-size:12.5px; font-weight:600; color:var(--pv-text); font-variant-numeric:tabular-nums;">${mvStr}</div>
                  <div style="font-size:11px; color:var(--pv-accent);">Model: ${pvStr}</div>
                </div>
              </a>
            `;
          }).join('');
          dropdown.classList.add('active');
        } else {
          dropdown.innerHTML = `<div style="padding:14px; font-size:12.5px; color:var(--pv-muted); text-align:center;">No players found matching "${q}"</div>`;
          dropdown.classList.add('active');
        }
      } catch (err) {
        console.warn('Search error:', err);
      }
    }, 220);
  });

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') dropdown.classList.remove('active');
  });

  document.addEventListener('click', (e) => {
    if (!input.contains(e.target) && !dropdown.contains(e.target)) {
      dropdown.classList.remove('active');
    }
  });
}

function setupLeaguePills() {
  document.querySelectorAll('.league-pill').forEach(pill => {
    pill.addEventListener('click', () => {
      document.querySelectorAll('.league-pill').forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      activeLeagueFilter = pill.dataset.league;
      loadMarketBoard();
    });
  });
}

async function loadMarketBoard() {
  const underContainer = document.getElementById('board-undervalued-list');
  const overContainer = document.getElementById('board-overvalued-list');

  // Render skeleton rows while loading
  const skeletonHtml = Array(5).fill(`
    <div class="board-skeleton-row" aria-hidden="true">
      <div class="board-skeleton-avatar"></div>
      <div class="board-skeleton-meta">
        <div class="board-skeleton-line name"></div>
        <div class="board-skeleton-line sub"></div>
      </div>
      <div class="board-skeleton-val">
        <div class="board-skeleton-line val"></div>
        <div class="board-skeleton-line chip"></div>
      </div>
    </div>
  `).join('');

  if (underContainer) underContainer.innerHTML = skeletonHtml;
  if (overContainer) overContainer.innerHTML = skeletonHtml;

  try {
    const leagueParam = activeLeagueFilter !== 'all' ? `&league=${encodeURIComponent(activeLeagueFilter)}` : '';

    let res;
    try {
      res = await fetch(`/api/analytics/top-discrepancies?limit=10${leagueParam}`);
      if (!res.ok) throw new Error('Local failed');
    } catch (e) {
      res = await fetch(`https://playervalue.up.railway.app/api/analytics/top-discrepancies?limit=10${leagueParam}`);
    }

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    const rawUndervalued = data.undervalued || [];
    const rawOvervalued = data.overvalued || [];

    // Helper to deduplicate by player id and filter invalid rows
    const cleanList = (list) => {
      const seen = new Set();
      const deduped = [];
      for (const p of list) {
        if (!p || !p.id) continue;
        if (seen.has(p.id)) continue;
        seen.add(p.id);

        const marketVal = p.market_value_eur ?? p.actual_market_value_eur ?? p.actual_eur ?? p.market_value;
        const mins = p.minutes !== undefined ? Number(p.minutes) : 999;

        // Filter out rows with null, zero, or negative market value
        if (marketVal === null || marketVal === undefined || isNaN(Number(marketVal)) || Number(marketVal) <= 0) {
          continue;
        }
        // Filter out invalid minutes
        if (isNaN(mins) || mins < 0) {
          continue;
        }

        deduped.push(p);
      }
      return deduped;
    };

    const cleanUndervalued = cleanList(rawUndervalued);
    const cleanOvervalued = cleanList(rawOvervalued);

    renderBoardList(underContainer, cleanUndervalued.slice(0, 5), true);
    renderBoardList(overContainer, cleanOvervalued.slice(0, 5), false);

    // Sanity check for forbidden strings
    verifyRenderedBoard();
  } catch (err) {
    console.error('[Dashboard] Discrepancies fetch failed:', err);
    const renderError = (container) => {
      if (!container) return;
      container.innerHTML = `
        <div class="board-error-state">
          <div>Failed to load market discrepancies.</div>
          <button type="button" class="board-retry-btn">
            Retry
          </button>
        </div>
      `;
      container.querySelector('.board-retry-btn')?.addEventListener('click', () => loadMarketBoard());
    };
    renderError(underContainer);
    renderError(overContainer);
  }
}

function renderBoardList(container, players, isUndervalued) {
  if (!container) return;
  if (!players || players.length === 0) {
    container.innerHTML = '<div style="padding:20px; color:var(--pv-muted); font-size:12.5px; text-align:center;">No players in this category.</div>';
    return;
  }

  // Safe formatter fallbacks
  const fmtMoney = typeof formatCurrency === 'function' ? formatCurrency : (v) => (v ? `€${(v / 1e6).toFixed(1)}M` : '—');
  const fmtPercent = typeof formatPercent === 'function' ? formatPercent : (v) => (v !== undefined ? `${Number(v) > 0 ? '+' : ''}${Number(v).toFixed(1)}%` : '—');
  const txtSafe = typeof safeText === 'function' ? safeText : (v, d = '—') => (v ? String(v) : d);

  container.innerHTML = players.map(p => {
    const name = txtSafe(p.name, 'Unknown Player');
    const pos = txtSafe(p.primary_position || p.position, '—');
    const club = txtSafe(p.club_name || p.club || p.current_club, '');
    const metaSub = club ? `${club} · ${pos}` : pos;

    const avatarHtml = typeof createPlayerAvatar === 'function' ?
      createPlayerAvatar(name, pos, 'avatar-sm') :
      `<div class="player-avatar">${name.slice(0, 2)}</div>`;

    const predVal = p.predicted_value_eur ?? p.predicted_eur ?? p.model_value ?? 0;
    const actualVal = p.market_value_eur ?? p.actual_market_value_eur ?? p.actual_eur ?? p.market_value ?? 0;
    
    let gapPct = p.value_gap_percent !== undefined ? Number(p.value_gap_percent) :
      (p.gap_percent !== undefined ? Number(p.gap_percent) :
      (p.difference_percent !== undefined ? Number(p.difference_percent) :
      (actualVal > 0 ? ((predVal - actualVal) / actualVal) * 100 : 0)));

    const chipClass = isUndervalued ? 'undervalued' : 'overvalued';
    const formattedVal = fmtMoney(predVal);
    const formattedGap = fmtPercent(gapPct);

    return `
      <a href="player.html?id=${p.id}" class="board-row">
        <div class="board-player-meta">
          ${avatarHtml}
          <div>
            <div style="font-weight:600; font-size:13px; color:var(--pv-text);">${name}</div>
            <div style="font-size:11.5px; color:var(--pv-muted);">${metaSub}</div>
          </div>
        </div>
        <div class="board-val-meta">
          <div style="font-size:12.5px; font-weight:600; color:var(--pv-text); font-variant-numeric:tabular-nums;">
            ${formattedVal}
          </div>
          <div class="board-gap-chip ${chipClass}">
            ${formattedGap} vs TM
          </div>
        </div>
      </a>
    `;
  }).join('');
}

function verifyRenderedBoard() {
  const container = document.querySelector('.market-board-grid') || document.body;
  if (!container) return;
  const html = container.innerHTML;
  const forbidden = ['undefined', 'NaN', 'null', '€0.0M', '- · undefined'];
  for (const item of forbidden) {
    if (html.includes(item)) {
      console.warn(`[DATA BUG WARNING] Found forbidden string "${item}" in rendered discrepancy board.`);
    }
  }
}

function loadSpotlightPlayer() {
  const spotlight = {
    name: "Brennan Johnson",
    club: "Tottenham Hotspur",
    position: "RW",
    age: 23,
    market_val: 30000000,
    model_val: 25400000,
    goals: 11,
    assists: 4,
    xg: 10.2,
    xa: 3.8,
    minutes: 2200,
    drivers: [
      { name: "Non-Penalty xG /90", impact: "+€3.4M", pos: true, pct: 72 },
      { name: "Attacking Box Touches", impact: "+€2.1M", pos: true, pct: 54 },
      { name: "Age Trajectory (23)", impact: "+€1.8M", pos: true, pct: 40 },
      { name: "Cross Success Rate", impact: "-€1.2M", pos: false, pct: 28 }
    ]
  };

  const nameEl = document.getElementById('spotlight-name');
  const subEl = document.getElementById('spotlight-sub');
  const modelValEl = document.getElementById('spotlight-model-val');
  const tmValEl = document.getElementById('spotlight-tm-val');
  const waterfallBox = document.getElementById('spotlight-waterfall-box');
  const predictorLink = document.getElementById('spotlight-predictor-btn');

  if (nameEl) nameEl.textContent = spotlight.name;
  if (subEl) subEl.textContent = `${spotlight.club} · Age ${spotlight.age} · ${spotlight.position}`;
  if (modelValEl) modelValEl.textContent = `€${(spotlight.model_val / 1e6).toFixed(1)}M`;
  if (tmValEl) tmValEl.textContent = `€${(spotlight.market_val / 1e6).toFixed(1)}M`;

  if (predictorLink) {
    const params = new URLSearchParams({
      pos: spotlight.position,
      age: spotlight.age,
      min: spotlight.minutes,
      g: spotlight.goals,
      a: spotlight.assists,
      xg: spotlight.xg,
      xa: spotlight.xa
    });
    predictorLink.href = `predictor.html?${params.toString()}`;
  }

  if (waterfallBox) {
    waterfallBox.innerHTML = `
      <div style="font-size:11.5px; font-weight:600; text-transform:uppercase; color:var(--pv-muted); margin-bottom:12px;">Top Statistical Valuation Drivers</div>
      ${spotlight.drivers.map(d => `
        <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:8px; font-size:12px;">
          <span style="color:var(--pv-text-secondary);">${d.name}</span>
          <div style="display:flex; align-items:center; gap:8px;">
            <div style="width:80px; height:5px; background:var(--pv-surface-3); border-radius:3px; overflow:hidden;">
              <div style="width:${d.pct}%; height:100%; background:${d.pos ? 'var(--pv-accent)' : '#F87171'}; border-radius:3px;"></div>
            </div>
            <span style="font-weight:600; color:${d.pos ? 'var(--pv-accent)' : '#F87171'}; width:48px; text-align:right;">${d.impact}</span>
          </div>
        </div>
      `).join('')}
    `;
  }
}

async function loadTrustMetrics() {
  try {
    let res;
    try {
      res = await fetch('/api/model/metrics');
      if (!res.ok) throw new Error('Local failed');
    } catch (e) {
      res = await fetch('data/model_metrics.json');
    }

    const data = await res.json();
    const heldOut = data.held_out_evaluation || {};

    setTrustVal('trust-players', '1,886');
    setTrustVal('trust-mae', heldOut.mae_eur ? `€${(heldOut.mae_eur / 1e6).toFixed(2)}M` : '€10.37M');
    setTrustVal('trust-ci', heldOut.ci_80_empirical_coverage ? `${heldOut.ci_80_empirical_coverage.toFixed(1)}%` : '73.4%');
    setTrustVal('trust-r2', heldOut.r2_log ? heldOut.r2_log.toFixed(4) : '0.2488');
  } catch (err) {
    console.warn('Trust metrics fetch fallback:', err);
    setTrustVal('trust-players', '1,886');
    setTrustVal('trust-mae', '€10.37M');
    setTrustVal('trust-ci', '73.4%');
    setTrustVal('trust-r2', '0.2488');
  }
}

function setTrustVal(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}
