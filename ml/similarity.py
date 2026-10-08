"""
Player similarity engine for PlayerValue.

Uses cosine similarity on standardized per-90 stats to find statistically
similar players. The feature vector is built from the latest season's
per-90 metrics, then scaled (zero-mean, unit-variance) before computing
cosine similarity.

WHY COSINE SIMILARITY?
Cosine similarity measures the angle between two vectors, making it
scale-invariant. A striker with 0.6 goals/90 and 0.3 assists/90 is
"similar" to one with 1.2 goals/90 and 0.6 assists/90 because the
proportions are the same. This captures play-style rather than raw output.
"""
import os
import sys
import pandas as pd
import numpy as np
from sklearn.preprocessing import StandardScaler
from sklearn.metrics.pairwise import cosine_similarity

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


def find_similar_players(player_id, db_session, n=5, filters=None):
    """
    Find the N most statistically similar players based on per-90 metrics.

    Args:
        player_id: ID of the target player.
        db_session: SQLAlchemy session.
        n: Number of similar players to return.
        filters: Optional dict with keys: same_position, max_age,
                 max_value, different_league.

    Returns:
        List of dicts with id, name, primary_position, age,
        market_value_eur, similarity_percent.
    """
    if filters is None:
        filters = {}

    query = """
    WITH latest_stats AS (
        SELECT s.*
        FROM season_stats s
        INNER JOIN (
            SELECT player_id, MAX(season) AS max_season
            FROM season_stats
            WHERE minutes >= 450
            GROUP BY player_id
        ) ls ON s.player_id = ls.player_id AND s.season = ls.max_season
    ),
    latest_mv AS (
        SELECT mv.*
        FROM market_values mv
        INNER JOIN (
            SELECT player_id, MAX(valuation_date) AS max_date
            FROM market_values
            GROUP BY player_id
        ) lmv ON mv.player_id = lmv.player_id AND mv.valuation_date = lmv.max_date
    )
    SELECT
        p.id AS player_id,
        p.name,
        p.primary_position,
        p.date_of_birth,
        ls.season,
        ls.minutes,
        ls.goals,
        ls.assists,
        ls.xg,
        ls.xa,
        ls.shots,
        ls.key_passes,
        ls.progressive_passes,
        ls.progressive_carries,
        ls.tackles,
        ls.interceptions,
        ls.aerial_wins,
        ls.recoveries,
        ls.clean_sheets,
        h.club_id,
        c.league_id,
        lm.market_value_eur
    FROM players p
    JOIN latest_stats ls ON p.id = ls.player_id
    JOIN player_club_history h ON p.id = h.player_id AND ls.season = h.season
    JOIN clubs c ON h.club_id = c.id
    LEFT JOIN latest_mv lm ON p.id = lm.player_id
    """

    df = pd.read_sql(query, db_session.bind)
    if df.empty or player_id not in df["player_id"].values:
        return []

    # Calculate age
    df["age"] = pd.Timestamp.now().year - pd.to_datetime(df["date_of_birth"]).dt.year

    # Calculate per-90 stats
    df["nineties"] = df["minutes"] / 90.0
    stat_cols = [
        "goals", "assists", "xg", "xa", "shots", "key_passes",
        "progressive_passes", "progressive_carries",
        "tackles", "interceptions", "aerial_wins", "recoveries",
        "clean_sheets",
    ]

    feature_cols = []
    for col in stat_cols:
        new_col = f"{col}_p90"
        df[new_col] = np.where(df["nineties"] > 0, df[col] / df["nineties"], 0)
        feature_cols.append(new_col)

    df = df.fillna(0)

    # Scale features and compute cosine similarity
    scaler = StandardScaler()
    scaled_features = scaler.fit_transform(df[feature_cols])
    similarity_matrix = cosine_similarity(scaled_features)

    # Find the target player's index
    player_idx = df.index[df["player_id"] == player_id].tolist()
    if not player_idx:
        return []
    player_idx = player_idx[0]
    player_row = df.iloc[player_idx]

    sim_scores = similarity_matrix[player_idx]
    # Convert to percentage (cosine similarity ranges from -1 to 1)
    df["similarity_percent"] = np.clip((sim_scores + 1) / 2 * 100, 0, 100)

    # Exclude the player themselves
    filtered_df = df[df["player_id"] != player_id].copy()

    # Apply filters
    if filters.get("same_position"):
        filtered_df = filtered_df[
            filtered_df["primary_position"] == player_row["primary_position"]
        ]
    if filters.get("max_age"):
        filtered_df = filtered_df[filtered_df["age"] <= int(filters["max_age"])]
    if filters.get("max_value") and "market_value_eur" in filtered_df.columns:
        filtered_df = filtered_df[
            filtered_df["market_value_eur"] <= float(filters["max_value"])
        ]
    if filters.get("different_league"):
        filtered_df = filtered_df[
            filtered_df["league_id"] != player_row["league_id"]
        ]

    # Sort by similarity and take top N
    top_similar = filtered_df.sort_values("similarity_percent", ascending=False).head(n)

    result = []
    for _, row in top_similar.iterrows():
        result.append({
            "id": int(row["player_id"]),
            "name": row["name"],
            "primary_position": row["primary_position"],
            "age": int(row["age"]),
            "market_value_eur": float(row["market_value_eur"]) if pd.notnull(row["market_value_eur"]) else None,
            "similarity_percent": round(float(row["similarity_percent"]), 1),
        })

    return result
