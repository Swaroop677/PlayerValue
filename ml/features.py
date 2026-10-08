"""
Feature engineering for the PlayerValue ML pipeline.

Extracts real performance features across multi-season historical data,
computes per-90 metrics, one-hot encodes positions, and splits temporally
to prevent future-leakage.
"""
import os
import sys
import pandas as pd
import numpy as np

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from backend.database.database import engine

def load_raw_data():
    """
    Load raw player stats, market values, and league context from database.
    Aligns the valuation year with the end/start of the season.
    """
    query = """
    SELECT
        s.id AS stat_id,
        p.id AS player_id,
        p.name,
        p.primary_position AS position,
        p.date_of_birth,
        s.season,
        s.minutes,
        s.goals,
        s.assists,
        s.xg,
        s.xa,
        s.shots,
        s.key_passes,
        s.progressive_passes,
        s.progressive_carries,
        s.tackles,
        s.interceptions,
        s.aerial_wins,
        s.recoveries,
        s.clean_sheets,
        c.league_id,
        l.strength_rating AS league_strength,
        m.market_value_eur AS target_market_value
    FROM season_stats s
    JOIN players p ON s.player_id = p.id
    JOIN player_club_history h ON p.id = h.player_id AND s.season = h.season
    JOIN clubs c ON h.club_id = c.id
    JOIN leagues l ON c.league_id = l.id
    LEFT JOIN (
        SELECT player_id, SUBSTR(valuation_date, 1, 4) AS val_year, MAX(market_value_eur) AS market_value_eur
        FROM market_values
        GROUP BY player_id, SUBSTR(valuation_date, 1, 4)
    ) m ON p.id = m.player_id AND m.val_year = SUBSTR(s.season, 1, 4)
    WHERE s.minutes > 0
    """
    df = pd.read_sql(query, engine)
    return df

def extract_features(df):
    """
    Extract per-90 features, player age, and categorical encodings.
    """
    df = df.copy()

    # Calculate age during the season
    season_start_year = df["season"].str[:4].astype(int)
    birth_year = pd.to_datetime(df["date_of_birth"], errors='coerce').dt.year.fillna(1999).astype(int)
    df["age"] = (season_start_year - birth_year).clip(16, 42)

    # Per-90 calculations
    df["nineties"] = df["minutes"] / 90.0

    per_90_cols = [
        "goals", "assists", "xg", "xa", "shots", "key_passes",
        "progressive_passes", "progressive_carries",
        "tackles", "interceptions", "aerial_wins", "recoveries",
        "clean_sheets"
    ]

    for col in per_90_cols:
        df[f"{col}_per_90"] = np.where(df["nineties"] > 0, df[col] / df["nineties"], 0.0)

    # Target log-transformed
    df["target"] = np.log1p(df["target_market_value"].clip(lower=10000))

    # Standard positions list
    all_positions = ['GK', 'CB', 'LB', 'RB', 'DM', 'CM', 'AM', 'LM', 'RM', 'LW', 'RW', 'ST', 'CF']
    for pos in all_positions:
        df[f"pos_{pos}"] = (df["position"] == pos).astype(int)

    pos_cols = [f"pos_{p}" for p in all_positions]
    feature_cols = ["age", "league_strength", "minutes"] + [f"{c}_per_90" for c in per_90_cols] + pos_cols

    return df, feature_cols

def temporal_split(df):
    """
    Train: 2016-17 to 2022-23 (historical)
    Validation: 2023-24
    Test: 2024-25
    Predict (latest inference): 2024-25 / 2025-26
    """
    train_seasons = ['2016-17', '2017-18', '2018-19', '2019-20', '2020-21', '2021-22', '2022-23']
    val_season = '2023-24'
    test_season = '2024-25'

    train_df = df[df["season"].isin(train_seasons)].dropna(subset=["target"]).copy()
    val_df = df[df["season"] == val_season].dropna(subset=["target"]).copy()
    test_df = df[df["season"] == test_season].dropna(subset=["target"]).copy()

    # For latest predictions, predict all active players with minutes in 2024-25 or 2025-26
    predict_df = df[df["season"].isin(['2024-25', '2025-26'])].drop_duplicates(subset=['player_id'], keep='last').copy()

    return train_df, val_df, test_df, predict_df

def get_prepared_data():
    raw_df = load_raw_data()
    processed_df, feature_cols = extract_features(raw_df)
    return temporal_split(processed_df), feature_cols
