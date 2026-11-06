"""
Scouting service — advanced player filtering for the scouting interface
and market opportunities (undervalued player) discovery.
"""
from sqlalchemy.orm import Session
from typing import Dict, Any

from backend.services.player_service import get_players


def get_scouting_results(db: Session, filters: Dict[str, Any], page: int = 1, page_size: int = 20,
                         sort_by: str = "market_value_eur", sort_dir: str = "desc"):
    """
    Advanced scouting search that supports all stat-based filters.
    
    Delegates to get_players which already handles per-90 stat filters,
    age, position, league, club, value ranges, etc.
    """
    return get_players(db, filters, page=page, page_size=page_size,
                       sort_by=sort_by, sort_dir=sort_dir)


def get_market_opportunities(db: Session, filters: Dict[str, Any], page: int = 1, page_size: int = 20):
    """
    Find players whose model-implied value exceeds their current market value.
    
    Default min_minutes to 900 to eliminate noisy rate-stat distortions from small samples.
    """
    if "min_gap_percent" not in filters or filters["min_gap_percent"] is None:
        filters["min_gap_percent"] = 0.01  # At least slightly undervalued

    if "min_minutes" not in filters or filters["min_minutes"] is None:
        filters["min_minutes"] = 900  # Default 900 minutes (full season regular)
    
    return get_players(db, filters, page=page, page_size=page_size,
                       sort_by="value_gap_percent", sort_dir="desc")
