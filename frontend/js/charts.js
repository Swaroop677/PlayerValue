/**
 * ========================================================
 * PLAYERVALUE - PREMIUM DATA VISUALIZATION ENGINE
 * Powered by Chart.js 4 (Pinned CDN, Vanilla JS)
 * ========================================================
 * 
 * Design Tokens & Configuration:
 * - Card Background: Glass rgba(255, 255, 255, 0.04), 1px border rgba(255, 255, 255, 0.08), 20px radius
 * - Palette: Neon Green (#00FF88), Cyan (#00D4FF), Gold (#FFC94D), Red (#FF4D6D), Purple (#8B5CF6)
 * - Typography: Inter for labels, JetBrains Mono for tabular numbers
 * - Custom Glass Tooltips, Dynamic Gradients, Crosshair Tracking, Annotations
 */

// Shared Design Tokens & Theme Configuration
export const CHART_THEME = {
    colors: {
        green: '#00FF88',
        cyan: '#00D4FF',
        gold: '#FFC94D',
        red: '#FF4D6D',
        purple: '#8B5CF6',
        silver: '#E2E8F0',
        bronze: '#F97316',
        cardBg: 'rgba(255, 255, 255, 0.04)',
        cardBorder: 'rgba(255, 255, 255, 0.08)',
        textPrimary: '#F5F7FA',
        textMuted: '#8A94A6',
        gridline: 'rgba(255, 255, 255, 0.05)',
        crosshair: 'rgba(0, 255, 136, 0.35)',
        primeBand: 'rgba(0, 212, 255, 0.06)'
    },
    fonts: {
        label: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
        mono: "'JetBrains Mono', 'SF Mono', monospace"
    }
};

let chartInstances = {};
let chartObserver = null;
const pendingCharts = new Map();

// Dynamic loader for Chart.js if not yet loaded in DOM
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

// Check theme tokens
function getThemeTokens() {
    const isDark = document.documentElement.getAttribute('data-theme') !== 'light';
    return {
        isDark,
        textPrimary: isDark ? CHART_THEME.colors.textPrimary : '#0F172A',
        textMuted: isDark ? CHART_THEME.colors.textMuted : '#64748B',
        gridline: isDark ? CHART_THEME.colors.gridline : 'rgba(15, 23, 42, 0.06)',
        cardBg: isDark ? 'rgba(10, 16, 30, 0.94)' : 'rgba(255, 255, 255, 0.96)',
        cardBorder: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(15, 23, 42, 0.12)'
    };
}

function destroyChart(canvasId) {
    if (chartInstances[canvasId]) {
        chartInstances[canvasId].destroy();
        delete chartInstances[canvasId];
    }
}

// Lazy-loader using IntersectionObserver to trigger entry animations once on view
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
        }, { rootMargin: '60px 0px', threshold: 0.15 });
    }

    pendingCharts.set(canvasId, renderFn);
    chartObserver.observe(canvas);
}

// Compact currency formatter (e.g. €12.8B, €35M, €500K)
function formatCompactCurrency(val) {
    if (typeof val !== 'number' || isNaN(val)) return '€0';
    try {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'EUR',
            notation: 'compact',
            maximumFractionDigits: 1
        }).format(val).replace('EUR', '€').trim();
    } catch (e) {
        if (val >= 1e9) return `€${(val / 1e9).toFixed(1)}B`;
        if (val >= 1e6) return `€${(val / 1e6).toFixed(1)}M`;
        if (val >= 1e3) return `€${(val / 1e3).toFixed(0)}K`;
        return `€${val}`;
    }
}

// Custom Glass Tooltip Renderer for Chart.js
function createGlassTooltipHandler() {
    return function(context) {
        const { chart, tooltip } = context;
        let tooltipEl = chart.canvas.parentNode.querySelector('.chartjs-glass-tooltip');

        if (!tooltipEl) {
            tooltipEl = document.createElement('div');
            tooltipEl.className = 'chartjs-glass-tooltip';
            chart.canvas.parentNode.appendChild(tooltipEl);
        }

        if (tooltip.opacity === 0) {
            tooltipEl.style.opacity = '0';
            tooltipEl.style.transform = 'translate(-50%, -85%) scale(0.95)';
            return;
        }

        if (tooltip.body) {
            const titleLines = tooltip.title || [];
            const bodyLines = tooltip.body.map(b => b.lines);

            let innerHtml = '';
            if (titleLines.length) {
                innerHtml += `<div class="tooltip-title">${titleLines.join(' ')}</div>`;
            }

            // Custom contents passed via callbacks
            if (tooltip.dataPoints && tooltip.dataPoints.length > 0) {
                const dp = tooltip.dataPoints[0];
                const customHtml = dp.dataset?.customTooltipHtml ? dp.dataset.customTooltipHtml(dp) : null;

                if (customHtml) {
                    innerHtml += customHtml;
                } else {
                    bodyLines.forEach((body) => {
                        innerHtml += `<div class="tooltip-row">${body}</div>`;
                    });
                }
            }

            tooltipEl.innerHTML = innerHtml;
        }

        const position = chart.canvas.getBoundingClientRect();
        tooltipEl.style.opacity = '1';
        tooltipEl.style.left = tooltip.caretX + 'px';
        tooltipEl.style.top = (tooltip.caretY - 12) + 'px';
        tooltipEl.style.transform = 'translate(-50%, -100%) scale(1)';
    };
}

