import sqlite3
import json
import os
from datetime import datetime
from typing import Optional, Dict, Any, List

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "clinician_feedback.db")

def init_cases_db():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS cases (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            case_id TEXT UNIQUE,
            upload_type TEXT,
            radiologist TEXT,
            status TEXT,
            timestamp TEXT,
            results TEXT
        )
    """)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS deleted_cases (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            case_id TEXT,
            started_by TEXT,
            files_processed INTEGER,
            deleted_by TEXT,
            started_at TEXT,
            deleted_at TEXT,
            reason TEXT
        )
    """)
    conn.commit()
    conn.close()

def create_case(case_id: str, upload_type: str, radiologist: str = "Dr. Affiong") -> Dict[str, Any]:
    init_cases_db()
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    try:
        cursor.execute("""
            INSERT INTO cases (case_id, upload_type, radiologist, status, timestamp, results)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (case_id, upload_type, radiologist, 'pending', datetime.now().isoformat(), json.dumps({})))
        conn.commit()
    except sqlite3.IntegrityError:
        pass # If case already exists, we just reuse it or ignore
    finally:
        conn.close()
    
    return {"case_id": case_id, "status": "pending"}

def update_case_results(case_id: str, new_result_data: Dict[str, Any], new_status: str = 'completed'):
    init_cases_db()
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Get existing results
    cursor.execute("SELECT results FROM cases WHERE case_id = ?", (case_id,))
    row = cursor.fetchone()
    if row:
        try:
            results = json.loads(row[0]) if row[0] else {}
        except:
            results = {}
        
        # We append images/reports to results
        # new_result_data can be like {"images": [...], "report": "..."}
        # Deep merge or just update
        results.update(new_result_data)
        
        cursor.execute("""
            UPDATE cases SET results = ?, status = ? WHERE case_id = ?
        """, (json.dumps(results), new_status, case_id))
        conn.commit()
    conn.close()

def get_cases() -> List[Dict[str, Any]]:
    if not os.path.exists(DB_PATH):
        return []
    
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    # Check if table exists
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='cases'")
    if not cursor.fetchone():
        conn.close()
        return []
        
    cursor.execute("SELECT * FROM cases ORDER BY timestamp DESC")
    rows = cursor.fetchall()
    
    cases_list = []
    for row in rows:
        try:
            res = json.loads(row["results"])
        except:
            res = {}
        cases_list.append({
            "id": row["id"],
            "case_id": row["case_id"],
            "upload_type": row["upload_type"],
            "radiologist": row["radiologist"],
            "status": row["status"],
            "timestamp": row["timestamp"],
            "results": res
        })
    conn.close()
    return cases_list

def delete_case(case_id: str, deleted_by: str, reason: str = "") -> bool:
    init_cases_db()
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Get the case details before deleting
    cursor.execute("SELECT radiologist, timestamp, results FROM cases WHERE case_id = ?", (case_id,))
    row = cursor.fetchone()
    if not row:
        conn.close()
        return False
        
    started_by = row[0]
    started_at = row[1]
    
    # Calculate files processed
    files_processed = 0
    try:
        results = json.loads(row[2]) if row[2] else {}
        files_processed = len(results.get("images", []))
    except:
        pass
        
    # Insert into deleted_cases
    cursor.execute("""
        INSERT INTO deleted_cases (case_id, started_by, files_processed, deleted_by, started_at, deleted_at, reason)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    """, (case_id, started_by, files_processed, deleted_by, started_at, datetime.now().isoformat(), reason))
    
    # Delete from cases
    cursor.execute("DELETE FROM cases WHERE case_id = ?", (case_id,))
    conn.commit()
    conn.close()
    return True

def get_deleted_cases() -> List[Dict[str, Any]]:
    init_cases_db()
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='deleted_cases'")
    if not cursor.fetchone():
        conn.close()
        return []
        
    cursor.execute("SELECT id, case_id, started_by, files_processed, deleted_by, started_at, deleted_at, reason FROM deleted_cases ORDER BY deleted_at DESC")
    rows = cursor.fetchall()
    conn.close()
    
    return [
        {
            "id": row[0],
            "case_id": row[1],
            "started_by": row[2],
            "files_processed": row[3],
            "deleted_by": row[4],
            "started_at": row[5],
            "deleted_at": row[6],
            "reason": row[7]
        }
        for row in rows
    ]

def get_case(case_id: str) -> Optional[Dict[str, Any]]:
    if not os.path.exists(DB_PATH):
        return None
    
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='cases'")
    if not cursor.fetchone():
        conn.close()
        return None
        
    cursor.execute("SELECT * FROM cases WHERE case_id = ?", (case_id,))
    row = cursor.fetchone()
    conn.close()
    
    if row:
        try:
            res = json.loads(row["results"])
        except:
            res = {}
        return {
            "id": row["id"],
            "case_id": row["case_id"],
            "upload_type": row["upload_type"],
            "radiologist": row["radiologist"],
            "status": row["status"],
            "timestamp": row["timestamp"],
            "results": res
        }
    return None

init_cases_db()
