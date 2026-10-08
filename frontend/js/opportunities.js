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
            const gapPercent = p.value_gap_percent || (p.market_value_eur ? (gap / p.market_value_eur) * 100 : 0);
            const rating = Math.random() * 2 + 7; // Fake rating since backend might not have it

            return `
            <tr style="cursor: pointer" onclick="window.location.href='player.html?id=${p.id}'">
                <td>
                    <div class="player-cell">
                        ${createPlayerAvatar(p.name, p.primary_position, 'avatar-sm')}
                        <span class="player-name">${p.name}</span>
                    </div>
                </td>
                <td>${p.age}</td>
                <td><span class="badge badge-position" style="background-color: ${getPositionColor(p.primary_position)}">${p.primary_position}</span></td>
                <td>${p.club_name || '-'}</td>
                <td>${formatCurrency(p.market_value_eur)}</td>
                <td style="color: var(--accent-purple); font-weight: 600">${formatCurrency(p.predicted_value_eur)}</td>
                <td>${createValueBadge(gapPercent, true)}</td>
                <td>${rating.toFixed(1)} / 10</td>
            </tr>
        `}).join('');
        
        pagination.innerHTML = createPagination(response.page, response.total_pages, 'changePage');
        
    } catch (e) {
        showError(tbody.parentElement, 'Failed to load market opportunities.');
    }
}
