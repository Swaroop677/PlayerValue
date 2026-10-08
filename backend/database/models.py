"""
SQLAlchemy ORM models for the PlayerValue database.

This file defines all database tables as Python classes.
Each class maps to a PostgreSQL table and defines its columns,
relationships, and indexes.

Tables:
    - League: Football leagues (Premier League, La Liga, etc.)
    - Club: Football clubs belonging to a league
    - Player: Player biographical information
    - PlayerClubHistory: Which club a player was at each season
    - SeasonStats: Player performance statistics per season
    - MarketValue: Historical market value snapshots
    - Transfer: Transfer records between clubs
    - ModelPrediction: ML model predicted values
    - ModelRun: ML model training run metadata
"""
from datetime import date, datetime
from sqlalchemy import (
    Column, Integer, String, Float, Date, DateTime, Boolean,
    ForeignKey, Index, Text, JSON
)
from sqlalchemy.orm import relationship, DeclarativeBase


class Base(DeclarativeBase):
    """Base class for all ORM models."""
    pass


# ---------------------------------------------------------------------------
# League
# ---------------------------------------------------------------------------
class League(Base):
    """A football league (e.g., Premier League, La Liga)."""
    __tablename__ = "leagues"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(100), nullable=False, unique=True)
    country = Column(String(100), nullable=False)
    strength_rating = Column(Float, nullable=False, default=3.0)

    # Relationships
    clubs = relationship("Club", back_populates="league")

    def __repr__(self) -> str:
        return f"<League {self.name}>"


# ---------------------------------------------------------------------------
# Club
# ---------------------------------------------------------------------------
class Club(Base):
    """A football club belonging to a league."""
    __tablename__ = "clubs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(150), nullable=False, unique=True)
    country = Column(String(100), nullable=False)
    league_id = Column(Integer, ForeignKey("leagues.id", ondelete="SET NULL"), nullable=True)

    # Relationships
    league = relationship("League", back_populates="clubs")
    player_histories = relationship("PlayerClubHistory", back_populates="club")

    # Indexes
    __table_args__ = (
        Index("ix_clubs_league_id", "league_id"),
    )

    def __repr__(self) -> str:
        return f"<Club {self.name}>"


# ---------------------------------------------------------------------------
# Player
# ---------------------------------------------------------------------------
class Player(Base):
    """A football player with biographical information."""
    __tablename__ = "players"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(200), nullable=False)
    date_of_birth = Column(Date, nullable=False)
    nationality = Column(String(100), nullable=False)
    height_cm = Column(Integer, nullable=True)
    preferred_foot = Column(String(10), nullable=True)  # "Left", "Right", "Both"
    primary_position = Column(String(5), nullable=False)  # GK, CB, LB, RB, CM, AM, LW, RW, ST

    # Relationships
    club_histories = relationship("PlayerClubHistory", back_populates="player", order_by="PlayerClubHistory.season")
    season_stats = relationship("SeasonStats", back_populates="player", order_by="SeasonStats.season")
    market_values = relationship("MarketValue", back_populates="player", order_by="MarketValue.valuation_date")
    transfers = relationship("Transfer", back_populates="player", order_by="Transfer.transfer_date")
    predictions = relationship("ModelPrediction", back_populates="player", order_by="ModelPrediction.prediction_date.desc()")

    # Indexes
    __table_args__ = (
        Index("ix_players_name", "name"),
        Index("ix_players_position", "primary_position"),
        Index("ix_players_nationality", "nationality"),
    )

    @property
    def age(self) -> int:
        """Calculate current age from date of birth."""
        today = date.today()
        return today.year - self.date_of_birth.year - (
            (today.month, today.day) < (self.date_of_birth.month, self.date_of_birth.day)
        )

    def __repr__(self) -> str:
        return f"<Player {self.name}>"


