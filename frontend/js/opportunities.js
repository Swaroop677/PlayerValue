/**
 * Opportunities & Unified Scouting Suite Logic
 * Market Arbitrage, Star-Bias Caveat, Minutes Filter, Diverging Gap Bars, and Slide-Over Drawer
 */

let activeTab = 'opportunities';
let oppFilters = {
  page: 1,
  page_size: 20,
  min_minutes: 900,
  min_gap_percent: 0.01,
  position: '',
  max_age: null,
  max_value: null
};

let scoutingFilters = {
  page: 1,
  page_size: 20,
  position: '',
  min_age: null,
  max_age: null,
  max_value: null,
  min_minutes: 900,
  min_goals: null,
  min_assists: null,
  min_tackles_per_90: null,
  min_interceptions_per_90: null
};

let selectedForCompare = new Set();
let cachedPlayersMap = new Map();

document.addEventListener('DOMContentLoaded', () => {
  initPage('opportunities');
  initOpportunitiesSuite();
});

function initOpportunitiesSuite() {
  setupTabs();
  setupFilterListeners();
  setupDrawerListeners();

  // Check URL query for tab selection (e.g. ?tab=scouting)
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('tab') === 'scouting') {
    switchSuiteTab('scouting');
  } else {
    loadOpportunitiesData();
  }
}

function setupTabs() {
  const oppTabBtn = document.getElementById('tab-btn-opp');
  const scoutTabBtn = document.getElementById('tab-btn-scout');

  if (oppTabBtn) oppTabBtn.addEventListener('click', () => switchSuiteTab('opportunities'));
  if (scoutTabBtn) scoutTabBtn.addEventListener('click', () => switchSuiteTab('scouting'));
}

function switchSuiteTab(tab) {
  activeTab = tab;
  const oppTabBtn = document.getElementById('tab-btn-opp');
  const scoutTabBtn = document.getElementById('tab-btn-scout');
  const oppSection = document.getElementById('opp-section');
  const scoutSection = document.getElementById('scout-section');

  if (oppTabBtn) oppTabBtn.classList.toggle('active', tab === 'opportunities');
  if (scoutTabBtn) scoutTabBtn.classList.toggle('active', tab === 'scouting');
  if (oppSection) oppSection.style.display = tab === 'opportunities' ? 'block' : 'none';
  if (scoutSection) scoutSection.style.display = tab === 'scouting' ? 'block' : 'none';

  const url = new URL(window.location.href);
  url.searchParams.set('tab', tab);
  window.history.replaceState({}, '', url.toString());

  if (tab === 'opportunities') {
    loadOpportunitiesData();
  } else {
    loadScoutingData();
  }
}

