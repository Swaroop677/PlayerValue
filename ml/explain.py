import os
import sys
import json
import joblib
import pandas as pd
import numpy as np

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from backend.database.models import ModelPrediction, Player, SeasonStats, MarketValue
from ml.features import get_prepared_data

def get_readable_feature_name(feature_col, val, mean_val):
    if feature_col == 'age':
        return f"Age {int(val)}"
    elif feature_col == 'league_strength':
        return "League Strength"
    elif feature_col == 'minutes':
        return "Playing Time"
    elif feature_col.startswith('pos_'):
        pos = feature_col.split('_')[1]
        return f"Position: {pos}"
    
    # Per-90 stats
    base = feature_col.replace('_per_90', '').replace('_', ' ').title()
    prefix = "High " if val > mean_val else "Low "
    return f"{prefix}{base}"

def explain_prediction(player_id, db_session):
    """
    Generate feature contributions for a specific player's prediction.
    """
    model_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "ml", "saved_models")
    model_path = os.path.join(model_dir, "model.joblib")
    scaler_path = os.path.join(model_dir, "scaler.joblib")
    features_path = os.path.join(model_dir, "features.json")
    
    if not os.path.exists(model_path):
        return {"error": "Model artifacts not found."}
        
    model = joblib.load(model_path)
    scaler = joblib.load(scaler_path)
    with open(features_path, 'r') as f:
        feature_cols = json.load(f)
        
    # We need the prepared data to get the population mean and the player's vector
    (_, _, test_df, predict_df), feature_cols = get_prepared_data()
    
    # Look for the player in the latest data (predict_df) or test_df
    df_search = pd.concat([test_df, predict_df])
    player_data = df_search[df_search['player_id'] == player_id]
    
    if player_data.empty:
        return {"error": "Player data not found for explanation."}
        
    # Get the latest season row
    player_row = player_data.sort_values('season', ascending=False).iloc[0]
    
    X_player = player_row[feature_cols].to_frame().T.fillna(0)
    X_scaled = scaler.transform(X_player)
    
    pred_log = model.predict(X_scaled)[0]
    pred_eur = np.expm1(pred_log)
    
    # Use population from test/predict df to find means
    X_pop = df_search[feature_cols].fillna(0)
    X_pop_scaled = scaler.transform(X_pop)
    
    mean_pred_log = np.mean(model.predict(X_pop_scaled))
    mean_pred_eur = np.expm1(mean_pred_log)
    
    # Feature importances (Random Forest or XGBoost)
    if hasattr(model, 'feature_importances_'):
        importances = model.feature_importances_
    else:
        # Fallback for models without feature_importances (e.g. Linear)
        importances = np.ones(len(feature_cols)) / len(feature_cols)
        
    # Calculate difference from mean feature values
    mean_features_scaled = np.mean(X_pop_scaled, axis=0)
    feat_diffs = X_scaled[0] - mean_features_scaled
    
    # Base contribution estimation
    # contribution roughly proportional to (importance * feature_diff)
    raw_contribs = importances * feat_diffs
    
    # Scale to match the EUR difference from the mean prediction
    diff_eur = pred_eur - mean_pred_eur
    
    sum_raw = np.sum(raw_contribs)
    if sum_raw != 0:
        scaling_factor = diff_eur / sum_raw
        contribs_eur = raw_contribs * scaling_factor
    else:
        contribs_eur = np.zeros(len(feature_cols))
        
    positive_contributors = []
    negative_contributors = []
    
    for i, col in enumerate(feature_cols):
        c_eur = float(contribs_eur[i])
        if abs(c_eur) < 50000: # Ignore tiny contributions
            continue
            
        val = X_player.iloc[0][col]
        mean_val = np.mean(X_pop[col])
        readable_name = get_readable_feature_name(col, val, mean_val)
        
        item = {
            "feature": readable_name,
            "contribution_eur": abs(c_eur),
            "direction": "positive" if c_eur > 0 else "negative"
        }
        
        if c_eur > 0:
            positive_contributors.append(item)
        else:
            negative_contributors.append(item)
            
    # Sort
    positive_contributors.sort(key=lambda x: x["contribution_eur"], reverse=True)
    negative_contributors.sort(key=lambda x: x["contribution_eur"], reverse=True) # Ascending by absolute impact
    
    return {
        "player_id": player_id,
        "predicted_value_eur": float(pred_eur),
        "mean_baseline_eur": float(mean_pred_eur),
        "positive_factors": positive_contributors[:5],
        "negative_factors": negative_contributors[:5]
    }
