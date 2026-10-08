import sys
import os

# Add project root to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.database.database import engine
from backend.database.models import Base
from scripts.seed_database import seed

def reset_db():
    print("Dropping all tables...")
    Base.metadata.drop_all(bind=engine)
    print("Tables dropped.")
    
    print("Re-creating tables and seeding data...")
    seed()

if __name__ == "__main__":
    reset_db()
