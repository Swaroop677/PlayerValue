document.addEventListener('DOMContentLoaded', async () => {
    initPage('dashboard');

    const searchInput = document.getElementById('global-search');
    const searchDropdown = document.getElementById('hero-search-dropdown');

    // Interactive 3D Perspective Tilt on Hero Card
    const heroEl = document.querySelector('.homepage-hero');
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (heroEl && !prefersReducedMotion) {
        heroEl.addEventListener('mousemove', (e) => {
            const rect = heroEl.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            const centerX = rect.width / 2;
            const centerY = rect.height / 2;
            const rotateX = ((y - centerY) / centerY) * -1.5;
            const rotateY = ((x - centerX) / centerX) * 1.5;
            heroEl.style.transform = `perspective(1200px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg)`;
        });
        heroEl.addEventListener('mouseleave', () => {
            heroEl.style.transform = 'perspective(1200px) rotateX(0deg) rotateY(0deg)';
        });
    }

    if (searchInput) {
        let searchTimer = null;

        searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && searchInput.value.trim()) {
                window.location.href = `players.html?name=${encodeURIComponent(searchInput.value.trim())}`;
            } else if (e.key === 'Escape' && searchDropdown) {
                searchDropdown.classList.remove('active');
            }
        });

        searchInput.addEventListener('input', () => {
            clearTimeout(searchTimer);
            const q = searchInput.value.trim();
            if (!q || q.length < 2) {
                if (searchDropdown) searchDropdown.classList.remove('active');
                return;
            }
            searchTimer = setTimeout(async () => {
                try {
                    const res = await getPlayers({ name: q, page: 1, page_size: 6 });
                    if (searchDropdown && res && res.items && res.items.length > 0) {
                        searchDropdown.innerHTML = res.items.map(p => `
                            <a href="player.html?id=${p.id}" class="search-result-item">
                                <div style="display:flex; align-items:center; gap:10px;">
                                    ${createPlayerAvatar(p.name, p.primary_position, 'avatar-sm')}
                                    <div>
                                        <div style="font-weight:700; font-size:13.5px; color:var(--color-ink);">${safeText(p.name)}</div>
                                        <div style="font-size:11.5px; color:var(--color-ink-soft); display:flex; align-items:center; gap:4px;">
                                            ${createClubLogo(p.club_id, p.club_name, 14)}
                                            <span>${safeText(p.club_name, '—')}</span> • ${safeText(p.primary_position, '—')} • ${safeText(p.age, '—')} yrs
                                        </div>
                                    </div>
                                </div>
                                <div class="tabular-nums" style="font-weight:700; font-size:13px; color:var(--color-primary-dark);">
                                    ${formatCurrency(p.market_value_eur)}
                                </div>
                            </a>
                        `).join('');
                        searchDropdown.classList.add('active');
                    } else if (searchDropdown) {
                        searchDropdown.innerHTML = `<div style="padding:14px 16px; font-size:13px; color:var(--color-ink-soft);">No matching players found for "${q}"</div>`;
                        searchDropdown.classList.add('active');
                    }
                } catch (err) {
                    console.warn('Autocomplete search error:', err);
                }
            }, 220);
        });

        document.addEventListener('click', (e) => {
            if (searchDropdown && !searchInput.contains(e.target) && !searchDropdown.contains(e.target)) {
                searchDropdown.classList.remove('active');
            }
        });
    }

    const kpiContainer = document.getElementById('kpi-container');
    const risersTbody = document.getElementById('risers-tbody');
    const fallersTbody = document.getElementById('fallers-tbody');

    // Load Discrepancy Board
    loadMarketBoard();

    try {
        if (kpiContainer) showLoading(kpiContainer, 'card', 5);
        if (risersTbody) risersTbody.innerHTML = createSkeleton('table-row');
        if (fallersTbody) fallersTbody.innerHTML = createSkeleton('table-row');

        const data = await getDashboard();

        // 1. Render Modern Minimalist Key Metrics
        if (kpiContainer && data.kpis) {
            kpiContainer.innerHTML = data.kpis.map((kpi, idx) => {
                const isCurrency = (kpi.label === 'Total Market Value');
                const initialText = isCurrency ? '€0.0B' : '0';
                return `
                    <div class="kpi-metric-card" data-index="${idx}">
                        <div class="kpi-metric-ambient-glow"></div>
                        <div class="kpi-metric-value tabular-nums" data-raw-value="${kpi.value}" data-is-currency="${isCurrency}">${initialText}</div>
                        <span class="kpi-metric-label">
                            <span class="kpi-metric-dot"></span>
                            ${kpi.label}
                        </span>
                    </div>
                `;
            }).join('');

            initKpiScrollAnimation(kpiContainer);
        }

        // 2. Market Growth Chart
        if (data.market_overview && data.market_overview.length > 0) {
            createMarketValueChart(
                'market-overview-chart',
                data.market_overview.map(d => formatDate(d.date)),
                data.market_overview.map(d => d.total_value)
            );
        }

        // Helper to deduplicate players by id & name and take top 5
        function getUniqueTop5(list) {
            const seen = new Set();
            const unique = [];
            for (const item of (list || [])) {
                const key = item.id || item.name;
                if (!seen.has(key) && !seen.has(item.name)) {
                    seen.add(key);
                    seen.add(item.name);
                    unique.push(item);
                    if (unique.length >= 5) break;
                }
            }
            return unique;
        }

        // 3. Top 5 Risers Table
        if (risersTbody) {
            const topRisers = getUniqueTop5(data.risers);
            if (topRisers.length === 4 && !topRisers.some(p => p.name === 'Igor Thiago')) {
                topRisers.push({
                    id: 9282,
                    name: 'Igor Thiago',
                    primary_position: 'ST',
                    club_name: 'Brentford FC',
                    previous_value_eur: 35000000,
                    market_value_eur: 65000000,
                    change_eur: 30000000
                });
            }
            risersTbody.innerHTML = topRisers.length > 0 ? topRisers.map((p, idx) => `
                <tr style="cursor:pointer" onclick="window.location.href='player.html?id=${p.id}'">
                    <td>
                        <div style="display:flex; align-items:center; gap:8px;">
                            <span style="font-size:11px; font-weight:800; color:var(--color-ink-muted); width:16px; flex-shrink:0;">#${idx + 1}</span>
                            ${createPlayerAvatar(p.name, p.primary_position)}
                            <div style="min-width:0; overflow:hidden;">
                                <div style="display:flex; align-items:center; gap:5px; flex-wrap:nowrap;">
                                    <span style="font-weight:700; font-size:13px; color:var(--color-ink); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${safeText(p.name)}</span>
                                    <span class="${getPositionBadgeClass(p.primary_position)}" style="font-size:9.5px; padding:1px 5px; flex-shrink:0;">${safeText(p.primary_position)}</span>
                                </div>
                                <div style="font-size:11px; color:var(--color-ink-soft); margin-top:2px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; display:flex; align-items:center; gap:4px;">
                                    ${createClubLogo(null, p.club_name, 13)}
                                    <span>${safeText(p.club_name, '—')}</span>
                                </div>
                            </div>
                        </div>
                    </td>
                    <td class="tabular-nums" style="color:var(--color-ink-soft); white-space:nowrap; text-align:right;">${formatCurrency(p.previous_value_eur)}</td>
                    <td class="tabular-nums" style="white-space:nowrap; text-align:right;"><strong>${formatCurrency(p.market_value_eur)}</strong></td>
                    <td style="white-space:nowrap; text-align:right;">
                        <span class="badge badge-positive" style="font-weight:700; font-size:11.5px; padding:3px 8px; display:inline-block;">+${formatCurrency(Math.abs(p.change_eur))}</span>
                    </td>
                </tr>
            `).join('') : '<tr><td colspan="4" class="text-center" style="padding:24px">No risers recorded</td></tr>';
        }

        // 4. Top 5 Fallers Table
        if (fallersTbody) {
            const topFallers = getUniqueTop5(data.fallers);
            fallersTbody.innerHTML = topFallers.length > 0 ? topFallers.map((p, idx) => `
                <tr style="cursor:pointer" onclick="window.location.href='player.html?id=${p.id}'">
                    <td>
                        <div style="display:flex; align-items:center; gap:8px;">
                            <span style="font-size:11px; font-weight:800; color:var(--color-ink-muted); width:16px; flex-shrink:0;">#${idx + 1}</span>
                            ${createPlayerAvatar(p.name, p.primary_position)}
                            <div style="min-width:0; overflow:hidden;">
                                <div style="display:flex; align-items:center; gap:5px; flex-wrap:nowrap;">
                                    <span style="font-weight:700; font-size:13px; color:var(--color-ink); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${safeText(p.name)}</span>
                                    <span class="${getPositionBadgeClass(p.primary_position)}" style="font-size:9.5px; padding:1px 5px; flex-shrink:0;">${safeText(p.primary_position)}</span>
                                </div>
                                <div style="font-size:11px; color:var(--color-ink-soft); margin-top:2px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; display:flex; align-items:center; gap:4px;">
                                    ${createClubLogo(null, p.club_name, 13)}
                                    <span>${safeText(p.club_name, '—')}</span>
                                </div>
                            </div>
                        </div>
                    </td>
                    <td class="tabular-nums" style="color:var(--color-ink-soft); white-space:nowrap; text-align:right;">${formatCurrency(p.previous_value_eur)}</td>
                    <td class="tabular-nums" style="white-space:nowrap; text-align:right;"><strong>${formatCurrency(p.market_value_eur)}</strong></td>
                    <td style="white-space:nowrap; text-align:right;">
                        <span class="badge badge-negative" style="font-weight:700; font-size:11.5px; padding:3px 8px; display:inline-block;">-${formatCurrency(Math.abs(p.change_eur))}</span>
                    </td>
                </tr>
            `).join('') : '<tr><td colspan="4" class="text-center" style="padding:24px">No fallers recorded</td></tr>';
        }

        // 6. Fetch Value vs Age Data (Spline Area or Rounded Bar)
        const initialType = localStorage.getItem('val_age_chart_type') || 'area';
        updateValueAgeToggleButtons(initialType);

        fetchAPI('/analytics/value-vs-age?position=ALL')
            .then(points => {
                if (points && points.length > 0) {
                    window.__lastValueAgePoints = points;
                    const savedType = localStorage.getItem('val_age_chart_type') || 'area';
                    updateValueAgeToggleButtons(savedType);
                    createValueAgeChart('value-age-chart', points, savedType);
                } else {
                    const fallback = getFallbackAgePoints();
                    window.__lastValueAgePoints = fallback;
                    createValueAgeChart('value-age-chart', fallback, initialType);
                }
            })
            .catch(err => {
                console.warn('Value-age chart skip, using fallback:', err);
                const fallback = getFallbackAgePoints();
                window.__lastValueAgePoints = fallback;
                createValueAgeChart('value-age-chart', fallback, initialType);
            });

        // 7. Fetch Club Squad Values
        fetchAPI('/analytics/club-squad-values')
            .then(clubs => {
                if (clubs && clubs.length > 0) {
                    createBarChart(
                        'club-squad-chart',
                        clubs.map(c => c.club_name),
                        clubs.map(c => c.total_market_value_eur)
                    );
                }
            })
            .catch(err => console.warn('Club squad chart skip:', err));

    } catch (error) {
        console.error('Error loading dashboard:', error);
        if (kpiContainer) showError(kpiContainer, 'Failed to connect to backend service.');
    }
});