# ---------------------------------------------------------------------------
# PlayerClubHistory
# ---------------------------------------------------------------------------
class PlayerClubHistory(Base):
    """Tracks which club a player belonged to in each season."""
    __tablename__ = "player_club_history"

    id = Column(Integer, primary_key=True, autoincrement=True)
    player_id = Column(Integer, ForeignKey("players.id", ondelete="CASCADE"), nullable=False)
    club_id = Column(Integer, ForeignKey("clubs.id", ondelete="CASCADE"), nullable=False)
    season = Column(String(10), nullable=False)  # e.g., "2024-25"
    is_current = Column(Boolean, default=False)

    # Relationships
    player = relationship("Player", back_populates="club_histories")
    club = relationship("Club", back_populates="player_histories")

    # Indexes
    __table_args__ = (
        Index("ix_pch_player_id", "player_id"),
        Index("ix_pch_club_id", "club_id"),
        Index("ix_pch_player_current", "player_id", "is_current"),
    )

    def __repr__(self) -> str:
        return f"<PlayerClubHistory player={self.player_id} club={self.club_id} season={self.season}>"


# ---------------------------------------------------------------------------
# SeasonStats
# ---------------------------------------------------------------------------
class SeasonStats(Base):
    """Player performance statistics for a single season."""
    __tablename__ = "season_stats"

    id = Column(Integer, primary_key=True, autoincrement=True)
    player_id = Column(Integer, ForeignKey("players.id", ondelete="CASCADE"), nullable=False)
    club_id = Column(Integer, ForeignKey("clubs.id", ondelete="CASCADE"), nullable=False)
    season = Column(String(10), nullable=False)  # e.g., "2024-25"

    # Playing time
    appearances = Column(Integer, default=0)
    minutes = Column(Integer, default=0)

    # Attacking
    goals = Column(Integer, default=0)
    assists = Column(Integer, default=0)
    xg = Column(Float, default=0.0)          # Expected goals
    xa = Column(Float, default=0.0)          # Expected assists
    shots = Column(Float, default=0.0)       # Total shots

    # Passing & progression
    key_passes = Column(Float, default=0.0)
    progressive_passes = Column(Float, default=0.0)
    progressive_carries = Column(Float, default=0.0)

    # Defending
    tackles = Column(Float, default=0.0)
    interceptions = Column(Float, default=0.0)
    aerial_wins = Column(Float, default=0.0)

    # Other
    recoveries = Column(Float, default=0.0)
    clean_sheets = Column(Integer, default=0)  # Mainly for GKs / defenders

    # Relationships
    player = relationship("Player", back_populates="season_stats")
    club = relationship("Club")

    # Indexes
    __table_args__ = (
        Index("ix_ss_player_id", "player_id"),
        Index("ix_ss_season", "season"),
        Index("ix_ss_player_season", "player_id", "season"),
    )

    @property
    def minutes_per_90(self) -> float:
        """Number of full 90-minute matches equivalent."""
        return self.minutes / 90.0 if self.minutes > 0 else 0.0

    @property
    def goals_per_90(self) -> float:
        m90 = self.minutes_per_90
        return self.goals / m90 if m90 > 0 else 0.0

    @property
    def assists_per_90(self) -> float:
        m90 = self.minutes_per_90
        return self.assists / m90 if m90 > 0 else 0.0

    @property
    def xg_per_90(self) -> float:
        m90 = self.minutes_per_90
        return self.xg / m90 if m90 > 0 else 0.0

    @property
    def xa_per_90(self) -> float:
        m90 = self.minutes_per_90
        return self.xa / m90 if m90 > 0 else 0.0

    @property
    def shots_per_90(self) -> float:
        m90 = self.minutes_per_90
        return self.shots / m90 if m90 > 0 else 0.0

    @property
    def progressive_passes_per_90(self) -> float:
        m90 = self.minutes_per_90
        return self.progressive_passes / m90 if m90 > 0 else 0.0

    @property
    def progressive_carries_per_90(self) -> float:
        m90 = self.minutes_per_90
        return self.progressive_carries / m90 if m90 > 0 else 0.0

    @property
    def tackles_per_90(self) -> float:
        m90 = self.minutes_per_90
        return self.tackles / m90 if m90 > 0 else 0.0

    @property
    def interceptions_per_90(self) -> float:
        m90 = self.minutes_per_90
        return self.interceptions / m90 if m90 > 0 else 0.0

    def __repr__(self) -> str:
        return f"<SeasonStats player={self.player_id} season={self.season}>"


