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
        <div class="card mb-4" style="border:1px solid var(--color-border);">
            <div style="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:20px;">
                <div style="display:flex; align-items:center; gap:18px;">
                    ${createPlayerAvatar(player.name, player.primary_position, 'avatar-xl')}
                    <div>
                        <div style="display:flex; align-items:center; gap:10px; margin-bottom:4px;">
                            <h1 style="font-size:28px; font-weight:800; margin:0; color:var(--color-ink);">${player.name}</h1>
                            <span class="${getPositionBadgeClass(player.primary_position)}">${player.primary_position}</span>
                        </div>
                        <div style="font-size:13.5px; color:var(--color-ink-soft); display:flex; gap:14px; flex-wrap:wrap; align-items:center;">
                            <span style="display:inline-flex; align-items:center; gap:6px;">
                                <strong>Club:</strong> 
                                ${createClubLogo(player.club_id, player.club_name, 22)}
                                <a href="club.html?id=${player.club_id}" style="color:var(--color-primary-dark); font-weight:600;">${player.club_name || 'Free Agent'}</a>
                            </span>
                            <span><strong>League:</strong> ${player.league_name || '-'}</span>
                            <span><strong>Nationality:</strong> ${player.nationality}</span>
                            <span><strong>Age:</strong> ${player.age || '-'}</span>
                            <span><strong>Height:</strong> ${player.height_cm ? player.height_cm + 'cm' : '-'}</span>
                            <span><strong>Foot:</strong> ${player.preferred_foot || '-'}</span>
                        </div>
                    </div>
                </div>

                <div style="display:flex; gap:20px; align-items:center; background:var(--color-surface-alt); padding:16px 20px; border-radius:var(--radius-md); border:1px solid var(--color-border);">
                    <div>
                        <div class="kpi-label">Market Value</div>
                        <div class="tabular-nums" style="font-size:24px; font-weight:800; color:var(--color-ink)">
                            ${formatCurrency(player.market_value_eur)}
                        </div>
                    </div>
                    <div style="width:1px; height:40px; background:var(--color-border);"></div>
                    <div>
                        <div class="kpi-label">Model Implied</div>
                        <div class="tabular-nums" style="font-size:24px; font-weight:800; color:var(--color-primary-dark)">
                            ${formatCurrency(player.predicted_value_eur)}
                        </div>
                    </div>
                    <div style="width:1px; height:40px; background:var(--color-border);"></div>
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
        const top100 = typeof getTop100Data === 'function' ? getTop100Data(player.id) : null;
        let ribbonHtml = '';
        let analysisHtml = '';

        if (top100) {
            ribbonHtml = `
                <div class="mb-3">
                    <div style="font-size:11.5px; font-weight:700; color:var(--color-ink-muted); text-transform:uppercase; letter-spacing:0.04em; margin-bottom:8px; display:flex; align-items:center; gap:6px;">
                        <span>Career Club Path</span>
                        <span style="color:var(--color-ink-soft); font-weight:400; text-transform:none;">(Chronological progression & kit colors)</span>
                    </div>
                    <div class="club-tenure-ribbon" style="display:flex; align-items:center; gap:8px; overflow-x:auto; padding-bottom:8px;">
                        ${top100.timeline.map((club, idx) => `
                            <div style="display:inline-flex; align-items:center; gap:8px; background:var(--color-surface-alt); border:1px solid var(--color-border); border-left:4px solid ${club.color}; border-radius:var(--radius-md); padding:8px 12px; white-space:nowrap; flex-shrink:0; box-shadow:var(--shadow-sm);">
                                ${createClubLogo(null, club.club_name, 22)}
                                <div>
                                    <div style="font-size:12.5px; font-weight:700; color:var(--color-ink);">${club.club_name}</div>
                                    <div style="font-size:11px; color:var(--color-ink-muted); font-family:var(--font-mono);">${club.start_date.substring(0,4)} – ${club.end_date.substring(0,4)}</div>
                                </div>
                            </div>
                            ${idx < top100.timeline.length - 1 ? '<span style="color:var(--color-ink-muted); font-size:13px; flex-shrink:0;">➔</span>' : ''}
                        `).join('')}
                    </div>
                </div>
            `;

            if (top100.transfers && top100.transfers.length > 0) {
                analysisHtml = `
                    <div class="mt-4" style="background:var(--color-surface-alt); border:1px solid var(--color-border); border-radius:var(--radius-lg); padding:16px 18px;">
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; flex-wrap:wrap; gap:8px;">
                            <div>
                                <h4 style="font-size:14px; font-weight:800; color:var(--color-ink); margin:0; display:flex; align-items:center; gap:8px;">
                                    <span>Transfer Fee vs. Model Valuation Analysis</span>
                                    <span class="badge" style="background:rgba(255, 180, 0, 0.15); color:#F59E0B; border:1px solid rgba(255, 180, 0, 0.3); font-size:10px; font-weight:800;">Top 100 Exclusive</span>
                                </h4>
                                <p style="font-size:12px; color:var(--color-ink-soft); margin:2px 0 0 0;">Historical transaction benchmark comparing actual transfer fees paid against PlayerValue market valuation at move dates</p>
                            </div>
                        </div>
                        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(280px, 1fr)); gap:12px;">
                            ${top100.transfers.map(tr => {
                                const fee = tr.fee_eur !== null ? formatCurrency(tr.fee_eur) : 'Free / Undisclosed';
                                const val = formatCurrency(tr.valuation_at_transfer);
                                const diff = tr.val_vs_fee_diff;
                                let badgeHtml = '';
                                if (tr.fee_eur === 0) {
                                    badgeHtml = `<span class="badge badge-positive" style="font-size:10.5px; padding:2px 8px;">Free Agent Bargain</span>`;
                                } else if (diff !== null && tr.fee_eur > 0) {
                                    if (diff > 0) {
                                        badgeHtml = `<span class="badge badge-positive" style="font-size:10.5px; padding:2px 8px;">+${formatCurrency(diff)} Value Surplus (+${tr.val_vs_fee_percent.toFixed(0)}%)</span>`;
                                    } else {
                                        badgeHtml = `<span class="badge badge-negative" style="font-size:10.5px; padding:2px 8px;">-${formatCurrency(Math.abs(diff))} Fee Premium</span>`;
                                    }
                                }
                                return `
                                    <div style="background:var(--color-surface); border:1px solid var(--color-border); border-radius:var(--radius-md); padding:12px 14px;">
                                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                                            <span style="font-size:11px; font-weight:700; color:var(--color-ink-muted); font-family:var(--font-mono);">${formatDate(tr.date)}</span>
                                            ${badgeHtml}
                                        </div>
                                        <div style="display:flex; align-items:center; gap:6px; margin-bottom:10px; flex-wrap:nowrap; overflow:hidden;">
                                            ${createClubLogo(null, tr.from_club, 18)}
                                            <span style="font-size:12px; font-weight:600; color:var(--color-ink); white-space:nowrap; text-overflow:ellipsis; overflow:hidden;">${tr.from_club}</span>
                                            <span style="color:var(--color-ink-muted); font-size:11px; flex-shrink:0;">➔</span>
                                            ${createClubLogo(null, tr.to_club, 18)}
                                            <span style="font-size:12px; font-weight:600; color:var(--color-ink); white-space:nowrap; text-overflow:ellipsis; overflow:hidden;">${tr.to_club}</span>
                                        </div>
                                        <div style="display:flex; justify-content:space-between; font-size:12px; border-top:1px dashed var(--color-border); padding-top:8px;">
                                            <div>
                                                <span style="color:var(--color-ink-soft); font-size:11px;">Transfer Fee:</span>
                                                <div class="tabular-nums" style="font-weight:700; color:var(--color-ink);">${fee}</div>
                                            </div>
                                            <div style="text-align:right;">
                                                <span style="color:var(--color-ink-soft); font-size:11px;">Valuation at Move:</span>
                                                <div class="tabular-nums" style="font-weight:700; color:var(--color-primary-dark);">${val}</div>
                                            </div>
                                        </div>
                                    </div>
                                `;
                            }).join('')}
                        </div>
                    </div>
                `;
            }
        }

        html += `
            <div class="card mb-4">
                <div class="card-header" style="flex-wrap:wrap; gap:10px;">
                    <div>
                        <h3 class="card-title">Market Valuation History</h3>
                        <p class="card-subtitle">${top100 ? 'Interactive career club tenure progression, kit colors & historical transfer events' : 'Transfermarkt historical value changes over seasons'}</p>
                    </div>
                    ${top100 ? `<span class="badge" style="background:rgba(255, 180, 0, 0.12); color:#F59E0B; border:1px solid rgba(255, 180, 0, 0.28); font-weight:700;">Top 100 • Club Timeline & Transfers</span>` : ''}
                </div>
                ${ribbonHtml}
                <div class="chart-container" style="height:330px;">
                    <canvas id="mv-chart"></canvas>
                </div>
                ${analysisHtml}
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
                const rawPlayer = [
                    Number(latestStat.goals_per_90 || 0).toFixed(2),
                    Number(latestStat.assists_per_90 || 0).toFixed(2),
                    Number(latestStat.xg_per_90 || 0).toFixed(2),
                    Number(latestStat.xa_per_90 || 0).toFixed(2),
                    Number(latestStat.progressive_passes_per_90 || 0).toFixed(2),
                    Number(latestStat.progressive_carries_per_90 || 0).toFixed(2),
                    Number(latestStat.tackles_per_90 || 0).toFixed(2),
                    Number(latestStat.interceptions_per_90 || 0).toFixed(2)
                ];
                const rawBench = [
                    Number(bench.goals_per_90 || 0.1).toFixed(2),
                    Number(bench.assists_per_90 || 0.1).toFixed(2),
                    Number(bench.xg_per_90 || 0.1).toFixed(2),
                    Number(bench.xa_per_90 || 0.1).toFixed(2),
                    Number(bench.progressive_passes_per_90 || 2.5).toFixed(2),
                    Number(bench.progressive_carries_per_90 || 1.8).toFixed(2),
                    Number(bench.tackles_per_90 || 1.2).toFixed(2),
                    Number(bench.interceptions_per_90 || 0.8).toFixed(2)
                ];

                // Benchmark average benchmark baseline = 50 / 100
                // Player index: <= bench ratio maps 5->50, > bench ratio maps 50->98
                function computeScore(pVal, bVal) {
                    const p = parseFloat(pVal) || 0;
                    const b = Math.max(parseFloat(bVal) || 0.1, 0.01);
                    if (p <= 0) return 5;
                    const ratio = p / b;
                    if (ratio <= 1.0) {
                        return Math.round(5 + ratio * 45);
                    } else {
                        const extra = Math.min(ratio - 1.0, 1.5) / 1.5;
                        return Math.round(50 + extra * 48);
                    }
                }

                const pVals = rawPlayer.map((val, i) => computeScore(val, rawBench[i]));
                const bVals = rawBench.map(() => 50);

                setTimeout(() => {
                    createRadarChart('radar-chart', labels, pVals, bVals, player.name, rawPlayer, rawBench);
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
                                    <td>
                                        <div style="display:inline-flex; align-items:center; gap:6px;">
                                            ${createClubLogo(null, t.from_club_name, 20)}
                                            <span>${t.from_club_name || 'Youth / Free'}</span>
                                        </div>
                                    </td>
                                    <td>
                                        <div style="display:inline-flex; align-items:center; gap:6px;">
                                            ${createClubLogo(null, t.to_club_name, 20)}
                                            <span>${t.to_club_name || 'Free Agent'}</span>
                                        </div>
                                    </td>
                                    <td><strong>${t.fee_eur !== null ? formatCurrency(t.fee_eur) : 'Undisclosed'}</strong></td>
                                    <td><span class="badge" style="background:var(--color-surface-alt); border:1px solid var(--color-border); color:var(--color-ink-soft);">${t.transfer_type || 'Transfer'}</span></td>
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
                <div class="grid-4" id="similar-container" style="display:grid; grid-template-columns:repeat(auto-fit, minmax(200px, 1fr)); gap:16px;">
                    ${similar.map(s => `
                        <div class="card card-interactive" style="cursor: pointer; padding:18px;" onclick="window.location.href='player.html?id=${s.id}'">
                            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
                                ${createPlayerAvatar(s.name, s.primary_position)}
                                <span class="badge" style="background:var(--color-tertiary-tint); color:var(--color-tertiary-dark); font-weight:700;">${formatPercent(s.similarity_percent, false)} Match</span>
                            </div>
                            <h4 style="font-size:14px; margin-bottom:3px; color:var(--color-ink); font-weight:700;">${s.name}</h4>
                            <div style="font-size:12px; color:var(--color-ink-soft); margin-bottom:8px;">${s.age || '-'} yrs • <span class="${getPositionBadgeClass(s.primary_position)}">${s.primary_position}</span></div>
                            <div class="tabular-nums" style="font-weight:700; color:var(--color-ink); font-size:14px;">${formatCurrency(s.market_value_eur)}</div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    container.innerHTML = html;

    if (history && history.length > 0) {
        setTimeout(() => {
            const top100Data = typeof getTop100Data === 'function' ? getTop100Data(player.id) : null;
            createPlayerValuationHistoryChart(
                'mv-chart', 
                history.map(h => h.valuation_date), 
                history.map(h => h.market_value_eur), 
                top100Data
            );
        }, 100);
    }
}
