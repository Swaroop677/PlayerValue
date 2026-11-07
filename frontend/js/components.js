/**
 * Shared Minimal, Vibrant Components & Layout Renderer
 * Features Sticky Navbar, Playful Micro-interactions, AA-Compliant Badges & Clean Footer
 */

function toggleTheme(event) {
    const current = document.documentElement.getAttribute('data-theme') || 'dark';
    const next = current === 'dark' ? 'light' : 'dark';

    const applyThemeChange = () => {
        document.documentElement.setAttribute('data-theme', next);
        localStorage.setItem('playervalue_theme', next);

        const lbl = document.getElementById('theme-toggle-label');
        if (lbl) {
            lbl.textContent = next === 'dark' ? 'Light' : 'Dark';
        }

        window.dispatchEvent(new CustomEvent('themechange', { detail: { theme: next } }));
        if (window.onThemeChange) {
            window.onThemeChange(next);
        }
    };

    // If View Transitions API is not supported or user prefers reduced motion, fallback
    if (!document.startViewTransition || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        applyThemeChange();
        return;
    }

    const rect = event?.currentTarget?.getBoundingClientRect();
    const x = rect ? rect.left + rect.width / 2 : (event?.clientX ?? window.innerWidth / 2);
    const y = rect ? rect.top + rect.height / 2 : (event?.clientY ?? 0);
    const endRadius = Math.hypot(
        Math.max(x, window.innerWidth - x),
        Math.max(y, window.innerHeight - y)
    );

    const transition = document.startViewTransition(() => {
        applyThemeChange();
    });

    transition.ready.then(() => {
        const clipPath = [
            `circle(0px at ${x}px ${y}px)`,
            `circle(${endRadius}px at ${x}px ${y}px)`
        ];
        document.documentElement.animate(
            {
                clipPath: next === 'dark' ? clipPath.slice().reverse() : clipPath
            },
            {
                duration: 380,
                easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
                pseudoElement: next === 'dark' ? '::view-transition-old(root)' : '::view-transition-new(root)'
            }
        );
    });
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

// Sync with system preference if user hasn't chosen manually
if (typeof window !== 'undefined') {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
        if (!localStorage.getItem('playervalue_theme')) {
            const newTheme = e.matches ? 'dark' : 'light';
            document.documentElement.setAttribute('data-theme', newTheme);
            const lbl = document.getElementById('theme-toggle-label');
            if (lbl) lbl.textContent = newTheme === 'dark' ? 'Light' : 'Dark';
            window.dispatchEvent(new CustomEvent('themechange', { detail: { theme: newTheme } }));
        }
    });
}

function createNavbar(activePage) {
    const navItems = [
        { id: 'dashboard', label: 'Dashboard', url: 'index.html' },
        { id: 'players', label: 'Players', url: 'players.html' },
        { id: 'predictor', label: 'Predictor', url: 'predictor.html' },
        { id: 'opportunities', label: 'Opportunities', url: 'opportunities.html' },
        { id: 'clubs', label: 'Clubs', url: 'clubs.html' },
        { id: 'model', label: 'Methodology', url: 'model.html' }
    ];

    const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
    const toggleLabel = currentTheme === 'dark' ? 'Light' : 'Dark';

    let navHtml = `
        <nav class="navbar">
            <div class="nav-container">
                <a href="index.html" class="nav-brand" aria-label="PlayerValue Home">
                    <img src="assets/logo-full.png" alt="PlayerValue" class="brand-logo-full logo-light-only">
                    <img src="assets/logo-full-dark.png" alt="PlayerValue" class="brand-logo-full logo-dark-only">
                    <img src="assets/logo-icon.png" alt="PlayerValue" class="brand-logo-compact">
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
                    <button class="theme-toggle-btn" onclick="toggleTheme(event)" aria-label="Toggle light or dark theme" title="Toggle theme">
                        <span class="theme-icon-wrap" aria-hidden="true">
                            <svg class="theme-icon sun-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <circle cx="12" cy="12" r="5"></circle>
                                <line x1="12" y1="1" x2="12" y2="3"></line>
                                <line x1="12" y1="21" x2="12" y2="23"></line>
                                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
                                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
                                <line x1="1" y1="12" x2="3" y2="12"></line>
                                <line x1="21" y1="12" x2="23" y2="12"></line>
                                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
                                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
                            </svg>
                            <svg class="theme-icon moon-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
                            </svg>
                        </span>
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
                            <img src="assets/logo-full.png" alt="PlayerValue" class="footer-logo-full logo-light-only">
                            <img src="assets/logo-full-dark.png" alt="PlayerValue" class="footer-logo-full logo-dark-only">
                        </div>
                        <p class="footer-desc">
                            Model-implied valuations and machine-learning arbitrage across 10 seasons of verified European football records. Exposing commercial hype, finding hidden gems.
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
                        <a href="model.html" class="footer-link">Methodology & Diagnostics</a>
                    </div>

                    <div class="footer-col">
                        <span class="footer-col-title">Data Sources</span>
                        <span class="footer-link" style="color:var(--color-ink-muted)">Transfermarkt</span>
                        <span class="footer-link" style="color:var(--color-ink-muted)">FBref / Opta</span>
                        <span class="footer-link" style="color:var(--color-ink-muted)">Premier League FPL</span>
                    </div>
                </div>

                <div class="footer-wordmark-wrap" aria-hidden="true">
                    <span class="footer-faint-wordmark">PLAYERVALUE</span>
                </div>

                <div class="footer-bottom">
                    <div>
                        © 2026 PlayerValue. Statistical valuations for intelligence, not commercial guarantees.
                    </div>
                    <div class="footer-back-to-top">
                        <button type="button" class="back-to-top-btn" onclick="window.scrollTo({top: 0, behavior: 'smooth'})">
                            <span>Back to top</span>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M18 15l-6-6-6 6"/>
                            </svg>
                        </button>
                    </div>
                    <div class="footer-signature">
                        Built for football intelligence
                    </div>
                </div>
            </div>
        </footer>
    `;
}
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
                        <div style="font-size:12px; color:var(--color-ink-soft); display:flex; align-items:center; gap:5px;">
                            ${createClubLogo(player.club_id, player.club_name, 16)}
                            <span>${player.club_name || 'Free Agent'}</span>
                        </div>
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
                        <div style="font-size:12px; color:var(--color-ink-muted); display:flex; align-items:center; gap:5px;">
                            ${createClubLogo(player.club_id, player.club_name, 16)}
                            <span>${player.club_name || 'Free Agent'}</span> · ${player.nationality || ''}
                        </div>
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
    if (!document.querySelector('link[rel="icon"]')) {
        const favicon = document.createElement('link');
        favicon.rel = 'icon';
        favicon.type = 'image/png';
        favicon.href = 'assets/logo-icon.png';
        document.head.appendChild(favicon);
    }
    document.body.insertAdjacentHTML('afterbegin', createNavbar(pageId));
    document.body.insertAdjacentHTML('beforeend', createFooter());
}
