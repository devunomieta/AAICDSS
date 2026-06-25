import time
import os
import shutil
import json
import uuid
import requests
from pathlib import Path
from fastapi import FastAPI, File, UploadFile, Form, BackgroundTasks
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from typing import List

app = FastAPI(title="AffiongAI CDSS Backend API")

# Allow the React frontend to communicate with this API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, lock this to the React server URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# We will inject these globally from main.py
AGENT = None
TOOLS_DICT = {}
UPLOAD_DIR = Path("temp")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
FEEDBACK_FILE = "active_learning_feedback.json"

@app.post("/api/upload")
async def upload_scans(files: List[UploadFile] = File(...)):
    """Receives batch uploads and saves them to the temp directory."""
    saved_paths = []
    for file in files:
        ext = os.path.splitext(file.filename)[1]
        safe_path = os.path.join(str(UPLOAD_DIR), f"scan_{uuid.uuid4().hex}{ext}")
        with open(safe_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        saved_paths.append(safe_path)
    return {"message": f"Successfully uploaded {len(saved_paths)} scans", "paths": saved_paths}

@app.post("/api/infer")
async def run_inference(image_path: str = Form(...)):
    """Runs the heavy PyTorch classification and XAI generation."""
    classifier = TOOLS_DICT.get("TorchXRayVisionClassifierTool")
    if not classifier:
        return {"error": "TorchXRayVisionClassifierTool not loaded"}
        
    try:
        out, meta = classifier._run(image_path)
        
        # Cast float32 to float for JSON serialization
        preds = {k: float(v) for k, v in sorted(out.items(), key=lambda item: item[1], reverse=True)[:8]}
        uncertainties = meta.get("uncertainty_scores", {})
        top_uncertainties = {k: float(uncertainties[k]) for k in preds.keys() if k in uncertainties}
        
        heatmap = meta.get("heatmap_path")
        gc_heatmap = meta.get("gradcam_path")
        
        return {
            "status": "success",
            "predictions": preds,
            "uncertainty": top_uncertainties,
            "ig_heatmap": heatmap,
            "gradcam_heatmap": gc_heatmap
        }
    except Exception as e:
        return {"error": str(e)}

@app.post("/api/report")
async def generate_clinical_report(preds: str = Form(...), uncertainties: str = Form(...)):
    """Streams a clinical report from the local Ollama LLM."""
    prompt = f"""
    You are an expert AI Radiologist for AffiongAI CDSS. 
    Based on the following AI CNN classification scores (0.0 to 1.0) and uncertainty variance, write a concise, professional clinical diagnostic report.
    Target Pathologies to emphasize if present: Pneumonia, Tuberculosis (TB), Pleural Effusion.
    
    Classification Scores:
    {preds}
    
    Uncertainty Scores:
    {uncertainties}
    
    Format the output in clean Markdown with:
    - **Primary Findings**: (List the most likely diseases with Confirmed/Absent status)
    - **Confidence & Uncertainty**: (Translate the variance into Low/Moderate/High Uncertainty)
    - **Target Pathology Focus**: (Explicitly mention Pneumonia, TB, and Pleural Effusion statuses)
    - **Recommendation**: (Brief clinical recommendation)
    
    Do not output raw JSON, only the professional clinical text.
    """
    
    def ollama_streamer():
        url = "http://localhost:11434/api/generate"
        payload = {"model": "llama3", "prompt": prompt, "stream": True}
        try:
            response = requests.post(url, json=payload, stream=True)
            for line in response.iter_lines():
                if line:
                    data = json.loads(line)
                    yield data.get("response", "")
        except Exception as e:
            yield f"\n\n[Error communicating with local LLM: {str(e)}]"
            
    return StreamingResponse(ollama_streamer(), media_type="text/event-stream")

@app.post("/api/feedback")
async def save_feedback(image_path: str = Form(...), prediction: str = Form(...), actual_decision: str = Form(...), user: str = Form(...)):
    """Saves Human-in-the-loop feedback for future active learning retraining."""
    data = []
    if os.path.exists(FEEDBACK_FILE):
        with open(FEEDBACK_FILE, 'r') as f:
            data = json.load(f)
            
    data.append({
        "timestamp": time.time(),
        "user": user,
        "image": image_path,
        "ai_prediction": prediction,
        "radiologist_decision": actual_decision,
        "status": "Pending Compliance Review" if "Overridden" in actual_decision else "Accepted"
    })
    
    with open(FEEDBACK_FILE, 'w') as f:
        json.dump(data, f, indent=4)
        
    return {"status": "success", "message": "Feedback safely recorded."}
