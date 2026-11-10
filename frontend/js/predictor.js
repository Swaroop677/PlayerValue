/**
 * PlayerValue - Interactive Valuation Predictor Controller
 * Provides synced slider inputs, preset gallery across 7 position categories,
 * debounced live ML calculations, SHAP contributions chart, and what-if analysis.
 */

let activePresetCategory = 'ST';
let activePresetId = 'haaland';
let compareMode = false;
let scenarioBStats = null;
let currentPredictionResult = null;
let isPredicting = false;
let currentValuationTween = 0;

// Current form state
let formState = {
    position: 'ST',
    age: 24,
    league_strength: 5.0,
    club_tier: 4.0,
    minutes: 3100,
    goals: 32,
    assists: 6,
    xg: 29.5,
    xa: 5.2,
    shots: 118,
    key_passes: 32,
    progressive_carries: 48,
    progressive_passes: 42,
    tackles: 14,
    interceptions: 8,
    aerial_wins: 48,
    recoveries: 36,
    clean_sheets: 0
};

// Initial state snapshot for Reset / Undo
let initialFormState = { ...formState };

document.addEventListener('DOMContentLoaded', () => {
    initPage('predictor');
    initPresetGallery();
    initPositionPicker();
    initTierSelector();
    bindFormEvents();
    loadPreset('haaland');
});

function initPresetGallery() {
    renderPresetTabs();
    renderPresetCards();
}

function renderPresetTabs() {
    const tabsContainer = document.getElementById('preset-tabs-bar');
    if (!tabsContainer) return;

    const categories = [
        { id: 'ST', label: 'Strikers' },
        { id: 'Winger', label: 'Wingers' },
        { id: 'AM/CM', label: 'AM / Central Mid' },
        { id: 'DM', label: 'Defensive Mid' },
        { id: 'CB', label: 'Centre-Backs' },
        { id: 'Fullback', label: 'Full-Backs' },
        { id: 'GK', label: 'Goalkeepers' }
    ];

    tabsContainer.innerHTML = categories.map(cat => `
        <button class="preset-tab-btn ${cat.id === activePresetCategory ? 'active' : ''}" onclick="selectPresetCategory('${cat.id}')">
            ${cat.label}
        </button>
    `).join('');
}

function selectPresetCategory(catId) {
    activePresetCategory = catId;
    renderPresetTabs();
    renderPresetCards();
}

function renderPresetCards() {
    const carousel = document.getElementById('preset-cards-carousel');
    if (!carousel) return;

    const filtered = (typeof PREDICTOR_PRESETS !== 'undefined' ? PREDICTOR_PRESETS : [])
        .filter(p => p.position_group === activePresetCategory);

    carousel.innerHTML = filtered.map(p => `
        <div class="preset-player-card ${p.id === activePresetId ? 'active' : ''}" onclick="loadPreset('${p.id}')">
            <div class="preset-card-top">
                <div class="preset-avatar">
                    <img src="${p.photo}" alt="${p.name}" onerror="this.src='assets/logo-icon.png'">
                </div>
                <div style="min-width:0;">
                    <div class="preset-meta-name" title="${p.name}">${p.name}</div>
                    <div class="preset-meta-club">${p.club}</div>
                </div>
            </div>
            <div class="preset-card-val">
                <span class="preset-tag">${p.position} • ${p.age}y</span>
                <strong style="color:var(--color-primary-dark); font-weight:700;">${formatCurrency(p.market_value_eur)}</strong>
            </div>
        </div>
    `).join('');
}

function loadPreset(presetId) {
    activePresetId = presetId;
    renderPresetCards();

    const p = (typeof PREDICTOR_PRESETS !== 'undefined' ? PREDICTOR_PRESETS : []).find(item => item.id === presetId);
    if (!p) return;

    formState = { ...p.stats };
    populateFormFields();
    triggerPrediction();
}

