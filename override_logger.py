import sqlite3
import json
import os
from datetime import datetime
from typing import Optional, Dict, Any, List

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "clinician_feedback.db")

def init_db():
    """
    Initializes the SQLite database and creates the clinician_feedback table if it doesn't exist.
    """
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS clinician_feedback (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            image_path TEXT NOT NULL,
            ai_prediction TEXT,
            clinician_correction TEXT NOT NULL,
            target_pathology TEXT NOT NULL,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    """)
    conn.commit()
    conn.close()

def log_feedback(image_path: str, ai_prediction: Optional[Any], correction_str: str, pathology: str):
    """
    Logs clinician override feedback into the SQLite database.
    
    Args:
        image_path (str): Path to the chest X-ray image file.
        ai_prediction (Any): Dict/List representing prediction probabilities, serialized to JSON.
        correction_str (str): The clinician's manual override correction text.
        pathology (str): The specific target pathology (e.g. Pneumonia, TB, Pleural Effusion).
    """
    init_db()  # Ensure table is created
    
    # Serialize AI prediction to JSON string
    ai_pred_str = None
    if ai_prediction is not None:
        try:
            ai_pred_str = json.dumps(ai_prediction)
        except Exception:
            ai_pred_str = str(ai_prediction)
            
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO clinician_feedback (image_path, ai_prediction, clinician_correction, target_pathology, timestamp)
        VALUES (?, ?, ?, ?, ?)
    """, (image_path, ai_pred_str, correction_str, pathology, datetime.now().isoformat()))
    conn.commit()
    conn.close()
    print(f"[override_logger] Feedback logged successfully for {pathology}")

def get_feedback() -> List[Dict[str, Any]]:
    """
    Queries and returns all feedback logged in the database.
    """
    if not os.path.exists(DB_PATH):
        return []
    
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM clinician_feedback ORDER BY timestamp DESC")
    rows = cursor.fetchall()
    
    feedback_list = []
    for row in rows:
        ai_pred = None
        if row["ai_prediction"]:
            try:
                ai_pred = json.loads(row["ai_prediction"])
            except Exception:
                ai_pred = row["ai_prediction"]
                
        feedback_list.append({
            "id": row["id"],
            "image_path": row["image_path"],
            "ai_prediction": ai_pred,
            "clinician_correction": row["clinician_correction"],
            "target_pathology": row["target_pathology"],
            "timestamp": row["timestamp"]
        })
    conn.close()
    return feedback_list

# Initialize database on module import
init_db()
