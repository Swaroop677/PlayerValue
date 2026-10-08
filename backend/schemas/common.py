from typing import Generic, TypeVar, List
from pydantic import BaseModel

T = TypeVar('T')

class PaginatedResponse(BaseModel, Generic[T]):
    items: List[T]
    total: int
    page: int
    page_size: int
    total_pages: int

class DashboardKPI(BaseModel):
    label: str
    value: float
    formatted_value: str

class MarketOverviewPoint(BaseModel):
    date: str
    total_value: float