function setupFilterListeners() {
  // Opportunities Minutes Pills
  document.querySelectorAll('.opp-min-pill').forEach(pill => {
    pill.addEventListener('click', () => {
      document.querySelectorAll('.opp-min-pill').forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      const mins = parseInt(pill.dataset.mins, 10);
      oppFilters.min_minutes = mins > 0 ? mins : null;
      oppFilters.page = 1;
      loadOpportunitiesData();
    });
  });

  // Opportunities standard filters
  bindDebouncedInput('o-position', (val) => { oppFilters.position = val; oppFilters.page = 1; loadOpportunitiesData(); }, true);
  bindDebouncedInput('o-max-age', (val) => { oppFilters.max_age = val ? Number(val) : null; oppFilters.page = 1; loadOpportunitiesData(); });
  bindDebouncedInput('o-min-gap', (val) => { oppFilters.min_gap_percent = val ? Number(val) : 0.01; oppFilters.page = 1; loadOpportunitiesData(); });
  bindDebouncedInput('o-max-val', (val) => { oppFilters.max_value = val ? parseFloat(val) * 1e6 : null; oppFilters.page = 1; loadOpportunitiesData(); });

  // Scouting filters
  bindDebouncedInput('s-position', (val) => { scoutingFilters.position = val; scoutingFilters.page = 1; loadScoutingData(); }, true);
  bindDebouncedInput('s-min-age', (val) => { scoutingFilters.min_age = val ? Number(val) : null; scoutingFilters.page = 1; loadScoutingData(); });
  bindDebouncedInput('s-max-age', (val) => { scoutingFilters.max_age = val ? Number(val) : null; scoutingFilters.page = 1; loadScoutingData(); });
  bindDebouncedInput('s-max-val', (val) => { scoutingFilters.max_value = val ? parseFloat(val) * 1e6 : null; scoutingFilters.page = 1; loadScoutingData(); });
  bindDebouncedInput('s-min-goals', (val) => { scoutingFilters.min_goals = val ? Number(val) : null; scoutingFilters.page = 1; loadScoutingData(); });
  bindDebouncedInput('s-min-assists', (val) => { scoutingFilters.min_assists = val ? Number(val) : null; scoutingFilters.page = 1; loadScoutingData(); });
  bindDebouncedInput('s-min-tackles', (val) => { scoutingFilters.min_tackles_per_90 = val ? parseFloat(val) : null; scoutingFilters.page = 1; loadScoutingData(); });
  bindDebouncedInput('s-min-interceptions', (val) => { scoutingFilters.min_interceptions_per_90 = val ? parseFloat(val) : null; scoutingFilters.page = 1; loadScoutingData(); });

  const resetScoutBtn = document.getElementById('s-reset-filters');
  if (resetScoutBtn) {
    resetScoutBtn.addEventListener('click', () => {
      ['s-position', 's-min-age', 's-max-age', 's-max-val', 's-min-goals', 's-min-assists', 's-min-tackles', 's-min-interceptions'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
      });
      scoutingFilters = { page: 1, page_size: 20, min_minutes: 900 };
      loadScoutingData();
    });
  }
}

function bindDebouncedInput(id, callback, isSelect = false) {
  const el = document.getElementById(id);
  if (!el) return;
  if (isSelect) {
    el.addEventListener('change', () => callback(el.value));
  } else {
    el.addEventListener('input', debounce(() => callback(el.value), 350));
  }
}

