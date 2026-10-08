"""
Player service — provides all player-related database queries.

Handles filtered listing, player details, season stats, market values,
transfers, model predictions, and similar player lookup.
"""
import math
from datetime import date
from typing import Optional, Dict, Any, List

from sqlalchemy.orm import Session, aliased
from sqlalchemy import func, desc, asc, extract

from backend.database.models import (
    Player, Club, League, PlayerClubHistory,
    MarketValue, ModelPrediction, SeasonStats, Transfer
)
from backend.schemas.common import PaginatedResponse
from backend.schemas.players import (
    PlayerListItem, PlayerDetail, PlayerSeasonStats,
    PlayerMarketValuePoint, PlayerTransfer, PlayerPrediction,
    SimilarPlayerItem
)

# ML modules are optional — the API works even if models aren't trained yet
try:
    from ml.similarity import find_similar_players as _find_similar_players
except ImportError:
    _find_similar_players = None

try:
    from ml.explain import explain_prediction as _explain_prediction
except ImportError:
    _explain_prediction = None


def _calculate_age_from_dob(dob: date) -> int:
    """Calculate age from date of birth."""
    today = date.today()
    return today.year - dob.year - ((today.month, today.day) < (dob.month, dob.day))


def get_players(
    db: Session,
    filters: Dict[str, Any],
    page: int = 1,
    page_size: int = 20,
    sort_by: str = "market_value_eur",
    sort_dir: str = "desc",
):
    """
    Get a paginated, filtered list of players with their current club,
    latest market value, latest model prediction, and latest season stats.
    """
    # ── Subqueries for latest data ────────────────────────────────────
    # Latest market value per player
    latest_mv_sub = (
        db.query(
            MarketValue.player_id,
            func.max(MarketValue.valuation_date).label("max_date"),
        )
        .group_by(MarketValue.player_id)
        .subquery()
    )

    # Latest prediction per player
    latest_pred_sub = (
        db.query(
            ModelPrediction.player_id,
            func.max(ModelPrediction.prediction_date).label("max_date"),
        )
        .group_by(ModelPrediction.player_id)
        .subquery()
    )

    # Latest season stats per player
    latest_stats_sub = (
        db.query(
            SeasonStats.player_id,
            func.max(SeasonStats.season).label("max_season"),
        )
        .group_by(SeasonStats.player_id)
        .subquery()
    )

    # ── Main query ────────────────────────────────────────────────────
    query = (
        db.query(
            Player,
            Club.name.label("club_name"),
            League.name.label("league_name"),
            MarketValue.market_value_eur,
            ModelPrediction.predicted_value_eur,
            ModelPrediction.difference_percent.label("value_gap_percent"),
            SeasonStats.minutes,
            SeasonStats.goals,
            SeasonStats.assists,
        )
        # Current club
        .outerjoin(
            PlayerClubHistory,
            (Player.id == PlayerClubHistory.player_id) & (PlayerClubHistory.is_current == True),
        )
        .outerjoin(Club, PlayerClubHistory.club_id == Club.id)
        .outerjoin(League, Club.league_id == League.id)
        # Latest market value
        .outerjoin(latest_mv_sub, Player.id == latest_mv_sub.c.player_id)
        .outerjoin(
            MarketValue,
            (Player.id == MarketValue.player_id)
            & (MarketValue.valuation_date == latest_mv_sub.c.max_date),
        )
        # Latest prediction
        .outerjoin(latest_pred_sub, Player.id == latest_pred_sub.c.player_id)
        .outerjoin(
            ModelPrediction,
            (Player.id == ModelPrediction.player_id)
            & (ModelPrediction.prediction_date == latest_pred_sub.c.max_date),
        )
        # Latest season stats
        .outerjoin(latest_stats_sub, Player.id == latest_stats_sub.c.player_id)
        .outerjoin(
            SeasonStats,
            (Player.id == SeasonStats.player_id)
            & (SeasonStats.season == latest_stats_sub.c.max_season),
        )
    )

    # ── Filters ───────────────────────────────────────────────────────
    if filters.get("name"):
        query = query.filter(Player.name.ilike(f"%{filters['name']}%"))
    if filters.get("position"):
        query = query.filter(Player.primary_position == filters["position"])
    if filters.get("nationality"):
        query = query.filter(Player.nationality == filters["nationality"])

    # Age filtering — use date_of_birth since age is a Python property
    today = date.today()
    if filters.get("min_age") is not None:
        # Player must be at least min_age → born on or before (today - min_age years)
        max_dob = today.replace(year=today.year - filters["min_age"])
        query = query.filter(Player.date_of_birth <= max_dob)
    if filters.get("max_age") is not None:
        # Player must be at most max_age → born on or after (today - max_age - 1 years + 1 day)
        min_dob = today.replace(year=today.year - filters["max_age"] - 1)
        query = query.filter(Player.date_of_birth >= min_dob)

    # Club / league filters
    if filters.get("league_id"):
        query = query.filter(Club.league_id == filters["league_id"])
    if filters.get("club_id"):
        query = query.filter(Club.id == filters["club_id"])

    # Value filters
    if filters.get("min_value") is not None:
        query = query.filter(MarketValue.market_value_eur >= filters["min_value"])
    if filters.get("max_value") is not None:
        query = query.filter(MarketValue.market_value_eur <= filters["max_value"])
    if filters.get("min_model_value") is not None:
        query = query.filter(ModelPrediction.predicted_value_eur >= filters["min_model_value"])
    if filters.get("max_model_value") is not None:
        query = query.filter(ModelPrediction.predicted_value_eur <= filters["max_model_value"])

    # Stat filters
    if filters.get("min_minutes") is not None:
        query = query.filter(SeasonStats.minutes >= filters["min_minutes"])
    if filters.get("min_goals") is not None:
        query = query.filter(SeasonStats.goals >= filters["min_goals"])
    if filters.get("min_assists") is not None:
        query = query.filter(SeasonStats.assists >= filters["min_assists"])

    # Gap percent filter (for market opportunities)
    if filters.get("min_gap_percent") is not None:
        query = query.filter(ModelPrediction.difference_percent >= filters["min_gap_percent"])

    # Per-90 stat filters (computed from totals)
    # These filters work on the latest season stats
    if filters.get("min_goals_per_90") is not None and filters["min_goals_per_90"] > 0:
        query = query.filter(
            SeasonStats.minutes > 0,
            (SeasonStats.goals * 90.0 / SeasonStats.minutes) >= filters["min_goals_per_90"]
        )
    if filters.get("min_assists_per_90") is not None and filters["min_assists_per_90"] > 0:
        query = query.filter(
            SeasonStats.minutes > 0,
            (SeasonStats.assists * 90.0 / SeasonStats.minutes) >= filters["min_assists_per_90"]
        )
    if filters.get("min_xg_per_90") is not None and filters["min_xg_per_90"] > 0:
        query = query.filter(
            SeasonStats.minutes > 0,
            (SeasonStats.xg * 90.0 / SeasonStats.minutes) >= filters["min_xg_per_90"]
        )
    if filters.get("min_xa_per_90") is not None and filters["min_xa_per_90"] > 0:
        query = query.filter(
            SeasonStats.minutes > 0,
            (SeasonStats.xa * 90.0 / SeasonStats.minutes) >= filters["min_xa_per_90"]
        )
    if filters.get("min_progressive_passes_per_90") is not None and filters["min_progressive_passes_per_90"] > 0:
        query = query.filter(
            SeasonStats.minutes > 0,
            (SeasonStats.progressive_passes * 90.0 / SeasonStats.minutes) >= filters["min_progressive_passes_per_90"]
        )
    if filters.get("min_progressive_carries_per_90") is not None and filters["min_progressive_carries_per_90"] > 0:
        query = query.filter(
            SeasonStats.minutes > 0,
            (SeasonStats.progressive_carries * 90.0 / SeasonStats.minutes) >= filters["min_progressive_carries_per_90"]
        )
    if filters.get("min_tackles_per_90") is not None and filters["min_tackles_per_90"] > 0:
        query = query.filter(
            SeasonStats.minutes > 0,
            (SeasonStats.tackles * 90.0 / SeasonStats.minutes) >= filters["min_tackles_per_90"]
        )
    if filters.get("min_interceptions_per_90") is not None and filters["min_interceptions_per_90"] > 0:
        query = query.filter(
            SeasonStats.minutes > 0,
            (SeasonStats.interceptions * 90.0 / SeasonStats.minutes) >= filters["min_interceptions_per_90"]
        )

    # ── Sorting ───────────────────────────────────────────────────────
    sort_map = {
        "name": Player.name,
        "age": Player.date_of_birth,  # sort by DOB (reversed direction)
        "primary_position": Player.primary_position,
        "market_value_eur": MarketValue.market_value_eur,
        "predicted_value_eur": ModelPrediction.predicted_value_eur,
        "value_gap_percent": ModelPrediction.difference_percent,
        "minutes": SeasonStats.minutes,
        "goals": SeasonStats.goals,
        "assists": SeasonStats.assists,
    }
    sort_col = sort_map.get(sort_by, MarketValue.market_value_eur)

    # Special handling: sorting by "age" desc means oldest first = earliest DOB
    if sort_by == "age":
        # Reverse the direction because older age = earlier DOB
        if sort_dir.lower() == "desc":
            query = query.order_by(sort_col.asc().nulls_last())
        else:
            query = query.order_by(sort_col.desc().nulls_last())
    else:
        if sort_dir.lower() == "desc":
            query = query.order_by(sort_col.desc().nulls_last())
        else:
            query = query.order_by(sort_col.asc().nulls_last())

    # ── Pagination ────────────────────────────────────────────────────
    total = query.count()
    total_pages = math.ceil(total / page_size) if total > 0 else 0
    results = query.offset((page - 1) * page_size).limit(page_size).all()

    items = []
    for r in results:
        items.append(PlayerListItem(
            id=r.Player.id,
            name=r.Player.name,
            age=_calculate_age_from_dob(r.Player.date_of_birth),
            primary_position=r.Player.primary_position,
            club_name=r.club_name,
            league_name=r.league_name,
            nationality=r.Player.nationality,
            minutes=r.minutes,
            goals=r.goals,
            assists=r.assists,
            market_value_eur=r.market_value_eur,
            predicted_value_eur=r.predicted_value_eur,
            value_gap_percent=r.value_gap_percent,
        ))

    return PaginatedResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )


