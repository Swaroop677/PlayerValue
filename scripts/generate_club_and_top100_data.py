#!/usr/bin/env python3
"""
Generate club logos data and top 100 players transfer & previous club intelligence.
Outputs:
  - frontend/js/club_logos_data.js
  - frontend/js/top100_data.js
"""

import sqlite3
import csv
import json
import os
from datetime import datetime

# Prominent club brand colors & aliases
CLUB_COLORS = {
    # Premier League
    "Manchester City": {"primary": "#6CABDD", "secondary": "#1C2C5B", "text": "#FFFFFF"},
    "Man City": {"primary": "#6CABDD", "secondary": "#1C2C5B", "text": "#FFFFFF"},
    "Arsenal FC": {"primary": "#EF0107", "secondary": "#063672", "text": "#FFFFFF"},
    "Arsenal": {"primary": "#EF0107", "secondary": "#063672", "text": "#FFFFFF"},
    "Liverpool FC": {"primary": "#C8102E", "secondary": "#00B2A9", "text": "#FFFFFF"},
    "Liverpool": {"primary": "#C8102E", "secondary": "#00B2A9", "text": "#FFFFFF"},
    "Chelsea FC": {"primary": "#034694", "secondary": "#EE242C", "text": "#FFFFFF"},
    "Chelsea": {"primary": "#034694", "secondary": "#EE242C", "text": "#FFFFFF"},
    "Manchester United": {"primary": "#DA291C", "secondary": "#FBE122", "text": "#FFFFFF"},
    "Man Utd": {"primary": "#DA291C", "secondary": "#FBE122", "text": "#FFFFFF"},
    "Tottenham Hotspur": {"primary": "#132257", "secondary": "#FFFFFF", "text": "#FFFFFF"},
    "Tottenham": {"primary": "#132257", "secondary": "#FFFFFF", "text": "#FFFFFF"},
    "Newcastle United": {"primary": "#241F20", "secondary": "#41B6E6", "text": "#FFFFFF"},
    "Newcastle": {"primary": "#241F20", "secondary": "#41B6E6", "text": "#FFFFFF"},
    "Aston Villa": {"primary": "#670E36", "secondary": "#95BFE5", "text": "#FFFFFF"},
    "Brighton & Hove Albion": {"primary": "#0057B8", "secondary": "#FFCD00", "text": "#FFFFFF"},
    "Brighton": {"primary": "#0057B8", "secondary": "#FFCD00", "text": "#FFFFFF"},
    "West Ham United": {"primary": "#7A263A", "secondary": "#1BB1E7", "text": "#FFFFFF"},
    "West Ham": {"primary": "#7A263A", "secondary": "#1BB1E7", "text": "#FFFFFF"},
    "Everton FC": {"primary": "#003399", "secondary": "#FFFFFF", "text": "#FFFFFF"},
    "Everton": {"primary": "#003399", "secondary": "#FFFFFF", "text": "#FFFFFF"},
    "Wolverhampton Wanderers": {"primary": "#FDB913", "secondary": "#231F20", "text": "#000000"},
    "Wolves": {"primary": "#FDB913", "secondary": "#231F20", "text": "#000000"},
    "AFC Bournemouth": {"primary": "#DA291C", "secondary": "#000000", "text": "#FFFFFF"},
    "Bournemouth": {"primary": "#DA291C", "secondary": "#000000", "text": "#FFFFFF"},
    "Brentford FC": {"primary": "#E30613", "secondary": "#FFD100", "text": "#FFFFFF"},
    "Brentford": {"primary": "#E30613", "secondary": "#FFD100", "text": "#FFFFFF"},
    "Fulham FC": {"primary": "#000000", "secondary": "#CC0000", "text": "#FFFFFF"},
    "Fulham": {"primary": "#000000", "secondary": "#CC0000", "text": "#FFFFFF"},
    "Crystal Palace": {"primary": "#1B458F", "secondary": "#C4122E", "text": "#FFFFFF"},
    "Nottingham Forest": {"primary": "#DD0000", "secondary": "#FFFFFF", "text": "#FFFFFF"},
    "Nottm Forest": {"primary": "#DD0000", "secondary": "#FFFFFF", "text": "#FFFFFF"},
    "Leicester City": {"primary": "#003090", "secondary": "#FDBE11", "text": "#FFFFFF"},
    "Leicester": {"primary": "#003090", "secondary": "#FDBE11", "text": "#FFFFFF"},
    "Ipswich Town": {"primary": "#0047AB", "secondary": "#FFFFFF", "text": "#FFFFFF"},
    "Southampton FC": {"primary": "#D71920", "secondary": "#130C0E", "text": "#FFFFFF"},
    "Southampton": {"primary": "#D71920", "secondary": "#130C0E", "text": "#FFFFFF"},

    # La Liga
    "Real Madrid": {"primary": "#00529F", "secondary": "#FEBE10", "text": "#FFFFFF"},
    "FC Barcelona": {"primary": "#A50044", "secondary": "#004D98", "text": "#FFFFFF"},
    "Barcelona": {"primary": "#A50044", "secondary": "#004D98", "text": "#FFFFFF"},
    "Barça": {"primary": "#A50044", "secondary": "#004D98", "text": "#FFFFFF"},
    "Atlético de Madrid": {"primary": "#CB3524", "secondary": "#1C346C", "text": "#FFFFFF"},
    "Atlético Madrid": {"primary": "#CB3524", "secondary": "#1C346C", "text": "#FFFFFF"},
    "Athletic Bilbao": {"primary": "#EE2524", "secondary": "#000000", "text": "#FFFFFF"},
    "Athletic Club": {"primary": "#EE2524", "secondary": "#000000", "text": "#FFFFFF"},
    "Real Sociedad": {"primary": "#0067B1", "secondary": "#FFFFFF", "text": "#FFFFFF"},
    "Villarreal CF": {"primary": "#FFE600", "secondary": "#00509E", "text": "#000000"},
    "Villarreal": {"primary": "#FFE600", "secondary": "#00509E", "text": "#000000"},
    "Real Betis Balompié": {"primary": "#0BB364", "secondary": "#FFFFFF", "text": "#FFFFFF"},
    "Real Betis": {"primary": "#0BB364", "secondary": "#FFFFFF", "text": "#FFFFFF"},
    "Betis": {"primary": "#0BB364", "secondary": "#FFFFFF", "text": "#FFFFFF"},
    "Sevilla FC": {"primary": "#D40F1E", "secondary": "#FFFFFF", "text": "#FFFFFF"},
    "Sevilla": {"primary": "#D40F1E", "secondary": "#FFFFFF", "text": "#FFFFFF"},
    "Girona FC": {"primary": "#CD1318", "secondary": "#FFFFFF", "text": "#FFFFFF"},
    "Girona": {"primary": "#CD1318", "secondary": "#FFFFFF", "text": "#FFFFFF"},
    "Valencia CF": {"primary": "#FF7F00", "secondary": "#000000", "text": "#FFFFFF"},
    "Valencia": {"primary": "#FF7F00", "secondary": "#000000", "text": "#FFFFFF"},
    "Celta de Vigo": {"primary": "#8AC3EE", "secondary": "#C8102E", "text": "#000000"},
    "Celta Vigo": {"primary": "#8AC3EE", "secondary": "#C8102E", "text": "#000000"},
    "CA Osasuna": {"primary": "#D91A2A", "secondary": "#0A1C2A", "text": "#FFFFFF"},
    "Osasuna": {"primary": "#D91A2A", "secondary": "#0A1C2A", "text": "#FFFFFF"},
    "RCD Mallorca": {"primary": "#E20613", "secondary": "#000000", "text": "#FFFFFF"},
    "Mallorca": {"primary": "#E20613", "secondary": "#000000", "text": "#FFFFFF"},
    "Rayo Vallecano": {"primary": "#E51D24", "secondary": "#FFFFFF", "text": "#FFFFFF"},
    "Getafe CF": {"primary": "#005BA9", "secondary": "#FFFFFF", "text": "#FFFFFF"},
    "Getafe": {"primary": "#005BA9", "secondary": "#FFFFFF", "text": "#FFFFFF"},
    "RCD Espanyol Barcelona": {"primary": "#007FC8", "secondary": "#FFFFFF", "text": "#FFFFFF"},
    "Espanyol": {"primary": "#007FC8", "secondary": "#FFFFFF", "text": "#FFFFFF"},
    "UD Las Palmas": {"primary": "#FFDE00", "secondary": "#0055A5", "text": "#000000"},
    "Las Palmas": {"primary": "#FFDE00", "secondary": "#0055A5", "text": "#000000"},
    "Deportivo Alavés": {"primary": "#005BA9", "secondary": "#FFFFFF", "text": "#FFFFFF"},
    "Alavés": {"primary": "#005BA9", "secondary": "#FFFFFF", "text": "#FFFFFF"},
    "CD Leganés": {"primary": "#005BA9", "secondary": "#00A550", "text": "#FFFFFF"},
    "Real Valladolid CF": {"primary": "#5C2D91", "secondary": "#FFFFFF", "text": "#FFFFFF"},
    "Valladolid": {"primary": "#5C2D91", "secondary": "#FFFFFF", "text": "#FFFFFF"},

    # Bundesliga
    "Bayern Munich": {"primary": "#DC052D", "secondary": "#0066B2", "text": "#FFFFFF"},
    "Bayern": {"primary": "#DC052D", "secondary": "#0066B2", "text": "#FFFFFF"},
    "Borussia Dortmund": {"primary": "#FDE100", "secondary": "#000000", "text": "#000000"},
    "Dortmund": {"primary": "#FDE100", "secondary": "#000000", "text": "#000000"},
    "BVB": {"primary": "#FDE100", "secondary": "#000000", "text": "#000000"},
    "Bayer 04 Leverkusen": {"primary": "#E32221", "secondary": "#000000", "text": "#FFFFFF"},
    "Leverkusen": {"primary": "#E32221", "secondary": "#000000", "text": "#FFFFFF"},
    "RB Leipzig": {"primary": "#DD0741", "secondary": "#001E46", "text": "#FFFFFF"},
    "Leipzig": {"primary": "#DD0741", "secondary": "#001E46", "text": "#FFFFFF"},
    "Eintracht Frankfurt": {"primary": "#E1000F", "secondary": "#000000", "text": "#FFFFFF"},
    "Frankfurt": {"primary": "#E1000F", "secondary": "#000000", "text": "#FFFFFF"},
    "VfB Stuttgart": {"primary": "#E30613", "secondary": "#FFFFFF", "text": "#FFFFFF"},
    "Stuttgart": {"primary": "#E30613", "secondary": "#FFFFFF", "text": "#FFFFFF"},
    "Borussia Mönchengladbach": {"primary": "#009933", "secondary": "#000000", "text": "#FFFFFF"},
    "Gladbach": {"primary": "#009933", "secondary": "#000000", "text": "#FFFFFF"},
    "VfL Wolfsburg": {"primary": "#65B32E", "secondary": "#FFFFFF", "text": "#FFFFFF"},
    "Wolfsburg": {"primary": "#65B32E", "secondary": "#FFFFFF", "text": "#FFFFFF"},
    "SC Freiburg": {"primary": "#D11218", "secondary": "#000000", "text": "#FFFFFF"},
    "Freiburg": {"primary": "#D11218", "secondary": "#000000", "text": "#FFFFFF"},
    "TSG 1899 Hoffenheim": {"primary": "#1C63B7", "secondary": "#FFFFFF", "text": "#FFFFFF"},
    "Hoffenheim": {"primary": "#1C63B7", "secondary": "#FFFFFF", "text": "#FFFFFF"},
    "SV Werder Bremen": {"primary": "#008754", "secondary": "#FFFFFF", "text": "#FFFFFF"},
    "Werder Bremen": {"primary": "#008754", "secondary": "#FFFFFF", "text": "#FFFFFF"},
    "1.FC Union Berlin": {"primary": "#DC052D", "secondary": "#FED100", "text": "#FFFFFF"},
    "Union Berlin": {"primary": "#DC052D", "secondary": "#FED100", "text": "#FFFFFF"},
    "1.FSV Mainz 05": {"primary": "#E2001A", "secondary": "#FFFFFF", "text": "#FFFFFF"},
    "Mainz 05": {"primary": "#E2001A", "secondary": "#FFFFFF", "text": "#FFFFFF"},
    "FC Augsburg": {"primary": "#BA3733", "secondary": "#006747", "text": "#FFFFFF"},
    "Augsburg": {"primary": "#BA3733", "secondary": "#006747", "text": "#FFFFFF"},
    "FC St. Pauli": {"primary": "#663300", "secondary": "#FFFFFF", "text": "#FFFFFF"},
    "St. Pauli": {"primary": "#663300", "secondary": "#FFFFFF", "text": "#FFFFFF"},
    "VfL Bochum": {"primary": "#005CA9", "secondary": "#FFFFFF", "text": "#FFFFFF"},
    "Bochum": {"primary": "#005CA9", "secondary": "#FFFFFF", "text": "#FFFFFF"},

    # Serie A
    "Inter Milan": {"primary": "#010E80", "secondary": "#000000", "text": "#FFFFFF"},
    "Inter": {"primary": "#010E80", "secondary": "#000000", "text": "#FFFFFF"},
    "AC Milan": {"primary": "#FB090B", "secondary": "#000000", "text": "#FFFFFF"},
    "Milan": {"primary": "#FB090B", "secondary": "#000000", "text": "#FFFFFF"},
    "Juventus FC": {"primary": "#1A1A1A", "secondary": "#C5A059", "text": "#FFFFFF"},
    "Juventus": {"primary": "#1A1A1A", "secondary": "#C5A059", "text": "#FFFFFF"},
    "Juve": {"primary": "#1A1A1A", "secondary": "#C5A059", "text": "#FFFFFF"},
    "SSC Napoli": {"primary": "#12A0D7", "secondary": "#FFFFFF", "text": "#FFFFFF"},
    "Napoli": {"primary": "#12A0D7", "secondary": "#FFFFFF", "text": "#FFFFFF"},
    "Atalanta BC": {"primary": "#1E71B8", "secondary": "#000000", "text": "#FFFFFF"},
    "Atalanta": {"primary": "#1E71B8", "secondary": "#000000", "text": "#FFFFFF"},
    "Associazione Sportiva Roma": {"primary": "#8E1F2F", "secondary": "#F0BC42", "text": "#FFFFFF"},
    "AS Roma": {"primary": "#8E1F2F", "secondary": "#F0BC42", "text": "#FFFFFF"},
    "Roma": {"primary": "#8E1F2F", "secondary": "#F0BC42", "text": "#FFFFFF"},
    "Società Sportiva Lazio S.p.A.": {"primary": "#87D8F7", "secondary": "#FFFFFF", "text": "#000000"},
    "SS Lazio": {"primary": "#87D8F7", "secondary": "#FFFFFF", "text": "#000000"},
    "Lazio": {"primary": "#87D8F7", "secondary": "#FFFFFF", "text": "#000000"},
    "Bologna Football Club 1909": {"primary": "#1A2F50", "secondary": "#A31F34", "text": "#FFFFFF"},
    "Bologna": {"primary": "#1A2F50", "secondary": "#A31F34", "text": "#FFFFFF"},
    "ACF Fiorentina": {"primary": "#4E2A84", "secondary": "#FFFFFF", "text": "#FFFFFF"},
    "Fiorentina": {"primary": "#4E2A84", "secondary": "#FFFFFF", "text": "#FFFFFF"},
    "Torino FC": {"primary": "#8A1538", "secondary": "#FFFFFF", "text": "#FFFFFF"},
    "Torino": {"primary": "#8A1538", "secondary": "#FFFFFF", "text": "#FFFFFF"},
    "Genoa CFC": {"primary": "#8B1C28", "secondary": "#002D62", "text": "#FFFFFF"},
    "Genoa": {"primary": "#8B1C28", "secondary": "#002D62", "text": "#FFFFFF"},
    "Udinese Calcio": {"primary": "#000000", "secondary": "#FFD100", "text": "#FFFFFF"},
    "Udinese": {"primary": "#000000", "secondary": "#FFD100", "text": "#FFFFFF"},
    "Cagliari Calcio": {"primary": "#002347", "secondary": "#BD1622", "text": "#FFFFFF"},
    "Cagliari": {"primary": "#002347", "secondary": "#BD1622", "text": "#FFFFFF"},
    "Parma Calcio 1913": {"primary": "#FFED00", "secondary": "#0047AB", "text": "#000000"},
    "Parma": {"primary": "#FFED00", "secondary": "#0047AB", "text": "#000000"},
    "Como 1907": {"primary": "#004C97", "secondary": "#FFFFFF", "text": "#FFFFFF"},
    "Como": {"primary": "#004C97", "secondary": "#FFFFFF", "text": "#FFFFFF"},
    "Hellas Verona": {"primary": "#003366", "secondary": "#FED100", "text": "#FFFFFF"},
    "Verona": {"primary": "#003366", "secondary": "#FED100", "text": "#FFFFFF"},
    "US Lecce": {"primary": "#F7D117", "secondary": "#D81E05", "text": "#000000"},
    "Lecce": {"primary": "#F7D117", "secondary": "#D81E05", "text": "#000000"},
    "FC Empoli": {"primary": "#005BAC", "secondary": "#FFFFFF", "text": "#FFFFFF"},
    "Empoli": {"primary": "#005BAC", "secondary": "#FFFFFF", "text": "#FFFFFF"},
    "AC Monza": {"primary": "#E30613", "secondary": "#FFFFFF", "text": "#FFFFFF"},
    "Monza": {"primary": "#E30613", "secondary": "#FFFFFF", "text": "#FFFFFF"},
    "Venezia FC": {"primary": "#FF8200", "secondary": "#008057", "text": "#FFFFFF"},
    "Venezia": {"primary": "#FF8200", "secondary": "#008057", "text": "#FFFFFF"},

    # Ligue 1
    "Paris Saint-Germain": {"primary": "#004170", "secondary": "#DA291C", "text": "#FFFFFF"},
    "PSG": {"primary": "#004170", "secondary": "#DA291C", "text": "#FFFFFF"},
    "AS Monaco": {"primary": "#E30613", "secondary": "#FFFFFF", "text": "#FFFFFF"},
    "Monaco": {"primary": "#E30613", "secondary": "#FFFFFF", "text": "#FFFFFF"},
    "Olympique Marseille": {"primary": "#00A3E0", "secondary": "#FFFFFF", "text": "#FFFFFF"},
    "Marseille": {"primary": "#00A3E0", "secondary": "#FFFFFF", "text": "#FFFFFF"},
    "Olympique Lyon": {"primary": "#DA0812", "secondary": "#1D428A", "text": "#FFFFFF"},
    "Lyon": {"primary": "#DA0812", "secondary": "#1D428A", "text": "#FFFFFF"},
    "LOSC Lille": {"primary": "#E01E26", "secondary": "#172648", "text": "#FFFFFF"},
    "Lille": {"primary": "#E01E26", "secondary": "#172648", "text": "#FFFFFF"},
    "OGC Nice": {"primary": "#D6001C", "secondary": "#000000", "text": "#FFFFFF"},
    "Nice": {"primary": "#D6001C", "secondary": "#000000", "text": "#FFFFFF"},
    "RC Lens": {"primary": "#DA291C", "secondary": "#FFD700", "text": "#FFFFFF"},
    "Lens": {"primary": "#DA291C", "secondary": "#FFD700", "text": "#FFFFFF"},
    "Stade Rennais FC": {"primary": "#E2001A", "secondary": "#000000", "text": "#FFFFFF"},
    "Stade Rennais": {"primary": "#E2001A", "secondary": "#000000", "text": "#FFFFFF"},
    "Rennes": {"primary": "#E2001A", "secondary": "#000000", "text": "#FFFFFF"},
    "Stade Brestois 29": {"primary": "#E20613", "secondary": "#FFFFFF", "text": "#FFFFFF"},
    "Brest": {"primary": "#E20613", "secondary": "#FFFFFF", "text": "#FFFFFF"},
    "Stade Reims": {"primary": "#E20613", "secondary": "#FFFFFF", "text": "#FFFFFF"},
    "Reims": {"primary": "#E20613", "secondary": "#FFFFFF", "text": "#FFFFFF"},
    "RC Strasbourg Alsace": {"primary": "#009FE3", "secondary": "#FFFFFF", "text": "#FFFFFF"},
    "Strasbourg": {"primary": "#009FE3", "secondary": "#FFFFFF", "text": "#FFFFFF"},
    "FC Toulouse": {"primary": "#4B2882", "secondary": "#FFFFFF", "text": "#FFFFFF"},
    "Toulouse": {"primary": "#4B2882", "secondary": "#FFFFFF", "text": "#FFFFFF"},
    "FC Nantes": {"primary": "#FED100", "secondary": "#008754", "text": "#000000"},
    "Nantes": {"primary": "#FED100", "secondary": "#008754", "text": "#000000"},
    "Montpellier HSC": {"primary": "#162B48", "secondary": "#FF6600", "text": "#FFFFFF"},
    "Montpellier": {"primary": "#162B48", "secondary": "#FF6600", "text": "#FFFFFF"},
    "AJ Auxerre": {"primary": "#0055A5", "secondary": "#FFFFFF", "text": "#FFFFFF"},
    "Auxerre": {"primary": "#0055A5", "secondary": "#FFFFFF", "text": "#FFFFFF"},
    "AS Saint-Étienne": {"primary": "#007A33", "secondary": "#FFFFFF", "text": "#FFFFFF"},
    "Saint-Étienne": {"primary": "#007A33", "secondary": "#FFFFFF", "text": "#FFFFFF"},
    "Le Havre AC": {"primary": "#6CB4EE", "secondary": "#00204A", "text": "#000000"},
    "Le Havre": {"primary": "#6CB4EE", "secondary": "#00204A", "text": "#000000"},
    "Angers SCO": {"primary": "#000000", "secondary": "#FFFFFF", "text": "#FFFFFF"},
    "Angers": {"primary": "#000000", "secondary": "#FFFFFF", "text": "#FFFFFF"},

    # Other Global Clubs
    "Salzburg": {"primary": "#CC0000", "secondary": "#FFFFFF", "text": "#FFFFFF"},
    "Red Bull Salzburg": {"primary": "#CC0000", "secondary": "#FFFFFF", "text": "#FFFFFF"},
    "Molde FK": {"primary": "#003366", "secondary": "#FFFFFF", "text": "#FFFFFF"},
    "Molde": {"primary": "#003366", "secondary": "#FFFFFF", "text": "#FFFFFF"},
    "Bryne": {"primary": "#E20613", "secondary": "#FFFFFF", "text": "#FFFFFF"},
    "Benfica": {"primary": "#E51937", "secondary": "#FFFFFF", "text": "#FFFFFF"},
    "Sporting CP": {"primary": "#008057", "secondary": "#FFFFFF", "text": "#FFFFFF"},
    "Sporting": {"primary": "#008057", "secondary": "#FFFFFF", "text": "#FFFFFF"},
    "Porto": {"primary": "#003B7B", "secondary": "#FFFFFF", "text": "#FFFFFF"},
    "FC Porto": {"primary": "#003B7B", "secondary": "#FFFFFF", "text": "#FFFFFF"},
    "Ajax": {"primary": "#D2122E", "secondary": "#FFFFFF", "text": "#FFFFFF"},
    "PSV": {"primary": "#EE1C25", "secondary": "#FFFFFF", "text": "#FFFFFF"},
    "PSV Eindhoven": {"primary": "#EE1C25", "secondary": "#FFFFFF", "text": "#FFFFFF"},
    "Feyenoord": {"primary": "#ED1C24", "secondary": "#FFFFFF", "text": "#FFFFFF"},
    "Birmingham": {"primary": "#0000FF", "secondary": "#FFFFFF", "text": "#FFFFFF"},
    "Birmingham City": {"primary": "#0000FF", "secondary": "#FFFFFF", "text": "#FFFFFF"},
    "Leeds United": {"primary": "#FFCD00", "secondary": "#1D428A", "text": "#000000"},
    "Leeds": {"primary": "#FFCD00", "secondary": "#1D428A", "text": "#000000"},
    "Southampton": {"primary": "#D71920", "secondary": "#000000", "text": "#FFFFFF"},
    "Reading": {"primary": "#002D62", "secondary": "#FFFFFF", "text": "#FFFFFF"},
    "Flamengo": {"primary": "#C00000", "secondary": "#000000", "text": "#FFFFFF"},
    "Palmeiras": {"primary": "#006437", "secondary": "#FFFFFF", "text": "#FFFFFF"},
    "Santos": {"primary": "#000000", "secondary": "#FFFFFF", "text": "#FFFFFF"},
    "River Plate": {"primary": "#D81E05", "secondary": "#FFFFFF", "text": "#FFFFFF"},
    "Boca Juniors": {"primary": "#003B7B", "secondary": "#FED100", "text": "#FFFFFF"}
}