async function loadOpportunitiesData() {
  const tbody = document.getElementById('opp-tbody');
  const pagination = document.getElementById('opp-pagination');
  if (!tbody) return;

  tbody.innerHTML = Array(6).fill(`
    <tr><td colspan="7" style="padding:16px; text-align:center; color:var(--pv-muted); animation: shimmer 1s infinite;">Loading market opportunities...</td></tr>
  `).join('');

  try {
    const params = new URLSearchParams();
    params.set('page', oppFilters.page);
    params.set('page_size', oppFilters.page_size);
    if (oppFilters.min_minutes) params.set('min_minutes', oppFilters.min_minutes);
    if (oppFilters.min_gap_percent) params.set('min_gap_percent', oppFilters.min_gap_percent);
    if (oppFilters.position) params.set('position', oppFilters.position);
    if (oppFilters.max_age) params.set('max_age', oppFilters.max_age);
    if (oppFilters.max_value) params.set('max_value', oppFilters.max_value);

    let res;
    try {
      res = await fetch(`/api/market-opportunities?${params.toString()}`);
      if (!res.ok) throw new Error('Local failed');
    } catch (e) {
      res = await fetch(`https://playervalue.up.railway.app/api/market-opportunities?${params.toString()}`);
    }

    const data = await res.json();
    const items = data.items || [];

    if (items.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" style="padding: 48px; text-align:center; color:var(--pv-muted);">No players found matching your criteria. Try adjusting the minutes or gap filters.</td></tr>`;
      if (pagination) pagination.innerHTML = '';
      return;
    }

    items.forEach(p => cachedPlayersMap.set(p.id, p));

    tbody.innerHTML = items.map(p => {
      const predVal = p.predicted_value_eur || 0;
      const actualVal = p.market_value_eur || 0;
      const gap = predVal - actualVal;
      const gapPct = p.value_gap_percent !== undefined && p.value_gap_percent !== null ?
        p.value_gap_percent : (actualVal > 0 ? (gap / actualVal) * 100 : 0);

      const mins = p.minutes || 0;
      const confLevel = mins >= 1800 ? 'high' : (mins >= 900 ? 'medium' : 'low');
      const confText = mins >= 1800 ? 'High' : (mins >= 900 ? 'Medium' : 'Low (<900m)');

      // Diverging gap bar math
      const isUndervalued = gap >= 0;
      const barFillClass = isUndervalued ? 'undervalued' : 'overvalued';
      const maxRange = Math.max(predVal, actualVal, 10000000);
      const fillWidth = Math.min(100, Math.max(8, (Math.abs(gap) / maxRange) * 100));

      const avatarHtml = typeof createPlayerAvatar === 'function' ?
        createPlayerAvatar(p.name, p.primary_position) :
        `<div class="player-avatar">${(p.name || 'P').slice(0, 2)}</div>`;

      return `
        <tr onclick="openPlayerDrawer(${p.id})">
          <td>
            <div style="display:flex; align-items:center; gap:12px;">
              ${avatarHtml}
              <div>
                <div style="font-weight:600; color:var(--pv-text);">${p.name}</div>
                <div style="font-size:12px; color:var(--pv-muted);">${p.club_name || 'Free Agent'} · ${p.league_name || ''}</div>
              </div>
            </div>
          </td>
          <td style="font-variant-numeric:tabular-nums;">${p.age || '-'}</td>
          <td><span class="${typeof getPositionBadgeClass === 'function' ? getPositionBadgeClass(p.primary_position) : 'badge'}">${p.primary_position}</span></td>
          <td style="font-variant-numeric:tabular-nums;">${mins.toLocaleString()}</td>
          <td>
            <div class="conf-badge">
              <span class="conf-dot ${confLevel}"></span>
              <span>${confText}</span>
            </div>
          </td>
          <td class="diverging-gap-cell">
            <div class="gap-labels-row">
              <span class="gap-label-model">Model: €${(predVal / 1e6).toFixed(1)}M</span>
              <span class="gap-label-market">TM: €${(actualVal / 1e6).toFixed(1)}M</span>
            </div>
            <div class="diverging-bar-track">
              <div class="diverging-bar-fill ${barFillClass}" style="width: ${fillWidth}%;"></div>
            </div>
          </td>
          <td style="font-weight:600; color:var(--pv-accent); font-variant-numeric:tabular-nums;">
            +${gapPct.toFixed(1)}%
          </td>
        </tr>
      `;
    }).join('');

    if (pagination && typeof createPagination === 'function') {
      pagination.innerHTML = createPagination(data.page, data.total_pages, 'changeOppPage');
    }
  } catch (err) {
    console.error(err);
    tbody.innerHTML = `<tr><td colspan="7" style="padding:32px; text-align:center; color:#F87171;">Failed to load market opportunities. Please retry.</td></tr>`;
  }
}

window.changeOppPage = (page) => {
  oppFilters.page = page;
  loadOpportunitiesData();
  window.scrollTo({ top: 180, behavior: 'smooth' });
};