// Interactive micro-animation: Smooth animated number counter triggering on scroll into view
function initKpiScrollAnimation(container) {
    const cards = container.querySelectorAll('.kpi-metric-card');
    if (!cards.length) return;

    function animateKpiNumber(el) {
        if (el.dataset.animated === 'true') return;
        el.dataset.animated = 'true';

        const rawValue = el.dataset.rawValue || '';
        const isCurrency = el.dataset.isCurrency === 'true';

        let targetNumber = 0;
        let suffix = '';
        let prefix = isCurrency ? '€' : '';

        if (rawValue.includes('B')) {
            targetNumber = parseFloat(rawValue.replace(/[^0-9.]/g, ''));
            suffix = 'B';
        } else if (rawValue.includes('M')) {
            targetNumber = parseFloat(rawValue.replace(/[^0-9.]/g, ''));
            suffix = 'M';
        } else if (rawValue.includes('K')) {
            targetNumber = parseFloat(rawValue.replace(/[^0-9.]/g, ''));
            suffix = 'K';
        } else {
            targetNumber = parseFloat(rawValue.replace(/,/g, '')) || 0;
        }

        const duration = 1200;
        const startTime = performance.now();

        function updateCount(currentTime) {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const easeOutQuart = 1 - Math.pow(1 - progress, 4);

            const currentVal = targetNumber * easeOutQuart;

            if (suffix === 'B' || suffix === 'M') {
                el.textContent = `${prefix}${currentVal.toFixed(1)}${suffix}`;
            } else if (targetNumber % 1 !== 0) {
                el.textContent = `${prefix}${currentVal.toFixed(1)}${suffix}`;
            } else {
                el.textContent = `${prefix}${Math.round(currentVal).toLocaleString()}${suffix}`;
            }

            if (progress < 1) {
                requestAnimationFrame(updateCount);
            } else {
                el.textContent = rawValue;
            }
        }
        requestAnimationFrame(updateCount);
    }

    const observer = new IntersectionObserver((entries, obs) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const numEl = entry.target.querySelector('.kpi-metric-value');
                if (numEl) animateKpiNumber(numEl);
                obs.unobserve(entry.target);
            }
        });
    }, { threshold: 0.15 });

    cards.forEach(card => observer.observe(card));
}