CLUB_CANONICAL = {
    "Man City": "Manchester City",
    "Man Utd": "Manchester United",
    "PSG": "Paris Saint-Germain",
    "Dortmund": "Borussia Dortmund",
    "Bayern": "Bayern Munich",
    "Barça": "FC Barcelona",
    "Barcelona": "FC Barcelona",
    "Atlético Madrid": "Atlético de Madrid",
    "Atletico Madrid": "Atlético de Madrid",
    "Monaco": "AS Monaco",
    "Salzburg": "Red Bull Salzburg",
    "Molde": "Molde FK",
    "Sporting": "Sporting CP",
    "Juve": "Juventus FC",
    "Juventus": "Juventus FC",
    "Milan": "AC Milan",
    "Inter": "Inter Milan",
    "Roma": "AS Roma",
    "Lazio": "SS Lazio",
    "Spurs": "Tottenham Hotspur",
    "Tottenham": "Tottenham Hotspur",
    "Arsenal": "Arsenal FC",
    "Chelsea": "Chelsea FC",
    "Liverpool": "Liverpool FC",
    "Newcastle": "Newcastle United",
    "Aston Villa": "Aston Villa",
    "West Ham": "West Ham United",
    "Everton": "Everton FC",
    "Wolves": "Wolverhampton Wanderers",
    "Bournemouth": "AFC Bournemouth",
    "Brentford": "Brentford FC",
    "Fulham": "Fulham FC",
    "Leicester": "Leicester City",
    "Southampton": "Southampton FC",
    "Leverkusen": "Bayer 04 Leverkusen",
    "Leipzig": "RB Leipzig",
    "Frankfurt": "Eintracht Frankfurt",
    "Stuttgart": "VfB Stuttgart",
    "Gladbach": "Borussia Mönchengladbach",
    "Wolfsburg": "VfL Wolfsburg",
    "Freiburg": "SC Freiburg",
    "Hoffenheim": "TSG 1899 Hoffenheim",
    "Augsburg": "FC Augsburg",
    "Mainz 05": "1.FSV Mainz 05",
    "Union Berlin": "1.FC Union Berlin",
    "St. Pauli": "FC St. Pauli",
    "Bochum": "VfL Bochum",
    "Napoli": "SSC Napoli",
    "Atalanta": "Atalanta BC",
    "Bologna": "Bologna Football Club 1909",
    "Fiorentina": "ACF Fiorentina",
    "Torino": "Torino FC",
    "Genoa": "Genoa CFC",
    "Udinese": "Udinese Calcio",
    "Cagliari": "Cagliari Calcio",
    "Parma": "Parma Calcio 1913",
    "Como": "Como 1907",
    "Verona": "Hellas Verona",
    "Lecce": "US Lecce",
    "Empoli": "FC Empoli",
    "Monza": "AC Monza",
    "Venezia": "Venezia FC",
    "Marseille": "Olympique Marseille",
    "Lyon": "Olympique Lyon",
    "Lille": "LOSC Lille",
    "Nice": "OGC Nice",
    "Lens": "RC Lens",
    "Rennes": "Stade Rennais FC",
    "Stade Rennais": "Stade Rennais FC",
    "Brest": "Stade Brestois 29",
    "Reims": "Stade Reims",
    "Strasbourg": "RC Strasbourg Alsace",
    "Toulouse": "FC Toulouse",
    "Nantes": "FC Nantes",
    "Montpellier": "Montpellier HSC",
    "Auxerre": "AJ Auxerre",
    "Saint-Étienne": "AS Saint-Étienne",
    "Le Havre": "Le Havre AC",
    "Angers": "Angers SCO",
    "Athletic Club": "Athletic Bilbao",
    "Real Betis": "Real Betis Balompié",
    "Betis": "Real Betis Balompié",
    "Sevilla": "Sevilla FC",
    "Girona": "Girona FC",
    "Valencia": "Valencia CF",
    "Celta Vigo": "Celta de Vigo",
    "Osasuna": "CA Osasuna",
    "Mallorca": "RCD Mallorca",
    "Getafe": "Getafe CF",
    "Espanyol": "RCD Espanyol Barcelona",
    "Las Palmas": "UD Las Palmas",
    "Alavés": "Deportivo Alavés",
    "Valladolid": "Real Valladolid CF"
}

