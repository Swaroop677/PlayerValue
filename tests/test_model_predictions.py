"""
Regression test suite for PlayerValue model predictions.
Evaluates >=15 well-known benchmark players across all tactical positions,
asserting predictions align with actual Transfermarkt valuations within reasonable tolerance.
"""
import os
import sys

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, BASE_DIR)

from backend.api.model import CustomPlayerStats, predict_custom_valuation

BENCHMARK_PLAYERS = [
    {
        "name": "Erling Haaland",
        "pos": "ST",
        "actual_eur": 200_000_000,
        "tolerance_pct": 35.0,
        "min_expected_eur": 160_000_000,
        "stats": CustomPlayerStats(
            age=24, position="ST", minutes=3100, league_strength=5.0, club_tier=4.0,
            goals=32, assists=6, xg=29.5, xa=5.2, shots=118, key_passes=32,
            progressive_carries=48, progressive_passes=42, tackles=14, clean_sheets=0
        )
    },
    {
        "name": "Kylian Mbappé",
        "pos": "ST",
        "actual_eur": 180_000_000,
        "tolerance_pct": 35.0,
        "min_expected_eur": 140_000_000,
        "stats": CustomPlayerStats(
            age=26, position="ST", minutes=3250, league_strength=5.0, club_tier=4.0,
            goals=30, assists=9, xg=27.2, xa=7.4, shots=130, key_passes=54,
            progressive_carries=104, progressive_passes=68, tackles=16, clean_sheets=0
        )
    },
    {
        "name": "Vinícius Júnior",
        "pos": "LW",
        "actual_eur": 180_000_000,
        "tolerance_pct": 35.0,
        "min_expected_eur": 130_000_000,
        "stats": CustomPlayerStats(
            age=24, position="LW", minutes=3050, league_strength=5.0, club_tier=4.0,
            goals=24, assists=12, xg=19.8, xa=10.4, shots=98, key_passes=68,
            progressive_carries=142, progressive_passes=78, tackles=32, clean_sheets=0
        )
    },
    {
        "name": "Jude Bellingham",
        "pos": "AM",
        "actual_eur": 180_000_000,
        "tolerance_pct": 35.0,
        "min_expected_eur": 130_000_000,
        "stats": CustomPlayerStats(
            age=21, position="AM", minutes=3250, league_strength=5.0, club_tier=4.0,
            goals=21, assists=10, xg=17.8, xa=8.6, shots=76, key_passes=58,
            progressive_carries=88, progressive_passes=124, tackles=62, clean_sheets=0
        )
    },
    {
        "name": "Bukayo Saka",
        "pos": "RW",
        "actual_eur": 140_000_000,
        "tolerance_pct": 35.0,
        "min_expected_eur": 100_000_000,
        "stats": CustomPlayerStats(
            age=23, position="RW", minutes=3150, league_strength=5.0, club_tier=4.0,
            goals=18, assists=14, xg=15.6, xa=12.8, shots=88, key_passes=82,
            progressive_carries=108, progressive_passes=96, tackles=48, clean_sheets=0
        )
    },
    {
        "name": "Florian Wirtz",
        "pos": "AM",
        "actual_eur": 130_000_000,
        "tolerance_pct": 35.0,
        "min_expected_eur": 90_000_000,
        "stats": CustomPlayerStats(
            age=21, position="AM", minutes=3100, league_strength=4.8, club_tier=3.0,
            goals=18, assists=16, xg=14.8, xa=14.2, shots=86, key_passes=88,
            progressive_carries=114, progressive_passes=142, tackles=42, clean_sheets=0
        )
    },
    {
        "name": "Jamal Musiala",
        "pos": "AM",
        "actual_eur": 130_000_000,
        "tolerance_pct": 35.0,
        "min_expected_eur": 90_000_000,
        "stats": CustomPlayerStats(
            age=22, position="AM", minutes=2850, league_strength=4.8, club_tier=4.0,
            goals=16, assists=9, xg=13.8, xa=8.2, shots=68, key_passes=56,
            progressive_carries=132, progressive_passes=98, tackles=38, clean_sheets=0
        )
    },
    {
        "name": "Rodri",
        "pos": "DM",
        "actual_eur": 130_000_000,
        "tolerance_pct": 35.0,
        "min_expected_eur": 85_000_000,
        "stats": CustomPlayerStats(
            age=28, position="DM", minutes=3650, league_strength=5.0, club_tier=4.0,
            goals=9, assists=10, xg=7.2, xa=8.4, shots=58, key_passes=56,
            progressive_carries=68, progressive_passes=268, tackles=88, clean_sheets=0
        )
    },
    {
        "name": "Declan Rice",
        "pos": "DM",
        "actual_eur": 120_000_000,
        "tolerance_pct": 35.0,
        "min_expected_eur": 80_000_000,
        "stats": CustomPlayerStats(
            age=26, position="DM", minutes=3550, league_strength=5.0, club_tier=4.0,
            goals=7, assists=9, xg=5.8, xa=7.6, shots=48, key_passes=52,
            progressive_carries=74, progressive_passes=198, tackles=84, clean_sheets=0
        )
    },
    {
        "name": "Cole Palmer",
        "pos": "AM",
        "actual_eur": 100_000_000,
        "tolerance_pct": 35.0,
        "min_expected_eur": 75_000_000,
        "stats": CustomPlayerStats(
            age=22, position="AM", minutes=3100, league_strength=5.0, club_tier=4.0,
            goals=22, assists=13, xg=18.5, xa=11.2, shots=94, key_passes=78,
            progressive_carries=84, progressive_passes=118, tackles=34, clean_sheets=0
        )
    },
    {
        "name": "Harry Kane",
        "pos": "ST",
        "actual_eur": 100_000_000,
        "tolerance_pct": 35.0,
        "min_expected_eur": 70_000_000,
        "stats": CustomPlayerStats(
            age=31, position="ST", minutes=3300, league_strength=4.8, club_tier=4.0,
            goals=36, assists=11, xg=31.4, xa=8.6, shots=135, key_passes=62,
            progressive_carries=44, progressive_passes=115, tackles=22, clean_sheets=0
        )
    },
    {
        "name": "William Saliba",
        "pos": "CB",
        "actual_eur": 100_000_000,
        "tolerance_pct": 40.0,
        "min_expected_eur": 65_000_000,
        "stats": CustomPlayerStats(
            age=23, position="CB", minutes=3420, league_strength=5.0, club_tier=4.0,
            goals=2, assists=1, xg=1.8, xa=1.0, shots=16, key_passes=12,
            progressive_carries=32, progressive_passes=175, tackles=58, clean_sheets=18
        )
    },
    {
        "name": "Trent Alexander-Arnold",
        "pos": "RB",
        "actual_eur": 75_000_000,
        "tolerance_pct": 35.0,
        "min_expected_eur": 55_000_000,
        "stats": CustomPlayerStats(
            age=26, position="RB", minutes=3050, league_strength=5.0, club_tier=4.0,
            goals=4, assists=12, xg=3.4, xa=11.8, shots=46, key_passes=88,
            progressive_carries=54, progressive_passes=235, tackles=52, clean_sheets=14
        )
    },
    {
        "name": "Mohamed Salah",
        "pos": "RW",
        "actual_eur": 55_000_000,
        "tolerance_pct": 35.0,
        "min_expected_eur": 40_000_000,
        "stats": CustomPlayerStats(
            age=32, position="RW", minutes=3200, league_strength=5.0, club_tier=4.0,
            goals=25, assists=14, xg=22.0, xa=12.2, shots=112, key_passes=76,
            progressive_carries=88, progressive_passes=98, tackles=24, clean_sheets=0
        )
    },
    {
        "name": "Thibaut Courtois",
        "pos": "GK",
        "actual_eur": 25_000_000,
        "tolerance_pct": 40.0,
        "min_expected_eur": 18_000_000,
        "stats": CustomPlayerStats(
            age=32, position="GK", minutes=2700, league_strength=5.0, club_tier=4.0,
            goals=0, assists=0, xg=0.0, xa=0.0, shots=0, key_passes=2,
            progressive_carries=4, progressive_passes=45, tackles=2, clean_sheets=14
        )
    },
    {
        "name": "Manuel Neuer",
        "pos": "GK",
        "actual_eur": 4_000_000,
        "tolerance_pct": 50.0,
        "min_expected_eur": 1_500_000,
        "stats": CustomPlayerStats(
            age=38, position="GK", minutes=2600, league_strength=4.8, club_tier=4.0,
            goals=0, assists=0, xg=0.0, xa=0.0, shots=0, key_passes=2,
            progressive_carries=5, progressive_passes=60, tackles=2, clean_sheets=13
        )
    }
]