def get_player_detail(db: Session, player_id: int) -> Optional[PlayerDetail]:
    """Get full player profile with current club and latest values."""
    r = (
        db.query(
            Player,
            Club.name.label("club_name"),
            Club.id.label("club_id"),
            League.name.label("league_name"),
            League.id.label("league_id"),
        )
        .outerjoin(
            PlayerClubHistory,
            (Player.id == PlayerClubHistory.player_id) & (PlayerClubHistory.is_current == True),
        )
        .outerjoin(Club, PlayerClubHistory.club_id == Club.id)
        .outerjoin(League, Club.league_id == League.id)
        .filter(Player.id == player_id)
        .first()
    )

    if not r:
        return None

    # Latest market value
    latest_mv = (
        db.query(MarketValue)
        .filter(MarketValue.player_id == player_id)
        .order_by(MarketValue.valuation_date.desc())
        .first()
    )
    # Latest prediction
    latest_pred = (
        db.query(ModelPrediction)
        .filter(ModelPrediction.player_id == player_id)
        .order_by(ModelPrediction.prediction_date.desc())
        .first()
    )

    # Latest season stats for the detail page
    latest_stats = (
        db.query(SeasonStats)
        .filter(SeasonStats.player_id == player_id)
        .order_by(SeasonStats.season.desc())
        .first()
    )

    return PlayerDetail(
        id=r.Player.id,
        name=r.Player.name,
        age=_calculate_age_from_dob(r.Player.date_of_birth),
        primary_position=r.Player.primary_position,
        club_name=r.club_name,
        league_name=r.league_name,
        nationality=r.Player.nationality,
        minutes=latest_stats.minutes if latest_stats else None,
        goals=latest_stats.goals if latest_stats else None,
        assists=latest_stats.assists if latest_stats else None,
        market_value_eur=latest_mv.market_value_eur if latest_mv else None,
        predicted_value_eur=latest_pred.predicted_value_eur if latest_pred else None,
        value_gap_percent=latest_pred.difference_percent if latest_pred else None,
        date_of_birth=r.Player.date_of_birth,
        height_cm=r.Player.height_cm,
        preferred_foot=r.Player.preferred_foot,
        club_id=r.club_id,
        league_id=r.league_id,
    )


