<h1 align="center">
🧠 AffiongAI: Clinical Decision Support System
</h1>
<p align="center"> 
  <em>An Academic Project leveraging MedRAX-2</em>
</p>

<br>

## About AffiongAI
AffiongAI is a next-generation Clinical Decision Support System (CDSS) built as an academic project. Designed specifically for radiologists and clinical environments, AffiongAI provides a highly intuitive and robust Diagnostic Workstation frontend that interfaces seamlessly with advanced medical reasoning engines. 

AffiongAI is built on top of **MedRAX-2** (Medical Reasoning Agent for Chest X-ray), leveraging its powerful Multi-Modal Large Language Models and state-of-the-art CXR analysis tools. We have wrapped the MedRAX-2 engine in a production-ready, highly safeguarded clinical UI to improve practical radiologist workflows.


### KEY Architectural & Backend System Improvements
To transform the core reasoning models into a complete Clinical Decision Support System, significant structural additions were made to the backend:

- **Custom FastAPI Backend Service**: Replaced the default Gradio interface with a robust, production-ready REST API built on FastAPI. This decouples the frontend from the model inference engine, allowing asynchronous batch processing and horizontal scaling.
- **Explainable AI (XAI) Engine**: Engineered custom extraction pipelines to pull raw feature maps and gradients directly from the underlying CNN models (like TorchXRayVision). This enables the real-time generation of both **Grad-CAM** and **Integrated Gradients (IG)** heatmaps, providing visual interpretability for clinical diagnoses.
- **Compliance & Audit Logging Subsystem**: Implemented a comprehensive audit trail mechanism (`/api/audit/log`). Every critical action—case initiation, scan uploads, and human-in-the-loop validation—is recorded with timestamps to meet clinical compliance standards.
- **Closed-Loop Feedback System**: Created a dedicated human validation loop (`/api/feedback`) that captures radiologist acceptances or overrides. This data is persistently stored, allowing the system to track model accuracy and providing a dataset for future model fine-tuning.
- **Analytics & Historical Tracking**: Developed a lightweight, CSV-backed analytical engine (`/api/analytics`) that tracks average inference times and pending compliance metrics, feeding real-time data back to the frontend for dynamic progress estimation.
- **Modular Pipeline Orchestration**: The inference pipeline is now heavily segmented. File upload, CNN Inference, and LLM Report Generation are distinct API calls, allowing the frontend to stream granular progress to the user rather than waiting for a single monolithic blocking process.

<br>

### UI/UX Improvements

- **Diagnostic Workstation UI**: A complete custom React frontend built for high-efficiency clinical workflows, featuring drag-and-drop batch processing.
- **Markdown Report Rendering**: The AI Diagnostic Reports are fully parsed with `react-markdown` and `remark-gfm` to elegantly display tables, clinical findings, and formatted text.
- **Auto-Resume & Session Persistence**: If the browser crashes or is accidentally closed, the session instantly auto-resumes from `localStorage`. Notifications clearly alert the user if any pending (un-uploaded) files were dropped during a crash.
- **Clinical Safeguards**: Built-in validation safeguards prevent radiologists from ending a session or closing a case if there are unvalidated (neither Accepted nor Overridden) AI reports, ensuring compliance and a complete audit trail.
- **Interactive Heatmap Legends**: Dynamic, context-aware legends automatically appear when toggling between Integrated Gradients (IG) and Grad-CAM heatmaps to help clinicians interpret model attention.
- **Dynamic Timers & Estimates**: Real-time progress trackers and dynamically estimated completion times (based on historical analytics) keep the user informed during CNN Inference and Report Generation.
- **Case ID Formatting**: Automatic `DDMMYY-(SN)-UserInput` formatting ensures that Case IDs are standardized and directly match what radiologists write on physical patient charts.
- **Fullscreen Scan Viewer**: A pop-out 90vh modal allowing radiologists to inspect high-resolution X-rays and heatmaps without UI clutter.

---

## Under the Hood: MedRAX-2
AffiongAI is proudly powered by **MedRAX**. MedRAX is the first versatile AI agent that seamlessly integrates state-of-the-art CXR analysis tools and multimodal large language models into a unified framework.

- **Integrated Tools**: Visual QA (CheXagent, LLaVA-Med), Segmentation (MedSAM2), Grounding (Maira-2), Report Generation, and Disease Classification.
- **ChestAgentBench**: Evaluated on a comprehensive benchmark containing 2,500 complex medical queries.

For detailed installation of the MedRAX backend models and Python environment, please refer to the original repository instructions.

<br>

## Citation (MedRAX)
If you find the underlying reasoning models useful, please cite the MedRAX paper:
```bibtex
@misc{fallahpour2025medraxmedicalreasoningagent,
      title={MedRAX: Medical Reasoning Agent for Chest X-ray}, 
      author={Adibvafa Fallahpour and Jun Ma and Alif Munim and Hongwei Lyu and Bo Wang},
      year={2025},
      eprint={2502.02673},
      archivePrefix={arXiv},
      primaryClass={cs.LG},
      url={https://arxiv.org/abs/2502.02673}, 
}
```

---
<p align="center">
AffiongAI was developed as an academic project. The underlying MedRAX engine was created by researchers at the University of Toronto, Vector Institute, and University Health Network.
</p>
