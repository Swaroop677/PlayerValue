document.addEventListener('DOMContentLoaded', async () => {
    initPage('clubs');
    
    document.getElementById('breadcrumbs-container').innerHTML = createBreadcrumbs([
        { label: 'Dashboard', url: 'index.html' },
        { label: 'Clubs', url: '#' }
    ]);

    const container = document.getElementById('clubs-container');
    showLoading(container, 'card', 8);

    try {
        const clubs = await getClubs();
        
        // Group by league
        const byLeague = clubs.reduce((acc, c) => {
            if (!acc[c.league_name]) acc[c.league_name] = [];
            acc[c.league_name].push(c);
            return acc;
        }, {});

        let html = '';
        for (const [league, leagueClubs] of Object.entries(byLeague)) {
            html += `<h3 class="mb-3 mt-4" style="border-bottom: 1px solid var(--border); padding-bottom: 8px;">${league}</h3>`;
            html += `<div class="grid-4 mb-4">`;
            
            leagueClubs.sort((a,b) => b.total_market_value - a.total_market_value).forEach(c => {
                html += `
                    <div class="card" style="cursor:pointer" onclick="window.location.href='club.html?id=${c.id}'">
                        <div class="flex-between mb-3">
                            <div class="player-avatar avatar-sm" style="background: var(--bg-tertiary)">${getInitials(c.name)}</div>
                            <span class="badge badge-league">${c.country}</span>
                        </div>
                        <h4 class="mb-1">${c.name}</h4>
                        <div style="font-size: 12px; color: var(--text-secondary)" class="mb-3">
                            Squad Size: ${c.squad_size} • Avg Age: ${formatNumber(c.avg_age, 1)}
                        </div>
                        <div class="flex-between">
                            <span style="font-size: 12px; color: var(--text-secondary)">Total Value</span>
                            <strong>${formatCurrency(c.total_market_value)}</strong>
                        </div>
                    </div>
                `;
            });
            html += `</div>`;
        }

        container.innerHTML = html;
    } catch (e) {
        showError(container, 'Failed to load clubs.');
    }
});
