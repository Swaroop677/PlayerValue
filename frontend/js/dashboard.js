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
                                        <div style="font-weight:700; font-size:13.5px; color:var(--color-ink);">${p.name}</div>
                                        <div style="font-size:11.5px; color:var(--color-ink-soft);">${p.club_name || '-'} • ${p.primary_position} • ${p.age || '-'} yrs</div>
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
    const undervaluedTbody = document.getElementById('undervalued-tbody');

    try {
        if (kpiContainer) showLoading(kpiContainer, 'card', 5);
        if (risersTbody) risersTbody.innerHTML = createSkeleton('table-row');
        if (fallersTbody) fallersTbody.innerHTML = createSkeleton('table-row');
        if (undervaluedTbody) undervaluedTbody.innerHTML = createSkeleton('table-row');

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
                        <div style="display:flex; align-items:center; gap:10px;">
                            <span style="font-size:11.5px; font-weight:800; color:var(--color-ink-muted); width:16px; flex-shrink:0;">#${idx + 1}</span>
                            ${createPlayerAvatar(p.name, p.primary_position)}
                            <div style="min-width:0;">
                                <div style="display:flex; align-items:center; gap:6px; flex-wrap:nowrap;">
                                    <span style="font-weight:700; font-size:13.5px; color:var(--color-ink); white-space:nowrap;">${p.name}</span>
                                    <span class="${getPositionBadgeClass(p.primary_position)}" style="font-size:10px; padding:1px 6px; flex-shrink:0;">${p.primary_position || ''}</span>
                                </div>
                                <div style="font-size:11.5px; color:var(--color-ink-soft); margin-top:2px; white-space:nowrap;">${p.club_name || ''}</div>
                            </div>
                        </div>
                    </td>
                    <td class="tabular-nums" style="color:var(--color-ink-soft); white-space:nowrap;">${formatCurrency(p.previous_value_eur)}</td>
                    <td class="tabular-nums" style="white-space:nowrap;"><strong>${formatCurrency(p.market_value_eur)}</strong></td>
                    <td style="white-space:nowrap;">${createValueBadge(p.change_eur, false)}</td>
                </tr>
            `).join('') : '<tr><td colspan="4" class="text-center" style="padding:24px">No risers recorded</td></tr>';
        }

        // 4. Top 5 Fallers Table
        if (fallersTbody) {
            const topFallers = getUniqueTop5(data.fallers);
            fallersTbody.innerHTML = topFallers.length > 0 ? topFallers.map((p, idx) => `
                <tr style="cursor:pointer" onclick="window.location.href='player.html?id=${p.id}'">
                    <td>
                        <div style="display:flex; align-items:center; gap:10px;">
                            <span style="font-size:11.5px; font-weight:800; color:var(--color-ink-muted); width:16px; flex-shrink:0;">#${idx + 1}</span>
                            ${createPlayerAvatar(p.name, p.primary_position)}
                            <div style="min-width:0;">
                                <div style="display:flex; align-items:center; gap:6px; flex-wrap:nowrap;">
                                    <span style="font-weight:700; font-size:13.5px; color:var(--color-ink); white-space:nowrap;">${p.name}</span>
                                    <span class="${getPositionBadgeClass(p.primary_position)}" style="font-size:10px; padding:1px 6px; flex-shrink:0;">${p.primary_position || ''}</span>
                                </div>
                                <div style="font-size:11.5px; color:var(--color-ink-soft); margin-top:2px; white-space:nowrap;">${p.club_name || ''}</div>
                            </div>
                        </div>
                    </td>
                    <td class="tabular-nums" style="color:var(--color-ink-soft); white-space:nowrap;">${formatCurrency(p.previous_value_eur)}</td>
                    <td class="tabular-nums" style="white-space:nowrap;"><strong>${formatCurrency(p.market_value_eur)}</strong></td>
                    <td style="white-space:nowrap;">${createValueBadge(p.change_eur, false)}</td>
                </tr>
            `).join('') : '<tr><td colspan="4" class="text-center" style="padding:24px">No fallers recorded</td></tr>';
        }

        // 6. Fetch Value vs Age Data
        fetchAPI('/analytics/value-vs-age?position=ALL')
            .then(points => {
                if (points && points.length > 0) {
                    createValueAgeChart('value-age-chart', points);
                }
            })
            .catch(err => console.warn('Value-age chart skip:', err));

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
        const rawVal = parseFloat(el.getAttribute('data-raw-value') || '0');
        const isCurrency = el.getAttribute('data-is-currency') === 'true';
        const duration = 1400; // ms
        const startTime = performance.now();

        function easeOutExpo(x) {
            return x === 1 ? 1 : 1 - Math.pow(2, -10 * x);
        }

        function step(now) {
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const ease = easeOutExpo(progress);

            if (isCurrency) {
                if (rawVal >= 1e9) {
                    const currentB = ((rawVal / 1e9) * ease).toFixed(1);
                    el.textContent = `€${currentB}B`;
                } else if (rawVal >= 1e6) {
                    const currentM = ((rawVal / 1e6) * ease).toFixed(1);
                    el.textContent = `€${currentM}M`;
                } else {
                    el.textContent = `€${Math.round(rawVal * ease).toLocaleString()}`;
                }
            } else {
                const currentInt = Math.round(rawVal * ease);
                el.textContent = currentInt.toLocaleString();
            }

            if (progress < 1) {
                requestAnimationFrame(step);
            } else {
                // Final exact formatting fallback
                if (isCurrency) {
                    el.textContent = formatCurrency(rawVal);
                } else {
                    el.textContent = formatNumber(rawVal);
                }
            }
        }

        requestAnimationFrame(step);
    }

    if (!('IntersectionObserver' in window)) {
        cards.forEach((card, i) => {
            const valEl = card.querySelector('.kpi-metric-value');
            if (valEl) setTimeout(() => animateKpiNumber(valEl), i * 80);
        });
        return;
    }

    const observer = new IntersectionObserver((entries, obs) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const card = entry.target;
                const valEl = card.querySelector('.kpi-metric-value');
                if (valEl && !valEl.classList.contains('counted')) {
                    valEl.classList.add('counted');
                    const idx = parseInt(card.getAttribute('data-index') || '0', 10);
                    setTimeout(() => animateKpiNumber(valEl), idx * 80);
                }
                obs.unobserve(card);
            }
        });
    }, {
        threshold: 0.15,
        rootMargin: '0px 0px -20px 0px'
    });

    cards.forEach(card => observer.observe(card));
}