# ---------------------------------------------------------------------------
# MarketValue
# ---------------------------------------------------------------------------
class MarketValue(Base):
    """A market value snapshot for a player at a point in time."""
    __tablename__ = "market_values"

    id = Column(Integer, primary_key=True, autoincrement=True)
    player_id = Column(Integer, ForeignKey("players.id", ondelete="CASCADE"), nullable=False)
    valuation_date = Column(Date, nullable=False)
    market_value_eur = Column(Float, nullable=False)  # Value in euros

    # Relationships
    player = relationship("Player", back_populates="market_values")

    # Indexes
    __table_args__ = (
        Index("ix_mv_player_id", "player_id"),
        Index("ix_mv_date", "valuation_date"),
    )

    def __repr__(self) -> str:
        return f"<MarketValue player={self.player_id} date={self.valuation_date} value={self.market_value_eur}>"


# ---------------------------------------------------------------------------
# Transfer
# ---------------------------------------------------------------------------
class Transfer(Base):
    """A transfer record — player moving from one club to another."""
    __tablename__ = "transfers"

    id = Column(Integer, primary_key=True, autoincrement=True)
    player_id = Column(Integer, ForeignKey("players.id", ondelete="CASCADE"), nullable=False)
    from_club_id = Column(Integer, ForeignKey("clubs.id", ondelete="SET NULL"), nullable=True)
    to_club_id = Column(Integer, ForeignKey("clubs.id", ondelete="SET NULL"), nullable=True)
    transfer_date = Column(Date, nullable=False)
    fee_eur = Column(Float, nullable=True)  # None = undisclosed, 0 = free transfer
    transfer_type = Column(String(50), default="Transfer")  # Transfer, Loan, Free, Youth

    # Relationships
    player = relationship("Player", back_populates="transfers")
    from_club = relationship("Club", foreign_keys=[from_club_id])
    to_club = relationship("Club", foreign_keys=[to_club_id])

    # Indexes
    __table_args__ = (
        Index("ix_transfers_player_id", "player_id"),
        Index("ix_transfers_date", "transfer_date"),
    )

    def __repr__(self) -> str:
        return f"<Transfer player={self.player_id} date={self.transfer_date}>"


# ---------------------------------------------------------------------------
# ModelPrediction
# ---------------------------------------------------------------------------
class ModelPrediction(Base):
    """A model-predicted market value for a player."""
    __tablename__ = "model_predictions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    player_id = Column(Integer, ForeignKey("players.id", ondelete="CASCADE"), nullable=False)
    prediction_date = Column(Date, nullable=False)
    predicted_value_eur = Column(Float, nullable=False)
    actual_market_value_eur = Column(Float, nullable=True)
    difference_percent = Column(Float, nullable=True)
    model_version = Column(String(50), nullable=False)

    # Relationships
    player = relationship("Player", back_populates="predictions")

    # Indexes
    __table_args__ = (
        Index("ix_mp_player_id", "player_id"),
        Index("ix_mp_date", "prediction_date"),
    )

    def __repr__(self) -> str:
        return f"<ModelPrediction player={self.player_id} predicted={self.predicted_value_eur}>"


# ---------------------------------------------------------------------------
# ModelRun
# ---------------------------------------------------------------------------
class ModelRun(Base):
    """Metadata about a model training run."""
    __tablename__ = "model_runs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    model_version = Column(String(50), nullable=False, unique=True)
    trained_at = Column(DateTime, default=datetime.utcnow)
    model_type = Column(String(100), nullable=False)  # e.g., "XGBoost", "RandomForest"
    
    # Evaluation metrics
    mae = Column(Float, nullable=True)    # Mean Absolute Error
    rmse = Column(Float, nullable=True)   # Root Mean Squared Error
    r2 = Column(Float, nullable=True)     # R-squared

    # Training configuration
    train_start = Column(String(10), nullable=True)
    train_end = Column(String(10), nullable=True)
    val_season = Column(String(10), nullable=True)
    test_season = Column(String(10), nullable=True)
    n_train_samples = Column(Integer, nullable=True)
    n_features = Column(Integer, nullable=True)
    feature_names = Column(JSON, nullable=True)  # List of feature names

    # Detailed evaluation results (stored as JSON for flexibility)
    evaluation_data = Column(JSON, nullable=True)

    # Indexes
    __table_args__ = (
        Index("ix_mr_version", "model_version"),
    )

    def __repr__(self) -> str:
        return f"<ModelRun version={self.model_version} type={self.model_type}>"
