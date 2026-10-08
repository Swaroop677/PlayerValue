"""
Unified Data Manager combining live FPL data and authentic Transfermarkt/FBref records.
Handles caching, normalization, merging, and refreshing.
"""
import os
import json
import logging
from typing import List, Dict, Any, Optional
from datetime import datetime

from backend.data_providers.fpl_provider import FPLProvider
from backend.data_providers.transfermarkt_provider import TransfermarktFBrefProvider

logger = logging.getLogger(__name__)

class DataManager:
    def __init__(self, config_path: str = "config/leagues.json"):
        self.config_path = config_path
        self.config = self._load_config()
        self.fpl_provider = FPLProvider()
        self.tm_provider = TransfermarktFBrefProvider()

    def _load_config(self) -> Dict[str, Any]:
        if os.path.exists(self.config_path):
            with open(self.config_path, "r", encoding="utf-8") as f:
                return json.load(f)
        return {"leagues": [{"id": "GB1", "name": "Premier League", "enabled": True}]}

    def get_enabled_leagues(self) -> List[Dict[str, Any]]:
        return [l for l in self.config.get("leagues", []) if l.get("enabled", False)]

    def get_all_leagues(self) -> List[Dict[str, Any]]:
        return self.config.get("leagues", [])

    def fetch_live_league_players(self, league_id: str = "GB1") -> List[Dict[str, Any]]:
        """
        Fetches live players. If league is Premier League (GB1), integrates live FPL stats
        with Transfermarkt market values and bio data.
        """
        tm_players = self.tm_provider.fetch_players(league_id)

        # If Premier League, enhance with live FPL stats
        if league_id == "GB1" and self.fpl_provider.is_available():
            try:
                fpl_players = self.fpl_provider.fetch_players("GB1")
                fpl_dict = {}
                for fp in fpl_players:
                    fpl_dict[fp["name"].lower()] = fp
                    if fp.get("web_name"):
                        fpl_dict[fp["web_name"].lower()] = fp

                # Match and enhance TM players
                for p in tm_players:
                    p_name = p["name"].lower()
                    last_name = p.get("last_name", "").lower()

                    match = fpl_dict.get(p_name) or (fpl_dict.get(last_name) if last_name else None)
                    if match:
                        p["minutes"] = match["minutes"]
                        p["appearances"] = match["appearances"]
                        p["goals"] = match["goals"]
                        p["assists"] = match["assists"]
                        p["xg"] = match["xg"]
                        p["xa"] = match["xa"]
                        p["shots"] = match["shots"]
                        p["key_passes"] = match["key_passes"]
                        p["clean_sheets"] = match["clean_sheets"]
                        p["fpl_points"] = match["raw_fpl"]["total_points"]
                        p["fpl_form"] = match["raw_fpl"]["form"]
                        p["is_live"] = True
            except Exception as e:
                logger.warning(f"Live FPL data integration skipped: {e}")

        return tm_players