// Base chart options adhering to strict tokens
function getBaseChartOptions() {
    const t = getThemeTokens();
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    return {
        responsive: true,
        maintainAspectRatio: false,
        devicePixelRatio: Math.min(window.devicePixelRatio || 1, 2),
        color: t.textMuted,
        font: { family: CHART_THEME.fonts.label, size: 12 },
        animation: prefersReducedMotion ? false : {
            duration: 1200,
            easing: 'easeOutCubic'
        },
        interaction: {
            mode: 'index',
            intersect: false
        },
        plugins: {
            legend: { display: false },
            tooltip: {
                enabled: false, // Handled via custom glass HTML tooltip
                external: createGlassTooltipHandler()
            }
        },
        scales: {
            x: {
                grid: { display: false },
                border: { display: false },
                ticks: {
                    color: t.textMuted,
                    font: { family: CHART_THEME.fonts.label, size: 11, weight: 500 },
                    maxRotation: 0,
                    autoSkip: true,
                    maxTicksLimit: window.innerWidth < 768 ? 5 : 8
                }
            },
            y: {
                grid: {
                    color: t.gridline,
                    drawBorder: false,
                    lineWidth: 1,
                    borderDash: [4, 4]
                },
                border: { display: false },
                ticks: {
                    color: t.textMuted,
                    font: { family: CHART_THEME.fonts.mono, size: 11 },
                    callback: (v) => formatCompactCurrency(v)
                }
            }
        }
    };
}


/**
 * ========================================================
 * 1. MARKET GROWTH HISTORY (SMOOTH AREA CHART)
 * ========================================================
 * - Smooth monotone cubic spline (tension 0.35)
 * - 3px solid #00FF88 with soft glow shadow
 * - Dynamic vertical gradient fill from chartArea height
 * - Peak gold annotation pill & pulsing latest point
 * - Vertical crosshair dashed line on hover
 * - 5Y | 10Y | All interactive range selector (no reload)
 * - Header summary with latest value & calculated growth badge
 */
