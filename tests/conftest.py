import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from fastapi.testclient import TestClient

from backend.database.models import Base, League, Club, Player, SeasonStats, MarketValue
from backend.main import app
from backend.database.database import get_db

# Create in-memory SQLite for testing
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base.metadata.create_all(bind=engine)

def override_get_db():
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db

@pytest.fixture(scope="session")
def db_engine():
    return engine

@pytest.fixture(scope="function")
def db():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

@pytest.fixture(scope="function")
def client(db):
    return TestClient(app)

@pytest.fixture(scope="function")
def sample_data(db):
    import datetime
    # Add League
    league = League(name="Premier League", country="England", strength_rating=5.0)
    db.add(league)
    db.commit()
    
    # Add Club
    club = Club(name="Arsenal", country="England", league_id=league.id)
    db.add(club)
    db.commit()
    
    # Add Player
    player = Player(
        name="Bukayo Saka",
        date_of_birth=datetime.date(2001, 9, 5),
        nationality="England",
        height_cm=178,
        preferred_foot="Left",
        primary_position="RW"
    )
    db.add(player)
    db.commit()
    
    # Add Stats
    stats = SeasonStats(
        player_id=player.id,
        club_id=club.id,
        season="2023-24",
        appearances=35,
        minutes=3000,
        goals=16,
        assists=9
    )
    db.add(stats)
    db.commit()
    
    # Add Market Value
    mv = MarketValue(
        player_id=player.id,
        valuation_date=datetime.date(2024, 6, 1),
        market_value_eur=130000000.0
    )
    db.add(mv)
    db.commit()
    
    return {
        "league": league,
        "club": club,
        "player": player,
        "stats": stats,
        "mv": mv
    }
