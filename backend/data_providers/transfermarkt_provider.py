"""
Transfermarkt + FBref dataset provider.
Reads authentic real-world data from the provided Kaggle archive folders.
Provides multi-season history, actual market values in EUR, and FBref per-90 metrics.
"""
import os
import pandas as pd
from typing import List, Dict, Any, Optional
from unidecode import unidecode
from backend.data_providers.base import BaseDataProvider

class TransfermarktFBrefProvider(BaseDataProvider):
    def __init__(self, data_dir: str = "data"):
        self.tm_dir = os.path.join(data_dir, "archive (2)")
        self.fb_dir = os.path.join(data_dir, "archive (1)")

    def get_provider_name(self) -> str:
        return "Transfermarkt & FBref Authentic Dataset"

    def is_available(self) -> bool:
        return (
            os.path.exists(os.path.join(self.tm_dir, "players.csv")) and
            os.path.exists(os.path.join(self.tm_dir, "player_valuations.csv"))
        )

    def fetch_players(self, league_id: str) -> List[Dict[str, Any]]:
        if not self.is_available():
            return []

        players_csv = os.path.join(self.tm_dir, "players.csv")
        clubs_csv = os.path.join(self.tm_dir, "clubs.csv")

        players_df = pd.read_csv(players_csv)
        clubs_df = pd.read_csv(clubs_csv)
        club_name_map = dict(zip(clubs_df["club_id"], clubs_df["name"]))

        filtered = players_df[
            (players_df["current_club_domestic_competition_id"] == league_id) &
            (players_df["market_value_in_eur"].notna()) &
            (players_df["market_value_in_eur"] > 0)
        ]

        pos_map = {
            'Goalkeeper': 'GK',
            'Centre-Back': 'CB',
            'Left-Back': 'LB',
            'Right-Back': 'RB',
            'Defensive Midfield': 'DM',
            'Central Midfield': 'CM',
            'Attacking Midfield': 'AM',
            'Left Midfield': 'LM',
            'Right Midfield': 'RM',
            'Left Winger': 'LW',
            'Right Winger': 'RW',
            'Centre-Forward': 'ST',
            'Second Striker': 'CF'
        }

        results = []
        for _, row in filtered.iterrows():
            sub_pos = str(row.get("sub_position", ""))
            main_pos = str(row.get("position", ""))
            pos = pos_map.get(sub_pos)
            if not pos:
                if main_pos == 'Attack': pos = 'ST'
                elif main_pos == 'Midfield': pos = 'CM'
                elif main_pos == 'Defender': pos = 'CB'
                elif main_pos == 'Goalkeeper': pos = 'GK'
                else: pos = 'CM'

            c_id = row.get("current_club_id")
            club_name = club_name_map.get(c_id, row.get("current_club_name", "Unknown"))

            dob = str(row.get("date_of_birth", ""))
            if " " in dob:
                dob = dob.split(" ")[0]

            results.append({
                "external_id": str(row["player_id"]),
                "name": str(row["name"]),
                "first_name": str(row.get("first_name", "")),
                "last_name": str(row.get("last_name", "")),
                "dob": dob,
                "nationality": str(row.get("country_of_citizenship", "Unknown")),
                "position": pos,
                "sub_position": sub_pos,
                "club_id": c_id,
                "club_name": club_name,
                "league_id": league_id,
                "height_cm": int(row["height_in_cm"]) if pd.notna(row.get("height_in_cm")) else None,
                "preferred_foot": str(row.get("foot", "")).capitalize() if pd.notna(row.get("foot")) else None,
                "market_value_eur": float(row["market_value_in_eur"])
            })

        return results
