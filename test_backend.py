import pytest
from fastapi.testclient import TestClient
import os
import json
import time
import torch

from medrax.tools import TorchXRayVisionClassifierTool
import api

# Load the REAL classifier tool instead of mocking it
# Using CPU by default for testing to avoid GPU out-of-memory if the backend is already running
device = "cuda:0" if torch.cuda.is_available() else "cpu"
print(f"Loading real TorchXRayVision model on {device}...")
try:
    api.TOOLS_DICT["TorchXRayVisionClassifierTool"] = TorchXRayVisionClassifierTool(device=device)
except Exception as e:
    print(f"Error loading model: {e}")

from api import app
import cases_db

client = TestClient(app)

TEST_IMAGE_PATH = os.path.join("demo", "chest", "pneumonia1.jpg")

@pytest.fixture(autouse=True)
def setup_db(tmp_path):
    # Use a unique temporary file for the database for each test to prevent race conditions
    test_db = str(tmp_path / "test_clinician_feedback_real.db")
    cases_db.DB_PATH = test_db
    cases_db.init_cases_db()
    yield
    # No need to manually clean up; pytest's tmp_path handles it automatically


# --- UNIT TESTS (Database operations) ---

def test_create_and_get_case():
    cases_db.create_case("unit-case-1", "DICOM")
    case = cases_db.get_case("unit-case-1")
    assert case is not None
    assert case["case_id"] == "unit-case-1"
    assert case["status"] == "pending"

def test_update_case_results():
    cases_db.create_case("unit-case-2", "JPEG")
    cases_db.update_case_results("unit-case-2", {"images": ["/fake/path.jpg"]}, "processing")
    case = cases_db.get_case("unit-case-2")
    assert case is not None, "Case should exist in the database"
    assert case["status"] == "processing"
    assert case["results"]["images"] == ["/fake/path.jpg"]

def test_delete_case():
    cases_db.create_case("unit-case-3", "DICOM")
    success = cases_db.delete_case("unit-case-3", "AdminUser", "Wrong patient")
    assert success is True
    assert cases_db.get_case("unit-case-3") is None
    
    deleted = cases_db.get_deleted_cases()
    assert len(deleted) == 1
    assert deleted[0]["case_id"] == "unit-case-3"
    assert deleted[0]["reason"] == "Wrong patient"

# --- INTEGRATION TESTS (API Endpoints & REAL AI Flow) ---

def test_api_init_case():
    response = client.post("/api/init_case", data={"case_id": "api-case-1", "upload_type": "DICOM"})
    assert response.status_code == 200
    assert response.json()["message"] == "Case api-case-1 initialized"
    
    case = cases_db.get_case("api-case-1")
    assert case is not None

def test_api_delete_case_permissions():
    cases_db.create_case("api-case-2", "DICOM")
    cases_db.update_case_results("api-case-2", {}, "completed")
    
    # Attempt delete by radiologist on completed case (should be forbidden)
    response = client.post("/api/cases/api-case-2/delete", data={"deleted_by": "RadUser", "user_role": "radiologist", "reason": "cleanup"})
    assert response.status_code == 403
    assert "error" in response.json()

def test_api_inference_real():
    # Test the inference endpoint integration with the REAL AI logic
    # Make sure we have the test image
    assert os.path.exists(TEST_IMAGE_PATH), f"Test image not found at {TEST_IMAGE_PATH}"
    
    response = client.post("/api/infer", data={"image_path": TEST_IMAGE_PATH})
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    
    # Ensure there are valid predictions from the real model
    predictions = data["predictions"]
    assert isinstance(predictions, dict)
    assert len(predictions) > 0
    
    # Check conformal bounds math
    conformal_bounds = data["conformal_prediction_bounds"]
    assert isinstance(conformal_bounds, dict)
    assert len(conformal_bounds) > 0
    
    print("\n--- REAL INFERENCE RESULTS ---")
    print(f"Top Predictions: {list(predictions.items())[:3]}")
    
def test_api_audit_log():
    response = client.post("/api/audit/log", data={"action": "View_Case", "user": "Dr. Test", "details": "Viewed case X"})
    assert response.status_code == 200
    
    response = client.get("/api/audit")
    assert response.status_code == 200
    logs = response.json()
    assert len(logs) > 0
    assert logs[-1]["action"] == "View_Case"
