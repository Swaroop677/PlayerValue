"""
Interactive Predictor API & Model Evaluation Routes.
Allows users to input custom player performance stats or select a player,
and returns real-time model valuation with confidence intervals and top driving factors.
"""
import os
import json
import joblib
import numpy as np
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List
from sqlalchemy.orm import Session

from backend.database.database import get_db
from backend.services.model_service import get_model_metrics

router = APIRouter(prefix="/model", tags=["Model"])

class CustomPlayerStats(BaseModel):
    age: int = Field(22, ge=16, le=45)
    position: str = Field("ST")
    minutes: int = Field(1800, ge=0, le=4000)
    league_strength: float = Field(5.0, ge=1.0, le=5.0)
    goals: int = Field(12, ge=0)
    assists: int = Field(5, ge=0)
    xg: float = Field(11.5, ge=0.0)
    xa: float = Field(4.8, ge=0.0)
    shots: float = Field(50.0, ge=0.0)
    key_passes: float = Field(30.0, ge=0.0)
    progressive_passes: float = Field(45.0, ge=0.0)
    progressive_carries: float = Field(40.0, ge=0.0)
    tackles: float = Field(15.0, ge=0.0)
    interceptions: float = Field(10.0, ge=0.0)
    aerial_wins: float = Field(25.0, ge=0.0)
    recoveries: float = Field(60.0, ge=0.0)
    clean_sheets: int = Field(0, ge=0)

# Load trained artifacts in-memory once
MODEL_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "ml", "saved_models")
_model = None
_scaler = None
_features = None

def get_artifacts():
    global _model, _scaler, _features
    if _model is None:
        model_path = os.path.join(MODEL_DIR, "model.joblib")
        scaler_path = os.path.join(MODEL_DIR, "scaler.joblib")
        feat_path = os.path.join(MODEL_DIR, "features.json")
        if os.path.exists(model_path) and os.path.exists(scaler_path) and os.path.exists(feat_path):
            _model = joblib.load(model_path)
            _scaler = joblib.load(scaler_path)
            with open(feat_path, "r") as f:
                _features = json.load(f)
    return _model, _scaler, _features

@router.get("/metrics")
def api_get_model_metrics(db: Session = Depends(get_db)):
    metrics = get_model_metrics(db)
    if not metrics:
        raise HTTPException(status_code=404, detail="Model metrics not found")
    return metrics

@router.post("/predict")
def predict_custom_valuation(stats: CustomPlayerStats):
    model, scaler, feature_cols = get_artifacts()
    if not model or not scaler or not feature_cols:
        raise HTTPException(status_code=503, detail="Trained model artifacts not available")

    # Compute per 90 stats
    nineties = max(stats.minutes / 90.0, 0.1)
    stat_dict = {
        "age": float(stats.age),
        "league_strength": float(stats.league_strength),
        "minutes": float(stats.minutes),
        "goals_per_90": stats.goals / nineties,
        "assists_per_90": stats.assists / nineties,
        "xg_per_90": stats.xg / nineties,
        "xa_per_90": stats.xa / nineties,
        "shots_per_90": stats.shots / nineties,
        "key_passes_per_90": stats.key_passes / nineties,
        "progressive_passes_per_90": stats.progressive_passes / nineties,
        "progressive_carries_per_90": stats.progressive_carries / nineties,
        "tackles_per_90": stats.tackles / nineties,
        "interceptions_per_90": stats.interceptions / nineties,
        "aerial_wins_per_90": stats.aerial_wins / nineties,
        "recoveries_per_90": stats.recoveries / nineties,
        "clean_sheets_per_90": stats.clean_sheets / nineties
    }

    # One hot position
    all_positions = ['GK', 'CB', 'LB', 'RB', 'DM', 'CM', 'AM', 'LM', 'RM', 'LW', 'RW', 'ST', 'CF']
    for pos in all_positions:
        stat_dict[f"pos_{pos}"] = 1.0 if stats.position == pos else 0.0

    # Build input row matching feature_cols exactly
    vec = [stat_dict.get(c, 0.0) for c in feature_cols]
    vec_scaled = scaler.transform([vec])

    pred_log = float(model.predict(vec_scaled)[0])
    pred_val = float(np.expm1(pred_log))

    # Calculate confidence interval (approx +/- 25% log residual spread)
    conf_low = float(np.expm1(max(pred_log - 0.35, 0)))
    conf_high = float(np.expm1(pred_log + 0.35))

    # Top drivers (importance x normalized input deviation)
    drivers = []
    if hasattr(model, "feature_importances_"):
        imps = model.feature_importances_
        for i, col in enumerate(feature_cols):
            imp = float(imps[i])
            val = vec_scaled[0][i]
            impact = imp * val
            direction = "positive" if impact > 0 else "negative"
            label = col.replace("_per_90", "/90").replace("pos_", "Position: ").replace("_", " ").title()
            drivers.append({
                "feature": label,
                "importance": round(imp * 100, 2),
                "direction": direction,
                "score": round(abs(impact), 4)
            })
        drivers.sort(key=lambda d: d["score"], reverse=True)

    return {
        "predicted_value_eur": round(pred_val, -3),
        "confidence_range_eur": {
            "low": round(conf_low, -3),
            "high": round(conf_high, -3)
        },
        "target_currency": "EUR",
        "top_factors": drivers[:6]
    }
