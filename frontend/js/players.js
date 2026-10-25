/**
 * Player Database Logic: Filters, Search, Debounce, List/Card View, and URL Sync
 */

let currentFilters = {
    page: 1,
    page_size: 20,
    sort_by: 'market_value_eur',
    sort_dir: 'desc'
};

let currentView = localStorage.getItem('playervalue_view_mode') || 'list';
let leaguesList = [];
let clubsList = [];

document.addEventListener('DOMContentLoaded', async () => {
    initPage('players');

    document.getElementById('breadcrumbs-container').innerHTML = createBreadcrumbs([
        { label: 'Dashboard', url: 'index.html' },
        { label: 'Players', url: '#' }
    ]);

    // Apply stored view mode (list or grid)
    setViewMode(currentView);

    // Load filter options (Leagues and Clubs)
    try {
        const [leagues, clubs] = await Promise.all([getLeagues(), getClubs()]);
        
        function getLeagueRank(name) {
            const n = (name || '').toLowerCase().replace(/[\s\-_]/g, '');
            if (n.includes('premier') || n === 'pl') return 0;
            if (n === 'laliga' || n === 'liga' || n.includes('laliga')) return 1;
            if (n.includes('bundesliga')) return 2;
            if (n.includes('seriea') || n.includes('serie')) return 3;
            if (n.includes('ligue1') || n.includes('ligue')) return 4;
            return 999;
        }

        leaguesList = (leagues || []).sort((a, b) => {
            const diff = getLeagueRank(a.name) - getLeagueRank(b.name);
            return diff !== 0 ? diff : (a.name || '').localeCompare(b.name || '');
        });
        clubsList = clubs || [];

        const leagueSelect = document.getElementById('f-league');
        const clubSelect = document.getElementById('f-club');

        leaguesList.forEach(l => {
            leagueSelect.insertAdjacentHTML('beforeend', `<option value="${l.id}">${l.name}</option>`);
        });

        clubsList.forEach(c => {
            clubSelect.insertAdjacentHTML('beforeend', `<option value="${c.id}">${c.name}</option>`);
        });
    } catch (e) {
        console.warn('Could not populate filter selects:', e);
    }

    // Read initial filters from URL params
    const urlParams = new URLSearchParams(window.location.search);
    ['name', 'position', 'league_id', 'club_id', 'valuation_status', 'sort_by', 'sort_dir', 'page'].forEach(key => {
        if (urlParams.has(key)) {
            const val = urlParams.get(key);
            if (key === 'page') {
                currentFilters.page = parseInt(val) || 1;
            } else if (key === 'sort_by') {
                currentFilters.sort_by = val;
                const el = document.getElementById('f-sort-by');
                if (el) el.value = val;
            } else if (key === 'sort_dir') {
                currentFilters.sort_dir = val;
                updateSortDirButton();
            } else {
                currentFilters[key] = val;
                const input = document.getElementById(`f-${key.replace('_id', '')}`);
                if (input) input.value = val;
            }
        }
    });

    setupEventListeners();
    updateActiveFilterChips();
    loadPlayers();
});

function setupEventListeners() {
    // Search input debounced to 250ms
    const nameInput = document.getElementById('f-name');
    const clearBtn = document.getElementById('search-clear-btn');

    nameInput.addEventListener('input', debounce((e) => {
        const val = e.target.value.trim();
        clearBtn.style.display = val ? 'block' : 'none';
        updateFilter('name', val || null);
    }, 250));

    clearBtn.addEventListener('click', () => {
        nameInput.value = '';
        clearBtn.style.display = 'none';
        updateFilter('name', null);
    });

    if (nameInput.value.trim()) {
        clearBtn.style.display = 'block';
    }

    // Dropdowns
    const selects = [
        { id: 'f-position', key: 'position' },
        { id: 'f-league', key: 'league_id' },
        { id: 'f-club', key: 'club_id' },
        { id: 'f-valuation-status', key: 'valuation_status' }
    ];

    selects.forEach(({ id, key }) => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('change', (e) => {
                updateFilter(key, e.target.value || null);
            });
        }
    });

    // Sort dropdown
    const sortSelect = document.getElementById('f-sort-by');
    if (sortSelect) {
        sortSelect.addEventListener('change', (e) => {
            currentFilters.sort_by = e.target.value;
            currentFilters.page = 1;
            syncUrlAndReload();
        });
    }

    // Sort direction toggle button
    const sortDirBtn = document.getElementById('sort-dir-toggle');
    if (sortDirBtn) {
        sortDirBtn.addEventListener('click', () => {
            currentFilters.sort_dir = currentFilters.sort_dir === 'asc' ? 'desc' : 'asc';
            updateSortDirButton();
            currentFilters.page = 1;
            syncUrlAndReload();
        });
    }

    // Clear all filters button
    const clearAllBtn = document.getElementById('clear-all-filters');
    if (clearAllBtn) {
        clearAllBtn.addEventListener('click', clearAllFilters);
    }

    // View mode toggle buttons
    const listBtn = document.getElementById('view-list-btn');
    const gridBtn = document.getElementById('view-grid-btn');

    listBtn.addEventListener('click', () => setViewMode('list'));
    gridBtn.addEventListener('click', () => setViewMode('grid'));
}

function updateSortDirButton() {
    const icon = document.getElementById('sort-dir-icon');
    if (icon) {
        icon.textContent = currentFilters.sort_dir === 'asc' ? '▲ Asc' : '▼ Desc';
    }
}

