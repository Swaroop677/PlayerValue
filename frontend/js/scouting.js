/**
 * Advanced Scouting Matrix Logic
 * Filter handling, debounced inputs, compare selection, and safe pagination
 */

let filters = { page: 1, page_size: 20 };
let selectedPlayers = [];

document.addEventListener('DOMContentLoaded', () => {
    initPage('scouting');
    
    const breadcrumbs = document.getElementById('breadcrumbs-container');
    if (breadcrumbs) {
        breadcrumbs.innerHTML = createBreadcrumbs([
            { label: 'Dashboard', url: 'index.html' },
            { label: 'Scouting', url: '#' }
        ]);
    }

    setupEventListeners();
    loadData();
});

function setupEventListeners() {
    const inputIds = [
        's-position', 's-min-age', 's-max-age', 's-max-value',
        's-min-mins', 's-min-goals', 's-min-assists', 's-min-prog-p', 's-min-tackles'
    ];

    inputIds.forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        if (el.tagName === 'SELECT') {
            el.addEventListener('change', () => applyFilters());
        } else {
            el.addEventListener('input', debounce(() => applyFilters(), 350));
        }
    });

    const applyBtn = document.getElementById('btn-apply-filters');
    if (applyBtn) {
        applyBtn.addEventListener('click', () => applyFilters());
    }

    const resetBtn = document.getElementById('btn-reset-filters');
    if (resetBtn) {
        resetBtn.addEventListener('click', () => resetFilters());
    }
}

function applyFilters() {
    filters = { page: 1, page_size: 20 };
    
    const mappings = {
        's-position': 'position',
        's-min-age': 'min_age',
        's-max-age': 'max_age',
        's-max-value': 'max_value',
        's-min-mins': 'min_minutes',
        's-min-goals': 'min_goals',
        's-min-assists': 'min_assists',
        's-min-prog-p': 'min_progressive_passes',
        's-min-tackles': 'min_tackles'
    };

    for (let id in mappings) {
        const el = document.getElementById(id);
        if (!el) continue;
        const val = el.value.trim();
        if (val) {
            if (id === 's-max-value') {
                filters[mappings[id]] = parseFloat(val) * 1000000;
            } else if (['s-min-age', 's-max-age', 's-min-mins', 's-min-goals', 's-min-assists', 's-min-prog-p', 's-min-tackles'].includes(id)) {
                filters[mappings[id]] = Number(val);
            } else {
                filters[mappings[id]] = val;
            }
        }
    }

    loadData();
}

function resetFilters() {
    const inputIds = [
        's-position', 's-min-age', 's-max-age', 's-max-value',
        's-min-mins', 's-min-goals', 's-min-assists', 's-min-prog-p', 's-min-tackles'
    ];
    inputIds.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });
    filters = { page: 1, page_size: 20 };
    loadData();
}

window.changePage = (page) => {
    filters.page = page;
    loadData();
    window.scrollTo({ top: 120, behavior: 'smooth' });
};

window.toggleSelection = (id) => {
    id = Number(id);
    const idx = selectedPlayers.indexOf(id);
    if (idx > -1) {
        selectedPlayers.splice(idx, 1);
    } else {
        if (selectedPlayers.length >= 3) {
            alert('You can compare up to 3 players at once.');
            const chk = document.getElementById(`chk-${id}`);
            if (chk) chk.checked = false;
            return;
        }
        selectedPlayers.push(id);
    }
    updateCompareBtn();
};

function updateCompareBtn() {
    const btn = document.getElementById('btn-compare');
    if (!btn) return;
    btn.textContent = `Compare Selected (${selectedPlayers.length})`;
    btn.disabled = selectedPlayers.length < 2;
    if (!btn.disabled) {
        btn.onclick = () => window.location.href = `compare.html?ids=${selectedPlayers.join(',')}`;
    } else {
        btn.onclick = null;
    }
}

async function loadData() {
    const tbody = document.getElementById('scouting-tbody');
    const pagination = document.getElementById('pagination-container');
    if (!tbody) return;

    tbody.innerHTML = Array(8).fill(createSkeleton('table-row')).join('');
    
    try {
        const response = await getScouting(filters);
        const items = response.items || [];
        
        if (items.length === 0) {
            tbody.innerHTML = `<tr><td colspan="8" class="text-center" style="padding: 48px; text-align:center; color:var(--color-ink-soft);">No players match these scouting parameters. Try relaxing the filter thresholds.</td></tr>`;
            if (pagination) pagination.innerHTML = '';
            return;
        }

        tbody.innerHTML = items.map(p => {
            const gap = (p.predicted_value_eur || 0) - (p.market_value_eur || 0);
            const gapPercent = p.value_gap_percent !== undefined && p.value_gap_percent !== null 
                ? p.value_gap_percent 
                : (p.market_value_eur ? (gap / p.market_value_eur) * 100 : 0);

            return `
                <tr onmouseenter="prefetchPlayer(${p.id})">
                    <td style="text-align:center;">
                        <input type="checkbox" id="chk-${p.id}" ${selectedPlayers.includes(p.id) ? 'checked' : ''} onchange="toggleSelection('${p.id}')" aria-label="Select ${p.name}">
                    </td>
                    <td onclick="window.location.href='player.html?id=${p.id}'" style="cursor: pointer;">
                        <div style="display:flex; align-items:center; gap:10px;">
                            ${createPlayerAvatar(p.name, p.primary_position)}
                            <div>
                                <span style="font-weight:600; color:var(--color-ink);">${p.name}</span>
                                <div style="font-size:12px; color:var(--color-ink-muted);">${p.club_name || 'Free Agent'}</div>
                            </div>
                        </div>
                    </td>
                    <td><span class="${getPositionBadgeClass(p.primary_position)}">${p.primary_position}</span></td>
                    <td class="tabular-nums">${p.age || '-'}</td>
                    <td>${p.club_name || '-'}</td>
                    <td class="tabular-nums"><strong>${formatCurrency(p.market_value_eur)}</strong></td>
                    <td class="tabular-nums" style="color: var(--color-primary-dark); font-weight: 600;">${formatCurrency(p.predicted_value_eur)}</td>
                    <td>
                        <div style="display:flex; flex-direction:column; gap:4px;">
                            ${createValueBadge(gapPercent, true)}
                            ${createMiniGapBar(gapPercent)}
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
        
        if (pagination) {
            pagination.innerHTML = createPagination(response.page, response.total_pages, 'changePage');
        }
        
    } catch (e) {
        console.error('Scouting fetch error:', e);
        showError(tbody.parentElement, 'Failed to load scouting results.');
    }
}
