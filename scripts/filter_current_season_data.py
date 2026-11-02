#!/usr/bin/env python3
"""
Filter playervalue.db to only include clubs and players active in the current season.
- Clubs: Only the 96 clubs playing in the 5 top European leagues for the current season (2025)
- Players: Only the active players playing for those 96 clubs in the current season (2025)
- All associated records (market values, season stats, transfers, predictions) pruned and validated.
"""

import sqlite3
import csv
import os
import shutil
import sys

def main():
    db_path = "playervalue.db"
    backup_path = "playervalue.db.backup"
    
    if not os.path.exists(db_path):
        print(f"Error: {db_path} not found.")
        sys.exit(1)

    print("1. Creating backup of playervalue.db...")
    shutil.copyfile(db_path, backup_path)
    print(f"   Backup saved to {backup_path}")

    # 2. Identify the 96 current clubs from clubs.csv
    print("\n2. Identifying current season clubs (season 2025)...")
    tm_dir = os.path.join("data", "archive (2)")
    with open(os.path.join(tm_dir, "clubs.csv"), mode="r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        top_csv_clubs = [
            row for row in reader 
            if row.get("domestic_competition_id") in ["GB1", "ES1", "L1", "IT1", "FR1"]
        ]

    curr_96_tm_ids = {
        int(c["club_id"]) for c in top_csv_clubs if c.get("last_season") == "2025"
    }
    curr_96_names = {
        c["name"] for c in top_csv_clubs if c.get("last_season") == "2025"
    }
    print(f"   Found {len(curr_96_tm_ids)} clubs for current season in clubs.csv.")

    # 3. Identify active current playing players from players.csv
    print("\n3. Identifying current playing players (season 2025 in current clubs)...")
    with open(os.path.join(tm_dir, "players.csv"), mode="r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        top_p = [
            row for row in reader 
            if row.get("current_club_domestic_competition_id") in ["GB1", "ES1", "L1", "IT1", "FR1"] 
            and float(row.get("market_value_in_eur") or 0) > 0
        ]

    # Remember DB Player.id was 1-based sequential index into top_p
    keep_player_ids = set()
    for idx, p in enumerate(top_p, 1):
        if p.get("last_season") == "2025" and int(p.get("current_club_id") or 0) in curr_96_tm_ids:
            keep_player_ids.add(idx)

    print(f"   Found {len(keep_player_ids)} current playing players.")

    # 4. Connect to database and perform cleanup
    conn = sqlite3.connect(db_path)
    c = conn.cursor()

    # Map current clubs to DB club IDs
    c.execute("SELECT id, name FROM clubs ORDER BY id")
    all_db_clubs = c.fetchall()
    
    keep_club_ids = {
        cid for cid, name in all_db_clubs if name in curr_96_names
    }
    print(f"   Matched {len(keep_club_ids)} current club IDs in database.")

    # Verify each player has an active club ID in keep_club_ids
    c.execute("""
        SELECT player_id, club_id 
        FROM player_club_history 
        WHERE is_current = 1 AND player_id IN (%s)
    """ % ",".join(map(str, keep_player_ids)))
    player_curr_club = dict(c.fetchall())

    # Begin transaction
    print("\n4. Pruning database tables...")

    # Disable foreign key enforcement during batch deletion
    c.execute("PRAGMA foreign_keys = OFF;")

    # a. Season stats
    print("   Cleaning season_stats...")
    # For players kept, if club_id is not in keep_club_ids, reassign to their current club
    c.execute("SELECT count(*) FROM season_stats WHERE player_id NOT IN (%s)" % ",".join(map(str, keep_player_ids)))
    del_ss = c.fetchone()[0]
    c.execute("DELETE FROM season_stats WHERE player_id NOT IN (%s)" % ",".join(map(str, keep_player_ids)))
    print(f"   Deleted {del_ss} season_stats of non-current players.")

    # Reassign any historical club_id not in 96 to player's current club
    reassigned = 0
    c.execute("SELECT id, player_id, club_id FROM season_stats WHERE club_id NOT IN (%s)" % ",".join(map(str, keep_club_ids)))
    for sid, pid, old_cid in c.fetchall():
        new_cid = player_curr_club.get(pid)
        if new_cid and new_cid in keep_club_ids:
            c.execute("UPDATE season_stats SET club_id = ? WHERE id = ?", (new_cid, sid))
            reassigned += 1
        else:
            c.execute("DELETE FROM season_stats WHERE id = ?", (sid,))
    print(f"   Reassigned {reassigned} historical season stats to player's current club.")

    # b. Player Club History
    print("   Cleaning player_club_history...")
    c.execute("DELETE FROM player_club_history WHERE player_id NOT IN (%s)" % ",".join(map(str, keep_player_ids)))
    c.execute("DELETE FROM player_club_history WHERE club_id NOT IN (%s)" % ",".join(map(str, keep_club_ids)))

    # c. Transfers
    print("   Cleaning transfers...")
    c.execute("DELETE FROM transfers WHERE player_id NOT IN (%s)" % ",".join(map(str, keep_player_ids)))
    c.execute("UPDATE transfers SET from_club_id = NULL WHERE from_club_id NOT IN (%s)" % ",".join(map(str, keep_club_ids)))
    c.execute("UPDATE transfers SET to_club_id = NULL WHERE to_club_id NOT IN (%s)" % ",".join(map(str, keep_club_ids)))

    # d. Market values
    print("   Cleaning market_values...")
    c.execute("SELECT count(*) FROM market_values WHERE player_id NOT IN (%s)" % ",".join(map(str, keep_player_ids)))
    del_mv = c.fetchone()[0]
    c.execute("DELETE FROM market_values WHERE player_id NOT IN (%s)" % ",".join(map(str, keep_player_ids)))
    print(f"   Deleted {del_mv} market_values of non-current players.")

    # e. Model predictions
    print("   Cleaning model_predictions...")
    c.execute("DELETE FROM model_predictions WHERE player_id NOT IN (%s)" % ",".join(map(str, keep_player_ids)))

    # f. Players
    print("   Cleaning players...")
    c.execute("SELECT count(*) FROM players WHERE id NOT IN (%s)" % ",".join(map(str, keep_player_ids)))
    del_p = c.fetchone()[0]
    c.execute("DELETE FROM players WHERE id NOT IN (%s)" % ",".join(map(str, keep_player_ids)))
    print(f"   Deleted {del_p} non-current players.")

    # g. Clubs
    print("   Cleaning clubs...")
    c.execute("SELECT count(*) FROM clubs WHERE id NOT IN (%s)" % ",".join(map(str, keep_club_ids)))
    del_c = c.fetchone()[0]
    c.execute("DELETE FROM clubs WHERE id NOT IN (%s)" % ",".join(map(str, keep_club_ids)))
    print(f"   Deleted {del_c} non-current clubs.")

    conn.commit()

    # Re-enable foreign keys and verify integrity
    c.execute("PRAGMA foreign_keys = ON;")
    c.execute("PRAGMA foreign_key_check;")
    fk_errors = c.fetchall()
    if fk_errors:
        print(f"⚠️ Warning: Found {len(fk_errors)} foreign key inconsistencies:", fk_errors[:5])
    else:
        print("✅ Foreign key check passed: 100% consistent.")

    # Vacuum database to shrink file size
    print("\n5. Vacuuming database...")
    c.execute("VACUUM;")
    c.execute("PRAGMA integrity_check;")
    check = c.fetchone()[0]
    print(f"   Integrity check: {check}")

    # Summary
    print("\n=== Final Database Summary ===")
    for t in ['leagues', 'clubs', 'players', 'player_club_history', 'market_values', 'season_stats', 'transfers', 'model_predictions']:
        c.execute(f"SELECT count(*) FROM {t}")
        print(f"   {t}: {c.fetchone()[0]} rows")

    # League club breakdown
    c.execute("""
        SELECT l.name, count(c.id) 
        FROM clubs c 
        JOIN leagues l ON c.league_id = l.id 
        GROUP BY l.name 
        ORDER BY l.id
    """)
    print("\n=== Clubs per League ===")
    for row in c.fetchall():
        print(f"   {row[0]}: {row[1]} clubs")

    conn.close()
    old_size = os.path.getsize(backup_path) / (1024 * 1024)
    new_size = os.path.getsize(db_path) / (1024 * 1024)
    print(f"\nDatabase compressed from {old_size:.1f} MB -> {new_size:.1f} MB.")
    print("✅ Database filter complete!")

if __name__ == "__main__":
    main()