function initPositionPicker() {
    const picker = document.getElementById('position-picker');
    if (!picker) return;

    const positions = ['ST', 'LW', 'RW', 'AM', 'CM', 'DM', 'CB', 'LB', 'RB', 'GK'];
    picker.innerHTML = positions.map(pos => `
        <button type="button" class="pos-btn ${pos === formState.position ? 'active' : ''}" onclick="selectPosition('${pos}')">
            ${pos}
        </button>
    `).join('');
}

function selectPosition(pos) {
    formState.position = pos;
    initPositionPicker();
    updateFieldVisibility();
    triggerPrediction();
}

function initTierSelector() {
    const selector = document.getElementById('tier-selector');
    if (!selector) return;

    const tiers = [
        { tier: 4.0, label: 'Tier 4: Global Elite', ex: 'Man City, Real Madrid, Bayern, PSG' },
        { tier: 3.0, label: 'Tier 3: UCL / Top Contender', ex: 'Inter, Dortmund, Atletico, Villa' },
        { tier: 2.0, label: 'Tier 2: Mid-Table Top 5', ex: 'Brighton, Sociedad, Frankfurt' },
        { tier: 1.0, label: 'Tier 1: Lower Division', ex: 'Championship, 2nd Tier, Domestic' }
    ];

    selector.innerHTML = tiers.map(t => `
        <div class="tier-card-btn ${formState.club_tier === t.tier ? 'active' : ''}" onclick="selectClubTier(${t.tier})">
            <div class="tier-num">${t.label.split(':')[0]}</div>
            <div class="tier-name">${t.label.split(':')[1]}</div>
            <div class="tier-examples">${t.ex}</div>
        </div>
    `).join('');
}

function selectClubTier(tier) {
    formState.club_tier = Number(tier);
    initTierSelector();
    triggerPrediction();
}

function populateFormFields() {
    // Set all numeric inputs & sliders
    const keys = [
        'age', 'minutes', 'league_strength', 'goals', 'assists', 'xg', 'xa',
        'shots', 'key_passes', 'progressive_carries', 'progressive_passes',
        'tackles', 'interceptions', 'aerial_wins', 'clean_sheets'
    ];

    keys.forEach(k => {
        const numInput = document.getElementById(`in-${k}`);
        const sliderInput = document.getElementById(`sl-${k}`);
        const val = formState[k] !== undefined ? formState[k] : 0;
        if (numInput) numInput.value = val;
        if (sliderInput) sliderInput.value = val;
    });

    initPositionPicker();
    initTierSelector();
    updateFieldVisibility();
}

function updateFieldVisibility() {
    const pos = formState.position.toUpperCase();
    const isFwd = ['ST', 'CF', 'LW', 'RW'].includes(pos);
    const isDef = ['CB', 'LB', 'RB'].includes(pos);
    const isGk = pos === 'GK';

    // Show/hide sections or metrics based on tactical relevance
    const attackingSection = document.getElementById('section-attacking');
    const defendingSection = document.getElementById('section-defending');
    const gkSection = document.getElementById('section-gk');

    if (gkSection) gkSection.style.display = isGk ? 'block' : 'none';
    if (attackingSection) attackingSection.style.display = isGk ? 'none' : 'block';
    if (defendingSection) defendingSection.style.display = isGk ? 'none' : 'block';
}

function bindFormEvents() {
    const keys = [
        'age', 'minutes', 'league_strength', 'goals', 'assists', 'xg', 'xa',
        'shots', 'key_passes', 'progressive_carries', 'progressive_passes',
        'tackles', 'interceptions', 'aerial_wins', 'clean_sheets'
    ];

    keys.forEach(k => {
        const numInput = document.getElementById(`in-${k}`);
        const sliderInput = document.getElementById(`sl-${k}`);

        if (sliderInput && numInput) {
            sliderInput.addEventListener('input', (e) => {
                const val = Number(e.target.value);
                numInput.value = val;
                formState[k] = val;
                triggerPrediction();
            });

            numInput.addEventListener('input', (e) => {
                const val = Number(e.target.value);
                sliderInput.value = val;
                formState[k] = val;
                triggerPrediction();
            });
        }
    });
}

