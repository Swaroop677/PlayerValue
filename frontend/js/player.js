document.addEventListener('DOMContentLoaded', async () => {
    initPage('');
    
    const playerId = getUrlParam('id');
    if (!playerId) {
        showError(document.getElementById('profile-container'), 'No player ID specified.');
        return;
    }

    try {
        const [player, stats, history, transfers, prediction, similar] = await Promise.all([
            getPlayer(playerId),
            getPlayerStats(playerId),
            getPlayerMarketValues(playerId),
            getPlayerTransfers(playerId),
            getPlayerPrediction(playerId),
            getSimilarPlayers(playerId, { n: 5 })
        ]);

        document.title = `PlayerValue | ${player.name}`;
        
        document.getElementById('breadcrumbs-container').innerHTML = createBreadcrumbs([
            { label: 'Dashboard', url: 'index.html' },
            { label: 'Players', url: 'players.html' },
            { label: player.name, url: '#' }
        ]);

        renderProfile(player, stats, history, transfers, prediction, similar);
    } catch (e) {
        console.error(e);
        showError(document.getElementById('profile-container'), 'Failed to load player profile.');
    }
});

function renderProfile(player, stats, history, transfers, prediction, similar) {
    const container = document.getElementById('profile-container');
    const gap = (player.predicted_value_eur || 0) - (player.market_value_eur || 0);
    const gapPercent = player.market_value_eur ? (gap / player.market_value_eur) * 100 : 0;
    
    let html = `
        <div class="card mb-4" style="background:var(--hero-grad); border:1px solid var(--border);">
            <div style="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:20px;">
                <div style="display:flex; align-items:center; gap:18px;">
                    <div style="width:64px; height:64px; border-radius:var(--radius-pill); background:var(--sky-soft); color:var(--sky-600); font-size:24px; font-weight:800; display:flex; align-items:center; justify-content:center;">
                        ${getInitials(player.name)}
                    </div>
                    <div>
                        <div style="display:flex; align-items:center; gap:10px; margin-bottom:4px;">
                            <h1 style="font-size:28px; font-weight:800; margin:0;">${player.name}</h1>
                            <span class="badge badge-sky">${player.primary_position}</span>
                        </div>
                        <div style="font-size:13.5px; color:var(--text-secondary); display:flex; gap:14px; flex-wrap:wrap;">
                            <span><strong>Club:</strong> <a href="club.html?id=${player.club_id}">${player.club_name || 'Free Agent'}</a></span>
                            <span><strong>League:</strong> ${player.league_name || '-'}</span>
                            <span><strong>Nationality:</strong> ${player.nationality}</span>
                            <span><strong>Age:</strong> ${player.age || '-'}</span>
                            <span><strong>Height:</strong> ${player.height_cm ? player.height_cm + 'cm' : '-'}</span>
                            <span><strong>Foot:</strong> ${player.preferred_foot || '-'}</span>
                        </div>
                    </div>
                </div>

                <div style="display:flex; gap:20px; align-items:center; background:var(--bg-card); padding:16px 20px; border-radius:var(--radius-md); border:1px solid var(--border);">
                    <div>
                        <div class="kpi-label">Market Value</div>
                        <div style="font-family:var(--font-heading); font-size:24px; font-weight:800; color:var(--text-primary)">
                            ${formatCurrency(player.market_value_eur)}
                        </div>
                    </div>
                    <div style="width:1px; height:40px; background:var(--border);"></div>
                    <div>
                        <div class="kpi-label">Model Implied</div>
                        <div style="font-family:var(--font-heading); font-size:24px; font-weight:800; color:var(--sky-500)">
                            ${formatCurrency(player.predicted_value_eur)}
                        </div>
                    </div>
                    <div style="width:1px; height:40px; background:var(--border);"></div>
                    <div>
                        <div class="kpi-label">Gap</div>
                        ${createValueBadge(gapPercent, true)}
                    </div>
                </div>
            </div>
        </div>
    `;

    // History Line Chart
    if (history && history.length > 0) {
        html += `
            <div class="card mb-4">
                <div class="card-header">
                    <div>
                        <h3 class="card-title">Market Valuation History</h3>
                        <p class="card-subtitle">Transfermarkt historical value changes over seasons</p>
                    </div>
                </div>
                <div class="chart-container" style="height:320px;">
                    <canvas id="mv-chart"></canvas>
                </div>
            </div>
        `;
    }

    // Latest Stats & Radar Comparison
    const latestStat = stats && stats.length > 0 ? stats[0] : null;
    if (latestStat) {
        html += `
            <div class="grid-2 mb-4" style="grid-template-columns: 1.1fr 0.9fr;">
                <div class="card">
                    <div class="card-header">
                        <div>
                            <h3 class="card-title">Season Statistics (${latestStat.season})</h3>
                            <p class="card-subtitle">Matches and per-90 performance metrics</p>
                        </div>
                    </div>
                    <div class="kpi-grid" style="grid-template-columns:repeat(2, 1fr); margin-bottom:0;">
                        ${createStatCard('Appearances', latestStat.appearances)}
                        ${createStatCard('Minutes', formatNumber(latestStat.minutes))}
                        ${createStatCard('Goals', latestStat.goals, `Goals/90: ${Number(latestStat.goals_per_90 || 0).toFixed(2)}`)}
                        ${createStatCard('Assists', latestStat.assists, `Assists/90: ${Number(latestStat.assists_per_90 || 0).toFixed(2)}`)}
                        ${createStatCard('Expected Goals (xG)', Number(latestStat.xg || 0).toFixed(1), `xG/90: ${Number(latestStat.xg_per_90 || 0).toFixed(2)}`)}
                        ${createStatCard('Expected Assists (xA)', Number(latestStat.xa || 0).toFixed(1), `xA/90: ${Number(latestStat.xa_per_90 || 0).toFixed(2)}`)}
                    </div>
                </div>

                <div class="card">
                    <div class="card-header">
                        <div>
                            <h3 class="card-title">Positional Radar Benchmark</h3>
                            <p class="card-subtitle">Per-90 metrics vs. league positional average</p>
                        </div>
                    </div>
                    <div class="chart-container" style="height:300px;">
                        <canvas id="radar-chart"></canvas>
                    </div>
                </div>
            </div>
        `;

        fetchAPI(`/players/positional-averages?position=${player.primary_position || 'CM'}`)
            .then(bench => {
                const labels = ['Goals/90', 'Assists/90', 'xG/90', 'xA/90', 'Prog Passes', 'Prog Carries', 'Tackles', 'Interceptions'];
                const pVals = [
                    latestStat.goals_per_90 || 0, latestStat.assists_per_90 || 0,
                    latestStat.xg_per_90 || 0, latestStat.xa_per_90 || 0,
                    latestStat.progressive_passes_per_90 || 0, latestStat.progressive_carries_per_90 || 0,
                    latestStat.tackles_per_90 || 0, latestStat.interceptions_per_90 || 0
                ];
                const bVals = [
                    bench.goals_per_90 || 0.1, bench.assists_per_90 || 0.1,
                    bench.xg_per_90 || 0.1, bench.xa_per_90 || 0.1,
                    bench.progressive_passes_per_90 || 2.5, bench.progressive_carries_per_90 || 1.8,
                    bench.tackles_per_90 || 1.2, bench.interceptions_per_90 || 0.8
                ];
                setTimeout(() => {
                    createRadarChart('radar-chart', labels, pVals, bVals, player.name);
                }, 100);
            })
            .catch(e => console.warn('Radar fetch failed', e));
    }

    // Model Factors Explanation
    if (prediction && prediction.explanation) {
        const pFactors = prediction.explanation.positive_factors || [];
        const nFactors = prediction.explanation.negative_factors || [];
        
        html += `
            <div class="card mb-4">
                <div class="card-header">
                    <div>
                        <h3 class="card-title">Model Valuation Factors (Why €${formatCurrency(prediction.predicted_value_eur)}?)</h3>
                        <p class="card-subtitle">Primary statistical drivers contributing to this implied valuation</p>
                    </div>
                </div>
                <div class="grid-2">
                    <div>
                        <h4 style="font-size:13px; color:var(--color-positive); margin-bottom:10px; font-weight:700;">Positive Contributors</h4>
                        <table class="data-table">
                            ${pFactors.map(f => `<tr><td>${f.feature.replace(/_/g, ' ')}</td><td style="color:var(--color-positive); font-weight:700; text-align:right">+${formatCurrency(f.contribution_eur)}</td></tr>`).join('')}
                        </table>
                    </div>
                    <div>
                        <h4 style="font-size:13px; color:var(--color-negative); margin-bottom:10px; font-weight:700;">Negative Contributors</h4>
                        <table class="data-table">
                            ${nFactors.map(f => `<tr><td>${f.feature.replace(/_/g, ' ')}</td><td style="color:var(--color-negative); font-weight:700; text-align:right">-${formatCurrency(Math.abs(f.contribution_eur))}</td></tr>`).join('')}
                        </table>
                    </div>
                </div>
            </div>
        `;
    }

    // Transfer History Table
    if (transfers && transfers.length > 0) {
        html += `
            <div class="card mb-4">
                <div class="card-header">
                    <div>
                        <h3 class="card-title">Transfer History</h3>
                        <p class="card-subtitle">Club moves and recorded transfer fees</p>
                    </div>
                </div>
                <div class="table-container">
                    <table class="data-table">
                        <thead><tr><th>Date</th><th>From Club</th><th>To Club</th><th>Fee</th><th>Type</th></tr></thead>
                        <tbody>
                            ${transfers.map(t => `
                                <tr>
                                    <td>${formatDate(t.transfer_date)}</td>
                                    <td>${t.from_club_name || 'Youth / Free'}</td>
                                    <td>${t.to_club_name || 'Free Agent'}</td>
                                    <td><strong>${t.fee_eur !== null ? formatCurrency(t.fee_eur) : 'Undisclosed'}</strong></td>
                                    <td><span class="badge badge-sky">${t.transfer_type || 'Transfer'}</span></td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }

    // Similar Players
    if (similar && similar.length > 0) {
        html += `
            <div class="card mb-4">
                <div class="card-header">
                    <div>
                        <h3 class="card-title">Statistically Similar Players</h3>
                        <p class="card-subtitle">Cosine similarity based on normalized per-90 statistical vectors</p>
                    </div>
                </div>
                <div class="grid-4" id="similar-container">
                    ${similar.map(s => `
                        <div class="card" style="cursor: pointer; padding:16px; background:var(--bg-subtle);" onclick="window.location.href='player.html?id=${s.id}'">
                            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
                                ${createPlayerAvatar(s.name, s.primary_position)}
                                <span class="badge badge-sky">${formatPercent(s.similarity_percent, false)} Match</span>
                            </div>
                            <h4 style="font-size:14px; margin-bottom:2px;">${s.name}</h4>
                            <div style="font-size:12px; color:var(--text-secondary); margin-bottom:8px;">${s.age || '-'} yrs • ${s.primary_position}</div>
                            <div style="font-weight:700; color:var(--text-primary); font-size:13px;">${formatCurrency(s.market_value_eur)}</div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    container.innerHTML = html;

    if (history && history.length > 0) {
        setTimeout(() => {
            createMarketValueChart('mv-chart', history.map(h => formatDate(h.valuation_date)), history.map(h => h.market_value_eur));
        }, 100);
    }
}
