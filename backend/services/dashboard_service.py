"""
Dashboard service — provides KPI aggregations, market risers/fallers,
undervalued players, recently updated players, and market overview data.
"""
from sqlalchemy.orm import Session
from sqlalchemy import func, desc, asc, case, extract
from typing import Dict, Any, List
from datetime import date

from backend.database.models import (
    Player, Club, League, PlayerClubHistory,
    MarketValue, ModelPrediction, SeasonStats
)


def get_dashboard_data(db: Session) -> Dict[str, Any]:
    """
    Assemble all dashboard data: KPIs, risers, fallers, undervalued,
    recently updated players, and market overview.
    """
    # ── KPIs ──────────────────────────────────────────────────────────
    player_count = db.query(func.count(Player.id)).scalar() or 0
    club_count = db.query(func.count(Club.id)).scalar() or 0
    league_count = db.query(func.count(League.id)).scalar() or 0
    prediction_count = db.query(func.count(ModelPrediction.id)).scalar() or 0

    # Total market value: sum of each player's latest market value
    latest_mv_sub = (
        db.query(
            MarketValue.player_id,
            func.max(MarketValue.valuation_date).label("max_date")
        )
        .group_by(MarketValue.player_id)
        .subquery()
    )
    total_market_value = (
        db.query(func.sum(MarketValue.market_value_eur))
        .join(
            latest_mv_sub,
            (MarketValue.player_id == latest_mv_sub.c.player_id)
            & (MarketValue.valuation_date == latest_mv_sub.c.max_date),
        )
        .scalar()
    ) or 0

    kpis = [
        {"label": "Players Tracked", "value": player_count},
        {"label": "Clubs", "value": club_count},
        {"label": "Leagues", "value": league_count},
        {"label": "Total Market Value", "value": total_market_value},
        {"label": "Model Predictions", "value": prediction_count},
    ]

    # ── Helper: build a player summary dict ───────────────────────────
    def _player_summary(player, club_name, league_name, mv, model_val=None, gap=None, prev_mv=None):
        return {
            "id": player.id,
            "name": player.name,
            "age": player.age,
            "primary_position": player.primary_position,
            "club_name": club_name,
            "league_name": league_name,
            "nationality": player.nationality,
            "market_value_eur": mv,
            "predicted_value_eur": model_val,
            "value_gap_percent": gap,
            "previous_value_eur": prev_mv,
        }

    # ── Risers / Fallers ──────────────────────────────────────────────
    # Compare each player's two most recent market values.
    # Subquery: rank market values per player by date descending.
    from sqlalchemy import literal_column
    from sqlalchemy.sql import text

    # Get two latest valuations per player
    # We'll use a simple approach: latest and second-latest
    latest_two = (
        db.query(
            MarketValue.player_id,
            MarketValue.market_value_eur,
            MarketValue.valuation_date,
            func.row_number()
            .over(
                partition_by=MarketValue.player_id,
                order_by=MarketValue.valuation_date.desc(),
            )
            .label("rn"),
        )
        .subquery()
    )

    latest_vals = (
        db.query(
            latest_two.c.player_id,
            latest_two.c.market_value_eur,
        )
        .filter(latest_two.c.rn == 1)
        .subquery()
    )

    prev_vals = (
        db.query(
            latest_two.c.player_id,
            latest_two.c.market_value_eur,
        )
        .filter(latest_two.c.rn == 2)
        .subquery()
    )

    # Compute change
    change_query = (
        db.query(
            Player,
            Club.name.label("club_name"),
            League.name.label("league_name"),
            latest_vals.c.market_value_eur.label("current_value"),
            prev_vals.c.market_value_eur.label("previous_value"),
            (latest_vals.c.market_value_eur - prev_vals.c.market_value_eur).label("change"),
        )
        .join(latest_vals, Player.id == latest_vals.c.player_id)
        .join(prev_vals, Player.id == prev_vals.c.player_id)
        .outerjoin(
            PlayerClubHistory,
            (Player.id == PlayerClubHistory.player_id) & (PlayerClubHistory.is_current == True),
        )
        .outerjoin(Club, PlayerClubHistory.club_id == Club.id)
        .outerjoin(League, Club.league_id == League.id)
        .filter(prev_vals.c.market_value_eur > 0)  # avoid division by zero
    )

    # Risers — top 10 biggest absolute increase
    risers_rows = change_query.order_by(desc("change")).limit(10).all()
    risers = []
    for r in risers_rows:
        change_pct = ((r.current_value - r.previous_value) / r.previous_value * 100) if r.previous_value else 0
        risers.append({
            **_player_summary(r.Player, r.club_name, r.league_name, r.current_value, prev_mv=r.previous_value),
            "change_eur": r.change,
            "change_percent": round(change_pct, 1),
        })

    # Fallers — top 10 biggest absolute decrease
    fallers_rows = change_query.order_by(asc("change")).limit(10).all()
    fallers = []
    for r in fallers_rows:
        change_pct = ((r.current_value - r.previous_value) / r.previous_value * 100) if r.previous_value else 0
        fallers.append({
            **_player_summary(r.Player, r.club_name, r.league_name, r.current_value, prev_mv=r.previous_value),
            "change_eur": r.change,
            "change_percent": round(change_pct, 1),
        })

    # ── Undervalued (model value > market value) ──────────────────────
    latest_pred_sub = (
        db.query(
            ModelPrediction.player_id,
            func.max(ModelPrediction.prediction_date).label("max_date"),
        )
        .group_by(ModelPrediction.player_id)
        .subquery()
    )

    undervalued_query = (
        db.query(
            Player,
            Club.name.label("club_name"),
            League.name.label("league_name"),
            MarketValue.market_value_eur,
            ModelPrediction.predicted_value_eur,
            ModelPrediction.difference_percent,
        )
        .join(latest_mv_sub, Player.id == latest_mv_sub.c.player_id)
        .join(
            MarketValue,
            (Player.id == MarketValue.player_id) & (MarketValue.valuation_date == latest_mv_sub.c.max_date),
        )
        .join(latest_pred_sub, Player.id == latest_pred_sub.c.player_id)
        .join(
            ModelPrediction,
            (Player.id == ModelPrediction.player_id) & (ModelPrediction.prediction_date == latest_pred_sub.c.max_date),
        )
        .outerjoin(
            PlayerClubHistory,
            (Player.id == PlayerClubHistory.player_id) & (PlayerClubHistory.is_current == True),
        )
        .outerjoin(Club, PlayerClubHistory.club_id == Club.id)
        .outerjoin(League, Club.league_id == League.id)
        .filter(ModelPrediction.difference_percent > 0)
        .order_by(ModelPrediction.difference_percent.desc())
        .limit(10)
    )

    undervalued = []
    for r in undervalued_query.all():
        undervalued.append(
            _player_summary(
                r.Player,
                r.club_name,
                r.league_name,
                r.market_value_eur,
                model_val=r.predicted_value_eur,
                gap=r.difference_percent,
            )
        )

    # ── Recently updated players ──────────────────────────────────────
    recent_rows = (
        db.query(
            Player,
            Club.name.label("club_name"),
            League.name.label("league_name"),
            MarketValue.market_value_eur,
            ModelPrediction.predicted_value_eur,
            ModelPrediction.difference_percent,
        )
        .join(latest_mv_sub, Player.id == latest_mv_sub.c.player_id)
        .join(
            MarketValue,
            (Player.id == MarketValue.player_id) & (MarketValue.valuation_date == latest_mv_sub.c.max_date),
        )
        .outerjoin(latest_pred_sub, Player.id == latest_pred_sub.c.player_id)
        .outerjoin(
            ModelPrediction,
            (Player.id == ModelPrediction.player_id) & (ModelPrediction.prediction_date == latest_pred_sub.c.max_date),
        )
        .outerjoin(
            PlayerClubHistory,
            (Player.id == PlayerClubHistory.player_id) & (PlayerClubHistory.is_current == True),
        )
        .outerjoin(Club, PlayerClubHistory.club_id == Club.id)
        .outerjoin(League, Club.league_id == League.id)
        .order_by(MarketValue.valuation_date.desc())
        .limit(10)
        .all()
    )

    recent = [
        _player_summary(
            r.Player, r.club_name, r.league_name,
            r.market_value_eur, r.predicted_value_eur, r.difference_percent,
        )
        for r in recent_rows
    ]

    # ── Market overview (total value per valuation date) ──────────────
    overview_rows = (
        db.query(
            MarketValue.valuation_date,
            func.sum(MarketValue.market_value_eur).label("total_value"),
        )
        .group_by(MarketValue.valuation_date)
        .order_by(MarketValue.valuation_date.asc())
        .all()
    )

    market_overview = [
        {"date": str(row.valuation_date), "total_value": row.total_value}
        for row in overview_rows
    ]

    return {
        "kpis": kpis,
        "risers": risers,
        "fallers": fallers,
        "undervalued": undervalued,
        "recent": recent,
        "market_overview": market_overview,
    }
