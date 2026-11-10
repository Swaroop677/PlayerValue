/**
 * PlayerValue - Club Detail Page Controller
 * Redesigned for rich data density, responsive Table/Cards/Pitch views,
 * animated KPI metrics, and synchronized Chart.js visual analytics.
 */

const COUNTRY_FLAGS = {
    'England': '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
    'Spain': '🇪🇸',
    'Germany': '🇩🇪',
    'Italy': '🇮🇹',
    'France': '🇫🇷',
    'Brazil': '🇧🇷',
    'Argentina': '🇦🇷',
    'Portugal': '🇵🇹',
    'Netherlands': '🇳🇱',
    'Belgium': '🇧🇪',
    'Croatia': '🇭🇷',
    'Norway': '🇳🇴',
    'Sweden': '🇸🇪',
    'Denmark': '🇩🇰',
    'Poland': '🇵🇱',
    'Austria': '🇦🇹',
    'Switzerland': '🇨🇭',
    'Uruguay': '🇺🇾',
    'Colombia': '🇨🇴',
    'Senegal': '🇸🇳',
    'Morocco': '🇲🇦',
    'Nigeria': '🇳🇬',
    'Ghana': '🇬🇭',
    'Japan': '🇯🇵',
    'South Korea': '🇰🇷',
    'United States': '🇺🇸',
    'Canada': '🇨🇦',
    'Turkey': '🇹🇷',
    'Scotland': '🏴󠁧󠁢󠁳󠁣󠁴󠁿',
    'Wales': '🏴󠁧󠁢󠁷󠁬󠁳󠁿',
    'Northern Ireland': '🇬🇧',
    'Ireland': '🇮🇪'
};

const POSITION_10_COLORS = {
    'GK': '#6366F1',   // Indigo
    'CB': '#0EA5E9',   // Sky Blue
    'LB': '#06B6D4',   // Cyan
    'RB': '#14B8A6',   // Teal
    'DM': '#10B981',   // Emerald
    'CM': '#84CC16',   // Lime
    'AM': '#EAB308',   // Yellow
    'LW': '#F97316',   // Orange
    'RW': '#EC4899',   // Pink
    'ST': '#FF5A5F',   // Coral Red
    'CF': '#F43F5E'    // Rose
};

let currentClub = null;
let currentRoster = [];
let activeView = 'table'; // 'table' | 'cards' | 'pitch'
let activePosFilter = 'ALL';
let activeValFilter = 'ALL';
let searchQuery = '';
let currentSort = 'mv_desc';
let pageSize = 15;
let isExpanded = false;

document.addEventListener('DOMContentLoaded', async () => {
    initPage('');

    const clubId = getUrlParam('id');
    if (!clubId) {
        showError(document.getElementById('club-container'), 'No club ID specified.');
        return;
    }

    try {
        const club = await getClub(clubId);
        if (!club) throw new Error('Club not found');
        currentClub = club;
        currentRoster = (club.roster || []).map(p => {
            const mv = Number(p.market_value_eur || 0);
            const pv = Number(p.predicted_value_eur || mv);
            const gap = mv > 0 ? ((pv - mv) / mv) * 100 : 0;
            return {
                ...p,
                market_value_eur: mv,
                predicted_value_eur: pv,
                gapPercent: gap,
                gapEuro: pv - mv
            };
        });

        document.title = `PlayerValue | ${club.name}`;

        document.getElementById('breadcrumbs-container').innerHTML = createBreadcrumbs([
            { label: 'Dashboard', url: 'index.html' },
            { label: 'Clubs', url: 'clubs.html' },
            { label: club.name, url: '#' }
        ]);

        renderClub(club);
    } catch (e) {
        console.error(e);
        showError(document.getElementById('club-container'), 'Failed to load club data.');
    }
});

