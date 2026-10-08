"""
Dashboard API Routes with advanced analytics:
- Core dashboard KPIs & risers/fallers
- Value vs Age distributions per position
- Top undervalued & overvalued players
- Club squad value comparisons
- League comparisons
"""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Dict, Any, List

from backend.database.database import get_db
from backend.services.dashboard_service import get_dashboard_data
from backend.database.models import Player, Club, League, MarketValue, ModelPrediction, PlayerClubHistory

router = APIRouter(tags=["Dashboard"])

@router.get("/dashboard")
def api_get_dashboard(db: Session = Depends(get_db)):
    return get_dashboard_data(db)

@router.get("/analytics/value-vs-age")
def api_get_value_vs_age(position: str = Query("ALL"), db: Session = Depends(get_db)):
    """
    Returns market value vs age points for charting value-vs-age curves.
    """
    q = db.query(Player.id, Player.name, Player.primary_position, Player.date_of_birth, ModelPrediction.actual_market_value_eur)\
        .join(ModelPrediction, Player.id == ModelPrediction.player_id)\
        .filter(ModelPrediction.actual_market_value_eur > 0)

    if position != "ALL":
        q = q.filter(Player.primary_position == position)

    results = []
    current_year = 2026
    for pid, name, pos, dob, mv in q.limit(400).all():
        age = (current_year - dob.year) if dob else 25
        results.append({
            "id": pid,
            "name": name,
            "position": pos,
            "age": age,
            "market_value_eur": mv
        })
    return results

@router.get("/analytics/top-discrepancies")
def api_get_top_discrepancies(db: Session = Depends(get_db)):
    """
    Returns top 10 most undervalued and top 10 most overvalued players.
    """
    undervalued = db.query(Player.id, Player.name, Player.primary_position, ModelPrediction.actual_market_value_eur, ModelPrediction.predicted_value_eur, ModelPrediction.difference_percent)\
        .join(ModelPrediction, Player.id == ModelPrediction.player_id)\
        .filter(ModelPrediction.actual_market_value_eur >= 2_000_000, ModelPrediction.difference_percent > 0)\
        .order_by(ModelPrediction.difference_percent.desc()).limit(10).all()

    overvalued = db.query(Player.id, Player.name, Player.primary_position, ModelPrediction.actual_market_value_eur, ModelPrediction.predicted_value_eur, ModelPrediction.difference_percent)\
        .join(ModelPrediction, Player.id == ModelPrediction.player_id)\
        .filter(ModelPrediction.actual_market_value_eur >= 10_000_000, ModelPrediction.difference_percent < 0)\
        .order_by(ModelPrediction.difference_percent.asc()).limit(10).all()

    return {
        "undervalued": [
            {"id": r[0], "name": r[1], "position": r[2], "actual_eur": r[3], "predicted_eur": r[4], "gap_percent": round(r[5], 1)}
            for r in undervalued
        ],
        "overvalued": [
            {"id": r[0], "name": r[1], "position": r[2], "actual_eur": r[3], "predicted_eur": r[4], "gap_percent": round(r[5], 1)}
            for r in overvalued
        ]
    }

@router.get("/analytics/club-squad-values")
def api_get_club_squad_values(db: Session = Depends(get_db)):
    """
    Aggregates total market value and average age for top 15 clubs.
    """
    clubs = db.query(Club.id, Club.name, League.name.label("league_name"), func.sum(ModelPrediction.actual_market_value_eur).label("total_val"))\
        .join(League, Club.league_id == League.id)\
        .join(PlayerClubHistory, (Club.id == PlayerClubHistory.club_id) & (PlayerClubHistory.is_current == True))\
        .join(ModelPrediction, PlayerClubHistory.player_id == ModelPrediction.player_id)\
        .group_by(Club.id)\
        .order_by(func.sum(ModelPrediction.actual_market_value_eur).desc())\
        .limit(15).all()

    return [
        {"club_id": r[0], "club_name": r[1], "league": r[2], "total_market_value_eur": float(r[3] or 0)}
        for r in clubs
    ]

@router.get("/analytics/league-comparisons")
def api_get_league_comparisons(db: Session = Depends(get_db)):
    """
    Compares enabled vs available leagues: total value, player counts, strength.
    """
    leagues = db.query(League.id, League.name, League.country, League.strength_rating).all()
    results = []
    for lid, name, country, rating in leagues:
        p_count = db.query(func.count(Player.id))\
            .join(PlayerClubHistory, (Player.id == PlayerClubHistory.player_id) & (PlayerClubHistory.is_current == True))\
            .join(Club, PlayerClubHistory.club_id == Club.id)\
            .filter(Club.league_id == lid).scalar() or 0

        tot_val = db.query(func.sum(ModelPrediction.actual_market_value_eur))\
            .join(PlayerClubHistory, (ModelPrediction.player_id == PlayerClubHistory.player_id) & (PlayerClubHistory.is_current == True))\
            .join(Club, PlayerClubHistory.club_id == Club.id)\
            .filter(Club.league_id == lid).scalar() or 0

        results.append({
            "league_id": lid,
            "name": name,
            "country": country,
            "strength_rating": rating,
            "player_count": p_count,
            "total_value_eur": float(tot_val)
        })
    return results
