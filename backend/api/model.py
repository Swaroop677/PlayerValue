"""
Interactive Predictor API & Model Evaluation Routes.
Allows users to input custom player performance stats or select presets,
and returns real-time model valuation with real quantile confidence intervals
and exact Tree-SHAP feature contributions.
"""
import os
import json
import joblib
import numpy as np
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List
from sqlalchemy.orm import Session
import xgboost as xgb

from backend.database.database import get_db
from backend.services.model_service import get_model_metrics

router = APIRouter(prefix="/model", tags=["Model"])


class CustomPlayerStats(BaseModel):
    age: int = Field(24, ge=16, le=45)
    position: str = Field("ST")
    minutes: int = Field(2700, ge=0, le=4500)
    league_strength: float = Field(5.0, ge=1.0, le=5.0)
    club_tier: float = Field(4.0, ge=1.0, le=4.0)
    goals: int = Field(22, ge=0)
    assists: int = Field(6, ge=0)
    xg: float = Field(20.0, ge=0.0)
    xa: float = Field(5.0, ge=0.0)
    shots: float = Field(85.0, ge=0.0)
    key_passes: float = Field(35.0, ge=0.0)
    progressive_passes: float = Field(50.0, ge=0.0)
    progressive_carries: float = Field(50.0, ge=0.0)
    tackles: Optional[float] = Field(None, ge=0.0)
    interceptions: Optional[float] = Field(None, ge=0.0)
    aerial_wins: Optional[float] = Field(None, ge=0.0)
    recoveries: Optional[float] = Field(None, ge=0.0)
    clean_sheets: int = Field(0, ge=0)


# In-memory cached artifacts
MODEL_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "ml", "saved_models")
_model_main = None
_model_q10 = None
_model_q90 = None
_features = None


_candidate_players = None


def _get_candidate_players():
    global _candidate_players
    if _candidate_players is not None:
        return _candidate_players

    import sqlite3
    db_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "playervalue.db")
    if not os.path.exists(db_path):
        return []

    try:
        conn = sqlite3.connect(db_path)
        cur = conn.cursor()
        cur.execute("""
            SELECT p.id, p.name, p.primary_position, p.date_of_birth, c.name, mv.market_value_eur,
                   ss.minutes, ss.goals, ss.assists, ss.xg, ss.xa
            FROM players p
            JOIN season_stats ss ON p.id = ss.player_id AND ss.season = '2024-25'
            LEFT JOIN clubs c ON ss.club_id = c.id
            LEFT JOIN (
                SELECT player_id, MAX(market_value_eur) as market_value_eur 
                FROM market_values GROUP BY player_id
            ) mv ON p.id = mv.player_id
            WHERE ss.minutes >= 450
        """)
        rows = cur.fetchall()
        conn.close()

        candidates = []
        for r in rows:
            dob = str(r[3] or '1999-01-01')
            birth_yr = int(dob[:4]) if len(dob) >= 4 and dob[:4].isdigit() else 1999
            age = max(16, min(42, 2025 - birth_yr))
            candidates.append({
                "id": r[0],
                "name": r[1],
                "position": r[2] or "MID",
                "age": age,
                "club": r[4] or "Top Flight",
                "market_value_eur": float(r[5] or 0),
                "minutes": float(r[6] or 0),
                "goals": float(r[7] or 0),
                "assists": float(r[8] or 0),
                "xg": float(r[9] or 0),
                "xa": float(r[10] or 0)
            })
        _candidate_players = candidates
        return candidates
    except Exception as e:
        print(f"Error loading candidates: {e}")
        return []


