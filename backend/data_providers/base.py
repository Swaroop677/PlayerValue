"""
Abstract Data Provider Interface for Football Analytics.
"""
from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional

class BaseDataProvider(ABC):
    @abstractmethod
    def get_provider_name(self) -> str:
        """Name of the data provider."""
        pass

    @abstractmethod
    def fetch_players(self, league_id: str) -> List[Dict[str, Any]]:
        """
        Fetch players for a league.
        Returns a list of standardized player dicts:
        {
            "external_id": str,
            "name": str,
            "dob": Optional[str],
            "age": Optional[int],
            "nationality": str,
            "position": str, # GK, CB, LB, RB, DM, CM, AM, LW, RW, ST, etc.
            "club_name": str,
            "league_id": str,
            "market_value_eur": Optional[float],
            "minutes": int,
            "appearances": int,
            "goals": int,
            "assists": int,
            "xg": float,
            "xa": float,
            "shots": float,
            "key_passes": float,
            "tackles": float,
            "interceptions": float,
            "clean_sheets": int
        }
        """
        pass

    @abstractmethod
    def is_available(self) -> bool:
        """Check if provider connection/data source is accessible."""
        pass
