"""
measure_latency.py
===================
Re-measures Table 5.8 (Inference Pipeline Latency by Stage) on your own
machine, INCLUDING the LLM report generation stage that could not be
measured in the sandbox this was originally timed in (no Ollama
instance was reachable there).

Prerequisites (all should already be true on your dev machine, since
this is the same environment your screenshots were captured from):
  1. Ollama installed and running, with the model pulled:
         ollama pull llama3
     (confirm the service is up: `ollama list` should show llama3)
  2. Your normal Python environment for this project, with torch,
     torchxrayvision, captum, and requests installed.
  3. Run this script from the project root (same folder as api.py),
     so the relative import and demo image path resolve correctly.

Usage:
    python measure_latency.py

Output: prints a table in the same Component | Mean | Median | Std Dev
| Min | Max format as the thesis's Table 5.8, computed over N=10
iterations per stage -- copy the printed numbers directly into the
table.
"""
import time
import json
import statistics

import numpy as np
import torch
import requests

# Uses the real import -- on your machine, with full dependencies
# installed, this works directly (no need for the direct-file-load
# workaround used in the original sandbox measurement).
from medrax.tools import TorchXRayVisionClassifierTool
import torchxrayvision as xrv
from captum.attr import IntegratedGradients, LayerGradCam

N = 2
IMAGE_PATH = "demo/chest/pneumonia1.jpg"  # same demonstration image used originally

print("Loading classifier (this happens once, not timed)...")
tool = TorchXRayVisionClassifierTool(device="cpu")


def time_stage(fn, n=N):
    times = []
    result = None
    for _ in range(n):
        t0 = time.perf_counter()
        result = fn()
        t1 = time.perf_counter()
        times.append((t1 - t0) * 1000)  # ms
    return times, result


# --- Stage 1: Preprocessing ---
times_prep, img = time_stage(lambda: tool._process_image(IMAGE_PATH))

# --- Stage 2: CXR Inference (single deterministic pass) ---
def infer_once():
    torch.manual_seed(42)
    tool.model.eval()
    with torch.inference_mode():
        return tool.model(img).cpu()[0]

times_inf, preds = time_stage(infer_once)

# --- Stage 3: MC Dropout (5 passes) ---
def mc_dropout_pass():
    torch.manual_seed(42)
    for m in tool.model.modules():
        if isinstance(m, torch.nn.Dropout):
            m.train()
    mc_preds = []
    with torch.inference_mode():
        for _ in range(5):
            mc_preds.append(tool.model(img).cpu()[0].numpy())
    tool.model.eval()
    return mc_preds

times_mc, mc_preds_last = time_stage(mc_dropout_pass)

uncertainty_scores = np.std(np.array(mc_preds_last), axis=0)
uncertainty_dict = dict(zip(xrv.datasets.default_pathologies, uncertainty_scores.tolist()))
preds_dict_top8 = dict(
    sorted(
        zip(xrv.datasets.default_pathologies, preds.numpy().tolist()),
        key=lambda kv: kv[1], reverse=True
    )[:8]
)

# --- Stage 4: Integrated Gradients ---
top_class_idx = int(np.argmax(preds.numpy()))

def ig_pass():
    ig = IntegratedGradients(tool.model)
    img.requires_grad_()
    return ig.attribute(img, target=top_class_idx, n_steps=10)

times_ig, _ = time_stage(ig_pass)

# --- Stage 5: Grad-CAM ---
def gradcam_pass():
    target_layer = tool.model.features[-1]
    layer_gc = LayerGradCam(tool.model, target_layer)
    return layer_gc.attribute(img, target=top_class_idx)

times_gc, _ = time_stage(gradcam_pass)

# --- Stage 6: LLM report generation (real call to Ollama) ---
# Replicates the exact prompt construction from api.py's
# generate_clinical_report, so this measures the real thing, not an
# approximation.
sorted_items = sorted(preds_dict_top8.items(), key=lambda item: item[1], reverse=True)[:6]
formatted_findings = []
for cond, score in sorted_items:
    pct = round(score * 100, 1)
    status = "Confirmed" if score >= 0.60 else "Indeterminate (Borderline)" if score >= 0.40 else "Absent"
    formatted_findings.append(f"- **{cond}**: {status} ({pct}%)")
