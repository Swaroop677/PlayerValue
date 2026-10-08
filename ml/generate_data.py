import numpy as np
from datetime import date, timedelta
import random

def generate_names():
    first_names = [
        "James", "John", "Robert", "Michael", "William", "David", "Richard", "Joseph", "Thomas", "Charles",
        "Christopher", "Daniel", "Matthew", "Anthony", "Mark", "Donald", "Steven", "Paul", "Andrew", "Joshua",
        "Kenneth", "Kevin", "Brian", "George", "Edward", "Ronald", "Timothy", "Jason", "Jeffrey", "Ryan",
        "Jacob", "Gary", "Nicholas", "Eric", "Jonathan", "Stephen", "Larry", "Justin", "Scott", "Brandon",
        "Benjamin", "Samuel", "Gregory", "Frank", "Alexander", "Raymond", "Patrick", "Jack", "Dennis", "Jerry"
    ]
    last_names = [
        "Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis", "Rodriguez", "Martinez",
        "Hernandez", "Lopez", "Gonzalez", "Wilson", "Anderson", "Thomas", "Taylor", "Moore", "Jackson", "Martin",
        "Lee", "Perez", "Thompson", "White", "Harris", "Sanchez", "Clark", "Ramirez", "Lewis", "Robinson",
        "Walker", "Young", "Allen", "King", "Wright", "Scott", "Torres", "Nguyen", "Hill", "Flores",
        "Green", "Adams", "Nelson", "Baker", "Hall", "Rivera", "Campbell", "Mitchell", "Carter", "Roberts",
        "Gomez", "Phillips", "Evans", "Turner", "Diaz", "Parker", "Cruz", "Edwards", "Collins", "Reyes",
        "Stewart", "Morris", "Morales", "Murphy", "Cook", "Rogers", "Gutierrez", "Ortiz", "Morgan", "Cooper",
        "Peterson", "Bailey", "Reed", "Kelly", "Howard", "Ramos", "Kim", "Cox", "Ward", "Richardson"
    ]
    return first_names, last_names

def generate_leagues():
    return [
        {"name": "Premier League", "country": "England", "strength": 5.0},
        {"name": "La Liga", "country": "Spain", "strength": 4.8},
        {"name": "Bundesliga", "country": "Germany", "strength": 4.5},
        {"name": "Serie A", "country": "Italy", "strength": 4.3},
        {"name": "Ligue 1", "country": "France", "strength": 4.0}
    ]

def generate_clubs(leagues):
    club_names_by_league = {
        "Premier League": ["London FC", "Manchester United", "Liverpool Red", "Arsenal North", "Newcastle United"],
        "La Liga": ["Madrid Real", "Barcelona FC", "Atletico Madrid", "Valencia CF", "Sevilla FC"],
        "Bundesliga": ["Munich Bayern", "Dortmund BVB", "Leipzig RB", "Leverkusen Bayer", "Frankfurt Eintracht"],
        "Serie A": ["Juventus Turin", "Milan AC", "Inter Milan", "Napoli SSC", "Roma AS"],
        "Ligue 1": ["Paris SG", "Marseille OM", "Lyon OL", "Monaco AS", "Lille OSC"]
    }
    clubs = []
    for league in leagues:
        for name in club_names_by_league[league["name"]]:
            clubs.append({
                "name": name,
                "league_name": league["name"],
                "reputation": np.random.uniform(70, 95)
            })
    return clubs

