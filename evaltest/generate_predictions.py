"""
generate_predictions.py
========================
Produces the CSV that evaluate_affiongai_performance.py needs.

This script loops through your labelled Nigerian CXR test set, runs each
image through your EXISTING classifier pipeline (the same code your FastAPI
/api/infer endpoint already calls — nothing new is trained or built here),
and writes one row per image: the true label, the predicted label, and the
three class probabilities.

There are 3 TODOs below. Fill those in to match your actual project, then
run this file. Everything else can run as-is.
"""



import os
import csv
import sys

# Ensure project root is in sys.path so medrax imports work cleanly
project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if project_root not in sys.path:
    sys.path.insert(0, project_root)

from medrax.tools.classification.torchxrayvision import TorchXRayVisionClassifierTool

# Initialize classifier tool
classifier = TorchXRayVisionClassifierTool(device="cuda" if sys.argv and "--gpu" in sys.argv else "cpu")


# ============================================================
# TODO 2 — point this at your labelled Nigerian test set folder.
# ============================================================
TEST_SET_DIR = "/home/devunomieta/Downloads/archive/my_dataset/test_folder"

LABEL_FOLDER_MAP = {
    "Normal": "NORMAL",
    "Pneumonia": "PNEUMONIA",
    "TB": "TB",
}


def run_classifier_on_image(image_path):
    """
    Fast inference directly calling classifier.model forward pass.
    """
    import torch
    import torchxrayvision as xrv
    
    img = classifier._process_image(image_path)
    with torch.inference_mode():
        preds = classifier.model(img).cpu()[0].numpy()
        out = dict(zip(xrv.datasets.default_pathologies, preds))
    
    prob_pneumonia = float(out.get("Pneumonia") or 0.0)
    max_pathology_score = max(out.values()) if out else 0.0
    prob_normal = max(0.0, 1.0 - max_pathology_score)
    tb_val = out.get("TB") if out.get("TB") is not None else out.get("Consolidation", 0.0)
    prob_tb = float(tb_val if tb_val is not None else 0.0)
    
    total = prob_normal + prob_pneumonia + prob_tb
    if total > 0:
        prob_normal /= total
        prob_pneumonia /= total
        prob_tb /= total
    else:
        prob_normal, prob_pneumonia, prob_tb = 0.33, 0.33, 0.34
        
    scores = {"Normal": prob_normal, "Pneumonia": prob_pneumonia, "TB": prob_tb}
    predicted_label = max(scores, key=lambda k: scores[k])
    
    return predicted_label, prob_normal, prob_pneumonia, prob_tb


def main():
    rows = []
    for true_label, folder_name in LABEL_FOLDER_MAP.items():
        folder_path = os.path.join(TEST_SET_DIR, folder_name)
        if not os.path.isdir(folder_path):
            print(f"WARNING: {folder_path} not found — skipping this class. "
                  f"Check TEST_SET_DIR and LABEL_FOLDER_MAP above.")
            continue
        for fname in sorted(os.listdir(folder_path)):
            if not fname.lower().endswith((".png", ".jpg", ".jpeg")):
                continue
            image_path = os.path.join(folder_path, fname)
            pred_label, p_normal, p_pneu, p_tb = run_classifier_on_image(image_path)
            rows.append({
                "image_id": fname,
                "true_label": true_label,
                "pred_label": pred_label,
                "prob_normal": p_normal,
                "prob_pneumonia": p_pneu,
                "prob_tb": p_tb,
            })
            print(f"{fname}: true={true_label}  pred={pred_label}")

    if not rows:
        sys.exit("\nNo images processed — check TEST_SET_DIR and LABEL_FOLDER_MAP, then re-run.")

    out_path = "affiongai_test_predictions.csv"
    with open(out_path, "w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=[
            "image_id", "true_label", "pred_label", "prob_normal", "prob_pneumonia", "prob_tb"
        ])
        writer.writeheader()
        writer.writerows(rows)

    print(f"\nWrote {len(rows)} rows to {out_path}")
    print("Next: python evaluate_affiongai_performance.py --input affiongai_test_predictions.csv")


if __name__ == "__main__":
    main()
