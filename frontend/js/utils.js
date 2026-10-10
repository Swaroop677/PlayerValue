/**
 * Utility functions for formatting, avatars, URL parameters and pagination
 * Uses clean CSS classes and design tokens with zero hardcoded colors.
 */

function formatCurrency(value) {
    if (value === null || value === undefined) return '-';
    if (value === 0) return '€0';
    if (value >= 1000000000) {
        return '€' + (value / 1000000000).toFixed(2) + 'B';
    }
    if (value >= 1000000) {
        return '€' + (value / 1000000).toFixed(1) + 'M';
    }
    if (value >= 1000) {
        return '€' + (value / 1000).toFixed(0) + 'K';
    }
    return '€' + Math.round(value).toLocaleString();
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
    const num = Number(value);
    const formatted = num.toFixed(1) + '%';
    if (showSign && num > 0) return '+' + formatted;
    return formatted;
}

function formatDate(dateStr) {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

function debounce(fn, ms = 250) {
    let timeoutId;
    return function (...args) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => fn.apply(this, args), ms);
    };
}

function getPositionCategory(pos) {
    if (!pos) return 'fwd';
    const p = pos.toUpperCase();
    if (p === 'GK') return 'gk';
    if (['CB', 'FB', 'LB', 'RB', 'DEF'].includes(p)) return 'def';
    if (['DM', 'CM', 'AM', 'LM', 'RM', 'MID'].includes(p)) return 'mid';
    return 'fwd'; // ST, CF, LW, RW, W, ATT
}

function getPositionBadgeClass(pos) {
    const cat = getPositionCategory(pos);
    return `badge badge-pos-${cat}`;
}

function getPositionLabel(pos) {
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
    return labels[pos] || pos || 'Unknown';
}

function getInitials(name) {
    if (!name) return '?';
    return name.split(' ').filter(Boolean).map(n => n[0]).slice(0, 2).join('').toUpperCase();
}

function createPlayerAvatar(name, position, sizeClass = '') {
    const initials = getInitials(name);
    return `<div class="player-avatar ${sizeClass}">${initials}</div>`;
}

function getUrlParam(name) {
    const params = new URLSearchParams(window.location.search);
    return params.get(name);
}

function setUrlParams(params) {
    const url = new URL(window.location);
    Object.keys(params).forEach(key => {
        if (params[key] === null || params[key] === '' || params[key] === undefined) {
            url.searchParams.delete(key);
        } else {
            url.searchParams.set(key, params[key]);
        }
    });
    window.history.replaceState({}, '', url);
}

function createSkeleton(type = 'card') {
    if (type === 'card') {
        return `<div class="card skeleton" style="height: 160px; margin-bottom: 16px;"></div>`;
    }
    if (type === 'table-row') {
        return `
            <tr>
                <td><div class="skeleton" style="height: 20px; width: 140px;"></div></td>
                <td><div class="skeleton" style="height: 20px; width: 32px;"></div></td>
                <td><div class="skeleton" style="height: 20px; width: 44px;"></div></td>
                <td><div class="skeleton" style="height: 20px; width: 90px;"></div></td>
                <td><div class="skeleton" style="height: 20px; width: 50px;"></div></td>
                <td><div class="skeleton" style="height: 20px; width: 70px;"></div></td>
                <td><div class="skeleton" style="height: 20px; width: 70px;"></div></td>
                <td><div class="skeleton" style="height: 20px; width: 85px;"></div></td>
            </tr>
        `;
    }
    return `<div class="skeleton" style="height: 20px; width: 100%;"></div>`;
}

function createPagination(currentPage, totalPages, onPageChangeName) {
    if (totalPages <= 1) return '';
    let html = '<div class="pagination">';
    
    html += `<button class="page-btn" ${currentPage === 1 ? 'disabled' : ''} onclick="${onPageChangeName}(${currentPage - 1})" aria-label="Previous page">&lt;</button>`;
    
    const start = Math.max(1, currentPage - 2);
    const end = Math.min(totalPages, start + 4);
    
    if (start > 1) {
        html += `<button class="page-btn" onclick="${onPageChangeName}(1)">1</button>`;
        if (start > 2) html += `<span style="padding: 0 4px; color: var(--color-ink-muted);">...</span>`;
    }
    
    for (let i = start; i <= end; i++) {
        html += `<button class="page-btn ${i === currentPage ? 'active' : ''}" onclick="${onPageChangeName}(${i})">${i}</button>`;
    }
    
    if (end < totalPages) {
        if (end < totalPages - 1) html += `<span style="padding: 0 4px; color: var(--color-ink-muted);">...</span>`;
        html += `<button class="page-btn" onclick="${onPageChangeName}(${totalPages})">${totalPages}</button>`;
    }
    
    html += `<button class="page-btn" ${currentPage === totalPages ? 'disabled' : ''} onclick="${onPageChangeName}(${currentPage + 1})" aria-label="Next page">&gt;</button>`;
    html += '</div>';
    
    return html;
}

function showError(container, message) {
    container.innerHTML = `
        <div class="empty-state">
            <div class="empty-state-icon">⚠️</div>
            <h3 class="empty-state-title">Something went sideways</h3>
            <p class="empty-state-desc">${message || "We couldn't load this data right now."}</p>
            <button class="btn btn-secondary btn-sm" onclick="window.location.reload()">Give it another shot</button>
        </div>
    `;
}

function showEmpty(container, message = "No players match. Try loosening a filter.") {
    container.innerHTML = `
        <div class="empty-state">
            <div class="empty-state-icon">🔍</div>
            <h3 class="empty-state-title">Nothing here yet</h3>
            <p class="empty-state-desc">${message}</p>
        </div>
    `;
}

function showLoading(container, type = 'card', count = 4) {
    container.innerHTML = Array(count).fill(0).map(() => createSkeleton(type)).join('');
}