def generate_data():
    rng = np.random.default_rng(42)
    first_names, last_names = generate_names()
    
    nationalities = ["England", "Spain", "Germany", "Italy", "France", "Brazil", "Argentina", "Portugal", "Netherlands", "Belgium", "Croatia", "Uruguay", "Colombia", "Senegal", "Morocco", "USA", "Japan", "South Korea", "Mexico", "Nigeria", "Ivory Coast", "Ghana", "Cameroon", "Algeria", "Egypt", "Denmark", "Sweden", "Norway", "Switzerland", "Austria"]
    nat_probs = np.array([10, 8, 7, 7, 7, 10, 8, 6, 5, 4, 3, 3, 2, 2, 2, 2, 1, 1, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1])
    nat_probs = nat_probs / nat_probs.sum()
    
    positions = ["GK", "CB", "FB", "CM", "AM", "W", "ST"]
    pos_probs = [0.10, 0.18, 0.14, 0.18, 0.12, 0.16, 0.12]
    
    leagues = generate_leagues()
    clubs = generate_clubs(leagues)
    
    # Generate 400 players
    players = []
    generated_names = set()
    for _ in range(400):
        while True:
            first = rng.choice(first_names)
            last = rng.choice(last_names)
            name = f"{first} {last}"
            if name not in generated_names:
                generated_names.add(name)
                break
                
        position = rng.choice(positions, p=pos_probs)
        nationality = rng.choice(nationalities, p=nat_probs)
        
        # Age between 17 and 36, peak at 22-29
        age = int(rng.normal(25, 4))
        age = max(17, min(36, age))
        
        # Birth date based on age as of 2024
        birth_year = 2024 - age
        birth_month = rng.integers(1, 13)
        birth_day = rng.integers(1, 29)
        date_of_birth = date(birth_year, birth_month, birth_day)
        
        # Height based on position
        if position in ["GK", "CB"]:
            height = rng.normal(188, 4)
        elif position == "ST":
            height = rng.normal(184, 5)
        elif position in ["FB", "W"]:
            height = rng.normal(176, 5)
        else: # CM, AM
            height = rng.normal(180, 5)
            
        height = max(165, min(205, height))
        
        players.append({
            "name": name,
            "date_of_birth": date_of_birth,
            "nationality": nationality,
            "position": position,
            "height_cm": height,
            "preferred_foot": rng.choice(["Right", "Left", "Both"], p=[0.75, 0.20, 0.05]),
            "base_ability": rng.normal(65, 15)  # Hidden attribute for stat generation
        })
        
    seasons = ["2019-20", "2020-21", "2021-22", "2022-23", "2023-24", "2024-25", "2025-26"]
    
    season_stats = []
    market_values = []
    transfers = []
    player_club_histories = []
    
    # Assign initial clubs
    current_clubs = {}
    for p_idx, player in enumerate(players):
        current_clubs[p_idx] = rng.choice(clubs)
        
    for s_idx, season in enumerate(seasons):
        season_start_year = int(season.split("-")[0])
        
        for p_idx, player in enumerate(players):
            current_age = season_start_year - player["date_of_birth"].year
            
            # Too young or too old for professional play
            if current_age < 17 or current_age > 38:
                continue
                
            # Age factor for ability
            age_factor = 1.0
            if current_age < 22:
                age_factor = 0.8 + (current_age - 17) * 0.04
            elif current_age > 30:
                age_factor = 1.0 - (current_age - 30) * 0.05
                
            ability = player["base_ability"] * age_factor
            
            # Assign club
            club = current_clubs[p_idx]
            
            # Transfer logic (10% chance per season)
            if s_idx > 0 and rng.random() < 0.1:
                new_club = rng.choice(clubs)
                if new_club != club:
                    transfers.append({
                        "player_name": player["name"],
                        "from_club_name": club["name"],
                        "to_club_name": new_club["name"],
                        "transfer_date": date(season_start_year, 7, 1),
                        "fee_eur": 0 # to be updated after value calc
                    })
                    club = new_club
                    current_clubs[p_idx] = club
            
            player_club_histories.append({
                "player_name": player["name"],
                "club_name": club["name"],
                "season": season
            })
            
            league_strength = next(l["strength"] for l in leagues if l["name"] == club["league_name"])
            
            # Stats generation
            minutes = max(0, int(rng.normal(2000 * (ability/100), 500)))
            minutes = min(3420, minutes)
            if minutes < 90:
                continue
                
            games_played = minutes // 90
            
            pos = player["position"]
            goals = assists = xg = xa = shots = prog_passes = prog_carries = tackles = intercep = clean_sheets = 0
            key_passes = aerial_wins = recoveries = 0
            
            if pos == "ST":
                goals = max(0, rng.normal(0.5 * games_played * (ability/70), 3))
                xg = goals * rng.normal(1.0, 0.1)
                shots = goals * rng.normal(5, 1)
                assists = max(0, rng.normal(0.15 * games_played, 2))
                xa = assists * rng.normal(1.0, 0.1)
                prog_passes = max(0, rng.normal(1 * games_played, 1))
                prog_carries = max(0, rng.normal(2 * games_played, 2))
                tackles = max(0, rng.normal(0.5 * games_played, 1))
                intercep = max(0, rng.normal(0.2 * games_played, 0.5))
                key_passes = max(0, rng.normal(0.8 * games_played, 1))
                aerial_wins = max(0, rng.normal(2.0 * games_played, 2))
                recoveries = max(0, rng.normal(1.0 * games_played, 1))
            elif pos == "W":
                goals = max(0, rng.normal(0.25 * games_played * (ability/70), 2))
                xg = goals * rng.normal(1.0, 0.1)
                shots = goals * rng.normal(4, 1)
                assists = max(0, rng.normal(0.3 * games_played * (ability/70), 3))
                xa = assists * rng.normal(1.0, 0.1)
                prog_passes = max(0, rng.normal(3 * games_played, 2))
                prog_carries = max(0, rng.normal(5 * games_played, 2))
                tackles = max(0, rng.normal(1 * games_played, 1))
                intercep = max(0, rng.normal(0.5 * games_played, 1))
                key_passes = max(0, rng.normal(2.0 * games_played, 1.5))
                aerial_wins = max(0, rng.normal(0.5 * games_played, 0.5))
                recoveries = max(0, rng.normal(1.5 * games_played, 1))
            elif pos == "AM":
                goals = max(0, rng.normal(0.2 * games_played * (ability/70), 2))
                xg = goals * rng.normal(1.0, 0.1)
                shots = goals * rng.normal(2.5, 1)
                assists = max(0, rng.normal(0.35 * games_played * (ability/70), 3))
                xa = assists * rng.normal(1.0, 0.1)
                prog_passes = max(0, rng.normal(5 * games_played, 2))
                prog_carries = max(0, rng.normal(3 * games_played, 2))
                tackles = max(0, rng.normal(1.5 * games_played, 1))
                intercep = max(0, rng.normal(0.8 * games_played, 1))
                key_passes = max(0, rng.normal(3.0 * games_played, 2))
                aerial_wins = max(0, rng.normal(0.3 * games_played, 0.5))
                recoveries = max(0, rng.normal(2.0 * games_played, 1))
            elif pos == "CM":
                goals = max(0, rng.normal(0.1 * games_played, 1))
                xg = goals * rng.normal(1.0, 0.1)
                shots = goals * rng.normal(1.5, 0.5)
                assists = max(0, rng.normal(0.15 * games_played, 2))
                xa = assists * rng.normal(1.0, 0.1)
                prog_passes = max(0, rng.normal(6 * games_played * (ability/70), 3))
                prog_carries = max(0, rng.normal(2 * games_played, 1))
                tackles = max(0, rng.normal(2.5 * games_played, 1.5))
                intercep = max(0, rng.normal(1.5 * games_played, 1))
                key_passes = max(0, rng.normal(2.0 * games_played, 1.5))
                aerial_wins = max(0, rng.normal(1.0 * games_played, 1))
                recoveries = max(0, rng.normal(3.0 * games_played, 1.5))
            elif pos == "FB":
                goals = max(0, rng.normal(0.05 * games_played, 1))
                xg = goals * rng.normal(1.0, 0.1)
                shots = goals * rng.normal(0.5, 0.3)
                assists = max(0, rng.normal(0.15 * games_played, 2))
                xa = assists * rng.normal(1.0, 0.1)
                prog_passes = max(0, rng.normal(3 * games_played, 2))
                prog_carries = max(0, rng.normal(3 * games_played, 2))
                tackles = max(0, rng.normal(2.5 * games_played, 1.5))
                intercep = max(0, rng.normal(1.5 * games_played, 1))
                key_passes = max(0, rng.normal(1.0 * games_played, 1))
                aerial_wins = max(0, rng.normal(1.5 * games_played, 1))
                recoveries = max(0, rng.normal(2.5 * games_played, 1.5))
            elif pos == "CB":
                goals = max(0, rng.normal(0.05 * games_played, 1))
                xg = goals * rng.normal(1.0, 0.1)
                shots = goals * rng.normal(0.5, 0.2)
                assists = max(0, rng.normal(0.02 * games_played, 0.5))
                xa = assists * rng.normal(1.0, 0.1)
                prog_passes = max(0, rng.normal(2 * games_played, 1))
                prog_carries = max(0, rng.normal(0.5 * games_played, 0.5))
                tackles = max(0, rng.normal(1.5 * games_played, 1))
                intercep = max(0, rng.normal(2.5 * games_played, 1))
                key_passes = max(0, rng.normal(0.3 * games_played, 0.5))
                aerial_wins = max(0, rng.normal(3.0 * games_played, 2))
                recoveries = max(0, rng.normal(2.5 * games_played, 1.5))
            elif pos == "GK":
                clean_sheets = max(0, rng.normal(0.25 * games_played * (ability/70), 2))
                prog_passes = max(0, rng.normal(0.5 * games_played, 0.5))
                aerial_wins = max(0, rng.normal(0.5 * games_played, 0.5))
                recoveries = max(0, rng.normal(1.0 * games_played, 1))
                
            stats = {
                "player_name": player["name"],
                "club_name": club["name"],
                "season": season,
                "minutes_played": int(minutes),
                "goals": int(goals),
                "assists": int(assists),
                "xg": float(xg),
                "xa": float(xa),
                "shots": int(shots),
                "key_passes": int(key_passes),
                "progressive_passes": int(prog_passes),
                "progressive_carries": int(prog_carries),
                "tackles": int(tackles),
                "interceptions": int(intercep),
                "aerial_wins": int(aerial_wins),
                "recoveries": int(recoveries),
                "clean_sheets": int(clean_sheets)
            }
            season_stats.append(stats)
            
            # Market Value Calculation
            # Base value based on ability
            base_value = (ability / 50) ** 3 * 2_000_000
            
            # League strength multiplier
            league_mult = league_strength / 4.0
            
            # Age curve
            if current_age <= 21:
                age_mult = 1.5 + (21 - current_age) * 0.1
            elif current_age <= 24:
                age_mult = 1.2 + (24 - current_age) * 0.1
            elif current_age <= 28:
                age_mult = 1.0
            elif current_age <= 32:
                age_mult = 1.0 - (current_age - 28) * 0.1
            else:
                age_mult = 0.6 - (current_age - 32) * 0.1
            age_mult = max(0.1, age_mult)
            
            # Position premium
            pos_mult = {"ST": 1.3, "W": 1.2, "AM": 1.15, "CM": 1.0, "FB": 0.9, "CB": 0.85, "GK": 0.7}.get(pos, 1.0)
            
            # Performance modifier
            perf_score = (stats["goals"] * 3 + stats["assists"] * 2 + stats["clean_sheets"] * 2 + stats["minutes_played"]/100) / 10
            perf_mult = 1.0 + min(1.0, max(-0.5, (perf_score - 5) / 10))
            
            # Auto-correlation (look for previous market value)
            prev_val = None
            for mv in reversed(market_values):
                if mv["player_name"] == player["name"]:
                    prev_val = mv["market_value_eur"]
                    break
                    
            calculated_value = base_value * league_mult * age_mult * pos_mult * perf_mult * rng.normal(1.0, 0.1)
            
            if prev_val is not None:
                final_value = prev_val * 0.7 + calculated_value * 0.3
            else:
                final_value = calculated_value
                
            final_value = max(500_000, final_value)
            # Round to nearest 100k
            final_value = round(final_value / 100_000) * 100_000
            
            market_values.append({
                "player_name": player["name"],
                "date": date(season_start_year, 8, 1),
                "market_value_eur": final_value
            })
            
            # Update transfer fee if this was a transfer year
            for t in reversed(transfers):
                if t["player_name"] == player["name"] and t["transfer_date"].year == season_start_year and t["fee_eur"] == 0:
                    t["fee_eur"] = final_value * rng.normal(1.1, 0.2)
                    t["fee_eur"] = max(100_000, round(t["fee_eur"] / 100_000) * 100_000)
                    break
                    
    return {
        "leagues": leagues,
        "clubs": clubs,
        "players": players,
        "season_stats": season_stats,
        "market_values": market_values,
        "transfers": transfers,
        "player_club_histories": player_club_histories
    }
