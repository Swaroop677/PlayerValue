from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional

from backend.database.database import get_db
from backend.services.player_service import (
    get_players, get_player_detail, get_player_stats, 
    get_player_market_values, get_player_transfers, 
    get_player_prediction, get_similar_players
)
from backend.schemas.common import PaginatedResponse
from backend.schemas.players import PlayerListItem

router = APIRouter(prefix="/players", tags=["Players"])

@router.get("", response_model=PaginatedResponse[PlayerListItem])
def api_get_players(
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
    min_goals: Optional[int] = None,
    min_assists: Optional[int] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    sort_by: str = Query("market_value_eur"),
    sort_dir: str = Query("desc"),
    db: Session = Depends(get_db)
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
        "min_goals": min_goals,
        "min_assists": min_assists
    }
    return get_players(db, filters, page, page_size, sort_by, sort_dir)

@router.get("/positional-averages")
def api_get_positional_averages(position: str = Query("CM"), db: Session = Depends(get_db)):
    from backend.database.models import SeasonStats, Player
    # Compute average per-90 metrics for the requested position for season 2024-25
    stats = db.query(SeasonStats).join(Player, SeasonStats.player_id == Player.id)\
        .filter(Player.primary_position == position, SeasonStats.season.in_(["2024-25", "2023-24"]), SeasonStats.minutes >= 450).all()
    if not stats:
        return {
            "goals_per_90": 0.15, "assists_per_90": 0.12, "xg_per_90": 0.14,
            "xa_per_90": 0.10, "progressive_passes_per_90": 3.8, "progressive_carries_per_90": 2.1,
            "tackles_per_90": 1.6, "interceptions_per_90": 1.1
        }
    n = len(stats)
    return {
        "goals_per_90": round(sum(s.goals_per_90 for s in stats) / n, 2),
        "assists_per_90": round(sum(s.assists_per_90 for s in stats) / n, 2),
        "xg_per_90": round(sum(s.xg_per_90 for s in stats) / n, 2),
        "xa_per_90": round(sum(s.xa_per_90 for s in stats) / n, 2),
        "progressive_passes_per_90": round(sum(s.progressive_passes_per_90 for s in stats) / n, 2),
        "progressive_carries_per_90": round(sum(s.progressive_carries_per_90 for s in stats) / n, 2),
        "tackles_per_90": round(sum(s.tackles_per_90 for s in stats) / n, 2),
        "interceptions_per_90": round(sum(s.interceptions_per_90 for s in stats) / n, 2)
    }

@router.get("/{player_id}")
def api_get_player_detail(player_id: int, db: Session = Depends(get_db)):
    player = get_player_detail(db, player_id)
    if not player:
        raise HTTPException(status_code=404, detail="Player not found")
    return player

@router.get("/{player_id}/stats")
def api_get_player_stats(player_id: int, db: Session = Depends(get_db)):
    return get_player_stats(db, player_id)

@router.get("/{player_id}/market-values")
def api_get_player_market_values(player_id: int, db: Session = Depends(get_db)):
    return get_player_market_values(db, player_id)

@router.get("/{player_id}/transfers")
def api_get_player_transfers(player_id: int, db: Session = Depends(get_db)):
    return get_player_transfers(db, player_id)

@router.get("/{player_id}/prediction")
def api_get_player_prediction(player_id: int, db: Session = Depends(get_db)):
    pred = get_player_prediction(db, player_id)
    if not pred:
        raise HTTPException(status_code=404, detail="Prediction not found")
    return pred

@router.get("/{player_id}/similar")
def api_get_similar_players(
    player_id: int, 
    same_position: bool = False,
    max_age: Optional[int] = None,
    max_value: Optional[float] = None,
    different_league: bool = False,
    n: int = 5,
    db: Session = Depends(get_db)
):
    filters = {
        "same_position": same_position,
        "max_age": max_age,
        "max_value": max_value,
        "different_league": different_league,
        "n": n
    }
    return get_similar_players(db, player_id, filters)
