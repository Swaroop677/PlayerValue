/**
 * Aesthetic Chart.js Visualizer
 * Electric Coral (#FF5A5F), Bright Citrus (#FFB400), Vivid Mint (#00D1B2), Deep Charcoal (#1E293B)
 * Lazy loading via IntersectionObserver, soft gradient area fills, rounded bars, custom tooltips.
 */

let chartInstances = {};
let chartObserver = null;
const pendingCharts = new Map();

// Dynamic loader for Chart.js if not yet present
let chartJsPromise = null;
function ensureChartJs() {
    if (window.Chart) return Promise.resolve(window.Chart);
    if (!chartJsPromise) {
        chartJsPromise = new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js';
            script.onload = () => resolve(window.Chart);
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }
    return chartJsPromise;
}

function getThemeTokens() {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    return {
        isDark,
        textPrimary: isDark ? '#F1F5F9' : '#1E293B',
        textSecondary: isDark ? '#94A3B8' : '#475569',
        textMuted: isDark ? '#64748B' : '#94A3B8',
        border: isDark ? '#334155' : '#E8EAEE',
        cardBg: isDark ? '#1E293B' : '#FFFFFF',
        coral: '#FF5A5F',
        citrus: '#FFB400',
        mint: '#00D1B2',
        charcoal: '#1E293B'
    };
}

function getBaseChartOptions() {
    const t = getThemeTokens();
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    return {
        responsive: true,
        maintainAspectRatio: false,
        color: t.textSecondary,
        font: { family: "'Inter', sans-serif", size: 12 },
        animation: prefersReducedMotion ? false : { duration: 500, easing: 'easeOutQuart' },
        plugins: {
            legend: {
                position: 'top',
                align: 'end',
                labels: {
                    color: t.textSecondary,
                    font: { family: "'Inter', sans-serif", size: 12, weight: 600 },
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
                cornerRadius: 12,
                boxPadding: 6,
                titleFont: { family: "'Inter', sans-serif", weight: 700, size: 13 },
                bodyFont: { family: "'Inter', sans-serif", size: 12 },
                displayColors: false
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

// Lazy loader helper using IntersectionObserver
function queueChartRender(canvasId, renderFn) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    if (!('IntersectionObserver' in window)) {
        ensureChartJs().then(renderFn);
        return;
    }

    if (!chartObserver) {
        chartObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const id = entry.target.id;
                    if (pendingCharts.has(id)) {
                        const fn = pendingCharts.get(id);
                        pendingCharts.delete(id);
                        chartObserver.unobserve(entry.target);
                        ensureChartJs().then(fn);
                    }
                }
            });
        }, { rootMargin: '100px 0px' });
    }

    pendingCharts.set(canvasId, renderFn);
    chartObserver.observe(canvas);
}

// 1. Line / Area Chart: Historical Market Value
function createMarketValueChart(canvasId, dates, values) {
    queueChartRender(canvasId, () => {
        destroyChart(canvasId);
        const canvas = document.getElementById(canvasId);
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const t = getThemeTokens();

        const gradient = ctx.createLinearGradient(0, 0, 0, 320);
        gradient.addColorStop(0, 'rgba(255, 90, 95, 0.30)');
        gradient.addColorStop(1, 'rgba(255, 90, 95, 0.00)');

        chartInstances[canvasId] = new Chart(ctx, {
            type: 'line',
            data: {
                labels: dates,
                datasets: [{
                    label: 'Market Valuation (€)',
                    data: values,
                    borderColor: t.coral,
                    backgroundColor: gradient,
                    borderWidth: 2.5,
                    fill: true,
                    tension: 0.35,
                    pointBackgroundColor: '#FFFFFF',
                    pointBorderColor: t.coral,
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
    });
}

// 2. Radar Chart: Player Per-90 vs Positional Average
function createRadarChart(canvasId, labels, playerVals, benchmarkVals, playerName = 'Player') {
    queueChartRender(canvasId, () => {
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
                        backgroundColor: 'rgba(255, 90, 95, 0.22)',
                        borderColor: t.coral,
                        pointBackgroundColor: t.coral,
                        pointBorderColor: '#FFFFFF',
                        borderWidth: 2,
                        fill: true
                    },
                    {
                        label: 'Position Benchmark',
                        data: benchmarkVals,
                        backgroundColor: 'transparent',
                        borderColor: t.mint,
                        pointBackgroundColor: t.mint,
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
    });
}

// 3. Scatter Plot: Actual vs Predicted with y = x Reference Line
function createScatterChart(canvasId, points) {
    queueChartRender(canvasId, () => {
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
                        backgroundColor: 'rgba(255, 90, 95, 0.65)',
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
    });
}

// 4. Value vs Age Curve Chart
function createValueAgeChart(canvasId, points) {
    queueChartRender(canvasId, () => {
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
                    backgroundColor: 'rgba(255, 180, 0, 0.65)',
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
    });
}

// 5. Bar Chart: Squad Value / Feature Importance / Residuals
function createBarChart(canvasId, labels, values, isHorizontal = false, customColor = null) {
    queueChartRender(canvasId, () => {
        destroyChart(canvasId);
        const canvas = document.getElementById(canvasId);
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const t = getThemeTokens();

        const color = customColor || t.coral;

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
    });
}

// 6. Doughnut Chart: Positional or Portfolio Distribution
function createDoughnutChart(canvasId, labels, values) {
    queueChartRender(canvasId, () => {
        destroyChart(canvasId);
        const canvas = document.getElementById(canvasId);
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const t = getThemeTokens();

        const palette = [t.coral, t.citrus, t.mint, '#6366F1', '#EC4899', '#8B5CF6', '#14B8A6'];

        chartInstances[canvasId] = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: values,
                    backgroundColor: palette.slice(0, labels.length),
                    borderWidth: 2,
                    borderColor: t.cardBg
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'right',
                        labels: {
                            color: t.textSecondary,
                            font: { family: "'Inter', sans-serif", size: 11, weight: 600 },
                            usePointStyle: true,
                            boxWidth: 8
                        }
                    },
                    tooltip: {
                        ...getBaseChartOptions().plugins.tooltip,
                        callbacks: {
                            label: (ctx) => ` ${ctx.label}: ${formatCurrency(ctx.raw)}`
                        }
                    }
                },
                cutout: '65%'
            }
        });
    });
}

window.onThemeChange = function() {
    Object.keys(chartInstances).forEach(id => {
        const chart = chartInstances[id];
        const t = getThemeTokens();
        if (chart.options.scales && chart.options.scales.y) {
            chart.options.scales.y.grid.color = t.border;
        }
        chart.update();
    });
};
