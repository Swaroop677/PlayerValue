let filters = { page: 1, page_size: 20 };
let selectedPlayers = [];

document.addEventListener('DOMContentLoaded', () => {
    initPage('scouting');
    document.getElementById('breadcrumbs-container').innerHTML = createBreadcrumbs([
        { label: 'Dashboard', url: 'index.html' },
        { label: 'Scouting', url: '#' }
    ]);
    loadData();
});

window.applyFilters = () => {
    filters = { page: 1, page_size: 20 };
    const mappings = {
        's-position': 'position',
        's-min-age': 'min_age',
        's-max-age': 'max_age',
        's-max-value': 'max_value',
        's-min-mins': 'min_minutes',
        's-min-goals': 'min_goals',
        's-min-assists': 'min_assists',
        's-min-prog-p': 'min_prog_passes',
        's-min-tackles': 'min_tackles'
    };

    for (let id in mappings) {
        const val = document.getElementById(id).value;
        if (val) {
            if (id === 's-max-value') filters[mappings[id]] = parseFloat(val) * 1000000;
            else filters[mappings[id]] = val;
        }
    }
    loadData();
};

window.resetFilters = () => {
    document.querySelectorAll('.filter-input').forEach(el => el.value = '');
    applyFilters();
};

window.changePage = (page) => {
    filters.page = page;
    loadData();
};

window.toggleSelection = (id) => {
    const idx = selectedPlayers.indexOf(id);
    if (idx > -1) {
        selectedPlayers.splice(idx, 1);
    } else {
        if (selectedPlayers.length >= 3) {
            alert('You can only compare up to 3 players at once.');
            document.getElementById(`chk-${id}`).checked = false;
            return;
        }
        selectedPlayers.push(id);
    }
    updateCompareBtn();
};

function updateCompareBtn() {
    const btn = document.getElementById('btn-compare');
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
    tbody.innerHTML = Array(10).fill(createSkeleton('table-row')).join('');
    
    try {
        const response = await getScouting(filters);
        
        if (response.items.length === 0) {
            tbody.innerHTML = `<tr><td colspan="7" class="text-center" style="padding: 40px">No players match the criteria.</td></tr>`;
            pagination.innerHTML = '';
            return;
        }

        tbody.innerHTML = response.items.map(p => `
            <tr>
                <td class="checkbox-cell">
                    <input type="checkbox" id="chk-${p.id}" ${selectedPlayers.includes(p.id) ? 'checked' : ''} onchange="toggleSelection('${p.id}')">
                </td>
                <td>
                    <div class="player-cell" style="cursor: pointer" onclick="window.location.href='player.html?id=${p.id}'">
                        ${createPlayerAvatar(p.name, p.primary_position, 'avatar-sm')}
                        <div class="player-info">
                            <span class="player-name">${p.name}</span>
                        </div>
                    </div>
                </td>
                <td>${p.age}</td>
                <td><span class="badge badge-position" style="background-color: ${getPositionColor(p.primary_position)}">${p.primary_position}</span></td>
                <td>${p.club_name || '-'}</td>
                <td>${formatCurrency(p.market_value_eur)}</td>
                <td style="color: var(--accent-purple)">${formatCurrency(p.predicted_value_eur)}</td>
            </tr>
        `).join('');
        
        pagination.innerHTML = createPagination(response.page, response.total_pages, 'changePage');
        
    } catch (e) {
        showError(tbody.parentElement, 'Failed to load scouting data');
    }
}