export function renderMarketGrowth(canvasId, dates, values) {
    queueChartRender(canvasId, () => {
        destroyChart(canvasId);
        const canvas = document.getElementById(canvasId);
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const t = getThemeTokens();

        // Save raw dataset for interactive range filtering
        const rawData = dates.map((d, i) => ({
            date: d,
            year: parseInt(d.match(/\d{4}/)?.[0] || '2020', 10),
            value: values[i]
        }));

        let activeRange = 'all';

        function getFilteredData(range) {
            if (!rawData.length) return { filteredDates: [], filteredValues: [] };
            const currentYear = rawData[rawData.length - 1].year;
            let subset = rawData;
            if (range === '5y') {
                subset = rawData.filter(d => d.year >= currentYear - 5);
            } else if (range === '10y') {
                subset = rawData.filter(d => d.year >= currentYear - 10);
            }
            if (!subset.length) subset = rawData;
            return {
                filteredDates: subset.map(d => d.date),
                filteredValues: subset.map(d => d.value)
            };
        }

        const initial = getFilteredData(activeRange);

        // Header Summary Calculation
        function updateHeaderSummary(valArr) {
            const latestEl = document.getElementById('market-latest-value');
            const growthEl = document.getElementById('market-growth-badge');
            if (!valArr || !valArr.length) return;

            const startVal = valArr[0] || 1;
            const latestVal = valArr[valArr.length - 1] || 1;
            const pctGrowth = Math.round(((latestVal - startVal) / startVal) * 100);

            if (latestEl) latestEl.textContent = formatCompactCurrency(latestVal);
            if (growthEl) {
                const isPositive = pctGrowth >= 0;
                growthEl.textContent = `${isPositive ? '▲ +' : '▼ '}${pctGrowth}%`;
                growthEl.className = `chart-growth-badge ${isPositive ? 'positive' : 'negative'}`;
            }
        }

        updateHeaderSummary(initial.filteredValues);

        // Dynamic vertical gradient built from chartArea
        function getAreaGradient(context) {
            const chart = context.chart;
            const { ctx, chartArea } = chart;
            if (!chartArea) return 'rgba(0, 255, 136, 0.15)';
            const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
            gradient.addColorStop(0, 'rgba(0, 255, 136, 0.38)');
            gradient.addColorStop(0.7, 'rgba(0, 255, 136, 0.08)');
            gradient.addColorStop(1, 'rgba(0, 255, 136, 0.00)');
            return gradient;
        }

        // Custom plugins: Glow, Crosshair line, Peak Pill & Pulsing Dot
        const marketDecorationsPlugin = {
            id: 'marketDecorations',
            beforeDatasetDraw(chart, args) {
                // Apply soft glowing line shadow
                const c = chart.ctx;
                c.save();
                c.shadowColor = 'rgba(0, 255, 136, 0.45)';
                c.shadowBlur = 14;
                c.shadowOffsetY = 2;
            },
            afterDatasetDraw(chart, args) {
                chart.ctx.restore();
            },
            afterDraw(chart) {
                const { ctx, chartArea, scales } = chart;
                const meta = chart.getDatasetMeta(0);
                if (!meta || !meta.data.length || !chartArea) return;

                // 1. Vertical crosshair line following active cursor
                const active = chart.tooltip?.getActiveElements();
                if (active && active.length > 0) {
                    const activePoint = active[0].element;
                    ctx.save();
                    ctx.setLineDash([4, 4]);
                    ctx.lineWidth = 1.5;
                    ctx.strokeStyle = CHART_THEME.colors.crosshair;
                    ctx.beginPath();
                    ctx.moveTo(activePoint.x, chartArea.top);
                    ctx.lineTo(activePoint.x, chartArea.bottom);
                    ctx.stroke();
                    ctx.restore();
                }

                // 2. Peak point gold pill annotation
                const dataVals = chart.data.datasets[0].data;
                let peakIdx = 0;
                let maxVal = -Infinity;
                dataVals.forEach((v, i) => {
                    if (v > maxVal) { maxVal = v; peakIdx = i; }
                });

                const peakPoint = meta.data[peakIdx];
                if (peakPoint && peakPoint.x >= chartArea.left && peakPoint.x <= chartArea.right) {
                    const peakLabel = `Peak ${formatCompactCurrency(maxVal)}`;
                    ctx.save();
                    ctx.font = `600 10.5px ${CHART_THEME.fonts.mono}`;
                    const textWidth = ctx.measureText(peakLabel).width;
                    const pillW = textWidth + 14;
                    const pillH = 20;
                    const pillX = Math.min(Math.max(peakPoint.x - (pillW / 2), chartArea.left + 4), chartArea.right - pillW - 4);
                    const pillY = Math.max(peakPoint.y - pillH - 8, chartArea.top + 2);

                    // Pill background & border
                    ctx.fillStyle = 'rgba(10, 16, 30, 0.9)';
                    ctx.strokeStyle = CHART_THEME.colors.gold;
                    ctx.lineWidth = 1;
                    ctx.beginPath();
                    ctx.roundRect(pillX, pillY, pillW, pillH, 10);
                    ctx.fill();
                    ctx.stroke();

                    // Gold text
                    ctx.fillStyle = CHART_THEME.colors.gold;
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText(peakLabel, pillX + (pillW / 2), pillY + (pillH / 2));
                    ctx.restore();
                }

                // 3. Latest point pulsing dot indicator
                const lastIdx = meta.data.length - 1;
                const lastPoint = meta.data[lastIdx];
                if (lastPoint) {
                    ctx.save();
                    // Outer subtle halo
                    ctx.beginPath();
                    ctx.arc(lastPoint.x, lastPoint.y, 7, 0, Math.PI * 2);
                    ctx.fillStyle = 'rgba(0, 255, 136, 0.25)';
                    ctx.fill();

                    // Inner bright core
                    ctx.beginPath();
                    ctx.arc(lastPoint.x, lastPoint.y, 3.5, 0, Math.PI * 2);
                    ctx.fillStyle = CHART_THEME.colors.green;
                    ctx.fill();
                    ctx.restore();
                }
            }
        };

        const baseOpts = getBaseChartOptions();

        const chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: initial.filteredDates,
                datasets: [{
                    label: 'Market Valuation (€)',
                    data: initial.filteredValues,
                    borderColor: CHART_THEME.colors.green,
                    borderWidth: 3,
                    borderCapStyle: 'round',
                    backgroundColor: getAreaGradient,
                    fill: true,
                    tension: 0.35,
                    cubicInterpolationMode: 'monotone',
                    pointRadius: 0,
                    pointHoverRadius: 6,
                    pointHoverBackgroundColor: CHART_THEME.colors.green,
                    pointHoverBorderColor: '#0A101E',
                    pointHoverBorderWidth: 3,
                    customTooltipHtml: (dp) => {
                        const val = dp.raw;
                        const idx = dp.dataIndex;
                        const prevVal = idx > 0 ? dp.dataset.data[idx - 1] : val;
                        const yoyChange = prevVal ? ((val - prevVal) / prevVal) * 100 : 0;
                        const isUp = yoyChange >= 0;

                        return `
                            <div class="tooltip-metric">${formatCompactCurrency(val)}</div>
                            <div class="tooltip-meta">
                                <span class="tooltip-pill ${isUp ? 'pill-up' : 'pill-down'}">
                                    ${isUp ? '▲ +' : '▼ '}${Math.abs(yoyChange).toFixed(1)}% YoY
                                </span>
                            </div>
                        `;
                    }
                }]
            },
            options: {
                ...baseOpts,
                scales: {
                    ...baseOpts.scales,
                    x: {
                        ...baseOpts.scales.x,
                        ticks: {
                            ...baseOpts.scales.x.ticks,
                            callback: function(val, idx) {
                                const rawLabel = this.getLabelForValue(val);
                                // Show years cleanly (e.g. '2015', '2018', '2021', '2026')
                                const yearMatch = rawLabel.match(/\d{4}/);
                                return yearMatch ? yearMatch[0] : rawLabel;
                            }
                        }
                    },
                    y: {
                        ...baseOpts.scales.y,
                        // Sensible min to preserve dynamic amplitude without flattening the trend
                        suggestedMin: Math.min(...values) * 0.85
                    }
                }
            },
            plugins: [marketDecorationsPlugin]
        });

        chartInstances[canvasId] = chart;

        // Set up interactive time range toggles (5Y | 10Y | All)
        const toggleContainer = document.getElementById('market-range-toggles');
        if (toggleContainer) {
            const buttons = toggleContainer.querySelectorAll('.range-btn');
            buttons.forEach(btn => {
                btn.onclick = () => {
                    const range = btn.getAttribute('data-range');
                    if (range === activeRange) return;
                    activeRange = range;

                    buttons.forEach(b => b.classList.toggle('active', b === btn));

                    const updated = getFilteredData(activeRange);
                    chart.data.labels = updated.filteredDates;
                    chart.data.datasets[0].data = updated.filteredValues;
                    chart.update();

                    updateHeaderSummary(updated.filteredValues);
                };
            });
        }
    });
}


