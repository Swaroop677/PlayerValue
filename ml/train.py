"""
ML model training pipeline for PlayerValue.

This module:
1. Loads prepared data from the features module
2. Trains 4 model types (Dummy baseline, Linear, RandomForest, XGBoost)
3. Selects the best model based on validation R²
4. Retrains the best model on Train+Val combined
5. Evaluates on the held-out Test set
6. Saves model artifacts to disk
7. Logs the ModelRun and generates ModelPredictions in the database

Usage:
    python ml/train.py
"""
import os
import sys
import json
import joblib
import pandas as pd
import numpy as np
from datetime import datetime, date

from sklearn.dummy import DummyRegressor
from sklearn.linear_model import LinearRegression
from sklearn.ensemble import RandomForestRegressor
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score

try:
    from xgboost import XGBRegressor
    HAS_XGBOOST = True
except ImportError:
    HAS_XGBOOST = False
    print("Warning: XGBoost not installed, skipping XGBoost model.")

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from ml.features import get_prepared_data
from backend.database.database import SessionLocal
from backend.database.models import ModelRun, ModelPrediction


def evaluate_model(model, X, y):
    """Evaluate a model and return MAE, RMSE, R² in log-space."""
    preds = model.predict(X)
    mae = mean_absolute_error(y, preds)
    rmse = np.sqrt(mean_squared_error(y, preds))
    r2 = r2_score(y, preds)
    return mae, rmse, r2


def compute_detailed_evaluation(model, scaler, X, df):
    """
    Compute detailed evaluation metrics for the model analytics page:
    - Per-bracket (value range) metrics
    - Per-position metrics
    - Scatter data (actual vs predicted)
    - Residual distribution
    """
    preds_log = model.predict(X)
    preds = np.expm1(preds_log)
    actuals = np.expm1(df["target"].values)

    # ── Value brackets ────────────────────────────────────────────────
    brackets = [
        (0, 5_000_000, "€0-5M"),
        (5_000_000, 15_000_000, "€5-15M"),
        (15_000_000, 30_000_000, "€15-30M"),
        (30_000_000, 60_000_000, "€30-60M"),
        (60_000_000, float("inf"), "€60M+"),
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
                "r2": float(r2_score(b_actuals, b_preds)) if mask.sum() > 1 else 0.0,
            }

    # ── Per-position metrics ──────────────────────────────────────────
    pos_metrics = {}
    for pos in df["position"].unique():
        mask = df["position"].values == pos
        if mask.sum() > 0:
            p_actuals = actuals[mask]
            p_preds = preds[mask]
            pos_metrics[pos] = {
                "count": int(mask.sum()),
                "mae": float(mean_absolute_error(p_actuals, p_preds)),
                "rmse": float(np.sqrt(mean_squared_error(p_actuals, p_preds))),
                "r2": float(r2_score(p_actuals, p_preds)) if mask.sum() > 1 else 0.0,
            }

    # ── Scatter data (capped at 200 for JSON size) ────────────────────
    n_points = min(200, len(actuals))
    rng = np.random.default_rng(42)
    indices = rng.choice(len(actuals), n_points, replace=False)
    scatter_data = [
        {
            "actual": float(actuals[i]),
            "predicted": float(preds[i]),
            "player": str(df.iloc[i]["name"]),
        }
        for i in indices
    ]

    # ── Residual distribution ─────────────────────────────────────────
    residuals = np.where(actuals > 0, (preds - actuals) / actuals, 0)
    res_n = min(500, len(residuals))
    res_indices = rng.choice(len(residuals), res_n, replace=False)
    residual_data = [float(r) for r in residuals[res_indices]]

    return {
        "bracket_metrics": bracket_metrics,
        "position_metrics": pos_metrics,
        "scatter_data": scatter_data,
        "residual_distribution": residual_data,
    }