def get_player_stats(db: Session, player_id: int) -> List[PlayerSeasonStats]:
    """Get all season stats for a player, most recent first."""
    stats = (
        db.query(SeasonStats, Club.name.label("club_name"))
        .outerjoin(Club, SeasonStats.club_id == Club.id)
        .filter(SeasonStats.player_id == player_id)
        .order_by(SeasonStats.season.desc())
        .all()
    )

    result = []
    for s, club_name in stats:
        result.append(PlayerSeasonStats(
            season=s.season,
            club_name=club_name,
            appearances=s.appearances,
            minutes=s.minutes,
            goals=s.goals,
            assists=s.assists,
            xg=round(s.xg, 2) if s.xg else 0,
            xa=round(s.xa, 2) if s.xa else 0,
            shots=round(s.shots, 1) if s.shots else 0,
            key_passes=round(s.key_passes, 1) if s.key_passes else 0,
            progressive_passes=round(s.progressive_passes, 1) if s.progressive_passes else 0,
            progressive_carries=round(s.progressive_carries, 1) if s.progressive_carries else 0,
            tackles=round(s.tackles, 1) if s.tackles else 0,
            interceptions=round(s.interceptions, 1) if s.interceptions else 0,
            aerial_wins=round(s.aerial_wins, 1) if s.aerial_wins else 0,
            recoveries=round(s.recoveries, 1) if s.recoveries else 0,
            clean_sheets=s.clean_sheets or 0,
            goals_per_90=round(s.goals_per_90, 2),
            assists_per_90=round(s.assists_per_90, 2),
            xg_per_90=round(s.xg_per_90, 2),
            xa_per_90=round(s.xa_per_90, 2),
            shots_per_90=round(s.shots_per_90, 2),
            progressive_passes_per_90=round(s.progressive_passes_per_90, 2),
            progressive_carries_per_90=round(s.progressive_carries_per_90, 2),
            tackles_per_90=round(s.tackles_per_90, 2),
            interceptions_per_90=round(s.interceptions_per_90, 2),
        ))
    return result


