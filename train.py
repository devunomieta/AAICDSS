import time
import json
import os
import random

FEEDBACK_FILE = "feedback.json"
STATUS_FILE = "training_status.json"

def write_status(status):
    with open(STATUS_FILE, 'w') as f:
        json.dump(status, f, indent=4)

def run_training():
    if not os.path.exists(FEEDBACK_FILE):
        write_status({"status": "failed", "message": "No feedback file found."})
        return

    with open(FEEDBACK_FILE, 'r') as f:
        data = json.load(f)
        
    ready_cases = [item for item in data if item.get("status") == "Retraining Ready"]
    if len(ready_cases) == 0:
        write_status({"status": "failed", "message": "No cases marked as 'Retraining Ready'."})
        return

    # Simulate Initialization
    write_status({
        "status": "running",
        "progress": 5,
        "message": f"Initializing PyTorch Environment... Found {len(ready_cases)} cases.",
        "epoch": 0,
        "loss": None
    })
    time.sleep(3)
    
    # Simulate Data Compilation
    write_status({
        "status": "running",
        "progress": 15,
        "message": "Compiling Data and augmenting features...",
        "epoch": 0,
        "loss": None
    })
    time.sleep(3)

    # Simulate Training Loop (10 epochs)
    epochs = 10
    loss = 0.85
    for epoch in range(1, epochs + 1):
        loss = loss * random.uniform(0.7, 0.95) # Loss goes down
        progress = 15 + int((epoch / epochs) * 70) # Progress from 15% to 85%
        
        write_status({
            "status": "running",
            "progress": progress,
            "message": f"Fine-tuning model weights...",
            "epoch": epoch,
            "total_epochs": epochs,
            "loss": round(loss, 4)
        })
        time.sleep(2) # 2 seconds per epoch
        
    # Validation & Deployment
    write_status({
        "status": "running",
        "progress": 95,
        "message": "Validating model performance against Golden Set...",
        "epoch": epochs,
        "loss": round(loss, 4)
    })
    time.sleep(3)
    
    # Update Feedback cases to 'Deployed'
    for item in data:
        if item.get("status") == "Retraining Ready":
            item["status"] = "Deployed"
            
    with open(FEEDBACK_FILE, 'w') as f:
        json.dump(data, f, indent=4)

    write_status({
        "status": "completed",
        "progress": 100,
        "message": "Retraining completed successfully. New model weights deployed.",
        "epoch": epochs,
        "loss": round(loss, 4)
    })

if __name__ == "__main__":
    run_training()
