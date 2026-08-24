"""
AffiongAI — Diagnostic Performance Evaluation Script
=====================================================
Addresses examiner feedback points 6 & 7:
  "conclusion did not show performance metrics... use a graph"
  "we are not interested in just that your system works but your
   model performance compared to previous studies"

WHAT THIS SCRIPT DOES
---------------------
Runs the exact evaluation your own thesis already commits to (Section 1.1:
"assess the feasibility"; Section 1.2: "limited evaluation of fixed CXR AI
components on publicly available, Nigeria-relevant data") and produces:

  1. Table 5.x — Diagnostic Performance Summary (accuracy, sensitivity,
     specificity, precision, F1, per class + macro-average)
  2. Figure 5.x — Confusion matrix heatmap
  3. Figure 5.y — ROC curves (one-vs-rest, all 3 classes) with AUC
  4. Figure 5.z — Bar chart comparing AffiongAI's accuracy/AUC against the
     literature figures YOU ALREADY CITE in Chapter 2 (Togunwa et al. 2025,
     CAD4TB, Qure.ai qXR) — this is exactly what feedback point 7 is asking for.

WHAT YOU MUST SUPPLY
---------------------
A CSV file with one row per test image, columns:
    image_id, true_label, pred_label, prob_normal, prob_pneumonia, prob_tb

- true_label / pred_label must be one of: "Normal", "Pneumonia", "TB"
- prob_* columns are the raw softmax/sigmoid outputs from your classifier
  for that image (already exist in your pipeline per Section 3.5/4.2.4 —
  this script does not compute new predictions, it only analyses the
  predictions your system already produces on the labelled Nigerian test set)

Run: python evaluate_affiongai_performance.py --input your_results.csv

IMPORTANT — READ BEFORE USING
------------------------------
This script will NOT run, and will NOT produce a chart, without a real
input file. There are no placeholder/sample numbers baked in anywhere in
this script. Do not hand-fill fake numbers into the CSV to "see what it
looks like" and then forget to replace them — that would be reporting
fabricated results in a thesis, which is a serious research-integrity
problem, not a formatting shortcut. Run this only once you have genuine
predictions from your own classifier on your own labelled test set.
"""

import argparse
import sys
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
from sklearn.metrics import (
    accuracy_score, precision_recall_fscore_support, confusion_matrix,
    roc_curve, auc, classification_report
)
from sklearn.preprocessing import label_binarize

CLASSES = ["Normal", "Pneumonia", "TB"]
NAVY, RUST, GOLD, MUTED = "#1A3A5C", "#C0392B", "#B8864B", "#9CA3AF"


def load_and_validate(path):
    df = pd.read_csv(path)
    required = {"image_id", "true_label", "pred_label", "prob_normal", "prob_pneumonia", "prob_tb"}
    missing = required - set(df.columns)
    if missing:
        sys.exit(f"ERROR: input CSV is missing required columns: {missing}")
    bad = set(df["true_label"]) - set(CLASSES)
    if bad:
        sys.exit(f"ERROR: true_label contains values outside {CLASSES}: {bad}")
    if len(df) < 10:
        print(f"WARNING: only {len(df)} test cases found — results will have very wide "
              f"confidence intervals and should be reported as preliminary/pilot-scale, "
              f"consistent with how you already describe Togunwa et al.'s n=190 pilot in Chapter 2.")
    return df


def compute_metrics_table(df):
    y_true, y_pred = df["true_label"], df["pred_label"]
    acc = accuracy_score(y_true, y_pred)
    precision, recall, f1, support = precision_recall_fscore_support(
        y_true, y_pred, labels=CLASSES, zero_division=0)

    cm = confusion_matrix(y_true, y_pred, labels=CLASSES)
    # per-class sensitivity (=recall) and specificity from the confusion matrix
    specificity = []
    for i in range(len(CLASSES)):
        tn = cm.sum() - (cm[i, :].sum() + cm[:, i].sum() - cm[i, i])
        fp = cm[:, i].sum() - cm[i, i]
        specificity.append(tn / (tn + fp) if (tn + fp) > 0 else 0.0)

    rows = []
    for i, c in enumerate(CLASSES):
        rows.append({
            "Class": c, "Sensitivity (Recall)": round(recall[i], 3),
            "Specificity": round(specificity[i], 3), "Precision": round(precision[i], 3),
            "F1-score": round(f1[i], 3), "Support (n)": int(support[i]),
        })
    rows.append({
        "Class": "Overall Accuracy", "Sensitivity (Recall)": "", "Specificity": "",
        "Precision": "", "F1-score": "", "Support (n)": round(acc, 3),
    })
    table = pd.DataFrame(rows)
    print("\n=== Table 5.x — AffiongAI Diagnostic Performance Summary ===")
    print(table.to_string(index=False))
    print("\n(Full sklearn classification report, for appendix if needed)")
    print(classification_report(y_true, y_pred, labels=CLASSES, zero_division=0))
    return table, cm, acc


