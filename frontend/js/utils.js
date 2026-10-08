function formatCurrency(value) {
    if (value === null || value === undefined) return '-';
    if (value === 0) return '€0';
    if (value >= 1000000) {
        return '€' + (value / 1000000).toFixed(1) + 'M';
    }
    if (value >= 1000) {
        return '€' + (value / 1000).toFixed(0) + 'K';
    }
    return '€' + value;
}

function formatNumber(value, decimals = 0) {
    if (value === null || value === undefined) return '-';
    return Number(value).toLocaleString(undefined, {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
    });
}

function formatPercent(value, showSign = true) {
    if (value === null || value === undefined) return '-';
    const formatted = Number(value).toFixed(1) + '%';
    if (showSign && value > 0) return '+' + formatted;
    return formatted;
}

function formatDate(dateStr) {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

function debounce(fn, ms) {
    let timeoutId;
    return function (...args) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => fn.apply(this, args), ms);
    };
}

const POSITION_COLORS = {
    'GK': '#eab308',
    'CB': '#3b82f6',
    'FB': '#60a5fa',
    'LB': '#60a5fa',
    'RB': '#60a5fa',
    'DM': '#10b981',
    'CM': '#34d399',
    'AM': '#a78bfa',
    'LM': '#c084fc',
    'RM': '#c084fc',
    'W': '#f97316',
    'LW': '#f43f5e',
    'RW': '#f43f5e',
    'ST': '#ef4444',
    'CF': '#ef4444'
};

function getPositionColor(position) {
    return POSITION_COLORS[position] || '#9ca3af';
}

function getPositionLabel(position) {
    const labels = {
        'GK': 'Goalkeeper',
        'CB': 'Centre-Back',
        'FB': 'Full-Back',
        'LB': 'Left-Back',
        'RB': 'Right-Back',
        'DM': 'Defensive Midfield',
        'CM': 'Central Midfield',
        'AM': 'Attacking Midfield',
        'LM': 'Left Midfield',
        'RM': 'Right Midfield',
        'W': 'Winger',
        'LW': 'Left Winger',
        'RW': 'Right Winger',
        'ST': 'Striker',
        'CF': 'Center Forward'
    };
    return labels[position] || position;
}

function getInitials(name) {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
}

function createPlayerAvatar(name, position, sizeClass = 'avatar-md') {
    const color = getPositionColor(position);
    const initials = getInitials(name);
    return `<div class="player-avatar ${sizeClass}" style="background-color: ${color}">${initials}</div>`;
}

function getUrlParam(name) {
    const params = new URLSearchParams(window.location.search);
    return params.get(name);
}

function setUrlParams(params) {
    const url = new URL(window.location);
    Object.keys(params).forEach(key => {
        if (params[key] === null || params[key] === '') {
            url.searchParams.delete(key);
        } else {
            url.searchParams.set(key, params[key]);
        }
    });
    window.history.pushState({}, '', url);
}

function createSkeleton(type) {
    if (type === 'card') {
        return `<div class="card skeleton-card skeleton"></div>`;
    }
    if (type === 'table-row') {
        return `
            <tr>
                <td><div class="skeleton-text"></div></td>
                <td><div class="skeleton-text"></div></td>
                <td><div class="skeleton-text"></div></td>
                <td><div class="skeleton-text"></div></td>
                <td><div class="skeleton-text"></div></td>
            </tr>
        `;
    }
    return `<div class="skeleton-text"></div>`;
}

function createPagination(currentPage, totalPages, onPageChangeName) {
    if (totalPages <= 1) return '';
    let html = '<div class="pagination">';
    
    html += `<button class="page-btn" ${currentPage === 1 ? 'disabled' : ''} onclick="${onPageChangeName}(${currentPage - 1})">&lt;</button>`;
    
    const start = Math.max(1, currentPage - 2);
    const end = Math.min(totalPages, start + 4);
    
    for (let i = start; i <= end; i++) {
        html += `<button class="page-btn ${i === currentPage ? 'active' : ''}" onclick="${onPageChangeName}(${i})">${i}</button>`;
    }
    
    html += `<button class="page-btn" ${currentPage === totalPages ? 'disabled' : ''} onclick="${onPageChangeName}(${currentPage + 1})">&gt;</button>`;
    html += '</div>';
    
    return html;
}

function showError(container, message) {
    container.innerHTML = `<div class="error-state">
        <strong>Error:</strong> ${message}
    </div>`;
}

function showEmpty(container, message) {
    container.innerHTML = `<div class="empty-state">
        <div class="empty-icon">📭</div>
        <h3>No Data Found</h3>
        <p>${message}</p>
    </div>`;
}

function showLoading(container, type = 'card', count = 4) {
    container.innerHTML = Array(count).fill(0).map(() => createSkeleton(type)).join('');
}
