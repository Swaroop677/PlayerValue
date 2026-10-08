from sqlalchemy.orm import Session
from typing import Dict, Any, Optional
from backend.database.models import ModelRun

def get_model_metrics(db: Session) -> Optional[Dict[str, Any]]:
    run = db.query(ModelRun).order_by(ModelRun.trained_at.desc()).first()
    if not run:
        return None
    
    return {
        "model_version": run.model_version,
        "trained_at": run.trained_at.isoformat() if run.trained_at else None,
        "model_type": run.model_type,
        "mae": run.mae,
        "rmse": run.rmse,
        "r2": run.r2,
        "train_start": run.train_start,
        "train_end": run.train_end,
        "val_season": run.val_season,
        "test_season": run.test_season,
        "n_train_samples": run.n_train_samples,
        "n_features": run.n_features,
        "feature_names": run.feature_names,
        "evaluation_data": run.evaluation_data
    }
