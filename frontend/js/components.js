/**
 * Shared Minimal, Vibrant Components & Layout Renderer
 * Features Sticky Navbar, Playful Micro-interactions, AA-Compliant Badges & Clean Footer
 */

function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme') || 'light';
    const next = current === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('playervalue_theme', next);

    const btn = document.getElementById('theme-toggle-label');
    if (btn) {
        btn.textContent = next === 'dark' ? '☀️ Light' : '🌙 Dark';
    }

    if (window.onThemeChange) {
        window.onThemeChange(next);
    }
}

function applyStoredTheme() {
    const stored = localStorage.getItem('playervalue_theme');
    if (stored) {
        document.documentElement.setAttribute('data-theme', stored);
    } else {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        document.documentElement.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
    }
}

function createNavbar(activePage) {
    const navItems = [
        { id: 'dashboard', label: 'Dashboard', url: 'index.html' },
        { id: 'players', label: 'Players', url: 'players.html' },
        { id: 'predictor', label: 'Predictor', url: 'predictor.html' },
        { id: 'opportunities', label: 'Opportunities', url: 'opportunities.html' },
        { id: 'scouting', label: 'Scouting', url: 'scouting.html' },
        { id: 'clubs', label: 'Clubs', url: 'clubs.html' },
        { id: 'model', label: 'Model', url: 'model.html' }
    ];

    const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
    const toggleLabel = currentTheme === 'dark' ? '☀️ Light' : '🌙 Dark';

    let navHtml = `
        <nav class="navbar">
            <div class="nav-container">
                <a href="index.html" class="nav-brand">
                    <span class="brand-dot"></span>
                    <span>PlayerValue</span>
                </a>

                <ul class="nav-links">
    `;

    navItems.forEach(item => {
        const isActive = activePage === item.id;
        navHtml += `
            <li>
                <a href="${item.url}" class="nav-link ${isActive ? 'active' : ''}">
                    ${item.label}
                </a>
            </li>
        `;
    });

    navHtml += `
                </ul>

                <div class="nav-actions">
                    <button class="theme-toggle-btn" onclick="toggleTheme()" aria-label="Toggle light or dark theme">
                        <span id="theme-toggle-label">${toggleLabel}</span>
                    </button>
                </div>
            </div>
        </nav>
    `;

    return navHtml;
}

function createFooter() {
    return `
        <footer class="site-footer">
            <div class="footer-container">
                <div class="footer-top">
                    <div class="footer-brand">
                        <div class="footer-title">
                            <span class="brand-dot" style="animation:none;"></span>
                            <span>PlayerValue</span>
                        </div>
                        <p class="footer-desc">
                            Real football intelligence and ML-powered player market valuations built on 10 seasons of verified top-5 European league data.
                        </p>
                    </div>

                    <div class="footer-col">
                        <span class="footer-col-title">Navigation</span>
                        <a href="index.html" class="footer-link">Dashboard</a>
                        <a href="players.html" class="footer-link">Players Database</a>
                        <a href="predictor.html" class="footer-link">Valuation Predictor</a>
                    </div>

                    <div class="footer-col">
                        <span class="footer-col-title">Intelligence</span>
                        <a href="opportunities.html" class="footer-link">Market Opportunities</a>
                        <a href="scouting.html" class="footer-link">Scouting Matrix</a>
                        <a href="model.html" class="footer-link">Model Diagnostics</a>
                    </div>

                    <div class="footer-col">
                        <span class="footer-col-title">Data Sources</span>
                        <span class="footer-link" style="color:var(--color-ink-muted)">Transfermarkt</span>
                        <span class="footer-link" style="color:var(--color-ink-muted)">FBref / Opta</span>
                        <span class="footer-link" style="color:var(--color-ink-muted)">Premier League FPL</span>
                    </div>
                </div>

                <div class="footer-bottom">
                    <div>
                        © 2026 PlayerValue. Statistical valuations for intelligence, not commercial guarantees.
                    </div>
                    <div>
                        Data refreshed: 2024-25 Season (Latest verified)
                    </div>
                    <div class="footer-signature">
                        Made by Swaroop Mane
                    </div>
                </div>
            </div>
        </footer>
    `;
}

function createValueBadge(val, isPercentage = false) {
    if (val === null || val === undefined) return '<span class="val-badge neutral">-</span>';
    const num = Number(val);
    const isPositive = num > 0;
    const isNegative = num < 0;
    const formatted = isPercentage ? formatPercent(num) : formatCurrency(Math.abs(num));
    const cls = isPositive ? 'val-badge positive' : (isNegative ? 'val-badge negative' : 'val-badge neutral');
    const label = isPositive ? 'Undervalued' : (isNegative ? 'Overvalued' : 'Fair');
    return `<span class="${cls}">${formatted} (${label})</span>`;
}

function createMiniGapBar(gapPercent) {
    if (gapPercent === null || gapPercent === undefined) return '';
    const pct = Math.min(Math.abs(gapPercent), 100);
    const isPositive = gapPercent > 0;
    return `
        <div class="mini-gap-bar-wrap" title="${isPositive ? 'Undervalued' : 'Overvalued'} ${gapPercent.toFixed(1)}%">
            <div class="mini-gap-bar ${isPositive ? 'positive' : 'negative'}" style="width: ${pct}%"></div>
        </div>
    `;
}