function stepField(key, delta) {
    const numInput = document.getElementById(`in-${key}`);
    const sliderInput = document.getElementById(`sl-${key}`);
    if (!numInput) return;

    let val = Number(numInput.value || 0) + delta;
    val = Math.max(Number(sliderInput?.min || 0), Math.min(Number(sliderInput?.max || 9999), val));
    if (key === 'league_strength' || key === 'xg' || key === 'xa') {
        val = Math.round(val * 10) / 10;
    } else {
        val = Math.round(val);
    }

    numInput.value = val;
    if (sliderInput) sliderInput.value = val;
    formState[key] = val;
    triggerPrediction();
}

const triggerPrediction = debounce(async () => {
    if (isPredicting) return;
    isPredicting = true;

    try {
        const res = await fetch('/api/model/predict-custom', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formState)
        });

        if (!res.ok) throw new Error('Prediction API failed');
        const data = await res.json();
        currentPredictionResult = data;
        renderPredictionResults(data);
    } catch (e) {
        console.error('Prediction failed:', e);
    } finally {
        isPredicting = false;
    }
}, 200);

function renderPredictionResults(data) {
    const valElement = document.getElementById('pred-big-valuation');
    const rangeLowEl = document.getElementById('pred-range-low');
    const rangeHighEl = document.getElementById('pred-range-high');
    const rangeMarker = document.getElementById('pred-range-marker');
    const rangeFill = document.getElementById('pred-range-fill');
    const shapContainer = document.getElementById('shap-factors-container');
    const whatIfContainer = document.getElementById('what-if-container');
    const compsContainer = document.getElementById('comparables-container');

    const predVal = data.predicted_value_eur || 0;
    const low = data.confidence_range_eur?.low || predVal * 0.75;
    const high = data.confidence_range_eur?.high || predVal * 1.35;

    // Number tween
    animateValuation(predVal, valElement);

    if (rangeLowEl) rangeLowEl.textContent = formatCurrency(low);
    if (rangeHighEl) rangeHighEl.textContent = formatCurrency(high);

    // Range marker position
    if (rangeMarker && rangeFill && high > low) {
        const pct = Math.max(5, Math.min(95, ((predVal - low) / (high - low)) * 100));
        rangeMarker.style.left = `${pct}%`;
        rangeFill.style.left = '0%';
        rangeFill.style.width = '100%';
    }

    // Top SHAP drivers
    if (shapContainer && data.top_factors) {
        const maxImpact = Math.max(...data.top_factors.map(f => Math.abs(f.contribution_eur || 0)), 1);

        shapContainer.innerHTML = data.top_factors.slice(0, 6).map(f => {
            const isPos = f.direction === 'positive';
            const widthPct = Math.min(100, (Math.abs(f.contribution_eur || 0) / maxImpact) * 100);
            const colorClass = isPos ? 'positive' : 'negative';
            const barColor = isPos ? 'var(--color-tertiary)' : 'var(--color-primary)';
            const sign = isPos ? '+' : '-';

            return `
                <div class="shap-factor-row">
                    <div class="shap-meta-row">
                        <span class="shap-factor-name">${f.feature}</span>
                        <span class="shap-factor-eur ${colorClass}">${sign}${formatCurrency(Math.abs(f.contribution_eur))}</span>
                    </div>
                    <div class="shap-bar-bg">
                        <div class="shap-bar-fill" style="width:${widthPct}%; background:${barColor};"></div>
                    </div>
                </div>
            `;
        }).join('');
    }

    // "What would change this valuation?"
    if (whatIfContainer && data.what_if_deltas) {
        const deltas = data.what_if_deltas;
        whatIfContainer.innerHTML = `
            <div class="what-if-grid">
                <div class="what-if-item">
                    <span class="what-if-label">+5 Season Goals</span>
                    <div class="what-if-right">
                        <span class="what-if-val" style="color:var(--color-tertiary-dark);">+${formatCurrency(deltas.plus_5_goals)}</span>
                        <button class="what-if-apply-btn" onclick="applyWhatIf('goals', 5)">+ Apply</button>
                    </div>
                </div>
                <div class="what-if-item">
                    <span class="what-if-label">+1 Year Age</span>
                    <div class="what-if-right">
                        <span class="what-if-val" style="color:${deltas.plus_1_year_age >= 0 ? 'var(--color-ink)' : 'var(--color-primary-dark)'};">
                            ${deltas.plus_1_year_age >= 0 ? '+' : ''}${formatCurrency(deltas.plus_1_year_age)}
                        </span>
                        <button class="what-if-apply-btn" onclick="applyWhatIf('age', 1)">+ Apply</button>
                    </div>
                </div>
                <div class="what-if-item">
                    <span class="what-if-label">Move to Elite Club (Tier 4)</span>
                    <div class="what-if-right">
                        <span class="what-if-val" style="color:var(--color-tertiary-dark);">+${formatCurrency(deltas.tier_4_transfer)}</span>
                        <button class="what-if-apply-btn" onclick="applyWhatIf('tier', 4)">+ Apply</button>
                    </div>
                </div>
            </div>
        `;
    }

    // Similar Comparable Players
    if (compsContainer && data.comparable_players) {
        compsContainer.innerHTML = data.comparable_players.slice(0, 3).map(p => `
            <div class="comparable-player-row" onclick="window.location.href='player.html?id=${p.id}'">
                <div style="display:flex; align-items:center; gap:10px;">
                    <div style="width:30px; height:30px; border-radius:50%; overflow:hidden;">
                        ${createPlayerAvatar(p.name, p.position, '', p.id)}
                    </div>
                    <div>
                        <div style="font-size:13px; font-weight:700; color:var(--color-ink);">${p.name}</div>
                        <div style="font-size:11px; color:var(--color-ink-muted);">${p.club} • ${p.position}</div>
                    </div>
                </div>
                <div style="text-align:right;">
                    <div style="font-size:12px; font-weight:700; color:var(--color-ink);">${formatCurrency(p.market_value_eur)}</div>
                    <div style="font-size:10px; font-weight:700; color:var(--color-tertiary-dark);">${p.similarity_percent}% match</div>
                </div>
            </div>
        `).join('');
    }
}

