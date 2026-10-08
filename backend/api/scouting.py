"""
Scouting API routes — advanced player filtering and market opportunity discovery.
"""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional

from backend.database.database import get_db
from backend.services.scouting_service import get_scouting_results, get_market_opportunities

router = APIRouter(tags=["Scouting"])


@router.get("/scouting")
def api_get_scouting(
    name: Optional[str] = None,
    position: Optional[str] = None,
    min_age: Optional[int] = None,
    max_age: Optional[int] = None,
    league_id: Optional[int] = None,
    club_id: Optional[int] = None,
    nationality: Optional[str] = None,
    min_value: Optional[float] = None,
    max_value: Optional[float] = None,
    min_model_value: Optional[float] = None,
    max_model_value: Optional[float] = None,
    min_minutes: Optional[int] = None,
    min_goals_per_90: Optional[float] = None,
    min_assists_per_90: Optional[float] = None,
    min_xg_per_90: Optional[float] = None,
    min_xa_per_90: Optional[float] = None,
    min_progressive_passes_per_90: Optional[float] = None,
    min_progressive_carries_per_90: Optional[float] = None,
    min_tackles_per_90: Optional[float] = None,
    min_interceptions_per_90: Optional[float] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    sort_by: str = Query("market_value_eur"),
    sort_dir: str = Query("desc"),
    db: Session = Depends(get_db),
):
    filters = {
        "name": name,
        "position": position,
        "min_age": min_age,
        "max_age": max_age,
        "league_id": league_id,
        "club_id": club_id,
        "nationality": nationality,
        "min_value": min_value,
        "max_value": max_value,
        "min_model_value": min_model_value,
        "max_model_value": max_model_value,
        "min_minutes": min_minutes,
        "min_goals_per_90": min_goals_per_90,
        "min_assists_per_90": min_assists_per_90,
        "min_xg_per_90": min_xg_per_90,
        "min_xa_per_90": min_xa_per_90,
        "min_progressive_passes_per_90": min_progressive_passes_per_90,
        "min_progressive_carries_per_90": min_progressive_carries_per_90,
        "min_tackles_per_90": min_tackles_per_90,
        "min_interceptions_per_90": min_interceptions_per_90,
    }
    return get_scouting_results(db, filters, page=page, page_size=page_size,
                                sort_by=sort_by, sort_dir=sort_dir)


@router.get("/market-opportunities")
def api_get_market_opportunities(
    position: Optional[str] = None,
    min_age: Optional[int] = None,
    max_age: Optional[int] = None,
    league_id: Optional[int] = None,
    max_value: Optional[float] = None,
    min_minutes: Optional[int] = None,
    min_gap_percent: Optional[float] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    filters = {
        "position": position,
        "min_age": min_age,
        "max_age": max_age,
        "league_id": league_id,
        "max_value": max_value,
        "min_minutes": min_minutes,
        "min_gap_percent": min_gap_percent,
    }
    return get_market_opportunities(db, filters, page=page, page_size=page_size)
