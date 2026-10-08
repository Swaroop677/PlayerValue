let currentFilters = { page: 1, sort_by: 'market_value_eur', sort_dir: 'desc' };

document.addEventListener('DOMContentLoaded', async () => {
    initPage('players');

    document.getElementById('breadcrumbs-container').innerHTML = createBreadcrumbs([
        { label: 'Dashboard', url: 'index.html' },
        { label: 'Players', url: '#' }
    ]);

    // Load selects
    try {
        const [leagues, clubs] = await Promise.all([getLeagues(), getClubs()]);
        const leagueSelect = document.getElementById('f-league');
        const clubSelect = document.getElementById('f-club');
        
        leagues.forEach(l => leagueSelect.insertAdjacentHTML('beforeend', `<option value="${l.id}">${l.name}</option>`));
        clubs.forEach(c => clubSelect.insertAdjacentHTML('beforeend', `<option value="${c.id}">${c.name}</option>`));
    } catch (e) { console.error('Failed to load filters', e); }

    // Init from URL
    const urlParams = new URLSearchParams(window.location.search);
    ['name', 'position', 'league_id', 'club_id', 'min_age', 'max_age'].forEach(key => {
        if (urlParams.has(key)) {
            currentFilters[key] = urlParams.get(key);
            const input = document.getElementById(`f-${key.replace('_id', '')}`);
            if (input) input.value = currentFilters[key];
        }
    });

    if (urlParams.has('page')) currentFilters.page = parseInt(urlParams.get('page'));

    setupEventListeners();
    loadData();
});

function setupEventListeners() {
    const inputs = ['f-name', 'f-min-age', 'f-max-age'];
    inputs.forEach(id => {
        document.getElementById(id).addEventListener('input', debounce((e) => {
            updateFilter(id.replace('f-', '').replace('-', '_'), e.target.value);
        }, 300));
    });

    const selects = ['f-position', 'f-league', 'f-club'];
    selects.forEach(id => {
        document.getElementById(id).addEventListener('change', (e) => {
            const key = id === 'f-league' ? 'league_id' : id === 'f-club' ? 'club_id' : id.replace('f-', '');
            updateFilter(key, e.target.value);
        });
    });
}

function updateFilter(key, value) {
    currentFilters[key] = value;
    currentFilters.page = 1;
    setUrlParams(currentFilters);
    loadData();
}

window.toggleSort = function(column) {
    if (currentFilters.sort_by === column) {
        currentFilters.sort_dir = currentFilters.sort_dir === 'asc' ? 'desc' : 'asc';
    } else {
        currentFilters.sort_by = column;
        currentFilters.sort_dir = 'desc';
    }
    
    document.querySelectorAll('.sort-icon').forEach(el => el.innerHTML = '');
    document.getElementById(`sort-${column}`).innerHTML = currentFilters.sort_dir === 'asc' ? '▲' : '▼';
    
    currentFilters.page = 1;
    setUrlParams(currentFilters);
    loadData();
}

window.changePage = function(page) {
    currentFilters.page = page;
    setUrlParams(currentFilters);
    loadData();
}

async function loadData() {
    const tbody = document.getElementById('players-tbody');
    const pagination = document.getElementById('pagination-container');
    
    tbody.innerHTML = Array(10).fill(createSkeleton('table-row')).join('');
    
    try {
        const response = await getPlayers(currentFilters);
        
        if (response.items.length === 0) {
            tbody.innerHTML = `<tr><td colspan="8" class="text-center" style="padding: 40px">No players found matching your filters.</td></tr>`;
            pagination.innerHTML = '';
            return;
        }

        tbody.innerHTML = response.items.map(p => createPlayerRow(p)).join('');
        pagination.innerHTML = createPagination(response.page, response.total_pages, 'changePage');
        
    } catch (error) {
        showError(tbody.parentElement, 'Failed to load players data');
    }
}