def run_tests():
    print("\n" + "=" * 90)
    print("REGRESSION TEST SUITE: 16 WELL-KNOWN SUPERSTAR PLAYERS PREDICTIONS")
    print("=" * 90)
    print(f"{'Player':<25} {'Pos':<5} {'Actual (TM)':<13} {'Model Implied':<15} {'Error %':<10} {'Status'}")
    print("-" * 90)

    flagged = 0
    errors = []

    for item in BENCHMARK_PLAYERS:
        name = item["name"]
        pos = item["pos"]
        act = item["actual_eur"]
        tol = item["tolerance_pct"]
        min_exp = item["min_expected_eur"]
        stats = item["stats"]

        res = predict_custom_valuation(stats)
        pred = res["predicted_value_eur"]
        err_pct = abs(pred - act) / act * 100.0
        errors.append(err_pct)

        passes_tol = (err_pct <= tol) or (pred >= min_exp and pred <= act * 1.35)
        if not passes_tol:
            flagged += 1
            status = "⚠️  Flagged"
        else:
            status = "✓  Passed"

        print(f"{name:<25} {pos:<5} €{act/1e6:>5.1f}M        €{pred/1e6:>5.1f}M          {err_pct:>6.1f}%    {status}")

    print("-" * 90)
    mape = sum(errors) / len(errors)
    med_err = sorted(errors)[len(errors)//2]
    print(f"Total Evaluated: {len(BENCHMARK_PLAYERS)} | Passed: {len(BENCHMARK_PLAYERS) - flagged} | Flagged: {flagged}")
    print(f"Mean Absolute % Error: {mape:.1f}% | Median % Error: {med_err:.1f}%")
    print("=" * 90 + "\n")

    assert flagged <= 2, f"Too many benchmark players flagged ({flagged}/{len(BENCHMARK_PLAYERS)})"
    print("All regression benchmarks successfully verified!")

if __name__ == "__main__":
    run_tests()
