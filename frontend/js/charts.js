/**
 * Aesthetic Chart.js Visualizer
 * Modern Sky Blue & White Palette (Vercel / Linear / Stripe minimal aesthetic)
 * Smooth curves, soft gradient area fills, clean tooltips, and horizontal gridlines only.
 */

let chartInstances = {};

function getThemeTokens() {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    return {
        isDark,
        textPrimary: isDark ? '#EAF4FF' : '#0B1F33',
        textSecondary: isDark ? '#9DB4CC' : '#51677D',
        textMuted: isDark ? '#627A94' : '#8CA0B3',
        border: isDark ? '#1B2E45' : '#DCE9F5',
        cardBg: isDark ? '#0D1B2D' : '#FFFFFF',
        skyPrimary: '#0EA5E9',
        skySoft: '#38BDF8',
        skyLight: '#7DD3FC',
        skyTint: isDark ? '#1E3A5F' : '#E0F2FE',
        accentIndigo: isDark ? '#818CF8' : '#6366F1',
        positive: isDark ? '#34D399' : '#10B981',
        negative: isDark ? '#FB7185' : '#F43F5E',
        warning: isDark ? '#FBBF24' : '#F59E0B'
    };
}

function getBaseChartOptions() {
    const t = getThemeTokens();
    return {
        responsive: true,
        maintainAspectRatio: false,
        color: t.textSecondary,
        font: { family: "'Inter', sans-serif", size: 12 },
        animation: { duration: 600, easing: 'easeOutQuart' },
        plugins: {
            legend: {
                position: 'top',
                align: 'end',
                labels: {
                    color: t.textSecondary,
                    font: { family: "'Inter', sans-serif", size: 12, weight: 500 },
                    usePointStyle: true,
                    boxWidth: 8
                }
            },
            tooltip: {
                backgroundColor: t.cardBg,
                titleColor: t.textPrimary,
                bodyColor: t.textSecondary,
                borderColor: t.border,
                borderWidth: 1,
                padding: 12,
                cornerRadius: 10,
                boxPadding: 4,
                titleFont: { family: "'Plus Jakarta Sans', sans-serif", weight: 700, size: 13 },
                bodyFont: { family: "'Inter', sans-serif", size: 12 }
            }
        },
        scales: {
            x: {
                grid: { display: false },
                border: { display: false },
                ticks: { color: t.textMuted, font: { size: 11 } }
            },
            y: {
                grid: { color: t.border, drawBorder: false, lineWidth: 1 },
                border: { display: false },
                ticks: { color: t.textMuted, font: { size: 11 } }
            }
        }
    };
}

function destroyChart(canvasId) {
    if (chartInstances[canvasId]) {
        chartInstances[canvasId].destroy();
        delete chartInstances[canvasId];
    }
}

// 1. Line / Area Chart: Historical Market Value
function createMarketValueChart(canvasId, dates, values) {
    destroyChart(canvasId);
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const t = getThemeTokens();

    const gradient = ctx.createLinearGradient(0, 0, 0, 320);
    gradient.addColorStop(0, 'rgba(14, 165, 233, 0.35)');
    gradient.addColorStop(1, 'rgba(14, 165, 233, 0.00)');

    chartInstances[canvasId] = new Chart(ctx, {
        type: 'line',
        data: {
            labels: dates,
            datasets: [{
                label: 'Market Valuation (€)',
                data: values,
                borderColor: t.skyPrimary,
                backgroundColor: gradient,
                borderWidth: 2.5,
                fill: true,
                tension: 0.35,
                pointBackgroundColor: '#FFFFFF',
                pointBorderColor: t.skyPrimary,
                pointBorderWidth: 2,
                pointRadius: 4,
                pointHoverRadius: 7
            }]
        },
        options: {
            ...getBaseChartOptions(),
            plugins: {
                ...getBaseChartOptions().plugins,
                tooltip: {
                    ...getBaseChartOptions().plugins.tooltip,
                    callbacks: {
                        label: (ctx) => `Valuation: ${formatCurrency(ctx.raw)}`
                    }
                }
            },
            scales: {
                ...getBaseChartOptions().scales,
                y: {
                    ...getBaseChartOptions().scales.y,
                    ticks: {
                        color: t.textMuted,
                        callback: (v) => formatCurrency(v)
                    }
                }
            }
        }
    });
}

// 2. Radar Chart: Player Per-90 vs Positional Average
function createRadarChart(canvasId, labels, playerVals, benchmarkVals, playerName = 'Player') {
    destroyChart(canvasId);
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const t = getThemeTokens();

    chartInstances[canvasId] = new Chart(ctx, {
        type: 'radar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: playerName,
                    data: playerVals,
                    backgroundColor: 'rgba(14, 165, 233, 0.22)',
                    borderColor: t.skyPrimary,
                    pointBackgroundColor: t.skyPrimary,
                    pointBorderColor: '#FFFFFF',
                    borderWidth: 2,
                    fill: true
                },
                {
                    label: 'Position League Benchmark',
                    data: benchmarkVals,
                    backgroundColor: 'transparent',
                    borderColor: t.accentIndigo,
                    pointBackgroundColor: t.accentIndigo,
                    pointBorderColor: '#FFFFFF',
                    borderWidth: 2,
                    borderDash: [4, 4]
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                r: {
                    angleLines: { color: t.border },
                    grid: { color: t.border },
                    pointLabels: {
                        color: t.textSecondary,
                        font: { family: "'Inter', sans-serif", weight: 600, size: 11 }
                    },
                    ticks: { display: false }
                }
            },
            plugins: getBaseChartOptions().plugins
        }
    });
}