/**
 * ========================================================
 * 2. VALUATION BY PLAYER AGE (DISTRIBUTION CURVES)
 * ========================================================
 * - Positional tiers: FWD (#00FF88), MID (#00D4FF), DEF (#8B5CF6), GK (#FFC94D)
 * - Smooth 2px curves with 20% opacity gradient fills
 * - Shaded band marking Prime Years (24–29y)
 * - Interactive legend toggling tiers with smooth animation
 * - Peak age & value markers per positional tier
 */
export function renderAgeCurve(canvasId, rawPoints) {
    queueChartRender(canvasId, () => {
        destroyChart(canvasId);
        const canvas = document.getElementById(canvasId);
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const t = getThemeTokens();

        // 1. Group points into 4 primary positional tiers
        const tiers = {
            FWD: { label: 'Forwards', color: CHART_THEME.colors.green, points: [] },
            MID: { label: 'Midfielders', color: CHART_THEME.colors.cyan, points: [] },
            DEF: { label: 'Defenders', color: CHART_THEME.colors.purple, points: [] },
            GK:  { label: 'Goalkeepers', color: CHART_THEME.colors.gold, points: [] }
        };

        function mapPositionToTier(pos) {
            if (!pos) return 'FWD';
            const p = pos.toUpperCase();
            if (p === 'GK') return 'GK';
            if (['CB', 'LB', 'RB', 'FB', 'DEF', 'WB', 'LWB', 'RWB'].includes(p)) return 'DEF';
            if (['DM', 'CM', 'AM', 'LM', 'RM', 'MID'].includes(p)) return 'MID';
            return 'FWD'; // ST, CF, LW, RW, W, ATT
        }

        rawPoints.forEach(pt => {
            const tierKey = mapPositionToTier(pt.position);
            if (tiers[tierKey]) {
                tiers[tierKey].points.push(pt);
            }
        });

        // 2. Generate smooth average valuation curves across ages 18 to 36
        const ages = Array.from({ length: 19 }, (_, i) => 18 + i); // 18..36

        const datasets = Object.keys(tiers).map(key => {
            const tier = tiers[key];
            const dataByAge = ages.map(age => {
                const matches = tier.points.filter(p => p.age === age);
                if (!matches.length) return null;
                // Weighted median of valuations for that age
                const sorted = matches.map(m => m.market_value_eur).sort((a, b) => a - b);
                const mid = Math.floor(sorted.length / 2);
                return sorted[mid] || 0;
            });

            // Smooth interpolation for missing age points
            for (let i = 0; i < dataByAge.length; i++) {
                if (dataByAge[i] === null) {
                    const prev = dataByAge[i - 1] || 5000000;
                    const next = dataByAge.slice(i + 1).find(v => v !== null) || prev;
                    dataByAge[i] = Math.round((prev + next) / 2);
                }
            }

            // Find peak age
            let peakVal = 0;
            let peakAge = 25;
            dataByAge.forEach((v, idx) => {
                if (v > peakVal) {
                    peakVal = v;
                    peakAge = ages[idx];
                }
            });

            // Area Gradient
            function getTierGradient(context) {
                const chart = context.chart;
                const { ctx, chartArea } = chart;
                if (!chartArea) return 'transparent';
                const grad = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
                grad.addColorStop(0, tier.color.replace(')', ', 0.22)').replace('rgb', 'rgba').replace('#', 'rgba('));
                grad.addColorStop(1, 'rgba(0, 0, 0, 0.00)');
                return grad;
            }

            return {
                id: key,
                label: `${tier.label} (Peak ${peakAge}y)`,
                tierKey: key,
                data: dataByAge,
                borderColor: tier.color,
                borderWidth: 2.2,
                backgroundColor: (context) => {
                    const chart = context.chart;
                    const { ctx, chartArea } = chart;
                    if (!chartArea) return 'rgba(0, 255, 136, 0.05)';
                    const grad = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
                    if (key === 'FWD') {
                        grad.addColorStop(0, 'rgba(0, 255, 136, 0.25)');
                        grad.addColorStop(1, 'rgba(0, 255, 136, 0.00)');
                    } else if (key === 'MID') {
                        grad.addColorStop(0, 'rgba(0, 212, 255, 0.25)');
                        grad.addColorStop(1, 'rgba(0, 212, 255, 0.00)');
                    } else if (key === 'DEF') {
                        grad.addColorStop(0, 'rgba(139, 92, 246, 0.25)');
                        grad.addColorStop(1, 'rgba(139, 92, 246, 0.00)');
                    } else {
                        grad.addColorStop(0, 'rgba(255, 201, 77, 0.25)');
                        grad.addColorStop(1, 'rgba(255, 201, 77, 0.00)');
                    }
                    return grad;
                },
                fill: true,
                tension: 0.38,
                pointRadius: 0,
                pointHoverRadius: 6,
                pointHoverBackgroundColor: tier.color,
                pointHoverBorderColor: '#0A101E',
                pointHoverBorderWidth: 2.5,
                customTooltipHtml: (dp) => {
                    const val = dp.raw;
                    const age = ages[dp.dataIndex];
                    const isPrime = age >= 24 && age <= 29;
                    return `
                        <div class="tooltip-title">${tier.label} • Age ${age}</div>
                        <div class="tooltip-metric">${formatCompactCurrency(val)}</div>
                        ${isPrime ? '<div class="tooltip-meta"><span class="tooltip-pill pill-prime">★ Peak Prime Window</span></div>' : ''}
                    `;
                }
            };
        });

        // Plugin: Shaded Band Marking Prime Years (24 to 29)
        const primeBandPlugin = {
            id: 'primeBand',
            beforeDatasetsDraw(chart) {
                const { ctx, chartArea, scales } = chart;
                const xScale = scales.x;
                if (!xScale || !chartArea) return;

                const xStart = xScale.getPixelForValue(24 - 18);
                const xEnd = xScale.getPixelForValue(29 - 18);

                ctx.save();
                // Shaded background tint
                ctx.fillStyle = CHART_THEME.colors.primeBand;
                ctx.fillRect(xStart, chartArea.top, xEnd - xStart, chartArea.height);

                // Dashed vertical boundaries
                ctx.setLineDash([4, 4]);
                ctx.lineWidth = 1;
                ctx.strokeStyle = 'rgba(0, 212, 255, 0.28)';

                ctx.beginPath();
                ctx.moveTo(xStart, chartArea.top);
                ctx.lineTo(xStart, chartArea.bottom);
                ctx.moveTo(xEnd, chartArea.top);
                ctx.lineTo(xEnd, chartArea.bottom);
                ctx.stroke();

                // Subtle Prime Window label
                ctx.font = `600 10px ${CHART_THEME.fonts.label}`;
                ctx.fillStyle = 'rgba(0, 212, 255, 0.7)';
                ctx.textAlign = 'center';
                ctx.fillText('PRIME WINDOW (24–29y)', (xStart + xEnd) / 2, chartArea.top + 14);
                ctx.restore();
            }
        };

        const baseOpts = getBaseChartOptions();

        const chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: ages.map(a => `${a}y`),
                datasets: datasets
            },
            options: {
                ...baseOpts,
                scales: {
                    ...baseOpts.scales,
                    x: {
                        ...baseOpts.scales.x,
                        title: { display: false }
                    },
                    y: {
                        ...baseOpts.scales.y,
                        beginAtZero: true
                    }
                }
            },
            plugins: [primeBandPlugin]
        });

        chartInstances[canvasId] = chart;

        // Interactive Pill Legend Toggles (FWD, MID, DEF, GK)
        const legendContainer = document.getElementById('age-tier-legend');
        if (legendContainer) {
            const buttons = legendContainer.querySelectorAll('.tier-btn');
            buttons.forEach(btn => {
                btn.onclick = () => {
                    const tierKey = btn.getAttribute('data-tier');
                    const dsIndex = chart.data.datasets.findIndex(d => d.tierKey === tierKey);
                    if (dsIndex === -1) return;

                    const isVisible = chart.isDatasetVisible(dsIndex);
                    chart.setDatasetVisibility(dsIndex, !isVisible);
                    btn.classList.toggle('active', !isVisible);
                    chart.update();
                };
            });
        }
    });
}


