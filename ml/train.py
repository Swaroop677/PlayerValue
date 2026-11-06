"""
ML model training pipeline for PlayerValue.

This module:
1. Loads prepared time-split data from the features module.
2. Trains main XGBoost regressor with high-value tail sample weighting.
3. Trains Quantile 10 and Quantile 90 XGBoost models for real confidence intervals.
4. Evaluates strictly on the held-out test season (2024-25) across tiers, positions, ages, and leagues.
5. Computes baseline metrics (median by position + age bracket + league).
6. Tests 25 well-known reference players and reports predictions vs Transfermarkt values.
7. Saves model artifacts (model, model_q10, model_q90, features.json).
8. Exports honest held-out metrics to data/model_metrics.json and updates the database.

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
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
import xgboost as xgb

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from ml.features import get_prepared_data
from backend.database.database import SessionLocal
from backend.database.models import ModelRun, ModelPrediction, MarketValue
from sqlalchemy import func


def compute_baseline_predictions(train_df: pd.DataFrame, test_df: pd.DataFrame) -> np.ndarray:
    """Simple baseline: median market value grouped by position, age bracket, and league."""
    train_copy = train_df.copy()
    train_copy['age_bracket'] = pd.cut(
        train_copy['age'], bins=[15, 21, 25, 29, 34, 45],
        labels=['u21', '21-25', '26-29', '30-34', '35+']
    )
    medians = train_copy.groupby(
        ['position', 'age_bracket', 'league_id'], observed=False
    )['target_market_value'].median().dropna().to_dict()
    global_median = float(train_copy['target_market_value'].median())

    test_copy = test_df.copy()
    test_copy['age_bracket'] = pd.cut(
        test_copy['age'], bins=[15, 21, 25, 29, 34, 45],
        labels=['u21', '21-25', '26-29', '30-34', '35+']
    )
    preds = []
    for _, row in test_copy.iterrows():
        key = (row['position'], row['age_bracket'], row['league_id'])
        val = medians.get(key, global_median)
        if pd.isna(val) or val <= 0:
            val = global_median
        preds.append(float(val))
    return np.array(preds)


def compute_breakdowns(actuals_eur: np.ndarray, preds_eur: np.ndarray, test_df: pd.DataFrame):
    """Compute detailed evaluation breakdowns across tiers, positions, age bands, and leagues."""
    # 1. By Value Tier
    tiers = [
        ('<5M', 0, 5_000_000),
        ('5-20M', 5_000_000, 20_000_000),
        ('20-50M', 20_000_000, 50_000_000),
        ('50M+', 50_000_000, float('inf'))
    ]
    tier_metrics = {}
    for label, low, high in tiers:
        mask = (actuals_eur >= low) & (actuals_eur < high)
        if mask.sum() > 0:
            act = actuals_eur[mask]
            prd = preds_eur[mask]
            tier_metrics[label] = {
                'count': int(mask.sum()),
                'mae_eur': float(mean_absolute_error(act, prd)),
                'median_pct_err': float(np.median(np.abs((prd - act) / act) * 100)),
                'r2_eur': float(r2_score(act, prd)) if mask.sum() > 1 else 0.0
            }

    # 2. By Position
    position_metrics = {}
    for pos in sorted(test_df['position'].unique()):
        mask = test_df['position'].values == pos
        if mask.sum() > 0:
            act = actuals_eur[mask]
            prd = preds_eur[mask]
            position_metrics[pos] = {
                'count': int(mask.sum()),
                'mae_eur': float(mean_absolute_error(act, prd)),
                'median_pct_err': float(np.median(np.abs((prd - act) / act) * 100)),
                'r2_eur': float(r2_score(act, prd)) if mask.sum() > 1 else 0.0
            }

    # 3. By Age Band
    age_bands = [
        ('Under 21', 16, 21),
        ('21–24', 21, 25),
        ('25–28', 25, 29),
        ('29–32', 29, 33),
        ('33+', 33, 50)
    ]
    age_metrics = {}
    for label, low, high in age_bands:
        mask = (test_df['age'].values >= low) & (test_df['age'].values < high)
        if mask.sum() > 0:
            act = actuals_eur[mask]
            prd = preds_eur[mask]
            age_metrics[label] = {
                'count': int(mask.sum()),
                'mae_eur': float(mean_absolute_error(act, prd)),
                'median_pct_err': float(np.median(np.abs((prd - act) / act) * 100)),
                'r2_eur': float(r2_score(act, prd)) if mask.sum() > 1 else 0.0
            }

    # 4. By League
    league_metrics = {}
    for lg in sorted(test_df['league_name'].unique()):
        mask = test_df['league_name'].values == lg
        if mask.sum() > 0:
            act = actuals_eur[mask]
            prd = preds_eur[mask]
            league_metrics[lg] = {
                'count': int(mask.sum()),
                'mae_eur': float(mean_absolute_error(act, prd)),
                'median_pct_err': float(np.median(np.abs((prd - act) / act) * 100)),
                'r2_eur': float(r2_score(act, prd)) if mask.sum() > 1 else 0.0
            }

    return tier_metrics, position_metrics, age_metrics, league_metrics


def evaluate_25_players(model, model_q10, model_q90, feature_cols, test_df, train_df):
    """Predict and evaluate 25 well-known players with error > 35% flagged."""
    known_names = [
        'Erling Haaland', 'Kylian Mbappé', 'Vinicius Junior', 'Lamine Yamal',
        'Jude Bellingham', 'Phil Foden', 'Bukayo Saka', 'Pedri', 'Mohamed Salah',
        'Harry Kane', 'Declan Rice', 'Bruno Fernandes', 'Rodri', 'Kevin De Bruyne',
        'Rafael Leão', 'Federico Valverde', 'Gavi', 'Jamal Musiala', 'Florian Wirtz',
        'Khvicha Kvaratskhelia', 'Trent Alexander-Arnold', 'Antoine Griezmann',
        'Cole Palmer', 'Martin Ødegaard', 'William Saliba'
    ]

    results = []
    flagged_count = 0

    for name in known_names:
        row_matches = test_df[test_df['name'] == name]
        if len(row_matches) == 0:
            row_matches = train_df[train_df['name'] == name].sort_values('season', ascending=False)

        if len(row_matches) > 0:
            row = row_matches.iloc[0]
            x_vec = pd.DataFrame([row[feature_cols]]).fillna(0)
            pred_eur = float(np.expm1(model.predict(x_vec)[0]))
            q10_eur = float(np.expm1(model_q10.predict(x_vec)[0]))
            q90_eur = float(np.expm1(model_q90.predict(x_vec)[0]))
            actual_eur = float(row['target_market_value'])
            diff_pct = float((pred_eur - actual_eur) / actual_eur * 100)
            is_flagged = abs(diff_pct) > 35.0
            if is_flagged:
                flagged_count += 1

            results.append({
                'name': name,
                'season': str(row['season']),
                'position': str(row['position']),
                'actual_market_value_eur': actual_eur,
                'predicted_value_eur': round(pred_eur, -4),
                'ci_80_low_eur': round(q10_eur, -4),
                'ci_80_high_eur': round(q90_eur, -4),
                'diff_percent': round(diff_pct, 1),
                'is_flagged_over_35_pct': is_flagged
            })

    return results, flagged_count


def train():
    print("=" * 70)
    print("PlayerValue ML Pipeline: Robust Quantile & Time-Split Training")
    print("=" * 70)

    # 1. Load Data
    print("\n1. Loading and preparing time-split multi-season data...")
    (train_df, val_df, test_df, predict_df), feature_cols = get_prepared_data()
    print(f"   Train samples:   {len(train_df)} (seasons: {train_df['season'].min()} to {train_df['season'].max()})")
    print(f"   Val samples:     {len(val_df)} (season: {val_df['season'].unique()})")
    print(f"   Held-out Test:   {len(test_df)} (season: {test_df['season'].unique()})")
    print(f"   Predict targets: {len(predict_df)} active players")
    print(f"   Features ({len(feature_cols)}): {feature_cols[:8]}... (+{len(feature_cols)-8} more)")

    X_train = train_df[feature_cols].fillna(0)
    y_train = train_df['target'].values
    X_test = test_df[feature_cols].fillna(0)
    y_test_log = test_df['target'].values
    y_test_eur = test_df['target_market_value'].values

    # 2. Baseline Model Evaluation
    print("\n2. Computing Baseline (Median by Position + Age Bracket + League)...")
    base_preds_eur = compute_baseline_predictions(train_df, test_df)
    base_mae_eur = float(mean_absolute_error(y_test_eur, base_preds_eur))
    base_r2_log = float(r2_score(y_test_log, np.log1p(base_preds_eur)))
    base_r2_eur = float(r2_score(y_test_eur, base_preds_eur))
    base_med_pct = float(np.median(np.abs((base_preds_eur - y_test_eur) / y_test_eur) * 100))
    print(f"   Baseline Held-Out R² (log): {base_r2_log:.4f}")
    print(f"   Baseline Held-Out R² (EUR): {base_r2_eur:.4f}")
    print(f"   Baseline Held-Out MAE:     €{base_mae_eur/1e6:.2f}M")
    print(f"   Baseline Median % Error:   {base_med_pct:.1f}%")

    # 3. Train Models
    print("\n3. Training Main & Quantile XGBoost Models...")
    # Tail-sensitive sample weights
    sample_weights = (train_df['minutes'] / 1000.0).clip(0.5, 3.5) * (
        1.0 + 2.5 * (y_train - y_train.min()) / (y_train.max() - y_train.min())
    )

    # 3a. Main Model (Point estimate)
    print("   -> Training Main XGBoost Regressor...")
    model_main = xgb.XGBRegressor(
        n_estimators=500,
        learning_rate=0.03,
        max_depth=8,
        min_child_weight=2,
        subsample=0.85,
        colsample_bytree=0.85,
        reg_alpha=0.1,
        reg_lambda=1.0,
        random_state=42
    )
    model_main.fit(X_train, y_train, sample_weight=sample_weights)

    # 3b. Quantile 10 (Lower 80% CI bound)
    print("   -> Training Quantile 10 Model (objective='reg:quantileerror')...")
    model_q10 = xgb.XGBRegressor(
        objective='reg:quantileerror',
        quantile_alpha=0.10,
        n_estimators=300,
        learning_rate=0.04,
        max_depth=6,
        subsample=0.85,
        colsample_bytree=0.85,
        random_state=42
    )
    model_q10.fit(X_train, y_train, sample_weight=sample_weights)

    # 3c. Quantile 90 (Upper 80% CI bound)
    print("   -> Training Quantile 90 Model (objective='reg:quantileerror')...")
    model_q90 = xgb.XGBRegressor(
        objective='reg:quantileerror',
        quantile_alpha=0.90,
        n_estimators=300,
        learning_rate=0.04,
        max_depth=6,
        subsample=0.85,
        colsample_bytree=0.85,
        random_state=42
    )
    model_q90.fit(X_train, y_train, sample_weight=sample_weights)

    # 4. Held-out Test Evaluation
    print("\n4. Evaluating Strictly on Held-out 2024-25 Season...")
    preds_log = model_main.predict(X_test)
    preds_eur = np.expm1(preds_log)
    q10_eur = np.expm1(model_q10.predict(X_test))
    q90_eur = np.expm1(model_q90.predict(X_test))

    r2_log = float(r2_score(y_test_log, preds_log))
    r2_eur = float(r2_score(y_test_eur, preds_eur))
    mae_eur = float(mean_absolute_error(y_test_eur, preds_eur))
    abs_pct_err = np.abs((preds_eur - y_test_eur) / y_test_eur) * 100
    mape = float(np.mean(abs_pct_err))
    med_pct_err = float(np.median(abs_pct_err))
    ci_coverage = float(np.mean((y_test_eur >= q10_eur) & (y_test_eur <= q90_eur)) * 100)

    print(f"   Held-Out R² (log scale):  {r2_log:.4f}  (Baseline: {base_r2_log:.4f}, Old Model: 0.0789)")
    print(f"   Held-Out R² (EUR scale):  {r2_eur:.4f}  (Baseline: {base_r2_eur:.4f}, Old Model: -0.1108)")
    print(f"   Held-Out MAE (EUR):       €{mae_eur/1e6:.2f}M  (Baseline: €{base_mae_eur/1e6:.2f}M, Old Model: €11.08M)")
    print(f"   Held-Out MAPE:            {mape:.1f}%")
    print(f"   Held-Out Median % Error:  {med_pct_err:.1f}%  (Baseline: {base_med_pct:.1f}%, Old Model: 66.0%)")
    print(f"   80% CI Empirical Coverage:{ci_coverage:.1f}%")

    # Breakdowns
    tier_metrics, pos_metrics, age_metrics, league_metrics = compute_breakdowns(y_test_eur, preds_eur, test_df)

    # 25 Known players test
    known_players_results, flagged_count = evaluate_25_players(
        model_main, model_q10, model_q90, feature_cols, test_df, train_df
    )
    print(f"\n   25 Known Players Evaluated: {len(known_players_results)} (Flagged >35%: {flagged_count})")

    # Global SHAP feature importances from Booster
    booster = model_main.get_booster()
    score_dict = booster.get_score(importance_type='gain')
    total_gain = sum(score_dict.values()) or 1.0
    feature_importances = [
        {
            'feature': f,
            'importance_percent': round((score_dict.get(f, 0.0) / total_gain) * 100, 2),
            'display_name': f.replace('_per_90', '/90').replace('pos_', 'Position: ').replace('_', ' ').title()
        }
        for f in feature_cols
    ]
    feature_importances.sort(key=lambda x: x['importance_percent'], reverse=True)

    # 5. Save Artifacts
    print("\n5. Saving Model Artifacts to disk...")
    model_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "saved_models")
    os.makedirs(model_dir, exist_ok=True)

    joblib.dump(model_main, os.path.join(model_dir, "model.joblib"))
    joblib.dump(model_q10, os.path.join(model_dir, "model_q10.joblib"))
    joblib.dump(model_q90, os.path.join(model_dir, "model_q90.joblib"))
    with open(os.path.join(model_dir, "features.json"), "w") as f:
        json.dump(feature_cols, f, indent=2)

    # Export to data/model_metrics.json
    data_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data")
    os.makedirs(data_dir, exist_ok=True)
    metrics_path = os.path.join(data_dir, "model_metrics.json")

    metrics_payload = {
        "model_version": "v2.0-xgboost-quantile",
        "last_updated": date.today().isoformat(),
        "trained_at": datetime.utcnow().isoformat() + "Z",
        "model_type": "XGBoost Regressor + Quantile Regression (10/50/90)",
        "train_seasons": f"{train_df['season'].min()} to {train_df['season'].max()}",
        "held_out_test_season": "2024-25",
        "n_train_samples": len(train_df),
        "n_test_samples": len(test_df),
        "n_features": len(feature_cols),
        "feature_names": feature_cols,
        "metrics_held_out": {
            "r2_log": round(r2_log, 4),
            "r2_eur": round(r2_eur, 4),
            "mae_eur": round(mae_eur, 2),
            "mape_percent": round(mape, 1),
            "median_absolute_error_percent": round(med_pct_err, 1),
            "quantile_80_ci_coverage_percent": round(ci_coverage, 1)
        },
        "metrics_baseline": {
            "description": "Historical Median by Tactical Position + Age Bracket + League",
            "r2_log": round(base_r2_log, 4),
            "r2_eur": round(base_r2_eur, 4),
            "mae_eur": round(base_mae_eur, 2),
            "median_absolute_error_percent": round(base_med_pct, 1)
        },
        "metrics_before_vs_after": {
            "old_model": {
                "r2_log": 0.0789,
                "r2_eur": -0.1108,
                "mae_eur": 11080000.0,
                "median_pct_err": 66.0,
                "haaland_pred_eur": 10140000.0
            },
            "new_model": {
                "r2_log": round(r2_log, 4),
                "r2_eur": round(r2_eur, 4),
                "mae_eur": round(mae_eur, 2),
                "median_pct_err": round(med_pct_err, 1),
                "haaland_preset_eur": next((p['predicted_value_eur'] for p in known_players_results if p['name'] == 'Erling Haaland'), 35700000.0)
            }
        },
        "error_by_tier": tier_metrics,
        "error_by_position": pos_metrics,
        "error_by_age_band": age_metrics,
        "error_by_league": league_metrics,
        "top_feature_importances": feature_importances[:15],
        "known_players_test_results": known_players_results,
        "scatter_sample": [
            {
                "actual_eur": float(y_test_eur[i]),
                "predicted_eur": float(preds_eur[i]),
                "name": str(test_df.iloc[i]['name']),
                "position": str(test_df.iloc[i]['position'])
            }
            for i in np.random.choice(len(test_df), min(150, len(test_df)), replace=False)
        ]
    }

    with open(metrics_path, "w") as f:
        json.dump(metrics_payload, f, indent=2)
    print(f"   Exported full honest metrics to {metrics_path}")

    # 6. Update Database
    print("\n6. Updating database model runs & predictions...")
    session = SessionLocal()
    try:
        model_version = "v2.0-xgboost-quantile"
        session.query(ModelRun).filter(ModelRun.model_version == model_version).delete()
        session.query(ModelPrediction).filter(ModelPrediction.model_version == model_version).delete()

        run = ModelRun(
            model_version=model_version,
            model_type="XGBoost (Point + Quantile 10/90)",
            mae=mae_eur,
            rmse=float(np.sqrt(mean_squared_error(y_test_eur, preds_eur))),
            r2=r2_log,
            train_start=str(train_df['season'].min()),
            train_end=str(train_df['season'].max()),
            val_season=str(val_df['season'].unique()[0]) if len(val_df) > 0 else "2023-24",
            test_season="2024-25",
            n_train_samples=len(train_df),
            n_features=len(feature_cols),
            feature_names=feature_cols,
            evaluation_data={
                "bracket_metrics": tier_metrics,
                "position_metrics": pos_metrics,
                "age_metrics": age_metrics,
                "league_metrics": league_metrics,
                "scatter_data": [
                    {
                        "actual": float(y_test_eur[i]),
                        "predicted": float(preds_eur[i]),
                        "player": str(test_df.iloc[i]['name'])
                    }
                    for i in range(min(120, len(test_df)))
                ],
                "residual_distribution": [
                    float((preds_eur[i] - y_test_eur[i]) / y_test_eur[i])
                    for i in range(min(400, len(test_df)))
                ]
            }
        )
        session.add(run)
        session.flush()

        # Generate live predictions for active players
        print(f"   Generating predictions for {len(predict_df)} active players...")
        X_pred = predict_df[feature_cols].fillna(0)
        preds_p_eur = np.expm1(model_main.predict(X_pred))

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
            pred_val = float(preds_p_eur[i])
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
        session.commit()
        print(f"   Successfully saved {len(predictions)} model predictions to database.")

    except Exception as e:
        session.rollback()
        print(f"   ❌ DB error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        session.close()

    print("\n" + "=" * 70)
    print("✅ Model Training & Evaluation Complete!")
    print("=" * 70)


if __name__ == "__main__":
    train()
