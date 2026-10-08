const API_BASE = '/api';

async function fetchAPI(endpoint, params = {}) {
    const url = new URL(API_BASE + endpoint, window.location.origin);
    
    Object.keys(params).forEach(key => {
        if (params[key] !== null && params[key] !== undefined && params[key] !== '') {
            url.searchParams.append(key, params[key]);
        }
    });

    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`API Error: ${response.status} ${response.statusText}`);
        }
        return await response.json();
    } catch (error) {
        console.error('API Fetch Error:', error);
        throw error;
    }
}

async function getDashboard() {
    return fetchAPI('/dashboard');
}

async function getPlayers(filters = {}) {
    return fetchAPI('/players', filters);
}

async function getPlayer(id) {
    return fetchAPI(`/players/${id}`);
}

async function getPlayerStats(id) {
    return fetchAPI(`/players/${id}/stats`);
}

async function getPlayerMarketValues(id) {
    return fetchAPI(`/players/${id}/market-values`);
}

async function getPlayerTransfers(id) {
    return fetchAPI(`/players/${id}/transfers`);
}

async function getPlayerPrediction(id) {
    return fetchAPI(`/players/${id}/prediction`);
}

async function getSimilarPlayers(id, filters = {}) {
    return fetchAPI(`/players/${id}/similar`, filters);
}

async function getClubs() {
    return fetchAPI('/clubs');
}

async function getClub(id) {
    return fetchAPI(`/clubs/${id}`);
}

async function getLeagues() {
    return fetchAPI('/leagues');
}

async function getScouting(filters = {}) {
    return fetchAPI('/scouting', filters);
}

async function getMarketOpportunities(filters = {}) {
    return fetchAPI('/market-opportunities', filters);
}

async function getModelMetrics() {
    return fetchAPI('/model/metrics');
}