/**
 * ========================================================
 * 3. CLUB SQUAD VALUATION RANKINGS (HORIZONTAL BARS)
 * ========================================================
 * - Horizontal bars sorted descending
 * - Green to Cyan gradient fill with rounded ends
 * - Top 3 podium styling: Gold (#1), Silver (#2), Bronze (#3)
 * - Background tracks (rgba(255,255,255,0.05))
 * - Club crest placeholder badges with initials
 * - Right-aligned monospace values (€X.XB)
 * - Hover shows exact valuation + percentage share of Top 15
 */
export function renderClubBars(canvasId, labels, values) {
    queueChartRender(canvasId, () => {
        destroyChart(canvasId);
        const canvas = document.getElementById(canvasId);
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const t = getThemeTokens();

        // Take top 15 clubs
        const count = Math.min(labels.length, 15);
        const topLabels = labels.slice(0, count);
        const topValues = values.slice(0, count);
        const totalSquadSum = topValues.reduce((a, b) => a + b, 0) || 1;

        // Update header total squad stat if container present
        const totalStatEl = document.getElementById('club-total-squad-value');
        if (totalStatEl) {
            totalStatEl.textContent = formatCompactCurrency(totalSquadSum);
        }

        // Generate club crest initials (e.g. Manchester City -> MC, Arsenal -> ARS)
        function getClubInitials(name) {
            if (!name) return 'FC';
            const words = name.replace(/FC|CF|BSC|VfL|VfB|SV|1\./gi, '').trim().split(/\s+/);
            if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
            return name.substring(0, 3).toUpperCase();
        }

        // Color gradients for each bar (Podium Gold, Silver, Bronze, then Green-to-Cyan)
        function getBarGradients() {
            return topValues.map((_, idx) => {
                const grad = ctx.createLinearGradient(0, 0, 420, 0);
                if (idx === 0) {
                    // 1st: Gold
                    grad.addColorStop(0, '#FFC94D');
                    grad.addColorStop(1, '#F59E0B');
                } else if (idx === 1) {
                    // 2nd: Silver
                    grad.addColorStop(0, '#F1F5F9');
                    grad.addColorStop(1, '#94A3B8');
                } else if (idx === 2) {
                    // 3rd: Bronze
                    grad.addColorStop(0, '#F97316');
                    grad.addColorStop(1, '#B45309');
                } else {
                    // Green to Cyan gradient
                    grad.addColorStop(0, '#00FF88');
                    grad.addColorStop(1, '#00D4FF');
                }
                return grad;
            });
        }

        // Custom plugin: Background pill tracks & right-aligned value labels
        const clubBarDecorationsPlugin = {
            id: 'clubBarDecorations',
            beforeDatasetsDraw(chart) {
                const { ctx, chartArea } = chart;
                const meta = chart.getDatasetMeta(0);
                if (!meta || !chartArea) return;

                ctx.save();
                ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
                const barH = 16;

                meta.data.forEach(bar => {
                    const y = bar.y - (barH / 2);
                    ctx.beginPath();
                    ctx.roundRect(chartArea.left, y, chartArea.width, barH, 8);
                    ctx.fill();
                });
                ctx.restore();
            },
            afterDatasetsDraw(chart) {
                const { ctx, chartArea } = chart;
                const meta = chart.getDatasetMeta(0);
                if (!meta) return;

                ctx.save();
                ctx.font = `600 11px ${CHART_THEME.fonts.mono}`;
                ctx.textBaseline = 'middle';

                meta.data.forEach((bar, idx) => {
                    const val = topValues[idx];
                    const valText = formatCompactCurrency(val);
                    // Place value right at the end of the bar or inside if near edge
                    const xPos = Math.min(bar.x + 8, chartArea.right - 4);
                    const isInside = (bar.x > chartArea.right - 55);

                    ctx.fillStyle = isInside ? '#0A101E' : CHART_THEME.colors.textPrimary;
                    ctx.textAlign = isInside ? 'right' : 'left';
                    ctx.fillText(valText, isInside ? bar.x - 8 : xPos, bar.y);
                });
                ctx.restore();
            }
        };

        const baseOpts = getBaseChartOptions();

        const chart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: topLabels,
                datasets: [{
                    data: topValues,
                    backgroundColor: getBarGradients(),
                    borderRadius: 8,
                    borderSkipped: false,
                    barThickness: 16,
                    maxBarThickness: 18,
                    hoverBackgroundColor: (c) => {
                        const i = c.dataIndex;
                        if (i === 0) return '#FFE082';
                        if (i === 1) return '#FFFFFF';
                        if (i === 2) return '#FB923C';
                        return '#38BDF8';
                    },
                    customTooltipHtml: (dp) => {
                        const val = dp.raw;
                        const club = topLabels[dp.dataIndex];
                        const rank = dp.dataIndex + 1;
                        const share = ((val / totalSquadSum) * 100).toFixed(1);
                        const medal = rank === 1 ? '🥇 ' : (rank === 2 ? '🥈 ' : (rank === 3 ? '🥉 ' : ''));

                        return `
                            <div class="tooltip-title">${medal}Rank #${rank} • ${club}</div>
                            <div class="tooltip-metric">${formatCompactCurrency(val)}</div>
                            <div class="tooltip-meta">
                                <span class="tooltip-pill pill-up">${share}% of Top 15 Total</span>
                            </div>
                        `;
                    }
                }]
            },
            options: {
                ...baseOpts,
                indexAxis: 'y',
                animation: {
                    duration: 900,
                    easing: 'easeOutCubic',
                    delay: (context) => (context.type === 'data' && context.mode === 'default') ? context.dataIndex * 60 : 0
                },
                scales: {
                    x: {
                        grid: { display: false },
                        border: { display: false },
                        ticks: { display: false } // Hidden for clean card aesthetic
                    },
                    y: {
                        grid: { display: false },
                        border: { display: false },
                        ticks: {
                            color: t.textPrimary,
                            font: { family: CHART_THEME.fonts.label, size: 12, weight: 600 },
                            callback: function(val, idx) {
                                const rawName = this.getLabelForValue(val);
                                const rank = idx + 1;
                                const initials = getClubInitials(rawName);
                                return `#${rank} ${rawName}`;
                            }
                        }
                    }
                }
            },
            plugins: [clubBarDecorationsPlugin]
        });

        chartInstances[canvasId] = chart;
    });
}


