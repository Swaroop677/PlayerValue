/**
 * Shared Modern Clean Components & Layout Renderer
 * Linear / Vercel Style with Sticky Navbar, Dynamic Theme Toggle, and Clean Footer
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
                    <div class="brand-icon">⚽</div>
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
                    <button class="theme-toggle-btn" onclick="toggleTheme()" aria-label="Toggle theme">
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
                        <div class="footer-title">PlayerValue</div>
                        <p class="footer-desc">
                            Football market intelligence and model-implied player valuations based on 10 seasons of verified match and performance statistics.
                        </p>
                    </div>

                    <div class="footer-nav">
                        <div class="footer-col">
                            <span class="footer-col-title">Navigation</span>
                            <a href="index.html" class="footer-link">Dashboard</a>
                            <a href="players.html" class="footer-link">Players Database</a>
                            <a href="predictor.html" class="footer-link">Valuation Predictor</a>
                        </div>
                        <div class="footer-col">
                            <span class="footer-col-title">Analytics</span>
                            <a href="opportunities.html" class="footer-link">Opportunities</a>
                            <a href="scouting.html" class="footer-link">Scouting Matrix</a>
                            <a href="model.html" class="footer-link">Model Diagnostics</a>
                        </div>
                        <div class="footer-col">
                            <span class="footer-col-title">Data Sources</span>
                            <span class="footer-link" style="color:var(--text-muted)">Transfermarkt</span>
                            <span class="footer-link" style="color:var(--text-muted)">FBref / Opta</span>
                            <span class="footer-link" style="color:var(--text-muted)">Premier League FPL</span>
                        </div>
                    </div>
                </div>

                <div class="footer-bottom">
                    <div>
                        © 2026 PlayerValue. Model-implied statistical valuations, not commercial price guarantees.
                    </div>
                    <div class="footer-signature">
                        Made by Swaroop Mane
                    </div>
                </div>
            </div>
        </footer>
    `;
}

function createPlayerAvatar(name, position, sizeClass = '') {
    const initials = getInitials(name);
    return `<div class="player-avatar" style="width:34px; height:34px; border-radius:var(--radius-pill); background:var(--sky-soft); color:var(--sky-600); font-weight:700; font-size:12px; display:inline-flex; align-items:center; justify-content:center;">${initials}</div>`;
}

function createPlayerCard(player) {
    const gap = (player.predicted_value_eur || 0) - (player.market_value_eur || 0);
    const gapPercent = player.market_value_eur ? (gap / player.market_value_eur) * 100 : 0;

    return `
        <div class="card" style="cursor: pointer;" onclick="window.location.href='player.html?id=${player.id}'">
            <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:14px;">
                <div style="display:flex; align-items:center; gap:10px;">
                    ${createPlayerAvatar(player.name, player.primary_position)}
                    <div>
                        <h4 style="font-size:15px; margin-bottom:2px;">${player.name}</h4>
                        <div style="font-size:12px; color:var(--text-secondary)">${player.club_name || 'Free Agent'}</div>
                    </div>
                </div>
                <span class="badge badge-sky">${player.primary_position}</span>
            </div>

            <div style="display:flex; justify-content:space-between; font-size:13px; margin-bottom:6px;">
                <span style="color:var(--text-secondary)">Market Value</span>
                <strong>${formatCurrency(player.market_value_eur)}</strong>
            </div>
            <div style="display:flex; justify-content:space-between; font-size:13px; margin-bottom:12px;">
                <span style="color:var(--text-secondary)">Model Implied</span>
                <strong style="color:var(--sky-500)">${formatCurrency(player.predicted_value_eur)}</strong>
            </div>

            <div style="display:flex; justify-content:space-between; align-items:center; padding-top:10px; border-top:1px solid var(--border);">
                <span style="font-size:11.5px; color:var(--text-muted); font-weight:600">SPREAD</span>
                ${createValueBadge(gapPercent, true)}
            </div>
        </div>
    `;
}

function createPlayerRow(player) {
    const gap = (player.predicted_value_eur || 0) - (player.market_value_eur || 0);
    const gapPercent = player.market_value_eur ? (gap / player.market_value_eur) * 100 : 0;

    return `
        <tr style="cursor: pointer" onclick="window.location.href='player.html?id=${player.id}'">
            <td>
                <div style="display:flex; align-items:center; gap:10px;">
                    ${createPlayerAvatar(player.name, player.primary_position)}
                    <div>
                        <div style="font-weight:600; color:var(--text-primary)">${player.name}</div>
                        <div style="font-size:12px; color:var(--text-muted)">${player.club_name || 'Free Agent'}</div>
                    </div>
                </div>
            </td>
            <td>${player.age || '-'}</td>
            <td><span class="badge badge-sky">${player.primary_position}</span></td>
            <td>${player.league_name || '-'}</td>
            <td>${formatNumber(player.minutes || 0)}</td>
            <td><strong>${formatCurrency(player.market_value_eur)}</strong></td>
            <td style="color:var(--sky-500); font-weight:600">${formatCurrency(player.predicted_value_eur)}</td>
            <td>${createValueBadge(gapPercent, true)}</td>
        </tr>
    `;
}

function createStatCard(label, value, subtitle = '', trend = null) {
    return `
        <div class="card kpi-card">
            <span class="kpi-label">${label}</span>
            <div class="kpi-value">${value}</div>
            ${subtitle ? `<span style="font-size:12px; color:var(--text-secondary); margin-top:4px;">${subtitle}</span>` : ''}
            ${trend ? `<span class="kpi-chip ${trend > 0 ? 'positive' : 'negative'}">${trend > 0 ? '↑' : '↓'} ${Math.abs(trend)}%</span>` : ''}
        </div>
    `;
}

function createValueBadge(val, isPercentage = false) {
    if (val === null || val === undefined) return '<span class="val-badge">-</span>';
    const isPositive = val > 0;
    const formatted = isPercentage ? formatPercent(val) : formatCurrency(val);
    const cls = isPositive ? 'val-badge positive' : (val < 0 ? 'val-badge negative' : 'val-badge');
    const label = isPositive ? 'Undervalued' : (val < 0 ? 'Overvalued' : 'Fair');
    return `<span class="${cls}">${formatted} (${label})</span>`;
}

function createBreadcrumbs(items) {
    const links = items.map((item, index) => {
        if (index === items.length - 1) return `<span>${item.label}</span>`;
        return `<a href="${item.url}">${item.label}</a> <span style="margin:0 4px; opacity:0.4">/</span>`;
    });
    return `<div class="breadcrumbs">${links.join('')}</div>`;
}

function initPage(pageId) {
    applyStoredTheme();
    document.body.insertAdjacentHTML('afterbegin', createNavbar(pageId));
    document.body.insertAdjacentHTML('beforeend', createFooter());
}