def train():
    """Main training pipeline."""
    print("=" * 60)
    print("PlayerValue ML Training Pipeline")
    print("=" * 60)

    # ── Load data ─────────────────────────────────────────────────────
    print("\n1. Loading and preparing data...")
    (train_df, val_df, test_df, predict_df), feature_cols = get_prepared_data()

    print(f"   Train:   {len(train_df)} samples")
    print(f"   Val:     {len(val_df)} samples")
    print(f"   Test:    {len(test_df)} samples")
    print(f"   Predict: {len(predict_df)} samples")
    print(f"   Features: {len(feature_cols)}")

    if len(train_df) == 0:
        print("ERROR: No training data available. Run seed_database.py first.")
        return

    X_train = train_df[feature_cols].fillna(0)
    y_train = train_df["target"]
    X_val = val_df[feature_cols].fillna(0)
    y_val = val_df["target"]

    # ── Scale features ────────────────────────────────────────────────
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_val_scaled = scaler.transform(X_val)

    # ── Train candidate models ────────────────────────────────────────
    print("\n2. Training candidate models...")
    models = {
        "Dummy": DummyRegressor(strategy="mean"),
        "LinearRegression": LinearRegression(),
        "RandomForest": RandomForestRegressor(
            n_estimators=100, max_depth=12, min_samples_leaf=5, random_state=42
        ),
    }
    if HAS_XGBOOST:
        models["XGBoost"] = XGBRegressor(
            n_estimators=150, learning_rate=0.08, max_depth=6,
            subsample=0.8, colsample_bytree=0.8, random_state=42
        )

    best_model_name = None
    best_model = None
    best_val_r2 = -float("inf")

    for name, model in models.items():
        model.fit(X_train_scaled, y_train)
        mae, rmse, r2 = evaluate_model(model, X_val_scaled, y_val)
        print(f"   {name:20s} MAE={mae:.4f}  RMSE={rmse:.4f}  R²={r2:.4f}")

        if r2 > best_val_r2:
            best_val_r2 = r2
            best_model_name = name
            best_model = model

    print(f"\n   ✅ Best model: {best_model_name} (Val R²: {best_val_r2:.4f})")

    # ── Retrain on Train + Val ────────────────────────────────────────
    print("\n3. Retraining best model on Train + Val combined...")
    train_val_df = pd.concat([train_df, val_df])
    X_train_val = train_val_df[feature_cols].fillna(0)
    y_train_val = train_val_df["target"]

    scaler = StandardScaler()
    X_train_val_scaled = scaler.fit_transform(X_train_val)

    # Create a fresh instance of the best model type
    model_constructors = {
        "Dummy": lambda: DummyRegressor(strategy="mean"),
        "LinearRegression": lambda: LinearRegression(),
        "RandomForest": lambda: RandomForestRegressor(
            n_estimators=100, max_depth=12, min_samples_leaf=5, random_state=42
        ),
    }
    if HAS_XGBOOST:
        model_constructors["XGBoost"] = lambda: XGBRegressor(
            n_estimators=150, learning_rate=0.08, max_depth=6,
            subsample=0.8, colsample_bytree=0.8, random_state=42
        )

    final_model = model_constructors[best_model_name]()
    final_model.fit(X_train_val_scaled, y_train_val)

    # ── Evaluate on Test set ──────────────────────────────────────────
    print("\n4. Evaluating on held-out test set...")
    X_test = test_df[feature_cols].fillna(0)
    y_test = test_df["target"]
    X_test_scaled = scaler.transform(X_test)

    mae_test, rmse_test, r2_test = evaluate_model(final_model, X_test_scaled, y_test)
    print(f"   Test MAE:  {mae_test:.4f}")
    print(f"   Test RMSE: {rmse_test:.4f}")
    print(f"   Test R²:   {r2_test:.4f}")

    # Compute EUR-space metrics for the model analytics page
    test_preds_log = final_model.predict(X_test_scaled)
    test_preds_eur = np.expm1(test_preds_log)
    test_actuals_eur = np.expm1(y_test.values)
    mae_eur = float(mean_absolute_error(test_actuals_eur, test_preds_eur))
    rmse_eur = float(np.sqrt(mean_squared_error(test_actuals_eur, test_preds_eur)))

    eval_data = compute_detailed_evaluation(final_model, scaler, X_test_scaled, test_df)

    # ── Save model artifacts ──────────────────────────────────────────
    print("\n5. Saving model artifacts...")
    model_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "saved_models")
    os.makedirs(model_dir, exist_ok=True)

    joblib.dump(final_model, os.path.join(model_dir, "model.joblib"))
    joblib.dump(scaler, os.path.join(model_dir, "scaler.joblib"))
    with open(os.path.join(model_dir, "features.json"), "w") as f:
        json.dump(feature_cols, f)
    print(f"   Saved to {model_dir}/")

    # ── Log to database ───────────────────────────────────────────────
    print("\n6. Logging to database...")
    model_version = f"v1.0-{best_model_name.lower()}"

    session = SessionLocal()
    try:
        # Remove previous runs with the same version
        session.query(ModelRun).filter(ModelRun.model_version == model_version).delete()
        session.query(ModelPrediction).filter(ModelPrediction.model_version == model_version).delete()

        # Create ModelRun
        run = ModelRun(
            model_version=model_version,
            model_type=best_model_name,
            mae=mae_eur,
            rmse=rmse_eur,
            r2=float(r2_test),
            train_start="2019-20",
            train_end="2023-24",
            val_season="2023-24",
            test_season="2024-25",
            n_train_samples=len(train_val_df),
            n_features=len(feature_cols),
            feature_names=feature_cols,
            evaluation_data=eval_data,
        )
        session.add(run)
        session.flush()

        # ── Generate predictions for latest season ────────────────────
        if len(predict_df) > 0:
            print(f"   Generating {len(predict_df)} predictions for 2025-26...")
            X_pred = predict_df[feature_cols].fillna(0)
            X_pred_scaled = scaler.transform(X_pred)
            preds_log = final_model.predict(X_pred_scaled)
            preds_eur = np.expm1(preds_log)

            # Get latest actual market values for comparison
            from backend.database.models import MarketValue
            from sqlalchemy import func

            latest_mv_sub = (
                session.query(
                    MarketValue.player_id,
                    func.max(MarketValue.valuation_date).label("max_date"),
                )
                .group_by(MarketValue.player_id)
                .subquery()
            )
            latest_mvs = (
                session.query(MarketValue.player_id, MarketValue.market_value_eur)
                .join(
                    latest_mv_sub,
                    (MarketValue.player_id == latest_mv_sub.c.player_id)
                    & (MarketValue.valuation_date == latest_mv_sub.c.max_date),
                )
                .all()
            )
            mv_lookup = {pid: val for pid, val in latest_mvs}

            predictions = []
            for i, (_, row) in enumerate(predict_df.iterrows()):
                pred_val = float(preds_eur[i])
                actual_val = mv_lookup.get(int(row["player_id"]))
                diff_pct = None
                if actual_val and actual_val > 0:
                    diff_pct = ((pred_val - actual_val) / actual_val) * 100

                predictions.append(
                    ModelPrediction(
                        player_id=int(row["player_id"]),
                        prediction_date=date.today(),
                        predicted_value_eur=pred_val,
                        actual_market_value_eur=actual_val,
                        difference_percent=diff_pct,
                        model_version=model_version,
                    )
                )
            session.add_all(predictions)
            print(f"   Stored {len(predictions)} predictions.")

        session.commit()
        print("\n✅ Training complete and logged to database.")

    except Exception as e:
        session.rollback()
        print(f"\n❌ Error logging to DB: {e}")
        import traceback
        traceback.print_exc()
    finally:
        session.close()

    print("=" * 60)


if __name__ == "__main__":
    train()
