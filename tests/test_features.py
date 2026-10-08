import pytest
import pandas as pd
import numpy as np
from ml.features import extract_features, temporal_split
from ml.similarity import find_similar_players
from backend.data_providers.fpl_provider import FPLProvider
from backend.data_providers.transfermarkt_provider import TransfermarktFBrefProvider

def test_feature_engineering_math():
    raw = pd.DataFrame([{
        "stat_id": 1,
        "player_id": 101,
        "name": "Erling Haaland",
        "position": "ST",
        "date_of_birth": "2000-07-21",
        "season": "2024-25",
        "minutes": 1800,
        "goals": 20,
        "assists": 5,
        "xg": 18.0,
        "xa": 4.5,
        "shots": 80.0,
        "key_passes": 25.0,
        "progressive_passes": 30.0,
        "progressive_carries": 25.0,
        "tackles": 10.0,
        "interceptions": 5.0,
        "aerial_wins": 15.0,
        "recoveries": 20.0,
        "clean_sheets": 0,
        "league_id": "GB1",
        "league_strength": 5.0,
        "target_market_value": 180000000.0
    }])

    feat_df, cols = extract_features(raw)
    assert "goals_per_90" in feat_df.columns
    # 20 goals in 1800 mins = 1.0 per 90
    assert np.isclose(feat_df["goals_per_90"].iloc[0], 1.0)
    assert np.isclose(feat_df["assists_per_90"].iloc[0], 0.25)
    assert "target" in feat_df.columns
    assert np.isclose(feat_df["target"].iloc[0], np.log1p(180000000.0))
    assert feat_df["pos_ST"].iloc[0] == 1
    assert feat_df["pos_CB"].iloc[0] == 0

def test_temporal_split_integrity():
    df = pd.DataFrame([
        {"season": "2018-19", "target": 15.0},
        {"season": "2020-21", "target": 16.0},
        {"season": "2023-24", "target": 17.0},
        {"season": "2024-25", "target": 18.0},
        {"season": "2025-26", "target": 19.0, "player_id": 1}
    ])
    train, val, test, pred = temporal_split(df)
    assert len(train) == 2
    assert len(val) == 1
    assert len(test) == 1
    assert len(pred) == 2
    # Check that test season has no overlap with train
    assert not any(train["season"].isin(["2024-25"]))

def test_data_providers_instantiation():
    fpl = FPLProvider()
    assert fpl.get_provider_name() == "Official Fantasy Premier League (FPL) API"
    tm = TransfermarktFBrefProvider()
    assert tm.get_provider_name() == "Transfermarkt & FBref Authentic Dataset"
