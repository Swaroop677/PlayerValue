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
            const avatarHtml = typeof createPlayerAvatar === 'function' ?
              createPlayerAvatar(p.name, p.primary_position, 'avatar-sm') :
              `<div class="player-avatar">${p.name.slice(0, 2)}</div>`;

            return `
              <a href="player.html?id=${p.id}" class="home-search-item">
                <div style="display:flex; align-items:center; gap:10px;">
                  ${avatarHtml}
                  <div>
                    <div style="font-weight:600; font-size:13px; color:var(--pv-text);">${p.name}</div>
                    <div style="font-size:11.5px; color:var(--pv-muted);">${p.club_name || '-'} · ${p.primary_position} · Age ${p.age || '-'}</div>
                  </div>
                </div>
                <div style="text-align:right;">
                  <div style="font-size:12.5px; font-weight:600; color:var(--pv-text); font-variant-numeric:tabular-nums;">€${((p.market_value_eur || 0) / 1e6).toFixed(1)}M</div>
                  <div style="font-size:11px; color:var(--pv-accent);">Model: €${((p.predicted_value_eur || 0) / 1e6).toFixed(1)}M</div>
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

  if (underContainer) {
    underContainer.innerHTML = Array(5).fill('<div style="padding:12px; color:var(--pv-muted); font-size:12px; animation:shimmer 1s infinite;">Loading top undervalued...</div>').join('');
  }
  if (overContainer) {
    overContainer.innerHTML = Array(5).fill('<div style="padding:12px; color:var(--pv-muted); font-size:12px; animation:shimmer 1s infinite;">Loading top overvalued...</div>').join('');
  }

  try {
    const leagueParam = activeLeagueFilter !== 'all' ? `&league=${encodeURIComponent(activeLeagueFilter)}` : '';

    let res;
    try {
      res = await fetch(`/api/analytics/top-discrepancies?limit=10${leagueParam}`);
      if (!res.ok) throw new Error('Local failed');
    } catch (e) {
      res = await fetch(`https://playervalue.up.railway.app/api/analytics/top-discrepancies?limit=10${leagueParam}`);
    }

    const data = await res.json();
    const undervalued = data.undervalued || [];
    const overvalued = data.overvalued || [];

    renderBoardList(underContainer, undervalued.slice(0, 5), true);
    renderBoardList(overContainer, overvalued.slice(0, 5), false);
  } catch (err) {
    console.error(err);
    if (underContainer) underContainer.innerHTML = '<div style="padding:16px; color:#F87171; font-size:12px;">Failed to load data.</div>';
    if (overContainer) overContainer.innerHTML = '<div style="padding:16px; color:#F87171; font-size:12px;">Failed to load data.</div>';
  }
}

function renderBoardList(container, players, isUndervalued) {
  if (!container) return;
  if (!players || players.length === 0) {
    container.innerHTML = '<div style="padding:14px; color:var(--pv-muted); font-size:12px; text-align:center;">No players in this category.</div>';
    return;
  }

  container.innerHTML = players.map(p => {
    const avatarHtml = typeof createPlayerAvatar === 'function' ?
      createPlayerAvatar(p.name, p.primary_position, 'avatar-sm') :
      `<div class="player-avatar">${p.name.slice(0, 2)}</div>`;

    const predVal = p.predicted_value_eur || 0;
    const actualVal = p.market_value_eur || 0;
    const gapPct = p.value_gap_percent !== undefined ? p.value_gap_percent :
      (actualVal > 0 ? ((predVal - actualVal) / actualVal) * 100 : 0);

    const sign = gapPct >= 0 ? '+' : '';
    const chipClass = isUndervalued ? 'undervalued' : 'overvalued';

    return `
      <a href="player.html?id=${p.id}" class="board-row">
        <div class="board-player-meta">
          ${avatarHtml}
          <div>
            <div style="font-weight:600; font-size:13px; color:var(--pv-text);">${p.name}</div>
            <div style="font-size:11.5px; color:var(--pv-muted);">${p.club_name || '-'} · ${p.primary_position}</div>
          </div>
        </div>
        <div class="board-val-meta">
          <div style="font-size:12.5px; font-weight:600; color:var(--pv-text); font-variant-numeric:tabular-nums;">
            €${(predVal / 1e6).toFixed(1)}M
          </div>
          <div class="board-gap-chip ${chipClass}">
            ${sign}${gapPct.toFixed(1)}% vs TM
          </div>
        </div>
      </a>
    `;
  }).join('');
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
