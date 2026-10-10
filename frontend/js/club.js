document.addEventListener('DOMContentLoaded', async () => {
    initPage('');
    
    const clubId = getUrlParam('id');
    if (!clubId) {
        showError(document.getElementById('club-container'), 'No club ID specified.');
        return;
    }

    try {
        const club = await getClub(clubId);
        document.title = `PlayerValue | ${club.name}`;
        
        document.getElementById('breadcrumbs-container').innerHTML = createBreadcrumbs([
            { label: 'Dashboard', url: 'index.html' },
            { label: 'Clubs', url: 'clubs.html' },
            { label: club.name, url: '#' }
        ]);

        renderClub(club);
    } catch (e) {
        showError(document.getElementById('club-container'), 'Failed to load club data.');
    }
});

function renderClub(club) {
    const container = document.getElementById('club-container');
    
    let html = `
        <div class="card mb-4" style="padding: 28px; display:flex; align-items:center; gap:20px;">
            <div class="player-avatar" style="width: 56px; height: 56px; font-size: 20px; font-weight:800;">${getInitials(club.name)}</div>
            <div>
                <h2 style="font-size: 28px; font-weight:800; color:var(--color-ink); margin-bottom: 4px;">${club.name}</h2>
                <div style="font-size: 14px; color: var(--color-ink-soft)">
                    ${club.league_name} • ${club.country}
                </div>
            </div>
        </div>

        <div class="kpi-grid">
            ${createStatCard('Squad Size', club.squad_size)}
            ${createStatCard('Total Market Value', formatCurrency(club.total_market_value))}
            ${createStatCard('Average Age', formatNumber(club.avg_age, 1) + ' yrs')}
        </div>

        <div class="grid-2 mb-4" style="grid-template-columns: 2fr 1fr;">
            <div class="card">
                <h3 class="card-title">Squad Roster</h3>
                <div class="table-container" style="max-height: 500px; overflow-y: auto;">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>Player</th>
                                <th>Age</th>
                                <th>Position</th>
                                <th>Market Value</th>
                                <th>Model Value</th>
                                <th>Gap</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${(club.roster || []).map(p => {
                                const gapPercent = p.market_value_eur ? ((p.predicted_value_eur || 0) - p.market_value_eur) / p.market_value_eur * 100 : 0;
                                return `
                                <tr onmouseenter="prefetchPlayer(${p.id})" style="cursor:pointer" onclick="window.location.href='player.html?id=${p.id}'">
                                    <td>
                                        <div style="display:flex; align-items:center; gap:10px;">
                                            ${createPlayerAvatar(p.name, p.primary_position)}
                                            <span style="font-weight:600; color:var(--color-ink);">${p.name}</span>
                                        </div>
                                    </td>
                                    <td class="tabular-nums">${p.age}</td>
                                    <td><span class="${getPositionBadgeClass(p.primary_position)}">${p.primary_position}</span></td>
                                    <td class="tabular-nums"><strong>${formatCurrency(p.market_value_eur)}</strong></td>
                                    <td class="tabular-nums" style="color: var(--color-primary-dark); font-weight:600;">${formatCurrency(p.predicted_value_eur)}</td>
                                    <td>${createValueBadge(gapPercent, true)}</td>
                                </tr>
                                `;
                            }).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
            
            <div class="card">
                <h3 class="card-title">Value Distribution by Position</h3>
                <div class="chart-container" style="height: 300px;">
                    <canvas id="dist-chart"></canvas>
                </div>
            </div>
        </div>
    `;

    container.innerHTML = html;

    // Draw chart
    if (club.roster && club.roster.length > 0) {
        const dist = club.roster.reduce((acc, p) => {
            const pos = p.primary_position;
            acc[pos] = (acc[pos] || 0) + p.market_value_eur;
            return acc;
        }, {});
        
        setTimeout(() => {
            createDoughnutChart('dist-chart', Object.keys(dist), Object.values(dist));
        }, 100);
    }
}
