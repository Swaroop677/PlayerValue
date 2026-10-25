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
            const league = c.league_name || 'Other';
            if (!acc[league]) acc[league] = [];
            acc[league].push(c);
            return acc;
        }, {});

        // Reorganize leagues in specified order: PL, La Liga, Bundesliga, Serie A, Ligue 1
        function getLeagueRank(name) {
            const n = (name || '').toLowerCase().replace(/[\s\-_]/g, '');
            if (n.includes('premier') || n === 'pl') return 0;
            if (n === 'laliga' || n === 'liga' || n.includes('laliga')) return 1;
            if (n.includes('bundesliga')) return 2;
            if (n.includes('seriea') || n.includes('serie')) return 3;
            if (n.includes('ligue1') || n.includes('ligue')) return 4;
            return 999;
        }

        const sortedLeagues = Object.keys(byLeague).sort((a, b) => {
            const diff = getLeagueRank(a) - getLeagueRank(b);
            return diff !== 0 ? diff : a.localeCompare(b);
        });

        let html = '';
        for (const league of sortedLeagues) {
            const leagueClubs = byLeague[league];
            html += `<h3 style="font-size:18px; font-weight:700; color:var(--color-ink); margin: 28px 0 16px 0; border-bottom: 1px solid var(--color-border); padding-bottom: 8px;">${league}</h3>`;
            html += `<div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(240px, 1fr)); gap:18px; margin-bottom:28px;">`;
            
            leagueClubs.sort((a,b) => (b.total_market_value || 0) - (a.total_market_value || 0)).forEach(c => {
                html += `
                    <div class="card card-interactive" style="cursor:pointer; padding:20px;" onclick="window.location.href='club.html?id=${c.id}'">
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
                            ${createClubLogo(c.id, c.name, 36)}
                            <span class="badge" style="background:var(--color-surface-alt); border:1px solid var(--color-border); color:var(--color-ink-soft);">${c.country}</span>
                        </div>
                        <h4 style="font-size:15px; font-weight:700; color:var(--color-ink); margin-bottom:4px;">${c.name}</h4>
                        <div style="font-size: 12px; color: var(--color-ink-soft); margin-bottom:12px;">
                            Squad Size: ${c.squad_size} • Avg Age: ${formatNumber(c.avg_age, 1)}
                        </div>
                        <div style="display:flex; justify-content:space-between; align-items:center; border-top:1px solid var(--color-border); padding-top:8px;">
                            <span style="font-size: 12px; color: var(--color-ink-muted)">Total Value</span>
                            <strong class="tabular-nums">${formatCurrency(c.total_market_value)}</strong>
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
