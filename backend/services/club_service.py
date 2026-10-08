"""
Club service — provides club listing, club detail with roster, and league data.
"""
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from backend.database.models import (
    Club, League, Player, PlayerClubHistory, MarketValue, ModelPrediction, SeasonStats
)
from backend.schemas.clubs import ClubListItem, ClubDetail, LeagueItem
from backend.schemas.players import PlayerListItem


def get_clubs(db: Session) -> List[ClubListItem]:
    """Get all clubs with their squad size, average age, and total market value."""
    clubs = (
        db.query(Club, League.name.label("league_name"))
        .outerjoin(League, Club.league_id == League.id)
        .all()
    )

    result = []
    for club, league_name in clubs:
        # Get active players (full objects to access .age property)
        active_players = (
            db.query(Player)
            .join(
                PlayerClubHistory,
                (Player.id == PlayerClubHistory.player_id) & (PlayerClubHistory.is_current == True),
            )
            .filter(PlayerClubHistory.club_id == club.id)
            .all()
        )

        squad_size = len(active_players)
        valid_ages = [p.age for p in active_players]
        avg_age = round(sum(valid_ages) / len(valid_ages), 1) if valid_ages else None

        # Total market value: sum of latest market value per player
        player_ids = [p.id for p in active_players]
        total_market_value = 0.0
        if player_ids:
            # Get the latest market value for each player using a subquery
            latest_mv_sub = (
                db.query(
                    MarketValue.player_id,
                    func.max(MarketValue.valuation_date).label("max_date"),
                )
                .filter(MarketValue.player_id.in_(player_ids))
                .group_by(MarketValue.player_id)
                .subquery()
            )
            latest_values = (
                db.query(MarketValue.market_value_eur)
                .join(
                    latest_mv_sub,
                    (MarketValue.player_id == latest_mv_sub.c.player_id)
                    & (MarketValue.valuation_date == latest_mv_sub.c.max_date),
                )
                .all()
            )
            total_market_value = sum(mv[0] for mv in latest_values if mv[0])

        result.append(ClubListItem(
            id=club.id,
            name=club.name,
            country=club.country,
            league_name=league_name,
            league_id=club.league_id,
            squad_size=squad_size,
            total_market_value=total_market_value,
            avg_age=avg_age,
        ))
    return result


def get_club_detail(db: Session, club_id: int) -> Optional[ClubDetail]:
    """Get full club profile with squad roster."""
    row = (
        db.query(Club, League.name.label("league_name"))
        .outerjoin(League, Club.league_id == League.id)
        .filter(Club.id == club_id)
        .first()
    )
    if not row:
        return None

    club, league_name = row

    # Get active players
    active_players = (
        db.query(Player)
        .join(
            PlayerClubHistory,
            (Player.id == PlayerClubHistory.player_id) & (PlayerClubHistory.is_current == True),
        )
        .filter(PlayerClubHistory.club_id == club.id)
        .all()
    )

    squad_size = len(active_players)
    valid_ages = [p.age for p in active_players]
    avg_age = round(sum(valid_ages) / len(valid_ages), 1) if valid_ages else None

    # Build roster with latest values and predictions
    roster = []
    total_market_value = 0.0
    for p in active_players:
        latest_mv = (
            db.query(MarketValue)
            .filter(MarketValue.player_id == p.id)
            .order_by(MarketValue.valuation_date.desc())
            .first()
        )
        latest_pred = (
            db.query(ModelPrediction)
            .filter(ModelPrediction.player_id == p.id)
            .order_by(ModelPrediction.prediction_date.desc())
            .first()
        )
        latest_stats = (
            db.query(SeasonStats)
            .filter(SeasonStats.player_id == p.id)
            .order_by(SeasonStats.season.desc())
            .first()
        )

        mv = latest_mv.market_value_eur if latest_mv else None
        if mv:
            total_market_value += mv

        roster.append(PlayerListItem(
            id=p.id,
            name=p.name,
            age=p.age,
            primary_position=p.primary_position,
            club_name=club.name,
            league_name=league_name,
            nationality=p.nationality,
            minutes=latest_stats.minutes if latest_stats else None,
            goals=latest_stats.goals if latest_stats else None,
            assists=latest_stats.assists if latest_stats else None,
            market_value_eur=mv,
            predicted_value_eur=latest_pred.predicted_value_eur if latest_pred else None,
            value_gap_percent=latest_pred.difference_percent if latest_pred else None,
        ))

    return ClubDetail(
        id=club.id,
        name=club.name,
        country=club.country,
        league_name=league_name,
        league_id=club.league_id,
        squad_size=squad_size,
        total_market_value=total_market_value,
        avg_age=avg_age,
        roster=roster,
    )


def get_leagues(db: Session) -> List[LeagueItem]:
    """Get all leagues."""
    leagues = db.query(League).all()
    return [
        LeagueItem(id=l.id, name=l.name, country=l.country, strength_rating=l.strength_rating)
        for l in leagues
    ]