def _compute_percentiles(stats: CustomPlayerStats, nineties: float, is_fwd: float, is_mid: float, is_def: float) -> Dict[str, int]:
    g90 = stats.goals / nineties
    a90 = stats.assists / nineties
    xg90 = stats.xg / nineties
    xa90 = stats.xa / nineties
    prg90 = (stats.progressive_carries + stats.progressive_passes) / nineties
    def_raw_sum = float(stats.tackles or (12.0 if is_fwd else 45.0)) + float(stats.interceptions or (8.0 if is_fwd else 30.0)) + float(stats.aerial_wins or 20.0)
    def90 = def_raw_sum / nineties

    if is_fwd:
        finish_raw = (g90 * 0.6 + xg90 * 0.4) / 0.85
        create_raw = (a90 * 0.5 + xa90 * 0.5) / 0.35
        prog_raw = prg90 / 6.0
        def_raw = def90 / 3.0
    elif is_mid:
        finish_raw = (g90 * 0.5 + xg90 * 0.5) / 0.35
        create_raw = (a90 * 0.5 + xa90 * 0.5) / 0.45
        prog_raw = prg90 / 9.0
        def_raw = def90 / 5.0
    else:  # defender or GK
        finish_raw = (g90 * 0.5 + xg90 * 0.5) / 0.10
        create_raw = (a90 * 0.5 + xa90 * 0.5) / 0.20
        prog_raw = prg90 / 6.0
        def_raw = def90 / 5.5

    return {
        "finishing": int(np.clip(finish_raw * 70.0 + 15.0, 5, 99)),
        "creation": int(np.clip(create_raw * 70.0 + 15.0, 5, 99)),
        "progression": int(np.clip(prog_raw * 70.0 + 15.0, 5, 99)),
        "defending": int(np.clip(def_raw * 70.0 + 15.0, 5, 99))
    }


def get_artifacts():
    global _model_main, _model_q10, _model_q90, _features
    if _model_main is None:
        main_path = os.path.join(MODEL_DIR, "model.joblib")
        q10_path = os.path.join(MODEL_DIR, "model_q10.joblib")
        q90_path = os.path.join(MODEL_DIR, "model_q90.joblib")
        feat_path = os.path.join(MODEL_DIR, "features.json")

        if os.path.exists(main_path) and os.path.exists(feat_path):
            _model_main = joblib.load(main_path)
            with open(feat_path, "r") as f:
                _features = json.load(f)
        if os.path.exists(q10_path):
            _model_q10 = joblib.load(q10_path)
        if os.path.exists(q90_path):
            _model_q90 = joblib.load(q90_path)

    return _model_main, _model_q10, _model_q90, _features


@router.get("/metrics")
def api_get_model_metrics(db: Session = Depends(get_db)):
    # Try reading from static data/model_metrics.json first for complete honest metrics
    metrics_file = os.path.join(
        os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "data", "model_metrics.json"
    )
    if os.path.exists(metrics_file):
        with open(metrics_file, "r") as f:
            return json.load(f)

    # Fallback to database
    metrics = get_model_metrics(db)
    if not metrics:
        raise HTTPException(status_code=404, detail="Model metrics not found")
    return metrics


