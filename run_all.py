"""
run_all.py
==========
Single-command driver for Table 5.8. Runs measure_vision_pipeline.py
and measure_llm_stage.py as two SEPARATE OS processes, one after the
other -- never both loaded in memory at once. When a subprocess exits,
the operating system reclaims 100% of its memory before the next one
starts, which is what avoids the crash from running everything in one
process.

Usage:
    python run_all.py

This will:
  1. Run measure_vision_pipeline.py to completion (a few minutes)
  2. Once it has fully exited (memory released), run measure_llm_stage.py
     (this is the slow one -- budget up to ~30 min at n=10, based on
     your ~188s/call measurement; reduce N inside measure_llm_stage.py
     if you'd rather not wait that long)
  3. Load both scripts' saved JSON results and print the final,
     complete Table 5.8 in one place.
"""
import subprocess
import sys
import json
import statistics
import os

PYTHON = sys.executable  # use the same interpreter/venv this script was launched with


def run_step(script_name, label):
    print(f"\n{'=' * 70}")
    print(f"  STARTING: {label}  ({script_name})")
    print(f"{'=' * 70}\n")

    result = subprocess.run([PYTHON, script_name])

    if result.returncode != 0:
        print(f"\n{label} exited with an error (code {result.returncode}). Stopping here.")
        sys.exit(1)

    print(f"\n{label} finished and its process has fully exited -- memory released.\n")


# Step 1: vision pipeline, as its own process
run_step("measure_vision_pipeline.py", "Vision pipeline (Preprocessing / Inference / MC Dropout / IG / Grad-CAM)")

# Step 2: LLM stage, as its own separate process -- only starts after
# step 1's process has completely terminated.
run_step("measure_llm_stage.py", "LLM report generation")

# Step 3: combine both JSON outputs into the final table.
if not os.path.exists("vision_results.json") or not os.path.exists("llm_results.json"):
    print("Could not find both result files -- something went wrong upstream.")
    sys.exit(1)

with open("vision_results.json") as f:
    vision = json.load(f)
with open("llm_results.json") as f:
    llm = json.load(f)

all_stages = {**vision, **llm}


def summarize(name, times):
    print(f"{name:24s} mean={statistics.mean(times):8.1f}  median={statistics.median(times):8.1f}  "
          f"std={statistics.stdev(times):7.1f}  min={min(times):8.1f}  max={max(times):8.1f}   (ms)")


print(f"\n{'=' * 70}")
print("  FINAL: Table 5.8 -- Inference Pipeline Latency by Stage")
print(f"{'=' * 70}\n")

for name in ["Preprocessing", "CXR Inference", "MC Dropout (x5 passes)",
             "Integrated Gradients", "Grad-CAM", "LLM report generation"]:
    summarize(name, all_stages[name])

lengths = {name: len(vals) for name, vals in all_stages.items()}
if len(set(lengths.values())) == 1:
    # All stages have the same N -- safe to pair positionally into a
    # combined end-to-end trial-by-trial.
    end_to_end = [sum(vals) for vals in zip(*all_stages.values())]
    summarize("End-to-end (full)", end_to_end)
else:
    # Different N (e.g. you reduced N for the slow LLM stage) --
    # positional pairing would silently truncate to the smallest N and
    # misrepresent the spread. The mean of a sum is still always valid
    # (means add regardless of sample size), so report that alone
    # rather than a misleading combined median/std/min/max.
    combined_mean = sum(statistics.mean(vals) for vals in all_stages.values())
    print(f"{'End-to-end (full)':24s} mean={combined_mean:8.1f}   (ms)")
    print(f"                         (median/std/min/max omitted -- stage sample sizes "
          f"differ: {lengths}, so trial-by-trial pairing would be misleading; "
          f"the mean above is still valid since means simply add.)")

print("\nCopy the numbers above directly into Table 5.8, and remove the")
print("'LLM report generation could not be measured' line from its footnote.")