function createPlayerCard(player) {
    const gap = (player.predicted_value_eur || 0) - (player.market_value_eur || 0);
    const gapPercent = player.market_value_eur ? (gap / player.market_value_eur) * 100 : 0;
    const posClass = getPositionBadgeClass(player.primary_position);

    return `
        <div class="player-grid-card" onmouseenter="prefetchPlayer(${player.id})" onclick="window.location.href='player.html?id=${player.id}'" role="button" tabindex="0">
            <div class="card-top">
                <div class="player-meta">
                    ${createPlayerAvatar(player.name, player.primary_position)}
                    <div>
                        <h4 style="font-size:15px; font-weight:700; color:var(--color-ink); margin-bottom:2px;">${player.name}</h4>
                        <div style="font-size:12px; color:var(--color-ink-soft);">${player.club_name || 'Free Agent'}</div>
                    </div>
                </div>
                <span class="${posClass}">${player.primary_position}</span>
            </div>

            <div class="val-block">
                <div class="val-row">
                    <span style="color:var(--color-ink-soft)">Actual Value</span>
                    <strong class="tabular-nums">${formatCurrency(player.market_value_eur)}</strong>
                </div>
                <div class="val-row">
                    <span style="color:var(--color-ink-soft)">Model Implied</span>
                    <strong class="tabular-nums" style="color:var(--color-primary-dark)">${formatCurrency(player.predicted_value_eur)}</strong>
                </div>
            </div>

            <div style="display:flex; justify-content:space-between; align-items:center; margin-top:auto; padding-top:10px; border-top:1px solid var(--color-border);">
                <div>
                    ${createValueBadge(gapPercent, true)}
                </div>
                ${createMiniGapBar(gapPercent)}
            </div>
        </div>
    `;
}

function createPlayerRow(player) {
    const gap = (player.predicted_value_eur || 0) - (player.market_value_eur || 0);
    const gapPercent = player.market_value_eur ? (gap / player.market_value_eur) * 100 : 0;
    const posClass = getPositionBadgeClass(player.primary_position);

    return `
        <tr onmouseenter="prefetchPlayer(${player.id})" onclick="window.location.href='player.html?id=${player.id}'" role="row" tabindex="0">
            <td>
                <div style="display:flex; align-items:center; gap:12px;">
                    ${createPlayerAvatar(player.name, player.primary_position)}
                    <div>
                        <div style="font-weight:600; color:var(--color-ink);">${player.name}</div>
                        <div style="font-size:12px; color:var(--color-ink-muted);">${player.club_name || 'Free Agent'} · ${player.nationality || ''}</div>
                    </div>
                </div>
            </td>
            <td class="tabular-nums">${player.age || '-'}</td>
            <td><span class="${posClass}">${player.primary_position}</span></td>
            <td>${player.league_name || '-'}</td>
            <td class="tabular-nums">${formatNumber(player.minutes || 0)}</td>
            <td class="tabular-nums"><strong>${formatCurrency(player.market_value_eur)}</strong></td>
            <td class="tabular-nums" style="color:var(--color-primary-dark); font-weight:600;">${formatCurrency(player.predicted_value_eur)}</td>
            <td>
                <div style="display:flex; flex-direction:column; gap:4px;">
                    ${createValueBadge(gapPercent, true)}
                    ${createMiniGapBar(gapPercent)}
                </div>
            </td>
        </tr>
    `;
}

function createStatCard(label, value, subtitle = '', trend = null) {
    const cardId = 'kpi-' + Math.random().toString(36).substring(2, 9);
    
    // Quick number count-up trigger
    setTimeout(() => {
        const el = document.getElementById(cardId);
        if (!el) return;
        const rawText = el.getAttribute('data-value') || '';
        const numMatch = rawText.match(/[\d,.]+/);
        if (numMatch) {
            const cleanNum = parseFloat(numMatch[0].replace(/,/g, ''));
            if (!isNaN(cleanNum) && cleanNum > 0) {
                const startTime = performance.now();
                const duration = 600;
                const prefix = rawText.startsWith('€') ? '€' : '';
                const suffix = rawText.endsWith('M') ? 'M' : (rawText.endsWith('%') ? '%' : '');
                
                function step(now) {
                    const progress = Math.min((now - startTime) / duration, 1);
                    const currentVal = Math.floor(progress * cleanNum);
                    el.textContent = `${prefix}${currentVal.toLocaleString()}${suffix}`;
                    if (progress < 1) {
                        requestAnimationFrame(step);
                    } else {
                        el.textContent = rawText;
                    }
                }
                requestAnimationFrame(step);
            }
        }
    }, 50);

    return `
        <div class="card kpi-card">
            <span class="kpi-label">${label}</span>
            <div id="${cardId}" class="kpi-value tabular-nums" data-value="${value}">${value}</div>
            ${subtitle ? `<div style="font-size:12px; color:var(--color-ink-soft); margin-top:4px;">${subtitle}</div>` : ''}
            ${trend !== null ? `<div class="kpi-chip ${trend > 0 ? 'positive' : 'negative'}">${trend > 0 ? '↑' : '↓'} ${Math.abs(trend)}%</div>` : ''}
        </div>
    `;
}

function createBreadcrumbs(items) {
    const links = items.map((item, index) => {
        if (index === items.length - 1) return `<span>${item.label}</span>`;
        return `<a href="${item.url}" style="color:var(--color-ink-soft);">${item.label}</a> <span style="margin:0 4px; opacity:0.4">/</span>`;
    });
    return `<div class="breadcrumbs" style="margin-bottom:16px; font-size:13px; font-weight:500;">${links.join('')}</div>`;
}

function initPage(pageId) {
    applyStoredTheme();
    document.body.insertAdjacentHTML('afterbegin', createNavbar(pageId));
    document.body.insertAdjacentHTML('beforeend', createFooter());
}