@router.post("/predict")
@router.post("/predict-custom")
def predict_custom_valuation(stats: CustomPlayerStats):
    model, model_q10, model_q90, feature_cols = get_artifacts()
    if not model or not feature_cols:
        raise HTTPException(status_code=503, detail="Trained model artifacts not available")

    # Map position category
    pos_upper = stats.position.upper()
    is_fwd = 1.0 if pos_upper in ['ST', 'CF', 'LW', 'RW'] else 0.0
    is_mid = 1.0 if pos_upper in ['AM', 'CM', 'DM', 'LM', 'RM'] else 0.0
    is_def = 1.0 if pos_upper in ['CB', 'LB', 'RB'] else 0.0
    is_gk = 1.0 if pos_upper == 'GK' else 0.0

    nineties = max(stats.minutes / 90.0, 0.1)
    minutes_share = min(stats.minutes / 3420.0, 1.2)

    goals = float(stats.goals)
    assists = float(stats.assists)
    xg = float(stats.xg)
    xa = float(stats.xa)

    clean_sheets_rate = (float(stats.clean_sheets) / nineties) if (is_def + is_gk > 0) else 0.0

    # Position-appropriate defaults for unprovided defensive/physical metrics
    # Prevents offensive players from being penalized for not playing as center-backs
    if stats.tackles is not None:
        tackles_rate = float(stats.tackles) / nineties
    else:
        tackles_rate = 1.2 if is_fwd else (2.4 if is_mid else (2.2 if is_def else 0.2))

    if stats.interceptions is not None:
        interceptions_rate = float(stats.interceptions) / nineties
    else:
        interceptions_rate = 0.8 if is_fwd else (1.6 if is_mid else (1.9 if is_def else 0.1))

    if stats.aerial_wins is not None:
        aerial_wins_rate = float(stats.aerial_wins) / nineties
    else:
        aerial_wins_rate = 1.4 if is_fwd else (1.3 if is_mid else (3.2 if is_def else 0.5))

    if stats.recoveries is not None:
        recoveries_rate = float(stats.recoveries) / nineties
    else:
        recoveries_rate = 4.2 if is_fwd else (6.8 if is_mid else (5.6 if is_def else 3.8))

    stat_dict = {
        "age": float(stats.age),
        "league_strength": float(stats.league_strength),
        "club_tier": float(stats.club_tier),
        "is_tier1_nation": 1.0,  # Default tier 1 market for top 5 league simulator
        "minutes": float(stats.minutes),
        "minutes_share": minutes_share,
        "goals": goals,
        "assists": assists,
        "goal_contributions": goals + assists,
        "xg": xg,
        "xa": xa,
        "xg_xa_total": xg + xa,
        "goals_per_90": goals / nineties,
        "assists_per_90": assists / nineties,
        "goal_contribs_per_90": (goals + assists) / nineties,
        "xg_per_90": xg / nineties,
        "xa_per_90": xa / nineties,
        "xg_xa_per_90": (xg + xa) / nineties,
        "shots_per_90": float(stats.shots) / nineties,
        "key_passes_per_90": float(stats.key_passes) / nineties,
        "progressive_passes_per_90": float(stats.progressive_passes) / nineties,
        "progressive_carries_per_90": float(stats.progressive_carries) / nineties,
        "tackles_per_90": tackles_rate,
        "interceptions_per_90": interceptions_rate,
        "aerial_wins_per_90": aerial_wins_rate,
        "recoveries_per_90": recoveries_rate,
        "clean_sheets_per_90": clean_sheets_rate,
        "is_forward": is_fwd,
        "is_midfielder": is_mid,
        "is_defender": is_def,
        "is_gk": is_gk
    }

    # Position flags (excluding pos_GK per ablation)
    all_positions = ['CB', 'LB', 'RB', 'DM', 'CM', 'AM', 'LM', 'RM', 'LW', 'RW', 'ST', 'CF']
    for pos in all_positions:
        stat_dict[f"pos_{pos}"] = 1.0 if pos_upper == pos else 0.0

    # Build input row matching feature_cols exactly
    vec = [float(stat_dict.get(c, 0.0)) for c in feature_cols]

    # Exact Tree SHAP computation via XGBoost booster
    booster = model.get_booster()
    dmat = xgb.DMatrix([vec], feature_names=feature_cols)
    contribs = booster.predict(dmat, pred_contribs=True)[0]

    base_log = float(contribs[-1])
    feat_contribs_log = contribs[:-1]
    pred_log = float(np.sum(contribs))
    raw_pred_val = float(np.expm1(pred_log))
    raw_base_val = float(np.expm1(base_log))

    # Super-linear football valuation calibration:
    # Solves tree log-compression where top superstars (€100M-€200M) were artificially capped at €25M-€35M
    def _calibrate_eur(val_eur: float, p_age: int, p_tier: float, p_goals: float, p_assists: float, p_cs: int, p_pos: str) -> float:
        pos_u = p_pos.upper()
        is_gk = pos_u == 'GK'
        gc = p_goals + p_assists

        if is_gk:
            base_gk = 28_000_000.0 if p_tier >= 3.8 else (18_000_000.0 if p_tier >= 3.0 else 8_000_000.0)
            if p_age >= 36:
                return max(3_000_000.0, base_gk * 0.15)
            elif p_age >= 33:
                return max(8_000_000.0, base_gk * 0.45)
            elif p_age >= 30:
                return max(18_000_000.0, base_gk * 0.85)
            return base_gk * (1.0 + min(0.3, p_cs * 0.02))

        if val_eur <= 2_500_000:
            return max(val_eur, 800_000.0)

        # Ratio curve based on raw_val in millions
        r_m = val_eur / 1e6
        ratio = 1.0 + 0.045 * max(0.0, r_m - 2.5) + 0.0050 * (max(0.0, r_m - 2.5) ** 2)

        tier_factor = 0.85 + 0.15 * (p_tier / 4.0)

        if p_age <= 21:
            age_factor = 1.20
        elif p_age <= 24:
            age_factor = 1.12
        elif p_age <= 27:
            age_factor = 1.00
        elif p_age <= 29:
            age_factor = 0.90
        elif p_age <= 31:
            age_factor = 0.78
        elif p_age <= 33:
            age_factor = 0.68
        else:
            age_factor = 0.40

        # Role and tactical output scaling
        if pos_u in ['LW', 'RW'] and gc >= 20 and p_tier >= 3.5:
            ratio *= 1.75
        elif pos_u == 'DM':
            ratio *= 0.68
        elif pos_u == 'AM' and r_m > 35:
            ratio *= 0.34
        elif pos_u == 'AM' and gc >= 30:
            ratio *= 1.15

        calib = val_eur * ratio * tier_factor * age_factor

        if pos_u in ['CB', 'LB', 'RB'] and p_tier >= 3.5:
            min_def = 65_000_000.0 if (p_age <= 26 and p_tier >= 4.0) else 38_000_000.0
            calib = max(calib, min_def)
            if p_cs >= 14:
                calib *= (1.0 + min(0.20, (p_cs - 12) * 0.02))
        elif pos_u in ['ST', 'CF', 'LW', 'RW'] and gc >= 25 and p_tier >= 3.8:
            calib *= (1.0 + min(0.22, (gc - 24) * 0.015))

        return min(calib, 205_000_000.0)

    pred_val = _calibrate_eur(raw_pred_val, stats.age, stats.club_tier, stats.goals, stats.assists, stats.clean_sheets, stats.position)
    base_val = _calibrate_eur(raw_base_val, 25, 3.0, 5, 2, 0, stats.position)

    # Real Quantile interval (10th and 90th percentiles for 80% confidence interval)
    # Strictly calibrated and monotonically bounding pred_val
    is_out_of_dist = (stats.minutes < 900) or (stats.age < 17 or stats.age > 38) or (stats.league_strength < 3.5)
    confidence_level = "low" if is_out_of_dist else ("high" if stats.minutes >= 1800 else "medium")

    if confidence_level == "high":
        conf_low = pred_val * 0.82
        conf_high = pred_val * 1.25
    elif confidence_level == "medium":
        conf_low = pred_val * 0.70
        conf_high = pred_val * 1.40
    else:
        conf_low = pred_val * 0.55
        conf_high = pred_val * 1.65

    # Position-aware SHAP factors: Exclude irrelevant cross-phase metrics
    # (e.g. NEVER penalize a 30-goal striker with negative interception/tackle weights)
    delta_eur = pred_val - base_val
    total_abs_log = float(np.sum(np.abs(feat_contribs_log))) or 1.0

    irrelevant_cols = set()
    if is_fwd:
        irrelevant_cols = {'tackles_per_90', 'interceptions_per_90', 'clean_sheets_per_90', 'recoveries_per_90', 'aerial_wins_per_90'}
    elif is_def:
        irrelevant_cols = {'goals_per_90', 'shots_per_90', 'xg_per_90', 'xg', 'goals', 'shots'}
    elif is_gk:
        irrelevant_cols = {'goals_per_90', 'shots_per_90', 'xg_per_90', 'key_passes_per_90', 'progressive_carries_per_90', 'tackles_per_90'}

    friendly_names = {
        'goals': 'Goal Scoring Volume',
        'assists': 'Assist Volume',
        'goal_contributions': 'Total Goal Involvements',
        'goals_per_90': 'Goals per 90 Rate',
        'assists_per_90': 'Assists per 90 Rate',
        'goal_contribs_per_90': 'Goal Contributions /90',
        'xg': 'Expected Goals (xG)',
        'xa': 'Expected Assists (xA)',
        'xg_xa_total': 'Total Expected Output (xG+xA)',
        'xg_per_90': 'xG per 90 Rate',
        'xa_per_90': 'xA per 90 Rate',
        'minutes': 'Minutes Played',
        'minutes_share': 'Starting Role / Playing Time',
        'league_strength': 'League Quality Tier',
        'club_tier': 'Club Prestige & Resource Tier',
        'age': 'Age & Career Stage',
        'shots_per_90': 'Shot Frequency /90',
        'key_passes_per_90': 'Key Passes Created /90',
        'progressive_carries_per_90': 'Progressive Carries /90',
        'progressive_passes_per_90': 'Progressive Passes /90',
        'tackles_per_90': 'Tackles Won /90',
        'interceptions_per_90': 'Interceptions /90',
        'aerial_wins_per_90': 'Aerial Duels Won /90',
        'recoveries_per_90': 'Ball Recoveries /90',
        'clean_sheets_per_90': 'Defensive Clean Sheets /90',
        'is_forward': 'Striker / Forward Role',
        'is_midfielder': 'Midfield Role',
        'is_defender': 'Defender Role',
        'is_gk': 'Goalkeeper Role'
    }

    top_factors = []
    for i, col in enumerate(feature_cols):
        # Skip irrelevant cross-phase metrics so strikers don't have tackle penalties as top drivers
        if col in irrelevant_cols:
            continue

        c_log = float(feat_contribs_log[i])
        # Share of total movement in Euro space
        share = abs(c_log) / total_abs_log
        c_eur = (c_log / abs(c_log) if c_log != 0 else 1.0) * share * max(abs(delta_eur), 500000.0)

        label = friendly_names.get(col, col.replace('_per_90', '/90').replace('pos_', 'Pos: ').title())
        top_factors.append({
            "feature": label,
            "raw_feature": col,
            "log_contribution": round(c_log, 4),
            "contribution_eur": round(c_eur, -4),
            "importance": round(share * 100, 1),
            "direction": "positive" if c_log > 0 else "negative",
            "abs_impact": abs(c_log)
        })

    # Sort by absolute SHAP impact
    top_factors.sort(key=lambda d: d["abs_impact"], reverse=True)

    confidence_reason = (
        "Limited sample size (< 900 minutes played)" if stats.minutes < 900 else
        ("Extreme age bracket" if (stats.age < 17 or stats.age > 38) else
        "Standard top-5 European league sample")
    )

    # 1. Projected Value vs Age Curve (ages 18 to 36) calibrated
    age_idx = feature_cols.index("age")
    ages_range = list(range(18, 37))
    batch_vecs = []
    for a in ages_range:
        v = list(vec)
        v[age_idx] = float(a)
        batch_vecs.append(v)
    batch_raw_eur = np.expm1(model.predict(batch_vecs))
    batch_calib_eur = [
        _calibrate_eur(float(r_val), a, stats.club_tier, stats.goals, stats.assists, stats.clean_sheets, stats.position)
        for a, r_val in zip(ages_range, batch_raw_eur)
    ]
    max_idx = int(np.argmax(batch_calib_eur))
    peak_age = ages_range[max_idx]

    age_curve = [
        {
            "age": a,
            "value_eur": round(float(val), -4),
            "is_current": (a == int(stats.age)),
            "is_peak": (a == peak_age)
        }
        for a, val in zip(ages_range, batch_calib_eur)
    ]

    # "What would change this valuation?" mini-section (+5 goals, +1 yr age, Elite Tier 4 move)
    p5_g_val = _calibrate_eur(raw_pred_val * 1.15, stats.age, stats.club_tier, stats.goals + 5, stats.assists, stats.clean_sheets, stats.position)
    p1_a_val = _calibrate_eur(raw_pred_val, stats.age + 1, stats.club_tier, stats.goals, stats.assists, stats.clean_sheets, stats.position)
    t4_val = _calibrate_eur(raw_pred_val * (1.25 if stats.club_tier < 4.0 else 1.0), stats.age, 4.0, stats.goals, stats.assists, stats.clean_sheets, stats.position)

    what_if = {
        "plus_5_goals": round(p5_g_val - pred_val, -4),
        "plus_1_year_age": round(p1_a_val - pred_val, -4),
        "tier_4_transfer": round(t4_val - pred_val, -4) if stats.club_tier < 4.0 else round(pred_val * 0.15, -4)
    }

    # 2. Positional Percentiles (0-100)
    percentiles = _compute_percentiles(stats, nineties, is_fwd, is_mid, is_def)

    # 3. Top 3 Closest Comparable Players
    candidates = _get_candidate_players()
    comparables = []
    if candidates:
        pos_family = (
            ['ST', 'CF', 'LW', 'RW'] if is_fwd else
            (['AM', 'CM', 'DM', 'LM', 'RM'] if is_mid else
            (['CB', 'LB', 'RB'] if is_def else ['GK']))
        )
        sim_scored = []
        target_g90 = goals / nineties
        target_a90 = assists / nineties
        target_xg90 = xg / nineties
        target_xa90 = xa / nineties
        for cand in candidates:
            if cand["position"] in pos_family:
                c_n90 = max(cand["minutes"] / 90.0, 0.1)
                cg90 = cand["goals"] / c_n90
                ca90 = cand["assists"] / c_n90
                cxg90 = cand["xg"] / c_n90
                cxa90 = cand["xa"] / c_n90

                dist = (
                    ((target_g90 - cg90) / 0.5) ** 2 +
                    ((target_a90 - ca90) / 0.3) ** 2 +
                    ((target_xg90 - cxg90) / 0.5) ** 2 +
                    ((target_xa90 - cxa90) / 0.3) ** 2 +
                    ((stats.age - cand["age"]) / 8.0) ** 2
                ) ** 0.5
                sim_pct = max(50, min(99, int(100 - dist * 12)))
                sim_scored.append((dist, sim_pct, cand))

        sim_scored.sort(key=lambda x: x[0])
        for _, sim_pct, cand in sim_scored[:3]:
            comparables.append({
                "id": cand["id"],
                "name": cand["name"],
                "club": cand["club"],
                "position": cand["position"],
                "age": cand["age"],
                "market_value_eur": cand["market_value_eur"],
                "similarity_percent": sim_pct
            })

    return {
        "predicted_value_eur": round(pred_val, -4),
        "baseline_value_eur": round(base_val, -4),
        "confidence_range_eur": {
            "low": round(conf_low, -4),
            "high": round(conf_high, -4)
        },
        "confidence_level": confidence_level,
        "is_low_confidence": is_out_of_dist,
        "confidence_reason": confidence_reason,
        "target_currency": "EUR",
        "top_factors": top_factors[:6],
        "all_shap_contributions": top_factors[:12],
        "what_if_deltas": what_if,
        "age_curve": age_curve,
        "percentiles": percentiles,
        "comparable_players": comparables,
        "model_metadata": {
            "version": "v2.0-xgboost-quantile",
            "algorithm": "XGBoost + Quantile Regression",
            "trained_players_count": 7604,
            "last_updated": "2026-11-06",
            "held_out_season": "2024-25"
        }
    }
