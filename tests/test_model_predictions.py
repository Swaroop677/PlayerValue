import os
import sqlite3

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB_PATH = os.path.join(BASE_DIR, "playervalue.db")

TARGET_PLAYERS = [
    "Erling Haaland",
    "Kylian Mbappé",
    "Bukayo Saka",
    "Jude Bellingham",
    "Vinicius Junior",
    "Rodri",
    "Declan Rice",
    "Martin Ødegaard",
    "Cole Palmer",
    "Phil Foden",
    "Florian Wirtz",
    "Jamal Musiala",
    "Harry Kane",
    "Mohamed Salah",
    "Lamine Yamal",
    "William Saliba",
    "Gabriel Magalhães",
    "Trent Alexander-Arnold",
    "Alphonso Davies",
    "Achraf Hakimi",
    "Bruno Fernandes",
    "Heung-min Son",
    "Lautaro Martínez",
    "Nicolò Barella",
    "Federico Valverde"
]

def test_25_players():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    placeholders = ",".join(["?"] * len(TARGET_PLAYERS))
    query = f"""
    SELECT 
        p.name,
        p.primary_position,
        mp.actual_market_value_eur,
        mp.predicted_value_eur,
        mp.difference_percent
    FROM model_predictions mp
    JOIN players p ON mp.player_id = p.id
    WHERE mp.model_version = 'v2.0-xgboost-quantile'
      AND p.name IN ({placeholders})
    GROUP BY p.name
    ORDER BY mp.actual_market_value_eur DESC
    """
    
    cursor.execute(query, TARGET_PLAYERS)
    rows = cursor.fetchall()
    conn.close()

    print("\n" + "=" * 80)
    print("EVALUATION ON 25 WELL-KNOWN PLAYERS (REAL STATS IN DB - v2.0-xgboost-quantile)")
    print("=" * 80)
    print(f"{'Player':<25} {'Pos':<5} {'Actual (TM)':<13} {'Model Implied':<15} {'Error %':<10} {'Status'}")
    print("-" * 80)

    flagged_count = 0
    errors = []

    for name, pos, actual, pred, diff_pct in rows:
        actual_eur = float(actual or 0)
        pred_eur = float(pred or 0)
        err_pct = abs(pred_eur - actual_eur) / max(actual_eur, 1.0) * 100.0
        errors.append(err_pct)
        
        is_flagged = err_pct > 35.0
        if is_flagged:
            flagged_count += 1
            status = "⚠️  >35% diff"
        else:
            status = "✓  Aligned"

        print(f"{name:<25} {pos:<5} €{actual_eur/1e6:>5.1f}M        €{pred_eur/1e6:>5.1f}M          {err_pct:>6.1f}%    {status}")

    print("-" * 80)
    print(f"Total evaluated: {len(rows)} | Flagged (>35% deviation): {flagged_count}/{len(rows)}")
    if errors:
        avg_err = sum(errors) / len(errors)
        sorted_errs = sorted(errors)
        median_err = sorted_errs[len(sorted_errs) // 2]
        print(f"Mean Absolute % Error on Sample: {avg_err:.1f}% | Median % Error: {median_err:.1f}%")
    print("=" * 80 + "\n")

if __name__ == "__main__":
    test_25_players()