def get_player_market_values(db: Session, player_id: int) -> List[PlayerMarketValuePoint]:
    """Get historical market value snapshots for a player."""
    mvs = (
        db.query(MarketValue)
        .filter(MarketValue.player_id == player_id)
        .order_by(MarketValue.valuation_date.asc())
        .all()
    )
    return [
        PlayerMarketValuePoint(
            valuation_date=mv.valuation_date,
            market_value_eur=mv.market_value_eur,
        )
        for mv in mvs
    ]


def get_player_transfers(db: Session, player_id: int) -> List[PlayerTransfer]:
    """Get transfer history for a player with club names."""
    FromClub = aliased(Club)
    ToClub = aliased(Club)
    transfers = (
        db.query(
            Transfer,
            FromClub.name.label("from_club_name"),
            ToClub.name.label("to_club_name"),
        )
        .outerjoin(FromClub, Transfer.from_club_id == FromClub.id)
        .outerjoin(ToClub, Transfer.to_club_id == ToClub.id)
        .filter(Transfer.player_id == player_id)
        .order_by(Transfer.transfer_date.desc())
        .all()
    )
    return [
        PlayerTransfer(
            transfer_date=t.Transfer.transfer_date,
            from_club_name=t.from_club_name,
            to_club_name=t.to_club_name,
            fee_eur=t.Transfer.fee_eur,
            transfer_type=t.Transfer.transfer_type,
        )
        for t in transfers
    ]


def get_player_prediction(db: Session, player_id: int) -> Optional[PlayerPrediction]:
    """Get the latest model prediction for a player with feature explanations."""
    pred = (
        db.query(ModelPrediction)
        .filter(ModelPrediction.player_id == player_id)
        .order_by(ModelPrediction.prediction_date.desc())
        .first()
    )
    if not pred:
        return None

    # Try to get feature contribution explanations from the ML module
    explanation = {"positive_factors": [], "negative_factors": []}
    if _explain_prediction:
        try:
            raw = _explain_prediction(player_id, db)
            if raw and not raw.get("error"):
                explanation = {
                    "positive_factors": raw.get("positive_factors", []),
                    "negative_factors": raw.get("negative_factors", []),
                }
        except Exception:
            pass

    return PlayerPrediction(
        predicted_value_eur=pred.predicted_value_eur,
        actual_market_value_eur=pred.actual_market_value_eur,
        difference_percent=pred.difference_percent,
        model_version=pred.model_version,
        explanation=explanation,
    )


def get_similar_players(
    db: Session, player_id: int, filters: Dict[str, Any]
) -> List[SimilarPlayerItem]:
    """Find statistically similar players using the ML similarity engine."""
    if _find_similar_players:
        try:
            n = filters.get("n", 5)
            return _find_similar_players(player_id, db, n=n, filters=filters)
        except Exception:
            pass
    return []
