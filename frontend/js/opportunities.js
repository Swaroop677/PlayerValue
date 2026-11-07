/**
 * Market Opportunities Logic
 * Filter handling, debounced inputs, min-minutes filter, safe pagination, and safe formatters
 */

let filters = { page: 1, page_size: 20, min_minutes: 900 };

document.addEventListener('DOMContentLoaded', () => {
    initPage('opportunities');
    
    const breadcrumbs = document.getElementById('breadcrumbs-container');
    if (breadcrumbs) {
        breadcrumbs.innerHTML = createBreadcrumbs([
            { label: 'Dashboard', url: 'index.html' },
            { label: 'Market Opportunities', url: '#' }
        ]);
    }
    
    setupEventListeners();
    loadData();
});

function setupEventListeners() {
    const inputs = ['o-min-mins', 'o-position', 'o-max-age', 'o-min-gap', 'o-max-val'];
    inputs.forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        if (el.tagName === 'SELECT') {
            el.addEventListener('change', () => applyFilters());
        } else {
            el.addEventListener('input', debounce(() => applyFilters(), 350));
        }
    });
}

function applyFilters() {
    filters = { page: 1, page_size: 20 };
    
    const minMins = document.getElementById('o-min-mins')?.value;
    const pos = document.getElementById('o-position')?.value;
    const maxAge = document.getElementById('o-max-age')?.value;
    const minGap = document.getElementById('o-min-gap')?.value;
    const maxVal = document.getElementById('o-max-val')?.value;
    
    if (minMins !== undefined && minMins !== '') filters.min_minutes = Number(minMins);
    if (pos) filters.position = pos;
    if (maxAge) filters.max_age = Number(maxAge);
    if (minGap) filters.min_gap_percent = Number(minGap);
    if (maxVal) filters.max_value = parseFloat(maxVal) * 1000000;
    
    loadData();
}

window.changePage = (page) => {
    filters.page = page;
    loadData();
    window.scrollTo({ top: 120, behavior: 'smooth' });
};

async function loadData() {
    const tbody = document.getElementById('opp-tbody');
    const pagination = document.getElementById('pagination-container');
    if (!tbody) return;

    tbody.innerHTML = `
        <tr>
            <td colspan="8" style="text-align:center; padding:40px; color:var(--color-ink-muted);">
                <div class="skeleton-card skeleton" style="height:32px; margin-bottom:8px;"></div>
                <div class="skeleton-card skeleton" style="height:32px; margin-bottom:8px;"></div>
                <div class="skeleton-card skeleton" style="height:32px;"></div>
            </td>
        </tr>
    `;

    try {
        const data = await getOpportunities(filters);
        const items = data.items || [];

        if (items.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="8" style="text-align:center; padding:48px 20px; color:var(--color-ink-muted);">
                        No market opportunities match the current criteria. Try lowering the min minutes or gap percentage.
                    </td>
                </tr>
            `;
            if (pagination) pagination.innerHTML = '';
            return;
        }

        tbody.innerHTML = items.map(p => {
            const mv = p.actual_market_value_eur !== undefined ? p.actual_market_value_eur : p.market_value_eur;
            const pv = p.predicted_value_eur !== undefined ? p.predicted_value_eur : p.model_value_eur;
            const gap = (pv || 0) - (mv || 0);
            const gapPercent = p.undervaluation_pct !== undefined ? p.undervaluation_pct : (mv ? (gap / mv) * 100 : 0);
            const posClass = getPositionBadgeClass(p.primary_position);

            return `
                <tr onclick="window.location.href='player.html?id=${p.id}'" role="row" tabindex="0" style="cursor:pointer;">
                    <td>
                        <div style="display:flex; align-items:center; gap:12px;">
                            ${createPlayerAvatar(p.name, p.primary_position)}
                            <div>
                                <div style="font-weight:600; color:var(--color-ink);">${safeText(p.name)}</div>
                                <div style="font-size:12px; color:var(--color-ink-muted); display:flex; align-items:center; gap:5px;">
                                    ${createClubLogo(p.club_id, p.club_name, 16)}
                                    <span>${safeText(p.club_name, 'Free Agent')}</span> · ${safeText(p.nationality, '—')}
                                </div>
                            </div>
                        </div>
                    </td>
                    <td class="tabular-nums">${safeText(p.age)}</td>
                    <td><span class="${posClass}">${safeText(p.primary_position)}</span></td>
                    <td>${safeText(p.club_name, '—')}</td>
                    <td>${safeText(p.league_name, '—')}</td>
                    <td class="tabular-nums"><strong>${formatCurrency(mv)}</strong></td>
                    <td class="tabular-nums" style="color:var(--color-primary-dark); font-weight:600;">${formatCurrency(pv)}</td>
                    <td>
                        <div style="display:flex; flex-direction:column; gap:4px;">
                            ${createValueBadge(gapPercent, true)}
                            ${createMiniGapBar(gapPercent)}
                        </div>
                    </td>
                </tr>
            `;
        }).join('');

        if (pagination && data.pages > 1) {
            pagination.innerHTML = createPagination(data.page, data.pages, 'changePage');
        } else if (pagination) {
            pagination.innerHTML = '';
        }
    } catch (err) {
        console.error('Failed to load opportunities:', err);
        tbody.innerHTML = `
            <tr>
                <td colspan="8" style="text-align:center; padding:32px; color:var(--color-negative);">
                    Failed to load market opportunities.
                    <button class="btn btn-secondary" onclick="loadData()" style="margin-left:12px; font-size:12px; padding:4px 10px;">Retry</button>
                </td>
            </tr>
        `;
    }
}
