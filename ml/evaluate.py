import os
import sys
import json
import joblib
import pandas as pd
import numpy as np

from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from ml.features import get_prepared_data

def evaluate():
    """
    Evaluates the trained model and returns metrics as a dictionary.
    """
    model_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "ml", "saved_models")
    model_path = os.path.join(model_dir, "model.joblib")
    scaler_path = os.path.join(model_dir, "scaler.joblib")
    features_path = os.path.join(model_dir, "features.json")
    
    if not os.path.exists(model_path):
        return {"error": "Model not found."}
        
    model = joblib.load(model_path)
    scaler = joblib.load(scaler_path)
    with open(features_path, 'r') as f:
        feature_cols = json.load(f)
        
    _, _, test_df, _ = get_prepared_data()
    
    X_test = test_df[feature_cols].fillna(0)
    y_test = test_df['target']
    
    X_test_scaled = scaler.transform(X_test)
    preds_log = model.predict(X_test_scaled)
    
    mae_log = float(mean_absolute_error(y_test, preds_log))
    rmse_log = float(np.sqrt(mean_squared_error(y_test, preds_log)))
    r2_log = float(r2_score(y_test, preds_log))
    
    preds = np.expm1(preds_log)
    actuals = np.expm1(y_test.values)
    
    # Value brackets
    brackets = [
        (0, 5_000_000, "€0-5M"),
        (5_000_000, 15_000_000, "€5-15M"),
        (15_000_000, 30_000_000, "€15-30M"),
        (30_000_000, 60_000_000, "€30-60M"),
        (60_000_000, float('inf'), "€60M+")
    ]
    
    bracket_metrics = {}
    for low, high, label in brackets:
        mask = (actuals >= low) & (actuals < high)
        if mask.sum() > 0:
            b_actuals = actuals[mask]
            b_preds = preds[mask]
            bracket_metrics[label] = {
                "count": int(mask.sum()),
                "mae": float(mean_absolute_error(b_actuals, b_preds)),
                "rmse": float(np.sqrt(mean_squared_error(b_actuals, b_preds))),
                "r2": float(r2_score(b_actuals, b_preds)) if mask.sum() > 1 else 0.0
            }
            
    # Position metrics
    pos_metrics = {}
    positions = test_df['position'].unique()
    for pos in positions:
        mask = test_df['position'] == pos
        if mask.sum() > 0:
            p_actuals = actuals[mask]
            p_preds = preds[mask]
            pos_metrics[pos] = {
                "count": int(mask.sum()),
                "mae": float(mean_absolute_error(p_actuals, p_preds)),
                "rmse": float(np.sqrt(mean_squared_error(p_actuals, p_preds))),
                "r2": float(r2_score(p_actuals, p_preds)) if mask.sum() > 1 else 0.0
            }
            
    scatter_data = [{"actual": float(actuals[i]), "predicted": float(preds[i]), "player": str(test_df.iloc[i]['name'])} for i in range(min(200, len(actuals)))]
    
    residuals = (preds - actuals) / actuals
    res_indices = np.random.choice(len(residuals), min(500, len(residuals)), replace=False)
    residual_data = [float(r) for r in residuals[res_indices]]

    return {
        "global_metrics": {
            "mae_log": mae_log,
            "rmse_log": rmse_log,
            "r2_log": r2_log
        },
        "bracket_metrics": bracket_metrics,
        "position_metrics": pos_metrics,
        "scatter_data": scatter_data,
        "residual_distribution": residual_data
    }

if __name__ == "__main__":
    results = evaluate()
    print(json.dumps(results, indent=2))