function setViewMode(mode) {
    currentView = mode;
    localStorage.setItem('playervalue_view_mode', mode);

    const listBtn = document.getElementById('view-list-btn');
    const gridBtn = document.getElementById('view-grid-btn');
    const listView = document.getElementById('list-view-container');
    const gridView = document.getElementById('grid-view-container');

    if (mode === 'list') {
        listBtn.classList.add('active');
        gridBtn.classList.remove('active');
        listView.style.display = 'block';
        gridView.style.display = 'none';
    } else {
        gridBtn.classList.add('active');
        listBtn.classList.remove('active');
        listView.style.display = 'none';
        gridView.style.display = 'grid';
    }
}

function updateFilter(key, value) {
    if (value === null || value === '') {
        delete currentFilters[key];
    } else {
        currentFilters[key] = value;
    }
    currentFilters.page = 1;
    updateActiveFilterChips();
    syncUrlAndReload();
}

function clearAllFilters() {
    ['name', 'position', 'league_id', 'club_id', 'valuation_status'].forEach(k => delete currentFilters[k]);
    currentFilters.page = 1;

    document.getElementById('f-name').value = '';
    document.getElementById('search-clear-btn').style.display = 'none';
    document.getElementById('f-position').value = '';
    document.getElementById('f-league').value = '';
    document.getElementById('f-club').value = '';
    document.getElementById('f-valuation-status').value = '';

    updateActiveFilterChips();
    syncUrlAndReload();
}

function updateActiveFilterChips() {
    const container = document.getElementById('active-chips-container');
    const clearAllBtn = document.getElementById('clear-all-filters');
    if (!container) return;

    const chips = [];

    if (currentFilters.name) {
        chips.push({ key: 'name', label: `Name: "${currentFilters.name}"` });
    }
    if (currentFilters.position) {
        chips.push({ key: 'position', label: `Pos: ${currentFilters.position}` });
    }
    if (currentFilters.league_id) {
        const found = leaguesList.find(l => String(l.id) === String(currentFilters.league_id));
        chips.push({ key: 'league_id', label: `League: ${found ? found.name : currentFilters.league_id}` });
    }
    if (currentFilters.club_id) {
        const found = clubsList.find(c => String(c.id) === String(currentFilters.club_id));
        chips.push({ key: 'club_id', label: `Club: ${found ? found.name : currentFilters.club_id}` });
    }
    if (currentFilters.valuation_status) {
        const statusMap = { undervalued: 'Undervalued', fair: 'Fair Value', overvalued: 'Overvalued' };
        chips.push({ key: 'valuation_status', label: statusMap[currentFilters.valuation_status] || currentFilters.valuation_status });
    }

    if (chips.length > 0) {
        container.innerHTML = chips.map(c => `
            <div class="filter-chip">
                <span>${c.label}</span>
                <button class="filter-chip-remove" onclick="removeFilterChip('${c.key}')" aria-label="Remove filter">✕</button>
            </div>
        `).join('');
        if (clearAllBtn) clearAllBtn.style.display = 'inline-block';
    } else {
        container.innerHTML = '';
        if (clearAllBtn) clearAllBtn.style.display = 'none';
    }
}

window.removeFilterChip = function(key) {
    if (key === 'name') {
        document.getElementById('f-name').value = '';
        document.getElementById('search-clear-btn').style.display = 'none';
    } else {
        const el = document.getElementById(`f-${key.replace('_id', '')}`);
        if (el) el.value = '';
    }
    updateFilter(key, null);
};

window.toggleSortColumn = function(column) {
    if (currentFilters.sort_by === column) {
        currentFilters.sort_dir = currentFilters.sort_dir === 'asc' ? 'desc' : 'asc';
    } else {
        currentFilters.sort_by = column;
        currentFilters.sort_dir = 'desc';
    }
    const sortSelect = document.getElementById('f-sort-by');
    if (sortSelect) sortSelect.value = column;
    updateSortDirButton();
    currentFilters.page = 1;
    syncUrlAndReload();
};

window.changePage = function(newPage) {
    currentFilters.page = newPage;
    syncUrlAndReload();
    window.scrollTo({ top: 120, behavior: 'smooth' });
};

function syncUrlAndReload() {
    setUrlParams(currentFilters);
    loadPlayers();
}

async function loadPlayers() {
    const tbody = document.getElementById('players-tbody');
    const gridView = document.getElementById('grid-view-container');
    const stateContainer = document.getElementById('state-container');
    const pagination = document.getElementById('pagination-container');
    const liveCount = document.getElementById('live-player-count');

    // Show skeletons
    tbody.innerHTML = Array(8).fill(createSkeleton('table-row')).join('');
    gridView.innerHTML = Array(8).fill(createSkeleton('card')).join('');
    stateContainer.innerHTML = '';

    try {
        const response = await getPlayers(currentFilters);
        const players = response.items || [];
        const total = response.total || 0;

        // Update live result count
        liveCount.textContent = `${total.toLocaleString()} player${total === 1 ? '' : 's'}`;

        if (players.length === 0) {
            tbody.innerHTML = '';
            gridView.innerHTML = '';
            pagination.innerHTML = '';
            showEmpty(stateContainer, 'No players match your filters. Try clearing or relaxing some criteria.');
            return;
        }

        // Render List rows
        tbody.innerHTML = players.map(p => createPlayerRow(p)).join('');

        // Render Grid cards
        gridView.innerHTML = players.map(p => createPlayerCard(p)).join('');

        // Render Pagination
        pagination.innerHTML = createPagination(response.page, response.total_pages, 'changePage');

    } catch (error) {
        console.error('Failed to load players:', error);
        tbody.innerHTML = '';
        gridView.innerHTML = '';
        pagination.innerHTML = '';
        showError(stateContainer, 'Failed to connect to the player database.');
    }
}
