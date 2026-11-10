/**
 * Preset player dataset for the PlayerValue Interactive Valuation Predictor.
 * Organized across 7 tactical position groups with at least 5 benchmark superstars each.
 */
const PREDICTOR_PRESETS = [
    // ==========================================
    // STRIKERS (ST / CF)
    // ==========================================
    {
        id: "haaland",
        name: "Erling Haaland",
        club: "Manchester City",
        league: "Premier League",
        position: "ST",
        position_group: "ST",
        age: 24,
        market_value_eur: 200000000,
        photo: "https://img.a.transfermarkt.technology/portrait/big/418560-1709108116.png?lm=1",
        description: "Generational goalscorer with historic xG conversion and physical box presence.",
        stats: {
            position: "ST", age: 24, minutes: 3100, league_strength: 5.0, club_tier: 4.0,
            goals: 32, assists: 6, xg: 29.5, xa: 5.2, shots: 118, key_passes: 32,
            progressive_carries: 48, progressive_passes: 42, tackles: 14, interceptions: 8,
            aerial_wins: 48, recoveries: 36, clean_sheets: 0
        }
    },
    {
        id: "mbappe",
        name: "Kylian Mbappé",
        club: "Real Madrid",
        league: "La Liga",
        position: "ST",
        position_group: "ST",
        age: 26,
        market_value_eur: 180000000,
        photo: "https://img.a.transfermarkt.technology/portrait/header/342229-1682683695.jpg?lm=1",
        description: "Devastating transitional speed, ball-carrying volume, and elite finishing.",
        stats: {
            position: "ST", age: 26, minutes: 3250, league_strength: 5.0, club_tier: 4.0,
            goals: 30, assists: 9, xg: 27.2, xa: 7.4, shots: 130, key_passes: 54,
            progressive_carries: 104, progressive_passes: 68, tackles: 16, interceptions: 10,
            aerial_wins: 15, recoveries: 44, clean_sheets: 0
        }
    },
    {
        id: "kane",
        name: "Harry Kane",
        club: "Bayern Munich",
        league: "Bundesliga",
        position: "ST",
        position_group: "ST",
        age: 31,
        market_value_eur: 100000000,
        photo: "https://img.a.transfermarkt.technology/portrait/header/132098-1700211176.jpg?lm=1",
        description: "Complete number 9 offering world-class playmaking passing and lethal box finishing.",
        stats: {
            position: "ST", age: 31, minutes: 3300, league_strength: 4.8, club_tier: 4.0,
            goals: 36, assists: 11, xg: 31.4, xa: 8.6, shots: 135, key_passes: 62,
            progressive_carries: 44, progressive_passes: 115, tackles: 22, interceptions: 12,
            aerial_wins: 52, recoveries: 55, clean_sheets: 0
        }
    },
    {
        id: "lewandowski",
        name: "Robert Lewandowski",
        club: "FC Barcelona",
        league: "La Liga",
        position: "ST",
        position_group: "ST",
        age: 36,
        market_value_eur: 15000000,
        photo: "https://img.a.transfermarkt.technology/portrait/header/38253-1701118759.jpg?lm=1",
        description: "Veteran master poacher with intelligent movement, hold-up linkup, and penalty mastery.",
        stats: {
            position: "ST", age: 36, minutes: 2850, league_strength: 5.0, club_tier: 4.0,
            goals: 24, assists: 4, xg: 22.8, xa: 3.9, shots: 96, key_passes: 30,
            progressive_carries: 28, progressive_passes: 38, tackles: 12, interceptions: 6,
            aerial_wins: 44, recoveries: 32, clean_sheets: 0
        }
    },
    {
        id: "osimhen",
        name: "Victor Osimhen",
        club: "Galatasaray",
        league: "Süper Lig",
        position: "ST",
        position_group: "ST",
        age: 26,
        market_value_eur: 75000000,
        photo: "https://img.a.transfermarkt.technology/portrait/header/401923-1661514389.jpg?lm=1",
        description: "Dynamic channel-running forward with elite aerial presence and high pressing work-rate.",
        stats: {
            position: "ST", age: 26, minutes: 2600, league_strength: 4.0, club_tier: 3.0,
            goals: 22, assists: 4, xg: 20.4, xa: 3.6, shots: 92, key_passes: 28,
            progressive_carries: 52, progressive_passes: 32, tackles: 20, interceptions: 9,
            aerial_wins: 62, recoveries: 48, clean_sheets: 0
        }
    },

    // ==========================================
    // WINGERS (LW / RW)
    // ==========================================
    {
        id: "vinicius",
        name: "Vinícius Júnior",
        club: "Real Madrid",
        league: "La Liga",
        position: "LW",
        position_group: "Winger",
        age: 24,
        market_value_eur: 180000000,
        photo: "https://img.a.transfermarkt.technology/portrait/header/371998-1664885870.jpg?lm=1",
        description: "World-class 1v1 dribbler, electric transitional outlet and Champions League winner.",
        stats: {
            position: "LW", age: 24, minutes: 3050, league_strength: 5.0, club_tier: 4.0,
            goals: 24, assists: 12, xg: 19.8, xa: 10.4, shots: 98, key_passes: 68,
            progressive_carries: 142, progressive_passes: 78, tackles: 32, interceptions: 14,
            aerial_wins: 8, recoveries: 64, clean_sheets: 0
        }
    },
    {
        id: "yamal",
        name: "Lamine Yamal",
        club: "FC Barcelona",
        league: "La Liga",
        position: "RW",
        position_group: "Winger",
        age: 17,
        market_value_eur: 180000000,
        photo: "https://img.a.transfermarkt.technology/portrait/header/937958-1718956961.jpg?lm=1",
        description: "Historic teenage sensation with generational vision, inverted crossing, and technical purity.",
        stats: {
            position: "RW", age: 17, minutes: 2950, league_strength: 5.0, club_tier: 4.0,
            goals: 12, assists: 16, xg: 10.8, xa: 13.9, shots: 82, key_passes: 76,
            progressive_carries: 128, progressive_passes: 92, tackles: 36, interceptions: 18,
            aerial_wins: 6, recoveries: 72, clean_sheets: 0
        }
    },
    {
        id: "saka",
        name: "Bukayo Saka",
        club: "Arsenal FC",
        league: "Premier League",
        position: "RW",
        position_group: "Winger",
        age: 23,
        market_value_eur: 140000000,
        photo: "https://img.a.transfermarkt.technology/portrait/header/433177-1684155057.jpg?lm=1",
        description: "Premier League talisman with elite ball retention, decision making, and consistent production.",
        stats: {
            position: "RW", age: 23, minutes: 3150, league_strength: 5.0, club_tier: 4.0,
            goals: 18, assists: 14, xg: 15.6, xa: 12.8, shots: 88, key_passes: 82,
            progressive_carries: 108, progressive_passes: 96, tackles: 48, interceptions: 22,
            aerial_wins: 24, recoveries: 80, clean_sheets: 0
        }
    },
    {
        id: "salah",
        name: "Mohamed Salah",
        club: "Liverpool FC",
        league: "Premier League",
        position: "RW",
        position_group: "Winger",
        age: 32,
        market_value_eur: 55000000,
        photo: "https://img.a.transfermarkt.technology/portrait/header/148455-1546603975.jpg?lm=1",
        description: "Legendary Premier League forward with sustained 30+ G+A output season after season.",
        stats: {
            position: "RW", age: 32, minutes: 3200, league_strength: 5.0, club_tier: 4.0,
            goals: 25, assists: 14, xg: 22.0, xa: 12.2, shots: 112, key_passes: 76,
            progressive_carries: 88, progressive_passes: 98, tackles: 24, interceptions: 12,
            aerial_wins: 14, recoveries: 58, clean_sheets: 0
        }
    },
    {
        id: "raphinha",
        name: "Raphinha",
        club: "FC Barcelona",
        league: "La Liga",
        position: "LW",
        position_group: "Winger",
        age: 28,
        market_value_eur: 75000000,
        photo: "https://img.a.transfermarkt.technology/portrait/header/411295-1668502598.jpg?lm=1",
        description: "Relentless pressing winger with devastating set-piece delivery and direct counter-attacking punch.",
        stats: {
            position: "LW", age: 28, minutes: 2900, league_strength: 5.0, club_tier: 4.0,
            goals: 18, assists: 12, xg: 16.2, xa: 11.4, shots: 92, key_passes: 74,
            progressive_carries: 86, progressive_passes: 84, tackles: 42, interceptions: 20,
            aerial_wins: 16, recoveries: 70, clean_sheets: 0
        }
    },

    // ==========================================
    // ATTACKING & CENTRAL MIDFIELD (AM / CM)
    // ==========================================
    {
        id: "bellingham",
        name: "Jude Bellingham",
        club: "Real Madrid",
        league: "La Liga",
        position: "AM",
        position_group: "AM/CM",
        age: 21,
        market_value_eur: 180000000,
        photo: "https://img.a.transfermarkt.technology/portrait/header/581678-1693217435.jpg?lm=1",
        description: "Complete box-to-box phenomenon dominating penalty boxes, duels, and late-game moments.",
        stats: {
            position: "AM", age: 21, minutes: 3250, league_strength: 5.0, club_tier: 4.0,
            goals: 21, assists: 10, xg: 17.8, xa: 8.6, shots: 76, key_passes: 58,
            progressive_carries: 88, progressive_passes: 124, tackles: 62, interceptions: 36,
            aerial_wins: 48, recoveries: 135, clean_sheets: 0
        }
    },
    {
        id: "musiala",
        name: "Jamal Musiala",
        club: "Bayern Munich",
        league: "Bundesliga",
        position: "AM",
        position_group: "AM/CM",
        age: 22,
        market_value_eur: 130000000,
        photo: "https://img.a.transfermarkt.technology/portrait/header/580195-1694595208.jpg?lm=1",
        description: "Silky tight-space dribbler who unlocks dense low blocks with unmatched balance.",
        stats: {
            position: "AM", age: 22, minutes: 2850, league_strength: 4.8, club_tier: 4.0,
            goals: 16, assists: 9, xg: 13.8, xa: 8.2, shots: 68, key_passes: 56,
            progressive_carries: 132, progressive_passes: 98, tackles: 38, interceptions: 20,
            aerial_wins: 14, recoveries: 85, clean_sheets: 0
        }
    },
    {
        id: "wirtz",
        name: "Florian Wirtz",
        club: "Bayer 04 Leverkusen",
        league: "Bundesliga",
        position: "AM",
        position_group: "AM/CM",
        age: 21,
        market_value_eur: 130000000,
        photo: "https://img.a.transfermarkt.technology/portrait/header/598577-1694595303.jpg?lm=1",
        description: "Bundesliga champion playmaker combining half-space vision, press resistance, and clutch finishing.",
        stats: {
            position: "AM", age: 21, minutes: 3100, league_strength: 4.8, club_tier: 3.0,
            goals: 18, assists: 16, xg: 14.8, xa: 14.2, shots: 86, key_passes: 88,
            progressive_carries: 114, progressive_passes: 142, tackles: 42, interceptions: 22,
            aerial_wins: 16, recoveries: 95, clean_sheets: 0
        }
    },
    {
        id: "pedri",
        name: "Pedri",
        club: "FC Barcelona",
        league: "La Liga",
        position: "CM",
        position_group: "AM/CM",
        age: 22,
        market_value_eur: 100000000,
        photo: "https://img.a.transfermarkt.technology/portrait/header/683840-1668502660.jpg?lm=1",
        description: "Pure midfield orchestrator dictating game tempo with immaculate 360-degree awareness.",
        stats: {
            position: "CM", age: 22, minutes: 2750, league_strength: 5.0, club_tier: 4.0,
            goals: 6, assists: 8, xg: 5.6, xa: 7.8, shots: 42, key_passes: 68,
            progressive_carries: 78, progressive_passes: 168, tackles: 52, interceptions: 36,
            aerial_wins: 18, recoveries: 140, clean_sheets: 0
        }
    },
    {
        id: "palmer",
        name: "Cole Palmer",
        club: "Chelsea FC",
        league: "Premier League",
        position: "AM",
        position_group: "AM/CM",
        age: 22,
        market_value_eur: 100000000,
        photo: "https://img.a.transfermarkt.technology/portrait/header/568177-1693899209.jpg?lm=1",
        description: "Ice-cold offensive creator with devastating through-balls, penalties, and long-range shooting.",
        stats: {
            position: "AM", age: 22, minutes: 3100, league_strength: 5.0, club_tier: 4.0,
            goals: 22, assists: 13, xg: 18.5, xa: 11.2, shots: 94, key_passes: 78,
            progressive_carries: 84, progressive_passes: 118, tackles: 34, interceptions: 18,
            aerial_wins: 12, recoveries: 75, clean_sheets: 0
        }
    },

    // ==========================================
    // DEFENSIVE MIDFIELD (DM)
    // ==========================================
    {
        id: "rodri",
        name: "Rodri",
        club: "Manchester City",
        league: "Premier League",
        position: "DM",
        position_group: "DM",
        age: 28,
        market_value_eur: 130000000,
        photo: "https://img.a.transfermarkt.technology/portrait/header/357565-1682587884.jpg?lm=1",
        description: "Ballon d'Or winner and the undisputed world benchmark holding midfielder.",
        stats: {
            position: "DM", age: 28, minutes: 3650, league_strength: 5.0, club_tier: 4.0,
            goals: 9, assists: 10, xg: 7.2, xa: 8.4, shots: 58, key_passes: 56,
            progressive_carries: 68, progressive_passes: 268, tackles: 88, interceptions: 46,
            aerial_wins: 68, recoveries: 228, clean_sheets: 0
        }
    },
    {
        id: "rice",
        name: "Declan Rice",
        club: "Arsenal FC",
        league: "Premier League",
        position: "DM",
        position_group: "DM",
        age: 26,
        market_value_eur: 120000000,
        photo: "https://img.a.transfermarkt.technology/portrait/header/357662-1684155097.jpg?lm=1",
        description: "Powerhouse defensive anchor with unmatched ball-winning recovery distance and set-piece value.",
        stats: {
            position: "DM", age: 26, minutes: 3550, league_strength: 5.0, club_tier: 4.0,
            goals: 7, assists: 9, xg: 5.8, xa: 7.6, shots: 48, key_passes: 52,
            progressive_carries: 74, progressive_passes: 198, tackles: 84, interceptions: 52,
            aerial_wins: 54, recoveries: 205, clean_sheets: 0
        }
    },
    {
        id: "tchouameni",
        name: "Aurélien Tchouaméni",
        club: "Real Madrid",
        league: "La Liga",
        position: "DM",
        position_group: "DM",
        age: 25,
        market_value_eur: 90000000,
        photo: "https://img.a.transfermarkt.technology/portrait/header/560593-1664885899.jpg?lm=1",
        description: "Physically imposing destroyer who screens backlines and breaks lines with raking passes.",
        stats: {
            position: "DM", age: 25, minutes: 3050, league_strength: 5.0, club_tier: 4.0,
            goals: 3, assists: 2, xg: 2.6, xa: 2.1, shots: 32, key_passes: 26,
            progressive_carries: 42, progressive_passes: 178, tackles: 72, interceptions: 56,
            aerial_wins: 58, recoveries: 185, clean_sheets: 0
        }
    },
    {
        id: "barella",
        name: "Nicolò Barella",
        club: "Inter Milan",
        league: "Serie A",
        position: "DM",
        position_group: "DM",
        age: 28,
        market_value_eur: 80000000,
        photo: "https://img.a.transfermarkt.technology/portrait/header/255942-1664885934.jpg?lm=1",
        description: "Dynamic box-to-box midfielder with high tactical intellect, tackling engine, and transition vision.",
        stats: {
            position: "DM", age: 28, minutes: 3250, league_strength: 4.7, club_tier: 3.0,
            goals: 5, assists: 8, xg: 4.8, xa: 7.2, shots: 46, key_passes: 62,
            progressive_carries: 76, progressive_passes: 184, tackles: 64, interceptions: 36,
            aerial_wins: 22, recoveries: 175, clean_sheets: 0
        }
    },
    {
        id: "zubimendi",
        name: "Martín Zubimendi",
        club: "Real Sociedad",
        league: "La Liga",
        position: "DM",
        position_group: "DM",
        age: 26,
        market_value_eur: 60000000,
        photo: "https://img.a.transfermarkt.technology/portrait/header/423440-1664885970.jpg?lm=1",
        description: "Classic Spanish pivot who controls space, anticipates second balls, and resists intense pressing.",
        stats: {
            position: "DM", age: 26, minutes: 3300, league_strength: 5.0, club_tier: 2.0,
            goals: 4, assists: 2, xg: 3.2, xa: 2.6, shots: 26, key_passes: 32,
            progressive_carries: 36, progressive_passes: 165, tackles: 68, interceptions: 48,
            aerial_wins: 56, recoveries: 195, clean_sheets: 0
        }
    },

    // ==========================================
    // CENTER BACKS (CB)
    // ==========================================
    {
        id: "saliba",
        name: "William Saliba",
        club: "Arsenal FC",
        league: "Premier League",
        position: "CB",
        position_group: "CB",
        age: 23,
        market_value_eur: 100000000,
        photo: "https://img.a.transfermarkt.technology/portrait/header/495666-1684155123.jpg?lm=1",
        description: "Rolls-Royce modern defender: serene in possession, rapid recovery speed, and rarely commits fouls.",
        stats: {
            position: "CB", age: 23, minutes: 3420, league_strength: 5.0, club_tier: 4.0,
            goals: 2, assists: 1, xg: 1.8, xa: 1.0, shots: 16, key_passes: 12,
            progressive_carries: 32, progressive_passes: 175, tackles: 58, interceptions: 42,
            aerial_wins: 82, recoveries: 178, clean_sheets: 18
        }
    },
    {
        id: "vandijk",
        name: "Virgil van Dijk",
        club: "Liverpool FC",
        league: "Premier League",
        position: "CB",
        position_group: "CB",
        age: 33,
        market_value_eur: 30000000,
        photo: "https://img.a.transfermarkt.technology/portrait/header/139208-1664886001.jpg?lm=1",
        description: "Legendary defensive leader dominating aerial duels and spraying 60-yard diagonal passes.",
        stats: {
            position: "CB", age: 33, minutes: 3400, league_strength: 5.0, club_tier: 4.0,
            goals: 4, assists: 2, xg: 3.6, xa: 1.6, shots: 32, key_passes: 16,
            progressive_carries: 28, progressive_passes: 185, tackles: 46, interceptions: 48,
            aerial_wins: 125, recoveries: 188, clean_sheets: 16
        }
    },
    {
        id: "gvardiol",
        name: "Joško Gvardiol",
        club: "Manchester City",
        league: "Premier League",
        position: "CB",
        position_group: "CB",
        age: 23,
        market_value_eur: 80000000,
        photo: "https://img.a.transfermarkt.technology/portrait/header/475959-1664886035.jpg?lm=1",
        description: "Hyper-modern hybrid defender who can drive forward, score wonder goals, and lock down wingers.",
        stats: {
            position: "CB", age: 23, minutes: 3250, league_strength: 5.0, club_tier: 4.0,
            goals: 5, assists: 3, xg: 4.2, xa: 3.0, shots: 36, key_passes: 38,
            progressive_carries: 74, progressive_passes: 190, tackles: 62, interceptions: 44,
            aerial_wins: 76, recoveries: 172, clean_sheets: 16
        }
    },
    {
        id: "dias",
        name: "Rúben Dias",
        club: "Manchester City",
        league: "Premier League",
        position: "CB",
        position_group: "CB",
        age: 27,
        market_value_eur: 80000000,
        photo: "https://img.a.transfermarkt.technology/portrait/header/258004-1664886068.jpg?lm=1",
        description: "Vocal organizer with brave goal-line shot-blocking and immaculate short passing under pressure.",
        stats: {
            position: "CB", age: 27, minutes: 3150, league_strength: 5.0, club_tier: 4.0,
            goals: 1, assists: 1, xg: 1.2, xa: 0.8, shots: 14, key_passes: 10,
            progressive_carries: 26, progressive_passes: 195, tackles: 50, interceptions: 36,
            aerial_wins: 72, recoveries: 165, clean_sheets: 17
        }
    },
    {
        id: "rudiger",
        name: "Antonio Rüdiger",
        club: "Real Madrid",
        league: "La Liga",
        position: "CB",
        position_group: "CB",
        age: 31,
        market_value_eur: 25000000,
        photo: "https://img.a.transfermarkt.technology/portrait/header/86479-1664886101.jpg?lm=1",
        description: "Aggressive, high-intensity man-marker who physically bullies forwards in big European ties.",
        stats: {
            position: "CB", age: 31, minutes: 3350, league_strength: 5.0, club_tier: 4.0,
            goals: 3, assists: 1, xg: 2.6, xa: 0.9, shots: 22, key_passes: 14,
            progressive_carries: 36, progressive_passes: 155, tackles: 52, interceptions: 40,
            aerial_wins: 92, recoveries: 170, clean_sheets: 16
        }
    },

    // ==========================================
    // FULLBACKS (LB / RB)
    // ==========================================
    {
        id: "trent",
        name: "Trent Alexander-Arnold",
        club: "Liverpool FC",
        league: "Premier League",
        position: "RB",
        position_group: "Fullback",
        age: 26,
        market_value_eur: 75000000,
        photo: "https://img.a.transfermarkt.technology/portrait/header/314353-1664886134.jpg?lm=1",
        description: "Generational playmaking fullback capable of game-defining passing range from inverted positions.",
        stats: {
            position: "RB", age: 26, minutes: 3050, league_strength: 5.0, club_tier: 4.0,
            goals: 4, assists: 12, xg: 3.4, xa: 11.8, shots: 46, key_passes: 88,
            progressive_carries: 54, progressive_passes: 235, tackles: 52, interceptions: 36,
            aerial_wins: 28, recoveries: 155, clean_sheets: 14
        }
    },
    {
        id: "hakimi",
        name: "Achraf Hakimi",
        club: "Paris Saint-Germain",
        league: "Ligue 1",
        position: "RB",
        position_group: "Fullback",
        age: 26,
        market_value_eur: 60000000,
        photo: "https://img.a.transfermarkt.technology/portrait/header/398073-1664886167.jpg?lm=1",
        description: "Blistering pace down the right flank, offering constant overlapping width and goal threat.",
        stats: {
            position: "RB", age: 26, minutes: 3150, league_strength: 4.5, club_tier: 4.0,
            goals: 6, assists: 8, xg: 5.6, xa: 7.8, shots: 42, key_passes: 62,
            progressive_carries: 98, progressive_passes: 164, tackles: 68, interceptions: 36,
            aerial_wins: 24, recoveries: 160, clean_sheets: 15
        }
    },
    {
        id: "theo",
        name: "Theo Hernández",
        club: "AC Milan",
        league: "Serie A",
        position: "LB",
        position_group: "Fullback",
        age: 27,
        market_value_eur: 60000000,
        photo: "https://img.a.transfermarkt.technology/portrait/header/339808-1664886200.jpg?lm=1",
        description: "Locomotive left-back whose freight-train ball carrying tears open opposition midfield lines.",
        stats: {
            position: "LB", age: 27, minutes: 3200, league_strength: 4.7, club_tier: 3.0,
            goals: 6, assists: 6, xg: 4.9, xa: 5.8, shots: 46, key_passes: 52,
            progressive_carries: 112, progressive_passes: 128, tackles: 62, interceptions: 32,
            aerial_wins: 38, recoveries: 150, clean_sheets: 13
        }
    },
    {
        id: "davies",
        name: "Alphonso Davies",
        club: "Bayern Munich",
        league: "Bundesliga",
        position: "LB",
        position_group: "Fullback",
        age: 24,
        market_value_eur: 50000000,
        photo: "https://img.a.transfermarkt.technology/portrait/header/424204-1664886233.jpg?lm=1",
        description: "Supercharged speedster who provides instant defensive recovery and dynamic flank progression.",
        stats: {
            position: "LB", age: 24, minutes: 2850, league_strength: 4.8, club_tier: 4.0,
            goals: 3, assists: 5, xg: 2.6, xa: 4.9, shots: 32, key_passes: 42,
            progressive_carries: 118, progressive_passes: 112, tackles: 56, interceptions: 36,
            aerial_wins: 26, recoveries: 145, clean_sheets: 14
        }
    },
    {
        id: "dimarco",
        name: "Federico Dimarco",
        club: "Inter Milan",
        league: "Serie A",
        position: "LB",
        position_group: "Fullback",
        age: 27,
        market_value_eur: 50000000,
        photo: "https://img.a.transfermarkt.technology/portrait/header/199248-1664886266.jpg?lm=1",
        description: "Deadly left-footed delivery specialist with world-class crossing accuracy and shooting technique.",
        stats: {
            position: "LB", age: 27, minutes: 2750, league_strength: 4.7, club_tier: 3.0,
            goals: 6, assists: 8, xg: 4.4, xa: 8.0, shots: 48, key_passes: 68,
            progressive_carries: 64, progressive_passes: 148, tackles: 46, interceptions: 26,
            aerial_wins: 16, recoveries: 135, clean_sheets: 14
        }
    },

    // ==========================================
    // GOALKEEPERS (GK)
    // ==========================================
    {
        id: "courtois",
        name: "Thibaut Courtois",
        club: "Real Madrid",
        league: "La Liga",
        position: "GK",
        position_group: "GK",
        age: 32,
        market_value_eur: 25000000,
        photo: "https://img.a.transfermarkt.technology/portrait/header/108390-1664886299.jpg?lm=1",
        description: "Commanding shot-stopper with extraordinary wingspan, box dominance, and UCL pedigree.",
        stats: {
            position: "GK", age: 32, minutes: 2700, league_strength: 5.0, club_tier: 4.0,
            goals: 0, assists: 0, xg: 0.0, xa: 0.0, shots: 0, key_passes: 2,
            progressive_carries: 4, progressive_passes: 45, tackles: 2, interceptions: 2,
            aerial_wins: 25, recoveries: 110, clean_sheets: 14
        }
    },
    {
        id: "alisson",
        name: "Alisson Becker",
        club: "Liverpool FC",
        league: "Premier League",
        position: "GK",
        position_group: "GK",
        age: 32,
        market_value_eur: 28000000,
        photo: "https://img.a.transfermarkt.technology/portrait/header/105470-1664886332.jpg?lm=1",
        description: "Elite 1v1 sweeper-keeper with proactive positioning and calm long-range distribution.",
        stats: {
            position: "GK", age: 32, minutes: 2800, league_strength: 5.0, club_tier: 4.0,
            goals: 0, assists: 1, xg: 0.0, xa: 0.8, shots: 0, key_passes: 3,
            progressive_carries: 6, progressive_passes: 55, tackles: 3, interceptions: 3,
            aerial_wins: 28, recoveries: 120, clean_sheets: 15
        }
    },
    {
        id: "donnarumma",
        name: "Gianluigi Donnarumma",
        club: "Paris Saint-Germain",
        league: "Ligue 1",
        position: "GK",
        position_group: "GK",
        age: 26,
        market_value_eur: 40000000,
        photo: "https://img.a.transfermarkt.technology/portrait/header/315858-1664886365.jpg?lm=1",
        description: "Euro 2020 hero with reflex stops from close range and massive frame on penalties.",
        stats: {
            position: "GK", age: 26, minutes: 3100, league_strength: 4.5, club_tier: 4.0,
            goals: 0, assists: 0, xg: 0.0, xa: 0.0, shots: 0, key_passes: 1,
            progressive_carries: 2, progressive_passes: 35, tackles: 1, interceptions: 1,
            aerial_wins: 22, recoveries: 105, clean_sheets: 16
        }
    },
    {
        id: "oblak",
        name: "Jan Oblak",
        club: "Atlético de Madrid",
        league: "La Liga",
        position: "GK",
        position_group: "GK",
        age: 32,
        market_value_eur: 25000000,
        photo: "https://img.a.transfermarkt.technology/portrait/header/121483-1664886398.jpg?lm=1",
        description: "Rock of Diego Simeone's defense with historic clean-sheet records and handling consistency.",
        stats: {
            position: "GK", age: 32, minutes: 3200, league_strength: 5.0, club_tier: 3.0,
            goals: 0, assists: 0, xg: 0.0, xa: 0.0, shots: 0, key_passes: 1,
            progressive_carries: 3, progressive_passes: 30, tackles: 2, interceptions: 2,
            aerial_wins: 24, recoveries: 100, clean_sheets: 15
        }
    },
    {
        id: "neuer",
        name: "Manuel Neuer",
        club: "Bayern Munich",
        league: "Bundesliga",
        position: "GK",
        position_group: "GK",
        age: 38,
        market_value_eur: 4000000,
        photo: "https://img.a.transfermarkt.technology/portrait/header/17259-1664886431.jpg?lm=1",
        description: "The pioneer of the modern sweeper-keeper role and World Cup winning captain.",
        stats: {
            position: "GK", age: 38, minutes: 2600, league_strength: 4.8, club_tier: 4.0,
            goals: 0, assists: 0, xg: 0.0, xa: 0.0, shots: 0, key_passes: 2,
            progressive_carries: 5, progressive_passes: 60, tackles: 2, interceptions: 2,
            aerial_wins: 18, recoveries: 130, clean_sheets: 13
        }
    }
];

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { PREDICTOR_PRESETS };
}