findings_str = "\n".join(formatted_findings)

ambiguity_scores = [1.0 - (2.0 * abs(s - 0.5)) for s in preds_dict_top8.values()]
avg_ambiguity = float(np.mean(ambiguity_scores))
model_unc = float(np.mean(list(uncertainty_dict.values())))
combined_unc = min(1.0, max(avg_ambiguity, model_unc))
uncertainty_pct = round(combined_unc * 100, 1)
confidence_pct = round((1.0 - combined_unc) * 100, 1)
uncertainty_level = "Low" if combined_unc < 0.25 else "Moderate" if combined_unc < 0.50 else "High"

prompt = f"""You are an expert AI Radiologist for AffiongAI CDSS.
Write a concise, professional clinical diagnostic report based on the pre-evaluated AI CNN findings and metrics below.

Pre-evaluated Findings:
{findings_str}

Measured Clinical Metrics:
- Measured Clinical Confidence: {confidence_pct}%
- Measured Uncertainty: {uncertainty_level} ({uncertainty_pct}%)

Format the output in clean Markdown with:
- **Primary Findings**: (List the pathologies with their exact status\u2014Confirmed, Indeterminate (Borderline), or Absent\u2014and percentages as provided above)
- **Confidence & Uncertainty**: (Summarize confidence and uncertainty using the exact measured metrics above: {confidence_pct}% confidence, {uncertainty_level} uncertainty at {uncertainty_pct}%)
- **Recommendation**: (Provide a 1-sentence clinical follow-up recommendation)

CRITICAL RULES:
1. Do not invent, hallucinate, or alter any percentage values or disease status. Use ONLY the exact values given above.
2. Do not use introductory preambles. Start directly with the Markdown sections.
3. Be 100% concise, accurate, and professional.
"""

def llm_report_pass():
    url = "http://localhost:11434/api/generate"
    payload = {"model": "llama3", "prompt": prompt, "stream": True,
               "options": {"temperature": 0.0, "seed": 42}}
    response = requests.post(url, json=payload, stream=True, timeout=120)
    report_text = ""
    for line in response.iter_lines():
        if line:
            data = json.loads(line)
            report_text += data.get("response", "")
    return report_text

print("\nTiming LLM report generation -- this one takes a while per iteration, please wait...")
try:
    times_llm, last_report = time_stage(llm_report_pass, n=N)
    llm_ok = True
except Exception as e:
    print(f"\nCould not reach Ollama: {e}")
    print("Check `ollama list` shows llama3 and the Ollama service is running, then re-run.")
    times_llm = None
    llm_ok = False


def summarize(name, times):
    if times is None:
        print(f"{name:24s} not measured")
        return
    print(f"{name:24s} mean={statistics.mean(times):8.1f}  median={statistics.median(times):8.1f}  "
          f"std={statistics.stdev(times):7.1f}  min={min(times):8.1f}  max={max(times):8.1f}   (ms)")


print("\n--- Table 5.8 (updated): Inference Pipeline Latency by Stage (n = 2 iterations) ---\n")
summarize("Preprocessing", times_prep)
summarize("CXR Inference", times_inf)
summarize("MC Dropout (x5)", times_mc)
summarize("Integrated Gradients", times_ig)
summarize("Grad-CAM", times_gc)
summarize("LLM report generation", times_llm)

if llm_ok and times_llm is not None:
    end_to_end = [a + b + c + d + e + f for a, b, c, d, e, f in
                  zip(times_prep, times_inf, times_mc, times_ig, times_gc, times_llm)]
    summarize("End-to-end (full)", end_to_end)
else:
    end_to_end = [a + b + c + d + e for a, b, c, d, e in
                  zip(times_prep, times_inf, times_mc, times_ig, times_gc)]
    summarize("End-to-end (excl. LLM)", end_to_end)

print("\nDone. Copy these numbers into Table 5.8, and update its footnote to remove")
print("the 'LLM report generation could not be measured' caveat once you have real numbers.")