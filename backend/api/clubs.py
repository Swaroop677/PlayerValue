from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from backend.database.database import get_db
from backend.services.club_service import get_clubs, get_club_detail, get_leagues
from backend.schemas.clubs import ClubListItem, ClubDetail, LeagueItem

router = APIRouter(tags=["Clubs"])

@router.get("/clubs", response_model=List[ClubListItem])
def api_get_clubs(db: Session = Depends(get_db)):
    return get_clubs(db)

@router.get("/clubs/{club_id}", response_model=ClubDetail)
def api_get_club_detail(club_id: int, db: Session = Depends(get_db)):
    club = get_club_detail(db, club_id)
    if not club:
        raise HTTPException(status_code=404, detail="Club not found")
    return club

@router.get("/leagues", response_model=List[LeagueItem])
def api_get_leagues(db: Session = Depends(get_db)):
    return get_leagues(db)
