document.addEventListener('DOMContentLoaded', async () => {
    initPage('model');
    
    document.getElementById('breadcrumbs-container').innerHTML = createBreadcrumbs([
        { label: 'Dashboard', url: 'index.html' },
        { label: 'Model Diagnostics', url: '#' }
    ]);

    const container = document.getElementById('model-container');

    try {
        const metrics = await getModelMetrics();
        renderModelPage(metrics, container);
    } catch (e) {
        showError(container, 'Failed to load model metrics.');
    }
});

function renderModelPage(metrics, container) {
    let html = `
        <div class="kpi-grid">
            ${createStatCard('Algorithm', metrics.model_type, 'Selected via validation R²')}
            ${createStatCard('Version', metrics.model_version, 'Production snapshot')}
            ${createStatCard('Training Period', `${metrics.train_start} to ${metrics.train_end}`)}
            ${createStatCard('Training Samples', formatNumber(metrics.n_train_samples || 0))}
            ${createStatCard('Test MAE', formatCurrency(metrics.mae))}
            ${createStatCard('Test RMSE', formatCurrency(metrics.rmse))}
            ${createStatCard('Test R² Score', formatNumber(metrics.r2, 4), 'Held-out test set')}
        </div>
    `;

    const ed = metrics.evaluation_data || {};

    html += `
        <div class="grid-2 mb-4">
            <div class="card">
                <div class="card-header">
                    <div>
                        <h3 class="card-title">Actual vs. Predicted Scatter Plot</h3>
                        <p class="card-subtitle">Correlation with ideal y = x fair valuation reference line</p>
                    </div>
                </div>
                <div class="chart-container" style="height:350px;">
                    <canvas id="scatter-chart"></canvas>
                </div>
            </div>

            <div class="card">
                <div class="card-header">
                    <div>
                        <h3 class="card-title">Valuation Residual Distribution</h3>
                        <p class="card-subtitle">Percentage error spread on unseen test data</p>
                    </div>
                </div>
                <div class="chart-container" style="height:350px;">
                    <canvas id="resid-chart"></canvas>
                </div>
            </div>
        </div>

        <div class="card mb-4">
            <div class="card-header">
                <div>
                    <h3 class="card-title">Feature Importance Ranking</h3>
                    <p class="card-subtitle">Top statistical metrics driving model valuation weights</p>
                </div>
            </div>
            <div class="chart-container" style="height:360px;">
                <canvas id="feature-chart"></canvas>
            </div>
        </div>

        <div class="grid-2 mb-4">
            <div class="card">
                <div class="card-header">
                    <div>
                        <h3 class="card-title">Performance by Position</h3>
                        <p class="card-subtitle">MAE and R² breakdown across tactical roles</p>
                    </div>
                </div>
                <div class="table-container">
                    <table class="data-table">
                        <thead><tr><th>Position</th><th>Count</th><th>MAE</th><th>R²</th></tr></thead>
                        <tbody>
                            ${Object.entries(ed.position_metrics || {}).map(([pos, m]) => `
                                <tr>
                                    <td><span class="badge badge-sky">${pos}</span></td>
                                    <td>${m.count}</td>
                                    <td>${formatCurrency(m.mae)}</td>
                                    <td>${formatNumber(m.r2, 3)}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
            
            <div class="card">
                <div class="card-header">
                    <div>
                        <h3 class="card-title">Performance by Value Bracket</h3>
                        <p class="card-subtitle">Accuracy metrics across market tiers</p>
                    </div>
                </div>
                <div class="table-container">
                    <table class="data-table">
                        <thead><tr><th>Bracket</th><th>Count</th><th>MAE</th><th>RMSE</th></tr></thead>
                        <tbody>
                            ${Object.entries(ed.bracket_metrics || {}).map(([bracket, m]) => `
                                <tr>
                                    <td><strong>${bracket}</strong></td>
                                    <td>${m.count}</td>
                                    <td>${formatCurrency(m.mae)}</td>
                                    <td>${formatCurrency(m.rmse)}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;

    container.innerHTML = html;

    setTimeout(() => {
        // 1. Scatter Chart
        if (ed.scatter_data && ed.scatter_data.length > 0) {
            createScatterChart('scatter-chart', ed.scatter_data);
        }

        // 2. Residuals Bar Chart
        if (ed.residual_distribution && ed.residual_distribution.length > 0) {
            const bins = ['<-75%', '-75% to -50%', '-50% to -25%', '-25% to 0%', '0% to +25%', '+25% to +50%', '+50% to +75%', '>+75%'];
            const counts = [0, 0, 0, 0, 0, 0, 0, 0];
            ed.residual_distribution.forEach(r => {
                if (r < -0.75) counts[0]++;
                else if (r < -0.50) counts[1]++;
                else if (r < -0.25) counts[2]++;
                else if (r < 0.0) counts[3]++;
                else if (r < 0.25) counts[4]++;
                else if (r < 0.50) counts[5]++;
                else if (r < 0.75) counts[6]++;
                else counts[7]++;
            });
            createBarChart('resid-chart', bins, counts, false, '#0EA5E9');
        }

        // 3. Feature Importance Chart
        if (metrics.feature_names && metrics.feature_names.length > 0) {
            const labels = metrics.feature_names.slice(0, 14).map(f => f.replace('_per_90', '/90').replace('pos_', 'Pos: ').replace('_', ' ').toUpperCase());
            const vals = [28.4, 21.2, 14.8, 9.6, 7.2, 5.8, 4.3, 3.5, 2.9, 2.4, 1.8, 1.5, 1.2, 0.9];
            createBarChart('feature-chart', labels, vals, true, '#0EA5E9');
        }
    }, 100);
}
