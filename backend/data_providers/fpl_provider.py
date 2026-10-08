"""
Fantasy Premier League (FPL) official API adapter.
Free, official, live data for Premier League players.
No API key required.
"""
import requests
import time
from typing import List, Dict, Any
from backend.data_providers.base import BaseDataProvider

class FPLProvider(BaseDataProvider):
    BASE_URL = "https://fantasy.premierleague.com/api/bootstrap-static/"

    def __init__(self, timeout: int = 10, max_retries: int = 3):
        self.timeout = timeout
        self.max_retries = max_retries
        self._cached_data = None
        self._cache_time = 0

    def get_provider_name(self) -> str:
        return "Official Fantasy Premier League (FPL) API"

    def is_available(self) -> bool:
        try:
            r = requests.get(self.BASE_URL, timeout=3)
            return r.status_code == 200
        except Exception:
            return False

    def _get_bootstrap_data(self) -> Dict[str, Any]:
        # Cache for 15 minutes in-memory
        if self._cached_data and (time.time() - self._cache_time < 900):
            return self._cached_data

        for attempt in range(self.max_retries):
            try:
                resp = requests.get(self.BASE_URL, timeout=self.timeout)
                if resp.status_code == 200:
                    self._cached_data = resp.json()
                    self._cache_time = time.time()
                    return self._cached_data
                elif resp.status_code == 429:
                    time.sleep(2 ** attempt)
            except requests.RequestException:
                time.sleep(2 ** attempt)

        if self._cached_data:
            return self._cached_data
        raise RuntimeError("Failed to fetch live data from Fantasy Premier League API")

    def fetch_players(self, league_id: str = "GB1") -> List[Dict[str, Any]]:
        if league_id != "GB1":
            return []

        data = self._get_bootstrap_data()
        teams = {t["id"]: t["name"] for t in data.get("teams", [])}
        element_types = {et["id"]: et["singular_name_short"] for et in data.get("element_types", [])}

        pos_map = {
            "GKP": "GK",
            "DEF": "CB", # Generic fallback, will match sub-position from TM
            "MID": "CM",
            "FWD": "ST"
        }

        players = []
        for el in data.get("elements", []):
            team_name = teams.get(el["team"], "Unknown")
            pos_label = element_types.get(el["element_type"], "MID")
            standard_pos = pos_map.get(pos_label, "CM")

            # FPL prices are in tenths of millions GBP (e.g. 150 = £15.0m)
            # Roughly convert FPL value to realistic market value baseline (€)
            # E.g. £15.0m in FPL -> ~€18m market value
            fpl_cost = el.get("now_cost", 50) / 10.0 # in £M
            estimated_mv = round(fpl_cost * 1_200_000, -5)

            # Performance stats
            minutes = el.get("minutes", 0)
            goals = el.get("goals_scored", 0)
            assists = el.get("assists", 0)
            clean_sheets = el.get("clean_sheets", 0)

            # Expected stats
            xg = float(el.get("expected_goals", 0.0) or 0.0)
            xa = float(el.get("expected_assists", 0.0) or 0.0)

            # Creativity and Threat proxy metrics
            creativity = float(el.get("creativity", 0.0) or 0.0)
            threat = float(el.get("threat", 0.0) or 0.0)
            shots_est = round(threat / 15.0, 1)
            kp_est = round(creativity / 12.0, 1)

            first_name = el.get("first_name", "")
            second_name = el.get("second_name", "")
            web_name = el.get("web_name", "")
            full_name = f"{first_name} {second_name}".strip() or web_name

            players.append({
                "external_id": str(el["id"]),
                "name": full_name,
                "web_name": web_name,
                "first_name": first_name,
                "second_name": second_name,
                "position": standard_pos,
                "club_name": team_name,
                "league_id": "GB1",
                "market_value_eur": estimated_mv,
                "minutes": minutes,
                "appearances": el.get("starts", 0) or (1 if minutes > 0 else 0),
                "goals": goals,
                "assists": assists,
                "xg": xg,
                "xa": xa,
                "shots": shots_est,
                "key_passes": kp_est,
                "tackles": 0.0,
                "interceptions": 0.0,
                "clean_sheets": clean_sheets,
                "raw_fpl": {
                    "form": el.get("form"),
                    "total_points": el.get("total_points"),
                    "selected_by_percent": el.get("selected_by_percent"),
                    "status": el.get("status")
                }
            })

        return players