function animateValuation(targetVal, element) {
    if (!element) return;
    const startVal = currentValuationTween;
    const duration = 400;
    const startTime = performance.now();

    function updateNumber(now) {
        const elapsed = now - startTime;
        const progress = Math.min(1, elapsed / duration);
        // Ease-out expo
        const ease = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
        const current = startVal + (targetVal - startVal) * ease;
        currentValuationTween = current;
        element.textContent = formatCurrency(current);

        if (progress < 1) {
            requestAnimationFrame(updateNumber);
        } else {
            element.textContent = formatCurrency(targetVal);
        }
    }

    requestAnimationFrame(updateNumber);
}

function applyWhatIf(field, value) {
    if (field === 'goals') {
        stepField('goals', value);
    } else if (field === 'age') {
        stepField('age', value);
    } else if (field === 'tier') {
        selectClubTier(value);
    }
}

function resetForm() {
    formState = { ...initialFormState };
    populateFormFields();
    triggerPrediction();
}

function copyShareLink() {
    const params = new URLSearchParams();
    params.set('pos', formState.position);
    params.set('age', formState.age);
    params.set('tier', formState.club_tier);
    params.set('goals', formState.goals);
    params.set('assists', formState.assists);
    const url = `${window.location.origin}${window.location.pathname}?${params.toString()}`;

    navigator.clipboard.writeText(url).then(() => {
        alert('Configuration link copied to clipboard!');
    }).catch(() => {
        prompt('Copy this predictor link:', url);
    });
}
