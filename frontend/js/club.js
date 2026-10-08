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
        <div class="profile-header mb-4" style="padding: 24px">
            <div class="player-avatar avatar-lg" style="background: var(--bg-tertiary); border-radius: 16px;">${getInitials(club.name)}</div>
            <div>
                <h2 style="font-size: 28px; margin-bottom: 8px;">${club.name}</h2>
                <div style="color: var(--text-secondary)">
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
                                <tr style="cursor:pointer" onclick="window.location.href='player.html?id=${p.id}'">
                                    <td>
                                        <div class="player-cell">
                                            ${createPlayerAvatar(p.name, p.primary_position, 'avatar-sm')}
                                            <span>${p.name}</span>
                                        </div>
                                    </td>
                                    <td>${p.age}</td>
                                    <td><span class="badge badge-position" style="background-color: ${getPositionColor(p.primary_position)}">${p.primary_position}</span></td>
                                    <td>${formatCurrency(p.market_value_eur)}</td>
                                    <td style="color: var(--accent-purple)">${formatCurrency(p.predicted_value_eur)}</td>
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
