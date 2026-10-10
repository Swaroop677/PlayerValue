/**
 * PlayerValue API Client with Client-Side Caching & Prefetching
 */

// API Base URL (configurable for cloud deployments, defaults to relative /api)
const API_BASE = window.__API_BASE__ || localStorage.getItem('playervalue_api_base') || '/api';

// In-memory cache for API requests with 3-minute stale TTL
const apiCache = new Map();
const CACHE_TTL_MS = 180000;

async function fetchAPI(endpoint, params = {}, options = {}) {
    const url = new URL(API_BASE + endpoint, window.location.origin);
    
    Object.keys(params).forEach(key => {
        if (params[key] !== null && params[key] !== undefined && params[key] !== '') {
            url.searchParams.append(key, params[key]);
        }
    });

    const cacheKey = url.toString();
    const useCache = options.cache !== false;

    if (useCache && apiCache.has(cacheKey)) {
        const cached = apiCache.get(cacheKey);
        if (Date.now() - cached.timestamp < CACHE_TTL_MS) {
            return cached.data;
        }
        apiCache.delete(cacheKey);
    }

    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`API Error: ${response.status} ${response.statusText}`);
        }
        const data = await response.json();
        if (useCache) {
            apiCache.set(cacheKey, { timestamp: Date.now(), data });
        }
        return data;
    } catch (error) {
        console.error('API Fetch Error:', error);
        throw error;
    }
}

// Prefetch player details into cache on hover
const prefetchedSet = new Set();
function prefetchPlayer(id) {
    if (!id || prefetchedSet.has(id)) return;
    prefetchedSet.add(id);
    fetchAPI(`/players/${id}`).catch(() => {});
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
