document.addEventListener('DOMContentLoaded', async () => {
    initPage('dashboard');

    const searchInput = document.getElementById('global-search');
    if (searchInput) {
        searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && searchInput.value.trim()) {
                window.location.href = `players.html?name=${encodeURIComponent(searchInput.value.trim())}`;
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

        // 1. Render KPIs
        if (kpiContainer && data.kpis) {
            kpiContainer.innerHTML = data.kpis.map(kpi => {
                let displayVal = kpi.value;
                if (kpi.label === 'Total Market Value') {
                    displayVal = formatCurrency(kpi.value);
                } else {
                    displayVal = formatNumber(kpi.value);
                }
                return createStatCard(kpi.label, displayVal);
            }).join('');
        }

        // 2. Market Growth Chart
        if (data.market_overview && data.market_overview.length > 0) {
            createMarketValueChart(
                'market-overview-chart',
                data.market_overview.map(d => formatDate(d.date)),
                data.market_overview.map(d => d.total_value)
            );
        }

        // 3. Risers Table
        if (risersTbody) {
            risersTbody.innerHTML = (data.risers || []).length > 0 ? data.risers.map(p => `
                <tr style="cursor:pointer" onclick="window.location.href='player.html?id=${p.id}'">
                    <td>
                        <div style="display:flex; align-items:center; gap:10px;">
                            ${createPlayerAvatar(p.name, p.primary_position, 'avatar-sm')}
                            <div>
                                <span style="font-weight:700">${p.name}</span>
                                <div style="font-size:11px; color:var(--color-ink-soft)">${p.club_name || ''}</div>
                            </div>
                        </div>
                    </td>
                    <td>${formatCurrency(p.previous_value_eur)}</td>
                    <td><strong>${formatCurrency(p.market_value_eur)}</strong></td>
                    <td>${createValueBadge(p.change_eur, false)}</td>
                </tr>
            `).join('') : '<tr><td colspan="4" class="text-center" style="padding:24px">No risers recorded</td></tr>';
        }

        // 4. Fallers Table
        if (fallersTbody) {
            fallersTbody.innerHTML = (data.fallers || []).length > 0 ? data.fallers.map(p => `
                <tr style="cursor:pointer" onclick="window.location.href='player.html?id=${p.id}'">
                    <td>
                        <div style="display:flex; align-items:center; gap:10px;">
                            ${createPlayerAvatar(p.name, p.primary_position, 'avatar-sm')}
                            <div>
                                <span style="font-weight:700">${p.name}</span>
                                <div style="font-size:11px; color:var(--color-ink-soft)">${p.club_name || ''}</div>
                            </div>
                        </div>
                    </td>
                    <td>${formatCurrency(p.previous_value_eur)}</td>
                    <td><strong>${formatCurrency(p.market_value_eur)}</strong></td>
                    <td>${createValueBadge(p.change_eur, false)}</td>
                </tr>
            `).join('') : '<tr><td colspan="4" class="text-center" style="padding:24px">No fallers recorded</td></tr>';
        }

        // 5. Undervalued Table
        if (undervaluedTbody && data.undervalued) {
            undervaluedTbody.innerHTML = data.undervalued.map(p => `
                <tr style="cursor:pointer" onclick="window.location.href='player.html?id=${p.id}'">
                    <td>
                        <div style="display:flex; align-items:center; gap:10px;">
                            ${createPlayerAvatar(p.name, p.primary_position, 'avatar-sm')}
                            <div>
                                <span style="font-weight:700">${p.name}</span>
                                <div style="font-size:11px; color:var(--color-ink-soft)">${p.club_name || ''}</div>
                            </div>
                        </div>
                    </td>
                    <td>${p.age}</td>
                    <td><span class="${getPositionBadgeClass(p.primary_position)}">${p.primary_position}</span></td>
                    <td>${p.club_name || '-'}</td>
                    <td>${formatCurrency(p.market_value_eur)}</td>
                    <td style="color:var(--color-primary-dark); font-weight:600">${formatCurrency(p.predicted_value_eur)}</td>
                    <td>${createValueBadge(p.value_gap_percent, true)}</td>
                </tr>
            `).join('');
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