function renderClub(club) {
    const container = document.getElementById('club-container');

    // 1. Calculations for KPIs and Health
    const squadSize = currentRoster.length;
    const totalMarketVal = currentRoster.reduce((sum, p) => sum + p.market_value_eur, 0);
    const totalModelVal = currentRoster.reduce((sum, p) => sum + p.predicted_value_eur, 0);
    const netGapEuro = totalModelVal - totalMarketVal;
    const netGapPct = totalMarketVal > 0 ? (netGapEuro / totalMarketVal) * 100 : 0;
    const avgAge = club.avg_age || (squadSize > 0 ? (currentRoster.reduce((sum, p) => sum + (p.age || 25), 0) / squadSize).toFixed(1) : 26.0);

    const mvp = [...currentRoster].sort((a, b) => b.market_value_eur - a.market_value_eur)[0] || null;

    // Health verdict
    let healthClass = 'fair';
    let healthText = 'Squad is valued fairly by model';
    let healthIcon = '⇄';
    if (netGapPct >= 5.0) {
        healthClass = 'undervalued';
        healthText = `Squad is ${Math.abs(netGapPct).toFixed(1)}% undervalued (+${formatCurrency(netGapEuro)})`;
        healthIcon = '↗';
    } else if (netGapPct <= -5.0) {
        healthClass = 'overvalued';
        healthText = `Squad is ${Math.abs(netGapPct).toFixed(1)}% overvalued (${formatCurrency(netGapEuro)})`;
        healthIcon = '↘';
    }

    const countryFlag = COUNTRY_FLAGS[club.country] || '🌐';

    // 2. Summary strip: top 3 undervalued & top 3 overvalued
    const evaluatedPlayers = currentRoster.filter(p => p.market_value_eur >= 1_000_000);
    const topUndervalued = [...evaluatedPlayers].sort((a, b) => b.gapPercent - a.gapPercent).slice(0, 3);
    const topOvervalued = [...evaluatedPlayers].sort((a, b) => a.gapPercent - b.gapPercent).slice(0, 3);

    container.innerHTML = `
        <!-- HERO HEADER -->
        <div class="club-hero">
            <div class="club-hero-backdrop"></div>
            <div class="club-hero-content">
                <div class="club-hero-crest">
                    ${createClubLogo(club.id, club.name, 64)}
                </div>
                <div class="club-hero-meta">
                    <h1>${club.name}</h1>
                    <div class="club-hero-sub">
                        <span>${countryFlag} ${club.country || 'Europe'}</span>
                        <span class="dot">•</span>
                        <span>${club.league_name || 'Top Division'}</span>
                        <span class="dot">•</span>
                        <span>${squadSize} Players</span>
                    </div>
                    <div class="club-hero-facts">
                        <span class="fact-item"><i class="ph ph-shield-check"></i> UEFA Tier: Top Flight</span>
                        <span class="fact-item"><i class="ph ph-currency-eur"></i> Market Cap: ${formatCurrency(totalMarketVal)}</span>
                    </div>
                </div>
            </div>
            <div class="club-hero-health">
                <div class="health-pill ${healthClass}">
                    <span>${healthIcon}</span>
                    <span>${healthText}</span>
                </div>
                <div class="health-subtext">Net Value Gap: ${formatPercent(netGapPct)} Model vs TM</div>
            </div>
        </div>

        <!-- 6-CARD KPI ROW -->
        <div class="club-kpi-grid">
            <!-- 1. Squad Size -->
            <div class="club-kpi-card">
                <div class="kpi-header">
                    <span class="kpi-label">Squad Size</span>
                    <div class="kpi-icon"><i class="ph ph-users"></i></div>
                </div>
                <div class="kpi-value count-up" data-target="${squadSize}">${squadSize}</div>
                <div class="kpi-subtext">Active contracted players</div>
                <div class="kpi-progress">
                    <div class="kpi-progress-bar" style="width: ${Math.min(100, (squadSize / 30) * 100)}%; background: var(--color-ink-soft);"></div>
                </div>
            </div>

            <!-- 2. Total Market Value -->
            <div class="club-kpi-card">
                <div class="kpi-header">
                    <span class="kpi-label">Market Value (TM)</span>
                    <div class="kpi-icon"><i class="ph ph-tag"></i></div>
                </div>
                <div class="kpi-value">${formatCurrency(totalMarketVal)}</div>
                <div class="kpi-subtext">Cumulative roster fee</div>
                <div class="kpi-progress">
                    <div class="kpi-progress-bar" style="width: 100%; background: var(--color-ink-muted);"></div>
                </div>
            </div>

            <!-- 3. Total Model Value -->
            <div class="club-kpi-card">
                <div class="kpi-header">
                    <span class="kpi-label">Model Implied Value</span>
                    <div class="kpi-icon"><i class="ph ph-cpu"></i></div>
                </div>
                <div class="kpi-value" style="color: var(--color-primary-dark);">${formatCurrency(totalModelVal)}</div>
                <div class="kpi-subtext">AI calibrated baseline</div>
                <div class="kpi-progress">
                    <div class="kpi-progress-bar" style="width: 100%; background: var(--color-primary);"></div>
                </div>
            </div>

            <!-- 4. Net Value Gap -->
            <div class="club-kpi-card">
                <div class="kpi-header">
                    <span class="kpi-label">Net Value Surplus</span>
                    <div class="kpi-icon"><i class="ph ph-trend-up"></i></div>
                </div>
                <div class="kpi-value" style="color: ${netGapPct >= 0 ? 'var(--color-tertiary-dark)' : 'var(--color-primary-dark)'};">
                    ${formatPercent(netGapPct)}
                </div>
                <div class="kpi-subtext">${netGapEuro >= 0 ? '+' : ''}${formatCurrency(netGapEuro)} spread</div>
                <div class="kpi-progress">
                    <div class="kpi-progress-bar" style="width: ${Math.min(100, Math.abs(netGapPct) * 4)}%; background: ${netGapPct >= 0 ? 'var(--color-tertiary)' : 'var(--color-primary)'};"></div>
                </div>
            </div>

            <!-- 5. Average Age -->
            <div class="club-kpi-card">
                <div class="kpi-header">
                    <span class="kpi-label">Average Age</span>
                    <div class="kpi-icon"><i class="ph ph-calendar"></i></div>
                </div>
                <div class="kpi-value">${avgAge} yrs</div>
                <div class="kpi-subtext">${avgAge < 25 ? 'Young, high-upside core' : (avgAge > 28 ? 'Experienced squad' : 'Prime competitive age')}</div>
                <div class="kpi-progress">
                    <div class="kpi-progress-bar" style="width: ${Math.min(100, ((avgAge - 18) / 16) * 100)}%; background: #FFB400;"></div>
                </div>
            </div>

            <!-- 6. Most Valuable Player -->
            <div class="club-kpi-card">
                <div class="kpi-header">
                    <span class="kpi-label">Top Asset</span>
                    <div class="kpi-icon"><i class="ph ph-crown"></i></div>
                </div>
                ${mvp ? `
                    <div class="kpi-mvp" onclick="window.location.href='player.html?id=${mvp.id}'" style="cursor:pointer;">
                        <div class="mvp-avatar">
                            ${createPlayerAvatar(mvp.name, mvp.primary_position, '', mvp.id)}
                        </div>
                        <div class="kpi-mvp-info">
                            <div class="kpi-mvp-name" title="${mvp.name}">${mvp.name}</div>
                            <div class="kpi-mvp-val">${formatCurrency(mvp.market_value_eur)}</div>
                        </div>
                    </div>
                ` : `<div class="kpi-value">—</div>`}
                <div class="kpi-subtext">${mvp ? mvp.primary_position + ' • ' + (mvp.age || '—') + ' yrs' : 'No player data'}</div>
            </div>
        </div>

        <!-- SUMMARY STRIP (Top 3 Undervalued & Overvalued) -->
        <div class="club-summary-strip">
            <!-- Top 3 Undervalued -->
            <div class="summary-strip-card">
                <div class="summary-strip-header">
                    <span class="summary-strip-title undervalued">
                        <span>↗</span> Top 3 Undervalued Opportunities
                    </span>
                    <span style="font-size:11px; color:var(--color-ink-muted);">Model implied upside</span>
                </div>
                <div class="summary-players-list">
                    ${topUndervalued.map(p => `
                        <div class="summary-player-item" onclick="window.location.href='player.html?id=${p.id}'">
                            <div class="summary-player-left">
                                <div style="width:28px; height:28px; border-radius:50%; overflow:hidden;">
                                    ${createPlayerAvatar(p.name, p.primary_position, '', p.id)}
                                </div>
                                <div>
                                    <div class="summary-player-name">${p.name}</div>
                                    <div class="summary-player-pos">${p.primary_position} • ${p.age || '—'} yrs</div>
                                </div>
                            </div>
                            <div class="summary-player-right">
                                <div class="summary-player-gap" style="color:var(--color-tertiary-dark);">${formatPercent(p.gapPercent)}</div>
                                <div class="summary-player-sub">${formatCurrency(p.market_value_eur)} TM</div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>

            <!-- Top 3 Overvalued -->
            <div class="summary-strip-card">
                <div class="summary-strip-header">
                    <span class="summary-strip-title overvalued">
                        <span>↘</span> Top 3 Market Premiums
                    </span>
                    <span style="font-size:11px; color:var(--color-ink-muted);">Trading above model estimate</span>
                </div>
                <div class="summary-players-list">
                    ${topOvervalued.map(p => `
                        <div class="summary-player-item" onclick="window.location.href='player.html?id=${p.id}'">
                            <div class="summary-player-left">
                                <div style="width:28px; height:28px; border-radius:50%; overflow:hidden;">
                                    ${createPlayerAvatar(p.name, p.primary_position, '', p.id)}
                                </div>
                                <div>
                                    <div class="summary-player-name">${p.name}</div>
                                    <div class="summary-player-pos">${p.primary_position} • ${p.age || '—'} yrs</div>
                                </div>
                            </div>
                            <div class="summary-player-right">
                                <div class="summary-player-gap" style="color:var(--color-primary-dark);">${formatPercent(p.gapPercent)}</div>
                                <div class="summary-player-sub">${formatCurrency(p.market_value_eur)} TM</div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        </div>

        <!-- 2-COLUMN MAIN CONTENT (Roster 2/3, Analytics 1/3) -->
        <div class="club-main-grid">
            <!-- ROSTER CARD -->
            <div class="roster-card">
                <!-- STICKY CONTROLS BAR -->
                <div class="roster-controls-bar">
                    <div class="roster-top-row">
                        <div class="roster-search-box">
                            <i class="ph ph-magnifying-glass roster-search-icon"></i>
                            <input type="text" id="roster-search" placeholder="Search players by name, nationality or position..." autocomplete="off">
                        </div>
                        <div class="roster-view-toggle">
                            <button class="view-btn ${activeView === 'table' ? 'active' : ''}" onclick="switchView('table')">
                                <i class="ph ph-table"></i> Table
                            </button>
                            <button class="view-btn ${activeView === 'cards' ? 'active' : ''}" onclick="switchView('cards')">
                                <i class="ph ph-squares-four"></i> Cards
                            </button>
                            <button class="view-btn ${activeView === 'pitch' ? 'active' : ''}" onclick="switchView('pitch')">
                                <i class="ph ph-soccer-ball"></i> Pitch
                            </button>
                        </div>
                    </div>

                    <div class="roster-filters-row">
                        <!-- Position chips -->
                        <div class="filter-chips-group">
                            <button class="filter-chip ${activePosFilter === 'ALL' ? 'active' : ''}" onclick="filterByPos('ALL')">All</button>
                            <button class="filter-chip ${activePosFilter === 'GK' ? 'active' : ''}" onclick="filterByPos('GK')">GK</button>
                            <button class="filter-chip ${activePosFilter === 'DEF' ? 'active' : ''}" onclick="filterByPos('DEF')">DEF</button>
                            <button class="filter-chip ${activePosFilter === 'MID' ? 'active' : ''}" onclick="filterByPos('MID')">MID</button>
                            <button class="filter-chip ${activePosFilter === 'FWD' ? 'active' : ''}" onclick="filterByPos('FWD')">FWD</button>
                        </div>

                        <!-- Valuation chips & Sort -->
                        <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
                            <div class="filter-chips-group">
                                <button class="filter-chip ${activeValFilter === 'ALL' ? 'active' : ''}" onclick="filterByVal('ALL')">All Valuations</button>
                                <button class="filter-chip ${activeValFilter === 'UNDERVALUED' ? 'active' : ''}" onclick="filterByVal('UNDERVALUED')">Undervalued</button>
                                <button class="filter-chip ${activeValFilter === 'OVERVALUED' ? 'active' : ''}" onclick="filterByVal('OVERVALUED')">Overvalued</button>
                            </div>
                            <select class="roster-sort-select" id="roster-sort" onchange="sortRoster(this.value)">
                                <option value="mv_desc">Market Value: High → Low</option>
                                <option value="mv_asc">Market Value: Low → High</option>
                                <option value="pv_desc">Model Value: High → Low</option>
                                <option value="gap_desc">Gap %: Most Undervalued</option>
                                <option value="gap_asc">Gap %: Most Overvalued</option>
                                <option value="age_asc">Age: Youngest</option>
                                <option value="age_desc">Age: Oldest</option>
                            </select>
                        </div>
                    </div>
                </div>

                <!-- VIEW CONTAINER (Table | Cards | Pitch) -->
                <div id="roster-view-container"></div>

                <!-- PAGINATION / SHOW MORE -->
                <div class="roster-pagination-bar" id="roster-pagination"></div>
            </div>

            <!-- CHARTS SIDEBAR -->
            <div class="club-charts-sidebar">
                <!-- CHART 1: Value Distribution by Position -->
                <div class="club-chart-card">
                    <div class="chart-card-header">
                        <span class="chart-card-title">Value Distribution by Position</span>
                        <span style="font-size:12px; font-weight:700; color:var(--color-primary-dark);">${formatCurrency(totalMarketVal)}</span>
                    </div>
                    <div style="position:relative; width:100%; height:230px;">
                        <canvas id="position-donut-chart"></canvas>
                        <div class="donut-center-total">
                            <div class="donut-total-label">Squad Value</div>
                            <div class="donut-total-num">${formatCurrency(totalMarketVal)}</div>
                        </div>
                    </div>
                    <div class="donut-legend-list" id="position-donut-legend"></div>
                </div>

                <!-- CHART 2: Age Distribution Histogram -->
                <div class="club-chart-card">
                    <div class="chart-card-header">
                        <span class="chart-card-title">Squad Age Profile</span>
                        <span style="font-size:12px; color:var(--color-ink-muted);">Average: ${avgAge} yrs</span>
                    </div>
                    <div style="height: 180px;">
                        <canvas id="age-hist-chart"></canvas>
                    </div>
                </div>

                <!-- CHART 3: Top 10 Market vs Model Comparison -->
                <div class="club-chart-card">
                    <div class="chart-card-header">
                        <span class="chart-card-title">Top 10 Assets: Market vs Model</span>
                        <span style="font-size:11px; color:var(--color-ink-muted);">Transfermarkt vs AI Model</span>
                    </div>
                    <div style="height: 280px;">
                        <canvas id="top10-comparison-chart"></canvas>
                    </div>
                </div>
            </div>
        </div>
    `;

    // Hook search event
    document.getElementById('roster-search').addEventListener('input', debounce((e) => {
        searchQuery = e.target.value.toLowerCase().trim();
        renderActiveView();
    }, 150));

    // Render active view
    renderActiveView();

    // Render all charts
    setTimeout(() => {
        initPositionDonutChart();
        initAgeHistogramChart();
        initTop10ComparisonChart();
    }, 100);
}

function getFilteredRoster() {
    return currentRoster.filter(p => {
        // Search
        if (searchQuery) {
            const nameMatch = (p.name || '').toLowerCase().includes(searchQuery);
            const nationMatch = (p.nationality || '').toLowerCase().includes(searchQuery);
            const posMatch = (p.primary_position || '').toLowerCase().includes(searchQuery);
            if (!nameMatch && !nationMatch && !posMatch) return false;
        }

        // Position category
        if (activePosFilter !== 'ALL') {
            const cat = getPositionCategory(p.primary_position).toUpperCase();
            if (activePosFilter === 'GK' && cat !== 'GK') return false;
            if (activePosFilter === 'DEF' && cat !== 'DEF') return false;
            if (activePosFilter === 'MID' && cat !== 'MID') return false;
            if (activePosFilter === 'FWD' && cat !== 'FWD') return false;
        }

        // Valuation category
        if (activeValFilter === 'UNDERVALUED' && p.gapPercent < 5.0) return false;
        if (activeValFilter === 'OVERVALUED' && p.gapPercent > -5.0) return false;

        return true;
    }).sort((a, b) => {
        if (currentSort === 'mv_desc') return b.market_value_eur - a.market_value_eur;
        if (currentSort === 'mv_asc') return a.market_value_eur - b.market_value_eur;
        if (currentSort === 'pv_desc') return b.predicted_value_eur - a.predicted_value_eur;
        if (currentSort === 'gap_desc') return b.gapPercent - a.gapPercent;
        if (currentSort === 'gap_asc') return a.gapPercent - b.gapPercent;
        if (currentSort === 'age_asc') return (a.age || 99) - (b.age || 99);
        if (currentSort === 'age_desc') return (b.age || 0) - (a.age || 0);
        return 0;
    });
}

function renderActiveView() {
    const container = document.getElementById('roster-view-container');
    const pagination = document.getElementById('roster-pagination');
    const filtered = getFilteredRoster();

    if (filtered.length === 0) {
        container.innerHTML = `
            <div style="padding: 48px; text-align:center; color:var(--color-ink-muted);">
                <i class="ph ph-user-circle" style="font-size:36px; margin-bottom:12px; display:inline-block;"></i>
                <div style="font-weight:700; font-size:16px; color:var(--color-ink);">No matching squad players</div>
                <div style="font-size:13px; margin-top:4px;">Try loosening your filters or search terms.</div>
            </div>
        `;
        pagination.innerHTML = '';
        return;
    }

    const visibleList = isExpanded || activeView === 'pitch' ? filtered : filtered.slice(0, pageSize);

    if (activeView === 'table') {
        container.innerHTML = `
            <div class="roster-table-wrapper">
                <table class="roster-table">
                    <thead>
                        <tr>
                            <th>Player</th>
                            <th>Age</th>
                            <th>Position</th>
                            <th>Market Value</th>
                            <th>Model Value</th>
                            <th>Valuation Gap</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${visibleList.map(p => {
                            const flag = COUNTRY_FLAGS[p.nationality] || '';
                            const isUndervalued = p.gapPercent >= 5.0;
                            const isOvervalued = p.gapPercent <= -5.0;
                            const pillClass = isUndervalued ? 'undervalued' : (isOvervalued ? 'overvalued' : 'fair');
                            const label = isUndervalued ? 'Undervalued' : (isOvervalued ? 'Overvalued' : 'Fair');
                            const barWidth = Math.min(100, Math.abs(p.gapPercent) * 2);
                            const barColor = isUndervalued ? 'var(--color-tertiary)' : (isOvervalued ? 'var(--color-primary)' : 'var(--color-secondary)');

                            return `
                                <tr class="roster-row" onclick="window.location.href='player.html?id=${p.id}'" onmouseenter="if(typeof prefetchPlayer==='function') prefetchPlayer(${p.id})">
                                    <td>
                                        <div class="player-cell">
                                            <div class="player-cell-avatar">
                                                ${createPlayerAvatar(p.name, p.primary_position, '', p.id)}
                                            </div>
                                            <div class="player-cell-meta">
                                                <span class="player-cell-name">${p.name}</span>
                                                <span class="player-cell-flag">${flag} ${p.nationality || 'International'}</span>
                                            </div>
                                        </div>
                                    </td>
                                    <td class="tabular-nums" style="font-weight:600;">${p.age || '—'}</td>
                                    <td>
                                        <span class="${getPositionBadgeClass(p.primary_position)}">${p.primary_position}</span>
                                    </td>
                                    <td class="tabular-nums" style="font-weight:700;">
                                        ${formatCurrency(p.market_value_eur)}
                                    </td>
                                    <td class="tabular-nums" style="font-weight:700; color:var(--color-primary-dark);">
                                        ${formatCurrency(p.predicted_value_eur)}
                                    </td>
                                    <td>
                                        <div class="gap-diverging-cell">
                                            <span class="gap-pill ${pillClass}">
                                                ${formatPercent(p.gapPercent)} • ${label}
                                            </span>
                                            <div class="gap-bar-container">
                                                <div class="gap-bar-fill" style="width:${barWidth}%; background:${barColor};"></div>
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            </div>
        `;
    } else if (activeView === 'cards') {
        container.innerHTML = `
            <div class="roster-cards-grid">
                ${visibleList.map(p => {
                    const flag = COUNTRY_FLAGS[p.nationality] || '';
                    const isUndervalued = p.gapPercent >= 5.0;
                    const isOvervalued = p.gapPercent <= -5.0;
                    const pillClass = isUndervalued ? 'undervalued' : (isOvervalued ? 'overvalued' : 'fair');

                    return `
                        <div class="player-grid-card" onclick="window.location.href='player.html?id=${p.id}'">
                            <div class="card-player-top">
                                <div class="card-player-avatar">
                                    ${createPlayerAvatar(p.name, p.primary_position, '', p.id)}
                                </div>
                                <div style="min-width:0;">
                                    <div class="card-player-name">${p.name}</div>
                                    <div class="card-player-tags">
                                        <span class="${getPositionBadgeClass(p.primary_position)}">${p.primary_position}</span>
                                        <span style="font-size:12px; color:var(--color-ink-muted);">${p.age || '—'} yrs</span>
                                        <span style="font-size:12px;">${flag}</span>
                                    </div>
                                </div>
                            </div>
                            <div class="card-values-row">
                                <div>
                                    <div class="card-val-label">Market Value</div>
                                    <div class="card-val-num">${formatCurrency(p.market_value_eur)}</div>
                                </div>
                                <div>
                                    <div class="card-val-label">Model Value</div>
                                    <div class="card-val-num" style="color:var(--color-primary-dark);">${formatCurrency(p.predicted_value_eur)}</div>
                                </div>
                            </div>
                            <div style="display:flex; justify-content:space-between; align-items:center;">
                                <span class="gap-pill ${pillClass}">${formatPercent(p.gapPercent)}</span>
                                <span style="font-size:11px; color:var(--color-ink-muted);">${p.minutes ? p.minutes.toLocaleString() + ' mins' : ''}</span>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
    } else if (activeView === 'pitch') {
        container.innerHTML = renderTacticalPitch(filtered);
    }

    // Render pagination
    if (activeView !== 'pitch' && filtered.length > pageSize) {
        if (!isExpanded) {
            pagination.innerHTML = `
                <span>Showing ${pageSize} of ${filtered.length} players</span>
                <button class="show-more-btn" onclick="toggleExpandRoster(true)">
                    Show All (${filtered.length - pageSize} more) <i class="ph ph-caret-down"></i>
                </button>
            `;
        } else {
            pagination.innerHTML = `
                <span>Showing all ${filtered.length} players</span>
                <button class="show-more-btn" onclick="toggleExpandRoster(false)">
                    Collapse <i class="ph ph-caret-up"></i>
                </button>
            `;
        }
    } else {
        pagination.innerHTML = `<span>${filtered.length} squad players</span>`;
    }
}

function renderTacticalPitch(players) {
    // Pick starting 11 based on highest market value by role (4-3-3 formation)
    const gks = players.filter(p => p.primary_position === 'GK');
    const defs = players.filter(p => ['CB', 'LB', 'RB', 'FB', 'DEF'].includes(p.primary_position));
    const mids = players.filter(p => ['DM', 'CM', 'AM', 'LM', 'RM', 'MID'].includes(p.primary_position));
    const fwds = players.filter(p => ['ST', 'CF', 'LW', 'RW', 'W', 'ATT'].includes(p.primary_position));

    const gk = gks[0] || players[0];
    const lb = defs.find(p => p.primary_position === 'LB') || defs[0];
    const cb1 = defs.find(p => p.primary_position === 'CB' && p !== lb) || defs[1];
    const cb2 = defs.find(p => p.primary_position === 'CB' && p !== lb && p !== cb1) || defs[2];
    const rb = defs.find(p => p.primary_position === 'RB' && p !== lb && p !== cb1 && p !== cb2) || defs[3];

    const dm = mids.find(p => p.primary_position === 'DM') || mids[0];
    const cm1 = mids.find(p => p !== dm) || mids[1];
    const cm2 = mids.find(p => p !== dm && p !== cm1) || mids[2];

    const lw = fwds.find(p => p.primary_position === 'LW') || fwds[0];
    const st = fwds.find(p => (p.primary_position === 'ST' || p.primary_position === 'CF') && p !== lw) || fwds[1];
    const rw = fwds.find(p => p.primary_position === 'RW' && p !== lw && p !== st) || fwds[2];

    const pitchCoords = [
        { p: gk, x: 50, y: 88, role: 'GK' },
        { p: lb, x: 18, y: 70, role: 'LB' },
        { p: cb1, x: 38, y: 72, role: 'CB' },
        { p: cb2, x: 62, y: 72, role: 'CB' },
        { p: rb, x: 82, y: 70, role: 'RB' },
        { p: dm, x: 50, y: 52, role: 'DM' },
        { p: cm1, x: 30, y: 42, role: 'CM' },
        { p: cm2, x: 70, y: 42, role: 'CM' },
        { p: lw, x: 22, y: 22, role: 'LW' },
        { p: st, x: 50, y: 16, role: 'ST' },
        { p: rw, x: 78, y: 22, role: 'RW' },
    ];

    return `
        <div class="pitch-container">
            <div class="tactical-pitch">
                <div class="pitch-line pitch-half-line"></div>
                <div class="pitch-line pitch-center-circle"></div>
                <div class="pitch-line pitch-box-top"></div>
                <div class="pitch-line pitch-box-bottom"></div>

                ${pitchCoords.map(({ p, x, y, role }) => {
                    if (!p) return '';
                    return `
                        <div class="pitch-player-node" style="left:${x}%; top:${y}%;" onclick="window.location.href='player.html?id=${p.id}'" title="${p.name} (${role}): ${formatCurrency(p.market_value_eur)}">
                            <div class="pitch-avatar">
                                ${createPlayerAvatar(p.name, p.primary_position, '', p.id)}
                            </div>
                            <div class="pitch-name-tag">${p.name.split(' ').pop()}</div>
                            <div class="pitch-val-tag">${formatCurrency(p.market_value_eur)}</div>
                        </div>
                    `;
                }).join('')}
            </div>
        </div>
    `;
}

function switchView(view) {
    activeView = view;
    document.querySelectorAll('.view-btn').forEach(btn => {
        btn.classList.toggle('active', btn.textContent.toLowerCase().includes(view));
    });
    renderActiveView();
}

function filterByPos(pos) {
    activePosFilter = pos;
    renderClub(currentClub);
}

function filterByVal(val) {
    activeValFilter = val;
    renderClub(currentClub);
}

function sortRoster(sortKey) {
    currentSort = sortKey;
    renderActiveView();
}

function toggleExpandRoster(expand) {
    isExpanded = expand;
    renderActiveView();
}

/* --- CHARTS IMPLEMENTATION --- */
let donutChartInstance = null;
let ageHistInstance = null;
let top10Instance = null;

function initPositionDonutChart() {
    const canvas = document.getElementById('position-donut-chart');
    if (!canvas) return;

    if (donutChartInstance) {
        donutChartInstance.destroy();
    }

    const posTotals = {};
    currentRoster.forEach(p => {
        const pos = p.primary_position || 'Other';
        posTotals[pos] = (posTotals[pos] || 0) + (p.market_value_eur || 0);
    });

    const sortedPos = Object.keys(posTotals).sort((a, b) => posTotals[b] - posTotals[a]);
    const labels = sortedPos;
    const dataVals = sortedPos.map(p => posTotals[p]);
    const totalVal = dataVals.reduce((a, b) => a + b, 0) || 1;

    const bgColors = labels.map(pos => POSITION_10_COLORS[pos] || '#94A3B8');

    donutChartInstance = new Chart(canvas, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: dataVals,
                backgroundColor: bgColors,
                borderWidth: 2,
                borderColor: document.documentElement.getAttribute('data-theme') === 'dark' ? '#0A101E' : '#FFFFFF',
                hoverOffset: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '72%',
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: function (ctx) {
                            const val = ctx.raw || 0;
                            const share = ((val / totalVal) * 100).toFixed(1);
                            return ` ${ctx.label}: ${formatCurrency(val)} (${share}%)`;
                        }
                    }
                }
            }
        }
    });

    // Populate interactive legend
    const legendContainer = document.getElementById('position-donut-legend');
    if (legendContainer) {
        legendContainer.innerHTML = labels.slice(0, 8).map((pos, idx) => {
            const val = posTotals[pos];
            const share = ((val / totalVal) * 100).toFixed(0);
            const color = bgColors[idx];
            return `
                <div class="donut-legend-item" onmouseenter="highlightDonut(${idx})" onmouseleave="resetDonut()">
                    <div style="display:flex; align-items:center;">
                        <span class="legend-color-dot" style="background:${color};"></span>
                        <span style="font-weight:700; color:var(--color-ink);">${pos}</span>
                    </div>
                    <span style="color:var(--color-ink-muted); font-weight:600;">${formatCurrency(val)} (${share}%)</span>
                </div>
            `;
        }).join('');
    }
}

function highlightDonut(index) {
    if (!donutChartInstance) return;
    donutChartInstance.setActiveElements([{ datasetIndex: 0, index: index }]);
    donutChartInstance.update();
}

function resetDonut() {
    if (!donutChartInstance) return;
    donutChartInstance.setActiveElements([]);
    donutChartInstance.update();
}

function initAgeHistogramChart() {
    const canvas = document.getElementById('age-hist-chart');
    if (!canvas) return;

    if (ageHistInstance) {
        ageHistInstance.destroy();
    }

    const bins = {
        'U21': 0,
        '21–24': 0,
        '25–28': 0,
        '29–32': 0,
        '33+': 0
    };

    currentRoster.forEach(p => {
        const age = p.age || 25;
        if (age < 21) bins['U21']++;
        else if (age <= 24) bins['21–24']++;
        else if (age <= 28) bins['25–28']++;
        else if (age <= 32) bins['29–32']++;
        else bins['33+']++;
    });

    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const textColor = isDark ? '#94A3B8' : '#475569';
    const gridColor = isDark ? 'rgba(148, 163, 184, 0.1)' : 'rgba(0, 0, 0, 0.05)';

    ageHistInstance = new Chart(canvas, {
        type: 'bar',
        data: {
            labels: Object.keys(bins),
            datasets: [{
                label: 'Player Count',
                data: Object.values(bins),
                backgroundColor: ['#6366F1', '#0EA5E9', '#10B981', '#F59E0B', '#EF4444'],
                borderRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: ctx => ` ${ctx.raw} players in this age group`
                    }
                }
            },
            scales: {
                x: {
                    grid: { display: false },
                    ticks: { color: textColor, font: { size: 11, weight: '600' } }
                },
                y: {
                    grid: { color: gridColor },
                    ticks: { stepSize: 1, color: textColor, font: { size: 10 } }
                }
            }
        }
    });
}

function initTop10ComparisonChart() {
    const canvas = document.getElementById('top10-comparison-chart');
    if (!canvas) return;

    if (top10Instance) {
        top10Instance.destroy();
    }

    const top10 = [...currentRoster].sort((a, b) => b.market_value_eur - a.market_value_eur).slice(0, 8);
    const labels = top10.map(p => p.name.split(' ').pop());
    const marketVals = top10.map(p => p.market_value_eur / 1e6);
    const modelVals = top10.map(p => p.predicted_value_eur / 1e6);

    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const textColor = isDark ? '#94A3B8' : '#475569';
    const gridColor = isDark ? 'rgba(148, 163, 184, 0.1)' : 'rgba(0, 0, 0, 0.05)';

    top10Instance = new Chart(canvas, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Market (TM)',
                    data: marketVals,
                    backgroundColor: isDark ? 'rgba(148, 163, 184, 0.35)' : '#CBD5E1',
                    borderRadius: 4
                },
                {
                    label: 'Model Value',
                    data: modelVals,
                    backgroundColor: '#FF5A5F',
                    borderRadius: 4
                }
            ]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top',
                    labels: { color: textColor, boxWidth: 12, font: { size: 11, weight: '600' } }
                },
                tooltip: {
                    callbacks: {
                        label: ctx => ` ${ctx.dataset.label}: €${ctx.raw.toFixed(1)}M`
                    }
                }
            },
            scales: {
                x: {
                    grid: { color: gridColor },
                    ticks: {
                        color: textColor,
                        font: { size: 10 },
                        callback: val => '€' + val + 'M'
                    }
                },
                y: {
                    grid: { display: false },
                    ticks: { color: textColor, font: { size: 11, weight: '600' } }
                }
            }
        }
    });
}
