from typing import Optional, List, Dict, Any
from datetime import date
from pydantic import BaseModel

class PlayerListItem(BaseModel):
    id: int
    name: str
    age: Optional[int]
    primary_position: Optional[str]
    club_name: Optional[str]
    league_name: Optional[str]
    nationality: Optional[str]
    minutes: Optional[int]
    goals: Optional[int]
    assists: Optional[int]
    market_value_eur: Optional[float]
    predicted_value_eur: Optional[float]
    value_gap_percent: Optional[float]

    class Config:
        from_attributes = True

class PlayerDetail(PlayerListItem):
    date_of_birth: Optional[date]
    height_cm: Optional[int]
    preferred_foot: Optional[str]
    club_id: Optional[int]
    league_id: Optional[int]

class PlayerSeasonStats(BaseModel):
    season: str
    club_name: Optional[str]
    appearances: int
    minutes: int
    goals: int
    assists: int
    xg: float
    xa: float
    shots: float
    key_passes: float
    progressive_passes: float
    progressive_carries: float
    tackles: float
    interceptions: float
    aerial_wins: float
    recoveries: float
    clean_sheets: int
    goals_per_90: float
    assists_per_90: float
    xg_per_90: float
    xa_per_90: float
    shots_per_90: float
    progressive_passes_per_90: float
    progressive_carries_per_90: float
    tackles_per_90: float
    interceptions_per_90: float

    class Config:
        from_attributes = True

class PlayerMarketValuePoint(BaseModel):
    valuation_date: date
    market_value_eur: float

    class Config:
        from_attributes = True

class PlayerTransfer(BaseModel):
    transfer_date: date
    from_club_name: Optional[str]
    to_club_name: Optional[str]
    fee_eur: Optional[float]
    transfer_type: str

    class Config:
        from_attributes = True

class PlayerPrediction(BaseModel):
    predicted_value_eur: float
    actual_market_value_eur: Optional[float]
    difference_percent: Optional[float]
    model_version: str
    explanation: Dict[str, List[Any]]

    class Config:
        from_attributes = True
        protected_namespaces = ()

class SimilarPlayerItem(BaseModel):
    id: int
    name: str
    age: Optional[int]
    primary_position: Optional[str]
    club_name: Optional[str]
    market_value_eur: Optional[float]
    similarity_percent: float

    class Config:
        from_attributes = True