/**
 * ========================================================
 * 4. TABLE MINI SPARKLINES (80x24px)
 * ========================================================
 * Renders high-performance micro-visual area curves in table rows
 * - Green for risers, Red for fallers
 * - Glow end-point dot
 */
export function renderSparklines() {
    const canvases = document.querySelectorAll('.table-sparkline');
    if (!canvases.length) return;

    canvases.forEach(canvas => {
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const isRiser = canvas.getAttribute('data-type') === 'riser';
        const prevVal = parseFloat(canvas.getAttribute('data-prev') || '0');
        const currVal = parseFloat(canvas.getAttribute('data-curr') || '0');

        const w = canvas.width || 80;
        const h = canvas.height || 24;

        ctx.clearRect(0, 0, w, h);

        const strokeColor = isRiser ? CHART_THEME.colors.green : CHART_THEME.colors.red;
        const grad = ctx.createLinearGradient(0, 0, 0, h);
        if (isRiser) {
            grad.addColorStop(0, 'rgba(0, 255, 136, 0.35)');
            grad.addColorStop(1, 'rgba(0, 255, 136, 0.00)');
        } else {
            grad.addColorStop(0, 'rgba(255, 77, 109, 0.35)');
            grad.addColorStop(1, 'rgba(255, 77, 109, 0.00)');
        }

        // Coordinates for smooth 4-step trajectory
        const padding = 3;
        const yStart = isRiser ? h - padding - 3 : padding + 3;
        const yEnd = isRiser ? padding + 3 : h - padding - 3;
        const yMid1 = isRiser ? h * 0.65 : h * 0.45;
        const yMid2 = isRiser ? h * 0.35 : h * 0.65;

        // Path
        ctx.beginPath();
        ctx.moveTo(padding, yStart);
        ctx.bezierCurveTo(w * 0.3, yMid1, w * 0.65, yMid2, w - padding - 2, yEnd);

        // Stroke line
        ctx.lineWidth = 2;
        ctx.strokeStyle = strokeColor;
        ctx.stroke();

        // Area fill
        ctx.lineTo(w - padding - 2, h);
        ctx.lineTo(padding, h);
        ctx.closePath();
        ctx.fillStyle = grad;
        ctx.fill();

        // Glowing end-point dot
        ctx.beginPath();
        ctx.arc(w - padding - 2, yEnd, 2.5, 0, Math.PI * 2);
        ctx.fillStyle = strokeColor;
        ctx.shadowColor = strokeColor;
        ctx.shadowBlur = 6;
        ctx.fill();
        ctx.shadowBlur = 0; // reset
    });
}