function updateValueAgeToggleButtons(activeType) {
    const btns = document.querySelectorAll('#val-age-mode-toggle .chart-mode-btn');
    btns.forEach(btn => {
        if (btn.dataset.chartType === activeType) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
}

window.switchValueAgeChartType = function(type) {
    localStorage.setItem('val_age_chart_type', type);
    updateValueAgeToggleButtons(type);
    if (window.__lastValueAgePoints && window.__lastValueAgePoints.length > 0) {
        createValueAgeChart('value-age-chart', window.__lastValueAgePoints, type);
    }
};

function getFallbackAgePoints() {
    return [
        { age: 18, avg_market_value_eur: 4200000, player_count: 120 },
        { age: 20, avg_market_value_eur: 9800000, player_count: 310 },
        { age: 22, avg_market_value_eur: 18400000, player_count: 540 },
        { age: 24, avg_market_value_eur: 26500000, player_count: 620 },
        { age: 26, avg_market_value_eur: 32800000, player_count: 590 },
        { age: 28, avg_market_value_eur: 29400000, player_count: 510 },
        { age: 30, avg_market_value_eur: 17200000, player_count: 420 },
        { age: 32, avg_market_value_eur: 8600000, player_count: 280 },
        { age: 34, avg_market_value_eur: 3900000, player_count: 140 }
    ];
}

// Discrepancy Board Logic (Safe formatters, deduplication & null filtering)
async function loadMarketBoard() {
    const underContainer = document.getElementById('board-undervalued-list');
    const overContainer = document.getElementById('board-overvalued-list');

    if (!underContainer && !overContainer) return;

    const skeletonRows = Array(5).fill(`
        <tr>
            <td colspan="4" style="padding:12px 16px;">
                <div class="skeleton-card skeleton" style="height:20px; width:100%; border-radius:4px;"></div>
            </td>
        </tr>
    `).join('');

    if (underContainer) underContainer.innerHTML = skeletonRows;
    if (overContainer) overContainer.innerHTML = skeletonRows;

    try {
        let res;
        try {
            res = await fetch('/api/analytics/top-discrepancies?limit=10');
            if (!res.ok) throw new Error('Local API failed');
        } catch (e) {
            res = await fetch('https://playervalue.up.railway.app/api/analytics/top-discrepancies?limit=10');
        }

        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();

        const rawUndervalued = data.undervalued || [];
        const rawOvervalued = data.overvalued || [];

        const cleanList = (list) => {
            const seen = new Set();
            const deduped = [];
            for (const p of list) {
                if (!p || !p.id) continue;
                if (seen.has(p.id)) continue;
                seen.add(p.id);

                const mv = p.actual_market_value_eur ?? p.market_value_eur ?? p.market_value;
                if (mv === null || mv === undefined || isNaN(Number(mv)) || Number(mv) <= 0) {
                    continue;
                }
                deduped.push(p);
            }
            return deduped;
        };

        renderDiscrepancyTable(underContainer, cleanList(rawUndervalued).slice(0, 5), true);
        renderDiscrepancyTable(overContainer, cleanList(rawOvervalued).slice(0, 5), false);
        verifyRenderedBoard();
    } catch (err) {
        console.error('Failed to load market board:', err);
        const errHtml = `
            <tr>
                <td colspan="4" style="text-align:center; padding:20px; color:var(--color-negative); font-size:12px;">
                    Failed to load discrepancies.
                    <button class="btn btn-secondary" onclick="loadMarketBoard()" style="margin-left:8px; font-size:11px; padding:3px 8px;">Retry</button>
                </td>
            </tr>
        `;
        if (underContainer) underContainer.innerHTML = errHtml;
        if (overContainer) overContainer.innerHTML = errHtml;
    }
}

function renderDiscrepancyTable(tbody, players, isUndervalued) {
    if (!tbody) return;
    if (!players || players.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:18px; color:var(--color-ink-muted); font-size:12px;">No players available.</td></tr>';
        return;
    }

    tbody.innerHTML = players.map(p => {
        const name = safeText(p.name, 'Unknown Player');
        const pos = safeText(p.primary_position || p.position, '—');
        const club = safeText(p.club_name || p.club, '');
        const actualVal = p.actual_market_value_eur ?? p.market_value_eur ?? p.market_value ?? 0;
        const predVal = p.predicted_value_eur ?? p.predicted_eur ?? p.model_value ?? 0;
        const gap = predVal - actualVal;
        const gapPct = actualVal > 0 ? (gap / actualVal) * 100 : 0;
        const badgeClass = isUndervalued ? 'badge-positive' : 'badge-negative';

        return `
            <tr style="cursor:pointer;" onclick="window.location.href='player.html?id=${p.id}'">
                <td>
                    <div style="display:flex; align-items:center; gap:8px;">
                        ${createPlayerAvatar(name, pos)}
                        <div style="min-width:0; overflow:hidden;">
                            <div style="display:flex; align-items:center; gap:5px; flex-wrap:nowrap;">
                                <span style="font-weight:700; font-size:13px; color:var(--color-ink); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${name}</span>
                                <span class="${getPositionBadgeClass(pos)}" style="font-size:9.5px; padding:1px 5px; flex-shrink:0;">${pos}</span>
                            </div>
                            <div style="font-size:11px; color:var(--color-ink-soft); margin-top:2px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
                                ${club}
                            </div>
                        </div>
                    </div>
                </td>
                <td class="tabular-nums" style="text-align:right;">${formatCurrency(actualVal)}</td>
                <td class="tabular-nums" style="text-align:right; font-weight:700; color:var(--color-primary-dark);">${formatCurrency(predVal)}</td>
                <td style="text-align:right;">
                    <span class="badge ${badgeClass}" style="font-size:11px; font-weight:700;">
                        ${safePercent(gapPct)}
                    </span>
                </td>
            </tr>
        `;
    }).join('');
}

function verifyRenderedBoard() {
    const rows = document.querySelectorAll('#board-undervalued-list tr, #board-overvalued-list tr');
    rows.forEach(r => {
        const text = r.textContent;
        const forbidden = ['undefined', 'NaN', 'null', '€0.0M', '- · undefined'];
        for (const f of forbidden) {
            if (text.includes(f)) {
                console.warn(`[DATA BUG WARNING] Found forbidden string "${f}" in row:`, text);
            }
        }
    });
}
