"""
Feature engineering for the PlayerValue ML pipeline.

Extracts real multi-season performance metrics, calculates per-90 statistics,
encodes position, league strength, club tier, and temporal features without future data leakage.
"""
import os
import sys
import pandas as pd
import numpy as np

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from backend.database.database import engine

ELITE_CLUBS = {
    'Real Madrid', 'Manchester City', 'FC Barcelona', 'Paris Saint-Germain',
    'Bayern Munich', 'Arsenal FC', 'Liverpool FC', 'Chelsea FC'
}

UCL_CLUBS = {
    'Manchester United', 'Tottenham Hotspur', 'Newcastle United', 'Inter Milan',
    'Juventus FC', 'SSC Napoli', 'AC Milan', 'Borussia Dortmund',
    'RB Leipzig', 'Bayer 04 Leverkusen', 'Atlético de Madrid', 'Aston Villa'
}

TIER1_NATIONS = {
    'England', 'France', 'Spain', 'Germany', 'Italy',
    'Brazil', 'Argentina', 'Portugal', 'Netherlands'
}

ALL_POSITIONS = [
    'CB', 'LB', 'RB', 'DM', 'CM', 'AM', 'LM', 'RM', 'LW', 'RW', 'ST', 'CF'
]  # pos_GK removed based on ablation study

PER_90_STATS = [
    'goals', 'assists', 'xg', 'xa', 'shots', 'key_passes',
    'progressive_passes', 'progressive_carries',
    'tackles', 'interceptions', 'aerial_wins', 'recoveries'
]


def get_club_tier(cname: str) -> float:
    if cname in ELITE_CLUBS:
        return 4.0
    if cname in UCL_CLUBS:
        return 3.0
    return 2.0


def load_raw_data() -> pd.DataFrame:
    """
    Load raw player stats, market values, and league/club context from database.
    Aggregates stats strictly per player per season to avoid duplicate row leakage.
    """
    query = """
    SELECT
        p.id AS player_id,
        p.name,
        p.primary_position AS position,
        p.date_of_birth,
        p.nationality,
        s.season,
        SUM(s.minutes) as minutes,
        SUM(s.goals) as goals,
        SUM(s.assists) as assists,
        SUM(s.xg) as xg,
        SUM(s.xa) as xa,
        SUM(s.shots) as shots,
        SUM(s.key_passes) as key_passes,
        SUM(s.progressive_passes) as progressive_passes,
        SUM(s.progressive_carries) as progressive_carries,
        SUM(s.tackles) as tackles,
        SUM(s.interceptions) as interceptions,
        SUM(s.aerial_wins) as aerial_wins,
        SUM(s.recoveries) as recoveries,
        SUM(s.clean_sheets) as clean_sheets,
        MAX(c.id) AS club_id,
        MAX(c.name) AS club_name,
        MAX(c.league_id) as league_id,
        MAX(l.name) AS league_name,
        MAX(l.strength_rating) AS league_strength,
        MAX(m.market_value_eur) AS target_market_value
    FROM season_stats s
    JOIN players p ON s.player_id = p.id
    JOIN clubs c ON s.club_id = c.id
    JOIN leagues l ON c.league_id = l.id
    LEFT JOIN (
        SELECT player_id, SUBSTR(valuation_date, 1, 4) AS val_year, MAX(market_value_eur) AS market_value_eur
        FROM market_values
        GROUP BY player_id, SUBSTR(valuation_date, 1, 4)
    ) m ON p.id = m.player_id AND m.val_year = SUBSTR(s.season, 1, 4)
    WHERE s.minutes > 0
    GROUP BY p.id, s.season
    """
    df = pd.read_sql(query, engine)
    return df


def extract_features(df: pd.DataFrame):
    """
    Compute derived rates, volumes, positional indicators, and target transform.
    """
    df = df.copy()

    season_start_year = df['season'].str[:4].astype(int)
    birth_year = pd.to_datetime(df['date_of_birth'], errors='coerce').dt.year.fillna(1999).astype(int)
    df['age'] = (season_start_year - birth_year).clip(16, 42)

    df['nineties'] = np.maximum(df['minutes'] / 90.0, 0.1)
    df['minutes_share'] = (df['minutes'] / 3420.0).clip(0.0, 1.2)

    # Volume totals
    df['goal_contributions'] = df['goals'] + df['assists']
    df['xg_xa_total'] = df['xg'] + df['xa']

    # Per-90 metrics
    for col in PER_90_STATS:
        df[f'{col}_per_90'] = df[col] / df['nineties']

    df['goal_contribs_per_90'] = df['goal_contributions'] / df['nineties']
    df['xg_xa_per_90'] = df['xg_xa_total'] / df['nineties']

    # Positional categorizations
    df['is_forward'] = df['position'].isin(['ST', 'CF', 'LW', 'RW']).astype(float)
    df['is_midfielder'] = df['position'].isin(['AM', 'CM', 'DM', 'LM', 'RM']).astype(float)
    df['is_defender'] = df['position'].isin(['CB', 'LB', 'RB']).astype(float)
    df['is_gk'] = (df['position'] == 'GK').astype(float)

    # Clean sheets only credited to defensive positions
    df['clean_sheets_per_90'] = np.where(
        df['is_defender'] + df['is_gk'] > 0,
        df['clean_sheets'] / df['nineties'],
        0.0
    )

    # Specific position flags (excluding pos_GK per ablation study)
    for pos in ALL_POSITIONS:
        df[f'pos_{pos}'] = (df['position'] == pos).astype(float)

    # Club tier and market nation
    df['club_tier'] = df['club_name'].apply(get_club_tier)
    df['is_tier1_nation'] = df['nationality'].isin(TIER1_NATIONS).astype(float)

    # Target
    df['target'] = np.log1p(df['target_market_value'].clip(lower=10000))

    feature_cols = (
        ['age', 'league_strength', 'club_tier', 'is_tier1_nation', 'minutes', 'minutes_share'] +
        ['goals', 'assists', 'goal_contributions', 'xg', 'xa', 'xg_xa_total'] +
        [f'{c}_per_90' for c in PER_90_STATS] +
        ['goal_contribs_per_90', 'xg_xa_per_90', 'clean_sheets_per_90'] +
        ['is_forward', 'is_midfielder', 'is_defender', 'is_gk'] +
        [f'pos_{p}' for p in ALL_POSITIONS]
    )

    return df, feature_cols


def temporal_split(df: pd.DataFrame):
    """
    Time-based train/val/test split:
    Train: Earlier seasons up to 2023-24
    Val: 2023-24 season
    Test: 2024-25 season (held-out test set)
    Predict: Latest 2024-25 / 2025-26 active players for live site predictions
    """
    train_df = df[df['season'] <= '2023-24'].dropna(subset=['target']).copy()
    val_df = df[df['season'] == '2023-24'].dropna(subset=['target']).copy()
    test_df = df[df['season'] == '2024-25'].dropna(subset=['target']).copy()
    predict_df = df[df['season'].isin(['2024-25', '2025-26'])].drop_duplicates(subset=['player_id'], keep='last').copy()

    return train_df, val_df, test_df, predict_df


def get_prepared_data():
    raw_df = load_raw_data()
    processed_df, feature_cols = extract_features(raw_df)
    return temporal_split(processed_df), feature_cols