async function loadScoutingData() {
  const tbody = document.getElementById('scout-tbody');
  const pagination = document.getElementById('scout-pagination');
  if (!tbody) return;

  tbody.innerHTML = Array(6).fill(`
    <tr><td colspan="7" style="padding:16px; text-align:center; color:var(--pv-muted); animation: shimmer 1s infinite;">Loading scouting talent pool...</td></tr>
  `).join('');

  try {
    const params = new URLSearchParams();
    params.set('page', scoutingFilters.page);
    params.set('page_size', scoutingFilters.page_size);
    if (scoutingFilters.position) params.set('position', scoutingFilters.position);
    if (scoutingFilters.min_age) params.set('min_age', scoutingFilters.min_age);
    if (scoutingFilters.max_age) params.set('max_age', scoutingFilters.max_age);
    if (scoutingFilters.max_value) params.set('max_value', scoutingFilters.max_value);
    if (scoutingFilters.min_minutes) params.set('min_minutes', scoutingFilters.min_minutes);
    if (scoutingFilters.min_goals) params.set('min_goals', scoutingFilters.min_goals);
    if (scoutingFilters.min_assists) params.set('min_assists', scoutingFilters.min_assists);
    if (scoutingFilters.min_tackles_per_90) params.set('min_tackles_per_90', scoutingFilters.min_tackles_per_90);
    if (scoutingFilters.min_interceptions_per_90) params.set('min_interceptions_per_90', scoutingFilters.min_interceptions_per_90);

    let res;
    try {
      res = await fetch(`/api/scouting?${params.toString()}`);
      if (!res.ok) throw new Error('Local failed');
    } catch (e) {
      res = await fetch(`https://playervalue.up.railway.app/api/scouting?${params.toString()}`);
    }

    const data = await res.json();
    const items = data.items || [];

    if (items.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" style="padding:48px; text-align:center; color:var(--pv-muted);">No scouting candidates match this exact criteria. Try broadening stat thresholds.</td></tr>`;
      if (pagination) pagination.innerHTML = '';
      return;
    }

    items.forEach(p => cachedPlayersMap.set(p.id, p));

    tbody.innerHTML = items.map(p => {
      const isSelected = selectedForCompare.has(p.id);
      const avatarHtml = typeof createPlayerAvatar === 'function' ?
        createPlayerAvatar(p.name, p.primary_position) :
        `<div class="player-avatar">${(p.name || 'P').slice(0, 2)}</div>`;

      return `
        <tr>
          <td onclick="event.stopPropagation();">
            <input type="checkbox" ${isSelected ? 'checked' : ''} onchange="toggleSelectPlayer(${p.id})">
          </td>
          <td onclick="openPlayerDrawer(${p.id})">
            <div style="display:flex; align-items:center; gap:12px;">
              ${avatarHtml}
              <div>
                <div style="font-weight:600; color:var(--pv-text);">${p.name}</div>
                <div style="font-size:12px; color:var(--pv-muted);">${p.club_name || 'Free Agent'}</div>
              </div>
            </div>
          </td>
          <td onclick="openPlayerDrawer(${p.id})">${p.age || '-'}</td>
          <td onclick="openPlayerDrawer(${p.id})"><span class="${typeof getPositionBadgeClass === 'function' ? getPositionBadgeClass(p.primary_position) : 'badge'}">${p.primary_position}</span></td>
          <td onclick="openPlayerDrawer(${p.id})" style="font-variant-numeric:tabular-nums;">${(p.minutes || 0).toLocaleString()}</td>
          <td onclick="openPlayerDrawer(${p.id})" style="font-variant-numeric:tabular-nums;"><strong>€${((p.market_value_eur || 0) / 1e6).toFixed(1)}M</strong></td>
          <td onclick="openPlayerDrawer(${p.id})" style="font-weight:600; color:var(--pv-accent); font-variant-numeric:tabular-nums;">€${((p.predicted_value_eur || 0) / 1e6).toFixed(1)}M</td>
        </tr>
      `;
    }).join('');

    if (pagination && typeof createPagination === 'function') {
      pagination.innerHTML = createPagination(data.page, data.total_pages, 'changeScoutPage');
    }
  } catch (err) {
    console.error(err);
    tbody.innerHTML = `<tr><td colspan="7" style="padding:32px; text-align:center; color:#F87171;">Failed to load scouting list. Please retry.</td></tr>`;
  }
}