// 3. Scatter Plot: Actual vs Predicted with y = x Reference Line
function createScatterChart(canvasId, points) {
    destroyChart(canvasId);
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const t = getThemeTokens();

    const maxVal = Math.max(...points.map(p => Math.max(p.actual || 0, p.predicted || 0)), 50000000);

    chartInstances[canvasId] = new Chart(ctx, {
        type: 'scatter',
        data: {
            datasets: [
                {
                    label: 'Players (Actual vs Model)',
                    data: points.map(p => ({ x: p.actual, y: p.predicted, player: p.player })),
                    backgroundColor: 'rgba(14, 165, 233, 0.65)',
                    borderColor: 'transparent',
                    pointRadius: 4,
                    pointHoverRadius: 7
                },
                {
                    label: 'Fair Valuation Line (y = x)',
                    type: 'line',
                    data: [{ x: 0, y: 0 }, { x: maxVal, y: maxVal }],
                    borderColor: t.textMuted,
                    borderWidth: 1.5,
                    borderDash: [5, 5],
                    pointRadius: 0,
                    fill: false
                }
            ]
        },
        options: {
            ...getBaseChartOptions(),
            plugins: {
                ...getBaseChartOptions().plugins,
                tooltip: {
                    ...getBaseChartOptions().plugins.tooltip,
                    callbacks: {
                        label: (ctx) => {
                            if (ctx.datasetIndex === 1) return 'Fair Valuation Baseline';
                            const pt = ctx.raw;
                            return `${pt.player || 'Player'}: Actual ${formatCurrency(pt.x)} | Model ${formatCurrency(pt.y)}`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    ...getBaseChartOptions().scales.x,
                    title: { display: true, text: 'Actual Market Value (€)', color: t.textMuted },
                    ticks: { callback: (v) => formatCurrency(v), color: t.textMuted }
                },
                y: {
                    ...getBaseChartOptions().scales.y,
                    title: { display: true, text: 'Model-Implied Value (€)', color: t.textMuted },
                    ticks: { callback: (v) => formatCurrency(v), color: t.textMuted }
                }
            }
        }
    });
}

// 4. Value vs Age Curve Chart
function createValueAgeChart(canvasId, points) {
    destroyChart(canvasId);
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const t = getThemeTokens();

    chartInstances[canvasId] = new Chart(ctx, {
        type: 'scatter',
        data: {
            datasets: [{
                label: 'Player Valuations by Age',
                data: points.map(p => ({ x: p.age, y: p.market_value_eur, name: p.name, pos: p.position })),
                backgroundColor: 'rgba(14, 165, 233, 0.55)',
                pointRadius: 4,
                pointHoverRadius: 7
            }]
        },
        options: {
            ...getBaseChartOptions(),
            plugins: {
                ...getBaseChartOptions().plugins,
                tooltip: {
                    ...getBaseChartOptions().plugins.tooltip,
                    callbacks: {
                        label: (ctx) => `${ctx.raw.name} (${ctx.raw.pos}, ${ctx.raw.x}y): ${formatCurrency(ctx.raw.y)}`
                    }
                }
            },
            scales: {
                x: {
                    ...getBaseChartOptions().scales.x,
                    title: { display: true, text: 'Player Age', color: t.textMuted },
                    min: 16,
                    max: 40
                },
                y: {
                    ...getBaseChartOptions().scales.y,
                    title: { display: true, text: 'Market Value (€)', color: t.textMuted },
                    ticks: { callback: (v) => formatCurrency(v), color: t.textMuted }
                }
            }
        }
    });
}

// 5. Bar Chart: Squad Value / Feature Importance / Residuals
function createBarChart(canvasId, labels, values, isHorizontal = false, customColor = null) {
    destroyChart(canvasId);
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const t = getThemeTokens();

    const color = customColor || t.skyPrimary;

    chartInstances[canvasId] = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                data: values,
                backgroundColor: color,
                borderRadius: 6,
                borderSkipped: false
            }]
        },
        options: {
            ...getBaseChartOptions(),
            indexAxis: isHorizontal ? 'y' : 'x',
            plugins: {
                ...getBaseChartOptions().plugins,
                legend: { display: false },
                tooltip: {
                    ...getBaseChartOptions().plugins.tooltip,
                    callbacks: {
                        label: (ctx) => typeof ctx.raw === 'number' && ctx.raw > 1000 ? formatCurrency(ctx.raw) : ctx.raw
                    }
                }
            },
            scales: {
                x: {
                    ...getBaseChartOptions().scales.x,
                    ticks: {
                        color: t.textMuted,
                        callback: (v) => typeof v === 'number' && v > 1000000 ? formatCurrency(v) : v
                    }
                },
                y: {
                    ...getBaseChartOptions().scales.y,
                    ticks: {
                        color: t.textMuted,
                        callback: (v) => typeof v === 'number' && v > 1000000 ? formatCurrency(v) : v
                    }
                }
            }
        }
    });
}

window.onThemeChange = function() {
    // When theme switches, re-render charts cleanly
    Object.keys(chartInstances).forEach(id => {
        const chart = chartInstances[id];
        const t = getThemeTokens();
        if (chart.options.scales && chart.options.scales.y) {
            chart.options.scales.y.grid.color = t.border;
        }
        chart.update();
    });
};
