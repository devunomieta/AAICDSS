"""
measure_llm_stage.py
=====================
Measures ONLY the LLM report generation stage (real calls to Ollama).
Deliberately imports nothing from torch/torchxrayvision/captum, so
this process's memory never overlaps with the vision pipeline -- run
measure_vision_pipeline.py separately (before or after, doesn't
matter, just not at the same time).

WARNING: your one-off test took ~188 seconds for a single call (almost
certainly slowed by heavy swapping at 91%+ RAM / 60% swap usage on your
machine). At that pace, N=10 could take ~30 minutes. Reduce N below if
you'd rather not wait that long -- N=3 still gives a usable mean/median/
spread, just with less precision than the rest of the table's n=10.

Usage:
    python measure_llm_stage.py
"""
import time
import json
import statistics
import requests

N = 10  # reduce to 3-5 if 30+ minutes is too long to wait

example_preds = {
    "Lung Opacity": 0.7581,
    "Effusion": 0.6115,
    "Mass": 0.6104,
    "Pneumonia": 0.42,
    "Cardiomegaly": 0.18,
    "Infiltration": 0.15,
}

sorted_items = sorted(example_preds.items(), key=lambda item: item[1], reverse=True)[:6]
formatted_findings = []
for cond, score in sorted_items:
    pct = round(score * 100, 1)
    status = "Confirmed" if score >= 0.60 else "Indeterminate (Borderline)" if score >= 0.40 else "Absent"
    formatted_findings.append(f"- **{cond}**: {status} ({pct}%)")
findings_str = "\n".join(formatted_findings)

confidence_pct = 85.0
uncertainty_pct = 15.0
uncertainty_level = "Low"

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


def one_call():
    url = "http://localhost:11434/api/generate"
    payload = {"model": "llama3", "prompt": prompt, "stream": True,
               "options": {"temperature": 0.0, "seed": 42}}
    response = requests.post(url, json=payload, stream=True, timeout=300)
    report_text = ""
    for line in response.iter_lines():
        if line:
            data = json.loads(line)
            report_text += data.get("response", "")
    return report_text


times = []
for i in range(N):
    print(f"Call {i + 1}/{N}...", end=" ", flush=True)
    t0 = time.perf_counter()
    try:
        one_call()
    except Exception as e:
        print(f"\nFAILED on call {i + 1}: {e}")
        print("Check `ollama list` shows llama3 and the Ollama service is running, then re-run.")
        raise SystemExit(1)
    t1 = time.perf_counter()
    elapsed = (t1 - t0) * 1000
    times.append(elapsed)
    print(f"{elapsed:.1f} ms")

print(f"\n--- LLM report generation, n={N} ---")
print(f"mean={statistics.mean(times):.1f}  median={statistics.median(times):.1f}  "
      f"std={statistics.stdev(times) if len(times) > 1 else 0:.1f}  "
      f"min={min(times):.1f}  max={max(times):.1f}   (ms)")

import json
with open("llm_results.json", "w") as f:
    json.dump({"LLM report generation": times}, f, indent=2)

print("\nSaved llm_results.json.")
print("Combine this row with measure_vision_pipeline.py's output for the full Table 5.8.")
