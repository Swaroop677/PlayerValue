document.addEventListener('DOMContentLoaded', async () => {
    initPage('');
    
    document.getElementById('breadcrumbs-container').innerHTML = createBreadcrumbs([
        { label: 'Dashboard', url: 'index.html' },
        { label: 'Scouting', url: 'scouting.html' },
        { label: 'Comparison', url: '#' }
    ]);

    const idsParam = getUrlParam('ids');
    if (!idsParam) {
        showError(document.getElementById('compare-container'), 'No players selected for comparison.');
        return;
    }

    const ids = idsParam.split(',').slice(0, 3);
    
    try {
        const playersData = await Promise.all(ids.map(id => getPlayer(id)));
        const statsData = await Promise.all(ids.map(id => getPlayerStats(id)));
        
        renderComparison(playersData, statsData);
    } catch (e) {
        showError(document.getElementById('compare-container'), 'Failed to load data for comparison.');
    }
});

function renderComparison(players, stats) {
    const container = document.getElementById('compare-container');
    
    // 1. Cards
    let html = `<div class="compare-grid">`;
    players.forEach(p => {
        html += createPlayerCard(p);
    });
    html += `</div>`;

    // 2. Radar Chart
    html += `
        <div class="card mb-4">
            <h3 class="card-title text-center">Performance Comparison (Percentiles)</h3>
            <div class="radar-container">
                <canvas id="radar-chart"></canvas>
            </div>
        </div>
    `;

    // 3. Data Table
    html += `
        <div class="card">
            <h3 class="card-title">Detailed Statistics (per 90)</h3>
            <div class="table-container">
                <table class="data-table text-center">
                    <thead>
                        <tr>
                            <th class="text-left">Metric</th>
                            ${players.map(p => `<th>${p.name}</th>`).join('')}
                        </tr>
                    </thead>
                    <tbody>
                        ${renderStatRow('Minutes', stats, s => s.minutes, 0)}
                        ${renderStatRow('Goals', stats, s => s.goals_per_90)}
                        ${renderStatRow('Assists', stats, s => s.assists_per_90)}
                        ${renderStatRow('xG', stats, s => s.xg_per_90)}
                        ${renderStatRow('xA', stats, s => s.xa_per_90)}
                        ${renderStatRow('Prog Passes', stats, s => s.progressive_passes_per_90)}
                        ${renderStatRow('Prog Carries', stats, s => s.progressive_carries_per_90)}
                        ${renderStatRow('Tackles', stats, s => s.tackles_per_90)}
                        ${renderStatRow('Interceptions', stats, s => s.interceptions_per_90)}
                    </tbody>
                </table>
            </div>
        </div>
    `;

    container.innerHTML = html;

    // Draw Radar
    const labels = ['Scoring', 'Creativity', 'Progression', 'Passing', 'Defending', 'Possession'];
    
    const datasets = players.map((p, i) => {
        const s = stats[i] && stats[i].length > 0 ? stats[i][0] : {};
        
        // Pseudo-normalization (just multiplying by factors to make them look like percentiles 0-100 for display)
        const scoring = Math.min(100, ((s.goals_per_90 || 0) + (s.xg_per_90 || 0)) * 50);
        const creativity = Math.min(100, ((s.assists_per_90 || 0) + (s.xa_per_90 || 0)) * 60);
        const progression = Math.min(100, ((s.progressive_passes_per_90 || 0) + (s.progressive_carries_per_90 || 0)) * 10);
        const passing = Math.min(100, (s.progressive_passes_per_90 || 0) * 15);
        const defending = Math.min(100, ((s.tackles_per_90 || 0) + (s.interceptions_per_90 || 0)) * 25);
        const possession = Math.min(100, (s.progressive_carries_per_90 || 0) * 20);

        return {
            label: p.name,
            data: [scoring, creativity, progression, passing, defending, possession]
        };
    });

    setTimeout(() => {
        createRadarChart('radar-chart', labels, datasets);
    }, 100);
}

function renderStatRow(label, stats, extractor, decimals = 2) {
    let row = `<tr><td class="text-left"><strong>${label}</strong></td>`;
    stats.forEach(sArr => {
        const s = sArr && sArr.length > 0 ? sArr[0] : null;
        let val = s ? extractor(s) : null;
        if (val === null || val === undefined) {
            row += `<td>-</td>`;
        } else {
            row += `<td>${formatNumber(val, decimals)}</td>`;
        }
    });
    row += `</tr>`;
    return row;
}