window.changeScoutPage = (page) => {
  scoutingFilters.page = page;
  loadScoutingData();
  window.scrollTo({ top: 180, behavior: 'smooth' });
};

window.toggleSelectPlayer = (id) => {
  if (selectedForCompare.has(id)) {
    selectedForCompare.delete(id);
  } else {
    selectedForCompare.add(id);
  }
  updateCompareButton();
};

function updateCompareButton() {
  const btn = document.getElementById('btn-compare-selected');
  if (!btn) return;
  const count = selectedForCompare.size;
  btn.textContent = `Compare Selected (${count})`;
  btn.disabled = count < 2;
  btn.onclick = () => {
    if (count >= 2) {
      const ids = Array.from(selectedForCompare).join(',');
      window.location.href = `compare.html?players=${ids}`;
    }
  };
}

// Slide-Over Drawer
function setupDrawerListeners() {
  const backdrop = document.getElementById('drawer-backdrop');
  const closeBtn = document.getElementById('drawer-close-btn');

  if (backdrop) backdrop.addEventListener('click', closePlayerDrawer);
  if (closeBtn) closeBtn.addEventListener('click', closePlayerDrawer);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closePlayerDrawer();
  });
}

async function openPlayerDrawer(playerId) {
  const drawer = document.getElementById('player-drawer');
  const backdrop = document.getElementById('drawer-backdrop');
  if (!drawer || !backdrop) return;

  drawer.classList.add('open');
  backdrop.classList.add('open');
  document.body.style.overflow = 'hidden';

  const player = cachedPlayersMap.get(playerId) || { id: playerId, name: 'Loading...' };

  document.getElementById('drawer-name').textContent = player.name || 'Player';
  document.getElementById('drawer-meta').textContent = `${player.club_name || 'Club'} · Age ${player.age || '-'} · ${player.primary_position || ''}`;
  document.getElementById('drawer-pred-val').textContent = player.predicted_value_eur ? `€${(player.predicted_value_eur / 1e6).toFixed(1)}M` : '€--M';
  document.getElementById('drawer-market-val').textContent = player.market_value_eur ? `€${(player.market_value_eur / 1e6).toFixed(1)}M` : '€--M';

  // Setup avatar
  const avatarContainer = document.getElementById('drawer-avatar-container');
  if (avatarContainer) {
    avatarContainer.innerHTML = typeof createPlayerAvatar === 'function' ?
      createPlayerAvatar(player.name, player.primary_position, 'drawer-avatar') :
      `<div class="drawer-avatar">${(player.name || 'P').slice(0, 2)}</div>`;
  }

  // Prepopulate stats
  document.getElementById('drawer-stat-min').textContent = (player.minutes || 0).toLocaleString();
  document.getElementById('drawer-stat-goals').textContent = player.goals !== undefined ? player.goals : '-';
  document.getElementById('drawer-stat-assists').textContent = player.assists !== undefined ? player.assists : '-';

  // Open in Predictor URL builder
  const openPredictorBtn = document.getElementById('drawer-btn-predictor');
  if (openPredictorBtn) {
    const params = new URLSearchParams({
      pos: player.primary_position || 'ST',
      age: player.age || 24,
      min: player.minutes || 2000,
      g: player.goals || 0,
      a: player.assists || 0
    });
    openPredictorBtn.href = `predictor.html?${params.toString()}`;
  }

  // Full Profile Link
  const fullProfileBtn = document.getElementById('drawer-btn-profile');
  if (fullProfileBtn) {
    fullProfileBtn.href = `player.html?id=${playerId}`;
  }
}

function closePlayerDrawer() {
  const drawer = document.getElementById('player-drawer');
  const backdrop = document.getElementById('drawer-backdrop');
  if (drawer) drawer.classList.remove('open');
  if (backdrop) backdrop.classList.remove('open');
  document.body.style.overflow = '';
}