/**
 * ========================================================
 * BACKWARD COMPATIBLE ROUTERS & EXISTING CHARTS
 * (Maintains compatibility with player.html, club.html, model.html)
 * ========================================================
 */
export function createMarketValueChart(canvasId, dates, values) {
    renderMarketGrowth(canvasId, dates, values);
}

export function createValueAgeChart(canvasId, points) {
    renderAgeCurve(canvasId, points);
}

export function createBarChart(canvasId, labels, values, isHorizontal = false, customColor = null) {
    if (canvasId === 'club-squad-chart') {
        renderClubBars(canvasId, labels, values);
    } else {
        // Standard bar chart for model / feature importance
        queueChartRender(canvasId, () => {
            destroyChart(canvasId);
            const canvas = document.getElementById(canvasId);
            if (!canvas) return;
            const ctx = canvas.getContext('2d');
            const t = getThemeTokens();

            chartInstances[canvasId] = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [{
                        data: values,
                        backgroundColor: customColor || CHART_THEME.colors.cyan,
                        borderRadius: 6
                    }]
                },
                options: {
                    ...getBaseChartOptions(),
                    indexAxis: isHorizontal ? 'y' : 'x',
                    plugins: { legend: { display: false } }
                }
            });
        });
    }
}

// Radar Chart for player comparison & attributes
export function createRadarChart(canvasId, labels, playerVals, benchmarkVals, playerName = 'Player') {
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
                        backgroundColor: 'rgba(0, 255, 136, 0.22)',
                        borderColor: CHART_THEME.colors.green,
                        pointBackgroundColor: CHART_THEME.colors.green,
                        borderWidth: 2
                    },
                    {
                        label: 'Positional Benchmark',
                        data: benchmarkVals || labels.map(() => 50),
                        backgroundColor: 'rgba(0, 212, 255, 0.1)',
                        borderColor: CHART_THEME.colors.cyan,
                        borderDash: [4, 4],
                        borderWidth: 1.5
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    r: {
                        angleLines: { color: t.gridline },
                        grid: { color: t.gridline },
                        pointLabels: {
                            color: t.textPrimary,
                            font: { family: CHART_THEME.fonts.label, size: 11, weight: 600 }
                        },
                        ticks: { display: false }
                    }
                }
            }
        });
    });
}