def canonical_club(name):
    if not name:
        return name
    return CLUB_CANONICAL.get(name, name)

def get_club_color(club_name):
    if not club_name:
        return {"primary": "#38BDF8", "secondary": "#0284C7", "text": "#FFFFFF"}
    c_name = canonical_club(club_name)
    if c_name in CLUB_COLORS:
        return CLUB_COLORS[c_name]
    for key, val in CLUB_COLORS.items():
        if key.lower() in c_name.lower() or c_name.lower() in key.lower():
            return val
    return {"primary": "#10B981", "secondary": "#059669", "text": "#FFFFFF"}

def main():
    conn = sqlite3.connect('playervalue.db')
    c = conn.cursor()

    # 1. Build Club Logos dataset
    print("Building club logos mapping...")
    with open('data/archive (2)/clubs.csv', mode='r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        csv_top = [row for row in reader if row.get('domestic_competition_id') in ['GB1', 'ES1', 'L1', 'IT1', 'FR1']]

    c.execute('SELECT id, name, country, league_id FROM clubs ORDER BY id')
    db_clubs = c.fetchall()

    club_logos = {}
    club_meta = {}
    for db_c, csv_c in zip(db_clubs, csv_top):
        tm_id = int(csv_c['club_id'])
        db_id = db_c[0]
        cname = db_c[1]
        logo_url = f"https://tmssl.akamaized.net/images/wappen/head/{tm_id}.png"
        colors = get_club_color(cname)
        
        info = {
            "id": db_id,
            "tm_id": tm_id,
            "name": cname,
            "country": db_c[2],
            "logo_url": logo_url,
            "colors": colors
        }
        club_logos[db_id] = logo_url
        club_logos[cname] = logo_url
        club_meta[db_id] = info
        club_meta[cname] = info

    # Output club_logos_data.js
    club_logos_js = f"""// Auto-generated Club Logos and Color Theme Dataset
const CLUB_LOGOS_BY_ID = {json.dumps(club_logos, indent=2)};
const CLUB_META_DATA = {json.dumps(club_meta, indent=2)};

function getClubLogoUrl(clubId, clubName) {{
    if (clubId && CLUB_LOGOS_BY_ID[clubId]) return CLUB_LOGOS_BY_ID[clubId];
    if (clubName && CLUB_LOGOS_BY_ID[clubName]) return CLUB_LOGOS_BY_ID[clubName];
    // Check partial name match
    if (clubName) {{
        const lower = clubName.toLowerCase();
        for (const [key, url] of Object.entries(CLUB_LOGOS_BY_ID)) {{
            if (typeof key === 'string' && (lower.includes(key.toLowerCase()) || key.toLowerCase().includes(lower))) {{
                return url;
            }}
        }}
    }}
    return null;
}}

function createClubLogo(clubId, clubName, size = 26, extraClass = '') {{
    const safeName = (clubName || 'Club').replace(/"/g, '&quot;');
    const logoUrl = getClubLogoUrl(clubId, clubName);
    const initials = (clubName || 'FC').split(' ').filter(Boolean).map(w => w[0]).slice(0, 2).join('').toUpperCase();
    
    if (logoUrl) {{
        return `<span class="club-logo-wrap ${{extraClass}}" style="display:inline-flex; align-items:center; justify-content:center; width:${{size}}px; height:${{size}}px; flex-shrink:0;">
            <img src="${{logoUrl}}" alt="${{safeName}}" title="${{safeName}}" loading="lazy" decoding="async"
                 style="width:100%; height:100%; object-fit:contain; filter:drop-shadow(0 1px 2px rgba(0,0,0,0.25));"
                 onerror="this.parentElement.innerHTML='<span style=\\'display:inline-flex;align-items:center;justify-content:center;width:${{size}}px;height:${{size}}px;border-radius:50%;background:rgba(255,255,255,0.08);font-size:${{Math.max(9, size * 0.36)}}px;font-weight:700;color:var(--color-ink);\\'>${{initials}}</span>';">
        </span>`;
    }}
    return `<span class="club-logo-wrap ${{extraClass}}" style="display:inline-flex; align-items:center; justify-content:center; width:${{size}}px; height:${{size}}px; border-radius:50%; background:rgba(255,255,255,0.08); font-size:${{Math.max(9, size * 0.36)}}px; font-weight:700; color:var(--color-ink); flex-shrink:0;">${{initials}}</span>`;
}}
"""
    with open('frontend/js/club_logos_data.js', 'w', encoding='utf-8') as f:
        f.write(club_logos_js)
    print("Saved frontend/js/club_logos_data.js")

    # 2. Build Top 100 Players Intelligence Dataset
    print("\nExtracting Top 100 players data...")
    query = """
        SELECT p.id, p.name, p.primary_position, mv.market_value_eur, c.name as current_club, c.id as current_club_id,
               mp.predicted_value_eur
        FROM players p
        JOIN (
            SELECT player_id, market_value_eur, valuation_date,
                   ROW_NUMBER() OVER (PARTITION BY player_id ORDER BY valuation_date DESC) as rn
            FROM market_values
        ) mv ON p.id = mv.player_id AND mv.rn = 1
        LEFT JOIN (
            SELECT player_id, predicted_value_eur,
                   ROW_NUMBER() OVER (PARTITION BY player_id ORDER BY prediction_date DESC) as rn
            FROM model_predictions
        ) mp ON p.id = mp.player_id AND mp.rn = 1
        LEFT JOIN player_club_history pch ON p.id = pch.player_id AND pch.is_current = 1
        LEFT JOIN clubs c ON pch.club_id = c.id
        ORDER BY mv.market_value_eur DESC
        LIMIT 100
    """
    c.execute(query)
    top100 = c.fetchall()

    # Pre-read valuations for all top 100
    top_ids = [r[0] for r in top100]
    c.execute(f"""
        SELECT player_id, valuation_date, market_value_eur
        FROM market_values
        WHERE player_id IN ({','.join(map(str, top_ids))})
        ORDER BY player_id, valuation_date ASC
    """)
    player_mvs = {}
    for pid, vdate, val in c.fetchall():
        if pid not in player_mvs:
            player_mvs[pid] = []
        player_mvs[pid].append((str(vdate), float(val)))

    # Pre-read transfers from transfers.csv for top 100
    top_names = {r[1]: r[0] for r in top100}
    raw_transfers = {r[1]: [] for r in top100}
    with open('data/archive (2)/transfers.csv', mode='r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            pname = row.get('player_name')
            if pname in raw_transfers:
                fee_str = row.get('transfer_fee')
                fee = float(fee_str) if fee_str and fee_str != '' else None
                from_c = canonical_club(row.get('from_club_name') or 'Youth Club')
                to_c = canonical_club(row.get('to_club_name') or 'Current Club')
                t_date = row.get('transfer_date')
                if t_date:
                    raw_transfers[pname].append({
                        'date': t_date,
                        'from_club': from_c,
                        'to_club': to_c,
                        'fee_eur': fee,
                        'season': row.get('transfer_season', '')
                    })

    # Read appearances / player_club_history to establish club tenure dates
    c.execute(f"""
        SELECT pch.player_id, pch.season, c.name, pch.is_current
        FROM player_club_history pch
        JOIN clubs c ON pch.club_id = c.id
        WHERE pch.player_id IN ({','.join(map(str, top_ids))})
        ORDER BY pch.player_id, pch.season ASC
    """)
    pch_by_player = {}
    for pid, season, cname, is_curr in c.fetchall():
        if pid not in pch_by_player:
            pch_by_player[pid] = []
        pch_by_player[pid].append({
            'season': season,
            'club_name': cname,
            'is_current': bool(is_curr)
        })

    def find_val_at_date(mvs, target_date):
        if not mvs:
            return None
        target = datetime.fromisoformat(target_date)
        best_val = mvs[0][1]
        best_diff = abs((datetime.fromisoformat(mvs[0][0]) - target).days)
        for d_str, v in mvs:
            diff = abs((datetime.fromisoformat(d_str) - target).days)
            if diff < best_diff:
                best_diff = diff
                best_val = v
        return best_val

    top100_intel = {}

    for row in top100:
        pid = row[0]
        pname = row[1]
        pos = row[2]
        mv = float(row[3])
        current_club = row[4] or "FC Club"
        current_club_id = row[5]
        pred_val = float(row[6]) if row[6] is not None else mv

        mvs = player_mvs.get(pid, [])
        t_list = raw_transfers.get(pname, [])
        # sort transfers by date ascending
        t_list.sort(key=lambda x: x['date'])

        # Filter meaningful senior transfers
        def is_youth(team):
            t_low = (team or '').lower()
            return any(k in t_low for k in ['u17', 'u18', 'u19', 'u20', 'u21', 'u23', 'youth', 'yth', 'jugend', 'jgd', 'clairef', 'sub-'])

        meaningful_transfers = []
        for t in t_list:
            from_c = t['from_club'] or ''
            to_c = t['to_club'] or ''
            fee = t['fee_eur']
            # Ignore same club moves unless significant fee
            if from_c == to_c:
                continue
            # If moving to youth and no fee, skip
            if is_youth(to_c) and (not fee or fee == 0):
                continue
            # If moving from youth to senior of same club and no fee, only keep if first move
            if is_youth(from_c) and not fee:
                continue

            val_at_t = find_val_at_date(mvs, t['date']) or mv
            diff = None
            diff_pct = None
            is_bargain = None
            if fee is not None:
                diff = val_at_t - fee
                diff_pct = (diff / fee * 100) if fee > 0 else 100.0
                is_bargain = diff > 0

            meaningful_transfers.append({
                "date": t['date'],
                "from_club": from_c,
                "to_club": to_c,
                "fee_eur": fee,
                "valuation_at_transfer": val_at_t,
                "val_vs_fee_diff": diff,
                "val_vs_fee_percent": diff_pct,
                "is_bargain": is_bargain,
                "from_logo": get_club_logo_url_py(from_c, club_logos),
                "to_logo": get_club_logo_url_py(to_c, club_logos),
                "from_color": get_club_color(from_c)['primary'],
                "to_color": get_club_color(to_c)['primary']
            })

        # Build chronological club periods
        club_periods = []
        start_date = mvs[0][0] if mvs else "2018-01-01"
        end_date = mvs[-1][0] if mvs else "2026-06-30"

        if meaningful_transfers:
            # First club from first transfer's from_club (if not youth)
            first_t = meaningful_transfers[0]
            if first_t['from_club'] and not is_youth(first_t['from_club']):
                club_periods.append({
                    "club_name": first_t['from_club'],
                    "start_date": start_date,
                    "end_date": first_t['date'],
                    "color": get_club_color(first_t['from_club'])['primary'],
                    "logo_url": get_club_logo_url_py(first_t['from_club'], club_logos)
                })

            for idx, tr in enumerate(meaningful_transfers):
                curr_start = tr['date']
                curr_end = meaningful_transfers[idx + 1]['date'] if idx + 1 < len(meaningful_transfers) else end_date
                if not is_youth(tr['to_club']):
                    club_periods.append({
                        "club_name": tr['to_club'],
                        "start_date": curr_start,
                        "end_date": curr_end,
                        "color": get_club_color(tr['to_club'])['primary'],
                        "logo_url": get_club_logo_url_py(tr['to_club'], club_logos)
                    })
        
        # Ensure current club is at the end of timeline
        if not club_periods or club_periods[-1]['club_name'] != current_club:
            if not club_periods:
                club_periods.append({
                    "club_name": current_club,
                    "start_date": start_date,
                    "end_date": end_date,
                    "color": get_club_color(current_club)['primary'],
                    "logo_url": get_club_logo_url_py(current_club, club_logos)
                })
            else:
                last_start = meaningful_transfers[-1]['date'] if meaningful_transfers else start_date
                club_periods.append({
                    "club_name": current_club,
                    "start_date": last_start,
                    "end_date": end_date,
                    "color": get_club_color(current_club)['primary'],
                    "logo_url": get_club_logo_url_py(current_club, club_logos)
                })

        # Deduplicate consecutive identical clubs in timeline
        dedup_periods = []
        for p in club_periods:
            p['club_name'] = canonical_club(p['club_name'])
            p['color'] = get_club_color(p['club_name'])['primary']
            p['logo_url'] = get_club_logo_url_py(p['club_name'], club_logos)
            if not dedup_periods:
                dedup_periods.append(p)
            elif dedup_periods[-1]['club_name'] == p['club_name']:
                dedup_periods[-1]['end_date'] = p['end_date']
            else:
                dedup_periods.append(p)

        top100_intel[pid] = {
            "id": pid,
            "name": pname,
            "primary_position": pos,
            "market_value_eur": mv,
            "predicted_value_eur": pred_val,
            "current_club": current_club,
            "current_club_id": current_club_id,
            "current_club_color": get_club_color(current_club)['primary'],
            "current_club_logo": get_club_logo_url_py(current_club, club_logos),
            "timeline": dedup_periods,
            "transfers": meaningful_transfers
        }

    # Write top100_data.js
    top100_js = f"""// Auto-generated Top 100 Players Career Clubs, Colors & Transfer Valuation Intelligence
const TOP_100_PLAYERS_DATA = {json.dumps(top100_intel, indent=2)};

function isTop100Player(playerId) {{
    return Boolean(TOP_100_PLAYERS_DATA && TOP_100_PLAYERS_DATA[playerId]);
}}

function getTop100Data(playerId) {{
    return TOP_100_PLAYERS_DATA ? TOP_100_PLAYERS_DATA[playerId] : null;
}}
"""
    with open('frontend/js/top100_data.js', 'w', encoding='utf-8') as f:
        f.write(top100_js)
    print("Saved frontend/js/top100_data.js")

def get_club_logo_url_py(cname, logo_dict):
    if not cname:
        return None
    if cname in logo_dict:
        return logo_dict[cname]
    lower = cname.lower()
    for k, v in logo_dict.items():
        if isinstance(k, str) and (lower in k.lower() or k.lower() in lower):
            return v
    return None

if __name__ == '__main__':
    main()
