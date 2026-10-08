from typing import Optional, List
from pydantic import BaseModel
from backend.schemas.players import PlayerListItem

class ClubListItem(BaseModel):
    id: int
    name: str
    country: Optional[str]
    league_name: Optional[str]
    league_id: Optional[int]
    squad_size: int
    total_market_value: float
    avg_age: Optional[float]

    class Config:
        from_attributes = True

class ClubDetail(ClubListItem):
    roster: List[PlayerListItem] = []

    class Config:
        from_attributes = True

class LeagueItem(BaseModel):
    id: int
    name: str
    country: Optional[str]
    strength_rating: Optional[float]

    class Config:
        from_attributes = True