def plot_confusion_matrix(cm, out_path):
    fig, ax = plt.subplots(figsize=(5.5, 5))
    im = ax.imshow(cm, cmap="Blues")
    ax.set_xticks(range(len(CLASSES))); ax.set_xticklabels(CLASSES)
    ax.set_yticks(range(len(CLASSES))); ax.set_yticklabels(CLASSES)
    ax.set_xlabel("Predicted label"); ax.set_ylabel("True label")
    ax.set_title("Figure 5.x — Confusion Matrix (AffiongAI on Nigerian CXR test set)")
    for i in range(len(CLASSES)):
        for j in range(len(CLASSES)):
            ax.text(j, i, cm[i, j], ha="center", va="center",
                     color="white" if cm[i, j] > cm.max() / 2 else "black", fontsize=13, fontweight="bold")
    fig.colorbar(im, fraction=0.046, pad=0.04)
    plt.tight_layout()
    plt.savefig(out_path, dpi=200, facecolor="white")
    plt.close(fig)
    print(f"Saved confusion matrix -> {out_path}")


def plot_roc_curves(df, out_path):
    y_true_bin = label_binarize(df["true_label"], classes=CLASSES)
    probs = df[["prob_normal", "prob_pneumonia", "prob_tb"]].values
    fig, ax = plt.subplots(figsize=(6, 5.5))
    colors = [NAVY, RUST, GOLD]
    aucs = {}
    for i, c in enumerate(CLASSES):
        fpr, tpr, _ = roc_curve(y_true_bin[:, i], probs[:, i])
        roc_auc = auc(fpr, tpr)
        aucs[c] = roc_auc
        ax.plot(fpr, tpr, color=colors[i], linewidth=2, label=f"{c} (AUC = {roc_auc:.2f})")
    ax.plot([0, 1], [0, 1], "--", color=MUTED, linewidth=1)
    ax.set_xlabel("False Positive Rate"); ax.set_ylabel("True Positive Rate")
    ax.set_title("Figure 5.y — ROC Curves, One-vs-Rest (AffiongAI)")
    ax.legend(loc="lower right")
    plt.tight_layout()
    plt.savefig(out_path, dpi=200, facecolor="white")
    plt.close(fig)
    print(f"Saved ROC curves -> {out_path}")
    return aucs


def plot_literature_comparison(affiongai_accuracy, affiongai_auc, out_path):
    """
    Compares AffiongAI's OWN computed numbers (passed in as real arguments —
    never hardcoded) against the literature figures already cited in your
    Chapter 2 gap analysis. This directly answers feedback point 7:
    'model performance compared to previous studies'.
    """
    if affiongai_accuracy is None or affiongai_auc is None:
        print("\nSkipping literature-comparison chart: pass your computed accuracy and "
              "mean AUC into plot_literature_comparison() once available. This chart is "
              "intentionally not generated with placeholder numbers.")
        return

    systems = ["Togunwa et al.\n(2025) — external", "CAD4TB\n(sensitivity)",
               "Qure.ai qXR\n(AUC, TB)", "AffiongAI\n(this study)"]
    values = [0.58, 0.90, 0.91, affiongai_accuracy]
    colors_ = [MUTED, MUTED, MUTED, NAVY]

    fig, ax = plt.subplots(figsize=(7.5, 5))
    bars = ax.bar(systems, values, color=colors_, width=0.55)
    ax.set_ylim(0, 1.05)
    ax.set_ylabel("Reported metric (accuracy / sensitivity / AUC)")
    ax.set_title("Figure 5.z — AffiongAI vs. Prior Studies (Section 2.2 / 2.4.1)")
    for b, v in zip(bars, values):
        ax.text(b.get_x() + b.get_width() / 2, v + 0.02, f"{v:.2f}", ha="center", fontweight="bold")
    ax.text(0.5, -0.18, "Note: metrics are not identical in kind (accuracy vs. sensitivity vs. AUC) —\n"
                        "label each bar's metric type explicitly in your thesis caption, not just the number.",
            transform=ax.transAxes, ha="center", fontsize=8.5, style="italic", color=MUTED)
    plt.tight_layout()
    plt.savefig(out_path, dpi=200, facecolor="white")
    plt.close(fig)
    print(f"Saved literature-comparison chart -> {out_path}")


def main():
    ap = argparse.ArgumentParser(description="AffiongAI diagnostic performance evaluation")
    ap.add_argument("--input", required=True, help="Path to your results CSV (see docstring for format)")
    ap.add_argument("--outdir", default=".", help="Directory to save charts into")
    args = ap.parse_args()

    df = load_and_validate(args.input)
    table, cm, acc = compute_metrics_table(df)
    table.to_csv(f"{args.outdir}/table_5x_performance_summary.csv", index=False)

    plot_confusion_matrix(cm, f"{args.outdir}/figure_5x_confusion_matrix.png")
    aucs = plot_roc_curves(df, f"{args.outdir}/figure_5y_roc_curves.png")
    mean_auc = float(np.mean(list(aucs.values())))

    # This is the ONLY place your real computed numbers feed into the
    # literature-comparison chart — nothing here is invented.
    plot_literature_comparison(acc, mean_auc, f"{args.outdir}/figure_5z_literature_comparison.png")

    print(f"\nDone. Overall accuracy: {acc:.3f} | Mean one-vs-rest AUC: {mean_auc:.3f}")
    print("Insert table_5x_performance_summary.csv and the three PNGs into Chapter 5, "
          "and reference figure_5z in your Conclusion per feedback point 6.")


if __name__ == "__main__":
    main()