// Scatter Chart for actual vs predicted
export function createScatterChart(canvasId, points) {
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
                        label: 'Players',
                        data: points.map(p => ({ x: p.actual, y: p.predicted, player: p.player })),
                        backgroundColor: 'rgba(0, 255, 136, 0.7)',
                        pointRadius: 4
                    },
                    {
                        label: 'Fair Value',
                        type: 'line',
                        data: [{ x: 0, y: 0 }, { x: maxVal, y: maxVal }],
                        borderColor: t.textMuted,
                        borderDash: [5, 5],
                        pointRadius: 0
                    }
                ]
            },
            options: {
                ...getBaseChartOptions(),
                scales: {
                    x: { ...getBaseChartOptions().scales.x, ticks: { callback: v => formatCompactCurrency(v) } },
                    y: { ...getBaseChartOptions().scales.y, ticks: { callback: v => formatCompactCurrency(v) } }
                }
            }
        });
    });
}

// Doughnut Chart
export function createDoughnutChart(canvasId, labels, values) {
    queueChartRender(canvasId, () => {
        destroyChart(canvasId);
        const canvas = document.getElementById(canvasId);
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const palette = [CHART_THEME.colors.green, CHART_THEME.colors.cyan, CHART_THEME.colors.gold, CHART_THEME.colors.purple, '#EC4899'];

        chartInstances[canvasId] = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: values,
                    backgroundColor: palette.slice(0, labels.length),
                    borderWidth: 2,
                    borderColor: 'rgba(10, 16, 30, 0.9)'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '70%',
                plugins: { legend: { position: 'right' } }
            }
        });
    });
}

// Global window attachment for non-module script tag compatibility
if (typeof window !== 'undefined') {
    window.CHART_THEME = CHART_THEME;
    window.renderMarketGrowth = renderMarketGrowth;
    window.renderAgeCurve = renderAgeCurve;
    window.renderClubBars = renderClubBars;
    window.renderSparklines = renderSparklines;
    window.createMarketValueChart = createMarketValueChart;
    window.createValueAgeChart = createValueAgeChart;
    window.createBarChart = createBarChart;
    window.createRadarChart = createRadarChart;
    window.createScatterChart = createScatterChart;
    window.createDoughnutChart = createDoughnutChart;
}
