let filters = { page: 1, page_size: 20 };

document.addEventListener('DOMContentLoaded', () => {
    initPage('opportunities');
    document.getElementById('breadcrumbs-container').innerHTML = createBreadcrumbs([
        { label: 'Dashboard', url: 'index.html' },
        { label: 'Opportunities', url: '#' }
    ]);
    
    const inputs = ['o-position', 'o-max-age', 'o-min-gap', 'o-max-val'];
    inputs.forEach(id => {
        document.getElementById(id).addEventListener('change', debounce(applyFilters, 300));
        document.getElementById(id).addEventListener('keyup', debounce(applyFilters, 300));
    });
    
    loadData();
});

function applyFilters() {
    filters = { page: 1, page_size: 20 };
    const pos = document.getElementById('o-position').value;
    const maxAge = document.getElementById('o-max-age').value;
    const minGap = document.getElementById('o-min-gap').value;
    const maxVal = document.getElementById('o-max-val').value;
    
    if (pos) filters.position = pos;
    if (maxAge) filters.max_age = maxAge;
    if (minGap) filters.min_gap_percent = minGap;
    if (maxVal) filters.max_value = parseFloat(maxVal) * 1000000;
    
    loadData();
}

window.changePage = (page) => {
    filters.page = page;
    loadData();
};

async function loadData() {
    const tbody = document.getElementById('opp-tbody');
    const pagination = document.getElementById('pagination-container');
    tbody.innerHTML = Array(10).fill(createSkeleton('table-row')).join('');
    
    try {
        const response = await getMarketOpportunities(filters);
        
        if (response.items.length === 0) {
            tbody.innerHTML = `<tr><td colspan="8" class="text-center" style="padding: 40px">No opportunities found matching your criteria.</td></tr>`;
            pagination.innerHTML = '';
            return;
        }

        tbody.innerHTML = response.items.map(p => {
            const gap = (p.predicted_value_eur || 0) - (p.market_value_eur || 0);
            const gapPercent = p.value_gap_percent !== undefined && p.value_gap_percent !== null 
                ? p.value_gap_percent 
                : (p.market_value_eur ? (gap / p.market_value_eur) * 100 : 0);

            return `
            <tr onmouseenter="prefetchPlayer(${p.id})" style="cursor: pointer" onclick="window.location.href='player.html?id=${p.id}'">
                <td>
                    <div style="display:flex; align-items:center; gap:10px;">
                        ${createPlayerAvatar(p.name, p.primary_position)}
                        <div>
                            <div style="font-weight:600; color:var(--color-ink);">${p.name}</div>
                            <div style="font-size:12px; color:var(--color-ink-muted);">${p.club_name || 'Free Agent'}</div>
                        </div>
                    </div>
                </td>
                <td class="tabular-nums">${p.age || '-'}</td>
                <td><span class="${getPositionBadgeClass(p.primary_position)}">${p.primary_position}</span></td>
                <td>${p.club_name || '-'}</td>
                <td>${p.league_name || '-'}</td>
                <td class="tabular-nums"><strong>${formatCurrency(p.market_value_eur)}</strong></td>
                <td class="tabular-nums" style="color:var(--color-primary-dark); font-weight:600">${formatCurrency(p.predicted_value_eur)}</td>
                <td>
                    <div style="display:flex; flex-direction:column; gap:4px;">
                        ${createValueBadge(gapPercent, true)}
                        ${createMiniGapBar(gapPercent)}
                    </div>
                </td>
            </tr>
        `}).join('');
        
        pagination.innerHTML = createPagination(response.page, response.total_pages, 'changePage');
        
    } catch (e) {
        showError(tbody.parentElement, 'Failed to load market opportunities.');
    }
}
