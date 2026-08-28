"""
measure_vision_pipeline.py
============================
Measures ONLY the 5 non-LLM stages (Preprocessing, CXR Inference,
MC Dropout, Integrated Gradients, Grad-CAM). Deliberately does NOT
touch Ollama at all, so this process's memory is fully separate from
the LLM measurement -- run measure_llm_stage.py separately afterward.

Usage:
    python measure_vision_pipeline.py
"""
import time
import statistics
import numpy as np
import torch

from medrax.tools import TorchXRayVisionClassifierTool
from captum.attr import IntegratedGradients, LayerGradCam

N = 10
IMAGE_PATH = "demo/chest/pneumonia1.jpg"

print("Loading classifier (not timed)...")
tool = TorchXRayVisionClassifierTool(device="cpu")


def time_stage(fn, n=N):
    times = []
    result = None
    for _ in range(n):
        t0 = time.perf_counter()
        result = fn()
        t1 = time.perf_counter()
        times.append((t1 - t0) * 1000)
    return times, result


times_prep, img = time_stage(lambda: tool._process_image(IMAGE_PATH))


def infer_once():
    torch.manual_seed(42)
    tool.model.eval()
    with torch.inference_mode():
        return tool.model(img).cpu()[0]


times_inf, preds = time_stage(infer_once)


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


times_mc, _ = time_stage(mc_dropout_pass)

top_class_idx = int(np.argmax(preds.numpy()))


def ig_pass():
    ig = IntegratedGradients(tool.model)
    img.requires_grad_()
    return ig.attribute(img, target=top_class_idx, n_steps=10)


times_ig, _ = time_stage(ig_pass)


def gradcam_pass():
    target_layer = tool.model.features[-1]
    layer_gc = LayerGradCam(tool.model, target_layer)
    return layer_gc.attribute(img, target=top_class_idx)


times_gc, _ = time_stage(gradcam_pass)


def summarize(name, times):
    print(f"{name:24s} mean={statistics.mean(times):8.1f}  median={statistics.median(times):8.1f}  "
          f"std={statistics.stdev(times):7.1f}  min={min(times):8.1f}  max={max(times):8.1f}   (ms)")


print(f"\n--- Vision pipeline timing, n={N} ---\n")
summarize("Preprocessing", times_prep)
summarize("CXR Inference", times_inf)
summarize("MC Dropout (x5)", times_mc)
summarize("Integrated Gradients", times_ig)
summarize("Grad-CAM", times_gc)
end_to_end = [a + b + c + d + e for a, b, c, d, e in
              zip(times_prep, times_inf, times_mc, times_ig, times_gc)]
summarize("Vision subtotal", end_to_end)

import json
with open("vision_results.json", "w") as f:
    json.dump({
        "Preprocessing": times_prep,
        "CXR Inference": times_inf,
        "MC Dropout (x5 passes)": times_mc,
        "Integrated Gradients": times_ig,
        "Grad-CAM": times_gc,
    }, f, indent=2)

print("\nSaved vision_results.json. If running manually (not via run_all.py),")
print("now run measure_llm_stage.py separately for the LLM row.")
