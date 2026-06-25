import time
import os
import shutil
import json
import uuid
import requests
from pathlib import Path
import gradio as gr

# Custom CSS for Premium UI, Sidebar, and removing Gradio branding
CSS = """
/* Remove Gradio Footer */
footer {display: none !important;}
/* Make the background sleek */
.gradio-container {
    font-family: 'Inter', sans-serif !important;
    max-width: 100% !important;
    padding: 0 !important;
}

/* Base Layout Classes */
.left-sidebar {
    background-color: #0b0f19;
    padding: 20px;
    height: 100vh;
    border-right: 1px solid #1f2937;
    display: flex;
    flex-direction: column;
}
.main-content {
    background-color: #111827;
    padding: 30px;
    height: 100vh;
    overflow-y: auto;
}
.right-sidebar {
    background-color: #0b0f19;
    padding: 20px;
    height: 100vh;
    border-left: 1px solid #1f2937;
    overflow-y: auto;
}

/* Left Sidebar Elements */
.brand-logo {
    color: #3b82f6;
    font-size: 1.5rem;
    font-weight: bold;
    margin-bottom: 40px;
    display: flex;
    align-items: center;
    gap: 10px;
}
.nav-menu {
    gap: 15px;
    display: flex;
    flex-direction: column;
}
.nav-btn {
    background: transparent !important;
    border: none !important;
    color: #9ca3af !important;
    text-align: left !important;
    padding: 10px 15px !important;
    justify-content: flex-start !important;
}
.nav-btn:hover {
    color: white !important;
    background: #1f2937 !important;
}
.nav-btn.primary {
    background: #1e3a8a !important;
    color: white !important;
    border-radius: 8px !important;
}
.user-profile {
    margin-top: auto;
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 15px 0;
    border-top: 1px solid #1f2937;
    border-bottom: 1px solid #1f2937;
    margin-bottom: 15px;
    color: white;
}
.avatar {
    width: 35px;
    height: 35px;
    border-radius: 50%;
    background-color: #3b82f6;
}

/* Main Content Header */
.header-title {
    color: white;
    font-size: 1.8rem;
    font-weight: 600;
    margin: 0;
}
.header-subtitle {
    color: #9ca3af;
    margin: 0;
}

/* Right Sidebar Metrics */
.metric-box {
    background-color: #1f2937;
    border-radius: 8px;
    padding: 15px;
    margin-bottom: 20px;
    border: 1px solid #374151;
}
.metric-title {
    color: #9ca3af;
    font-size: 0.8rem;
    font-weight: 700;
    letter-spacing: 1px;
    margin-bottom: 10px;
    text-transform: uppercase;
}
"""

class AffiongAIDashboard:
    def __init__(self, agent, tools_dict):
        self.agent = agent
        self.tools_dict = tools_dict
        self.upload_dir = Path("temp")
        self.upload_dir.mkdir(parents=True, exist_ok=True)
        self.feedback_file = "active_learning_feedback.json"
        
    def save_feedback(self, image_path, prediction, actual_decision, user):
        data = []
        if os.path.exists(self.feedback_file):
            with open(self.feedback_file, 'r') as f:
                data = json.load(f)
        data.append({
            "timestamp": time.time(),
            "user": user,
            "image": image_path,
            "ai_prediction": prediction,
            "radiologist_decision": actual_decision
        })
        with open(self.feedback_file, 'w') as f:
            json.dump(data, f, indent=4)
        return "Feedback successfully saved."

def query_ollama(prompt):
    url = "http://localhost:11434/api/generate"
    payload = {
        "model": "llama3",
        "prompt": prompt,
        "stream": True
    }
    try:
        response = requests.post(url, json=payload, stream=True)
        for line in response.iter_lines():
            if line:
                data = json.loads(line)
                yield data.get("response", "")
    except Exception as e:
        yield f"\n\n[Error communicating with local LLM: {str(e)}]"

def create_demo(agent, tools_dict):
    dashboard = AffiongAIDashboard(agent, tools_dict)
    
    # Custom Premium Medical Theme
    theme = gr.themes.Soft(
        primary_hue="blue",
        neutral_hue="slate",
    ).set(
        body_background_fill="#111827",
        body_background_fill_dark="#111827",
        block_background_fill="#1f2937",
        block_background_fill_dark="#1f2937",
        block_radius="8px",
        button_border_width="0px",
    )

    with gr.Blocks(theme=theme, title="AffiongAI CDSS", css=CSS) as demo:
        # Global States
        auth_state = gr.State(False)
        current_role = gr.State("")
        current_image_path = gr.State(None)
        
        # --- LOGIN PAGE ---
        with gr.Column(visible=True) as login_page:
            gr.Markdown("<h1 style='text-align: center; color: #3b82f6; margin-top: 100px; font-weight: 800; font-size: 3em;'>AffiongAI</h1>")
            gr.Markdown("<p style='text-align: center; font-size: 1.2em; color: #9ca3af;'>Diagnostic Workstation</p>")
            
            with gr.Row():
                with gr.Column(scale=1): pass
                with gr.Column(scale=1):
                    with gr.Group():
                        gr.Markdown("### Secure Access Portal")
                        username_input = gr.Textbox(label="Username", placeholder="Enter your clinical ID")
                        password_input = gr.Textbox(label="Password", type="password", placeholder="Enter your password")
                        login_btn = gr.Button("Secure Login", variant="primary")
                        
                        gr.Markdown("---")
                        gr.Markdown("### Developer Test Accounts (Click to Autofill)")
                        with gr.Row():
                            fill_radio = gr.Button("Radiologist")
                            fill_comp = gr.Button("Compliance Officer")
                with gr.Column(scale=1): pass

        # --- MAIN DASHBOARD (3-COLUMN LAYOUT) ---
        with gr.Row(visible=False, elem_classes="dashboard-row") as dashboard_page:
            
            # --- LEFT SIDEBAR ---
            with gr.Column(scale=1, min_width=250, elem_classes="left-sidebar"):
                gr.HTML("<div class='brand-logo'>📈 AffiongAI</div>")
                
                nav_inference = gr.Button("Inference", elem_classes=["nav-btn", "primary"])
                nav_analytics = gr.Button("Analytics", elem_classes="nav-btn")
                nav_pacs = gr.Button("PACS Gateway", elem_classes="nav-btn")
                nav_feedback = gr.Button("Feedback Board", elem_classes="nav-btn")
                
                gr.HTML("""
                <div class='user-profile'>
                    <div class='avatar'></div>
                    <div><strong>Dr. Affiong (Radiology)</strong><br><small style='color: #9ca3af;'>CLINICIAN</small></div>
                </div>
                """)
                
                nav_calib = gr.Button("System Calibration", elem_classes="nav-btn")
                logout_btn = gr.Button("Sign Out", elem_classes="nav-btn")
                
            # --- CENTER BODY ---
            with gr.Column(scale=4, elem_classes="main-content"):
                with gr.Row():
                    with gr.Column(scale=4):
                        gr.HTML("<h2 class='header-title'>Diagnostic Workstation</h2><p class='header-subtitle'>Radiology ID: DOCTOR_01</p>")
                    with gr.Column(scale=1):
                        analyze_btn = gr.Button("Start Inference", variant="primary", size="lg")
                
                gr.Markdown("<br>")
                
                with gr.Row():
                    # The Dropzone is central and large
                    image_input = gr.Image(type="filepath", label="Drag & Drop Chest X-ray / CT Scan", sources=["upload"])
                
                with gr.Row():
                    review_image = gr.Image(interactive=False, label="Currently Viewing")
                    with gr.Column():
                        gr.Markdown("### 📝 Thoracic AI Diagnostic Report")
                        clinical_report_box = gr.Markdown("*Report will stream here...*", elem_classes="clinical-report")
                
                gr.Markdown("### Validation")
                override_notes = gr.Textbox(label="Override Justification (Required if overriding)", lines=2)
                with gr.Row():
                    accept_btn = gr.Button("✅ Accept Diagnosis", variant="primary")
                    override_btn = gr.Button("⚠️ Override Diagnosis", variant="stop")
                feedback_status = gr.Markdown("")

            # --- RIGHT SIDEBAR ---
            with gr.Column(scale=2, elem_classes="right-sidebar"):
                
                with gr.Group(elem_classes="metric-box"):
                    gr.HTML("<div class='metric-title'>AI PREDICTION ENGINE</div>")
                    status_box = gr.Textbox(label="", placeholder="Waiting for input...", interactive=False, lines=3)
                    with gr.Accordion("Raw Classification Scores", open=False):
                        prediction_box = gr.JSON()
                
                with gr.Group(elem_classes="metric-box"):
                    gr.HTML("<div class='metric-title'>UNCERTAINTY QUANTIFICATION</div>")
                    gr.Warning("Monte Carlo Dropout active. Variance determines uncertainty.")
                    with gr.Accordion("Raw Variance Scores", open=False):
                        uncertainty_box = gr.JSON()
                
                with gr.Group(elem_classes="metric-box"):
                    gr.HTML("<div class='metric-title'>EXPLAINABILITY (XAI)</div>")
                    with gr.Tabs():
                        with gr.TabItem("IG"):
                            ig_heatmap = gr.Image(interactive=False, label="Pixel Attribution")
                        with gr.TabItem("Grad-CAM"):
                            gc_heatmap_img = gr.Image(interactive=False, label="Layer Activation")

        # --- FUNCTIONALITY ---
        
        # Auth Functions
        def autofill_radio():
            return "radiologist@affiong.ai", "radio123"
            
        def autofill_comp():
            return "compliance@affiong.ai", "comp123"
            
        def perform_login(user, pwd):
            if user in ["radiologist@affiong.ai", "compliance@affiong.ai"] and pwd != "":
                return gr.update(visible=False), gr.update(visible=True), True, user
            return gr.update(visible=True), gr.update(visible=False), False, ""
            
        def perform_logout():
            return gr.update(visible=True), gr.update(visible=False), False, ""

        fill_radio.click(autofill_radio, outputs=[username_input, password_input])
        fill_comp.click(autofill_comp, outputs=[username_input, password_input])
        
        nav_pacs.click(lambda: gr.Warning("Future Update: PACS Integration coming soon."))
        nav_analytics.click(lambda: gr.Warning("Future Update: Analytics coming soon."))
        
        login_btn.click(
            perform_login, 
            inputs=[username_input, password_input], 
            outputs=[login_page, dashboard_page, auth_state, current_role]
        )
        logout_btn.click(
            perform_logout,
            outputs=[login_page, dashboard_page, auth_state, current_role]
        )
        
        # Pipeline Function with Yielding for real-time status and Float32 FIX
        def run_pipeline(img_path):
            if not img_path:
                yield "Error: No image uploaded.", None, None, None, None, None, "*No report available.*"
                return
                
            status = "Upload Received...\n"
            yield status, img_path, None, None, None, None, "*Processing...*"
            
            ext = os.path.splitext(img_path)[1]
            safe_path = os.path.join(str(dashboard.upload_dir), f"scan_{uuid.uuid4().hex}{ext}")
            shutil.copy2(img_path, safe_path)
            
            status += "Preprocessing Image...\n"
            yield status, safe_path, None, None, None, None, "*Processing...*"
            
            status += "Running CNN Classification...\n"
            yield status, safe_path, None, None, None, None, "*Processing...*"
            
            status += "Calculating MC Dropout & Generating Heatmaps...\n"
            yield status, safe_path, None, None, None, None, "*Processing...*"
            
            try:
                classifier = dashboard.tools_dict.get("TorchXRayVisionClassifierTool")
                if classifier:
                    out, meta = classifier._run(safe_path)
                    
                    status += "Pipeline Complete! Generating Report..."
                    
                    # FIX: Cast float32 to python float to prevent JSON serialization error
                    preds = {k: float(v) for k, v in sorted(out.items(), key=lambda item: item[1], reverse=True)[:8]}
                    uncertainties = meta.get("uncertainty_scores", {})
                    top_uncertainties = {k: float(uncertainties[k]) for k in preds.keys() if k in uncertainties}
                    
                    heatmap = meta.get("heatmap_path")
                    gc_heatmap = meta.get("gradcam_path")
                    
                    yield status, safe_path, preds, top_uncertainties, heatmap, gc_heatmap, "*Generating LLM Clinical Report...*"
                    
                    prompt = f"""
                    You are an expert AI Radiologist for AffiongAI CDSS. 
                    Based on the following AI CNN classification scores (0.0 to 1.0) and uncertainty variance (standard deviation), write a concise, professional clinical diagnostic report.
                    
                    Target Pathologies to emphasize if present: Pneumonia, Tuberculosis (TB), Pleural Effusion.
                    
                    Classification Scores:
                    {json.dumps(preds, indent=2)}
                    
                    Uncertainty Scores:
                    {json.dumps(top_uncertainties, indent=2)}
                    
                    Format the output in clean Markdown with:
                    - **Primary Findings**: (List the most likely diseases with Confirmed/Absent status)
                    - **Confidence & Uncertainty**: (Translate the variance into Low/Moderate/High Uncertainty)
                    - **Target Pathology Focus**: (Explicitly mention Pneumonia, TB, and Pleural Effusion statuses)
                    - **Recommendation**: (Brief clinical recommendation)
                    
                    Do not output raw JSON, only the professional clinical text.
                    """
                    
                    report_text = ""
                    for chunk in query_ollama(prompt):
                        report_text += chunk
                        yield status, safe_path, preds, top_uncertainties, heatmap, gc_heatmap, report_text
                        
                else:
                    yield "Error: TorchXRayVisionClassifierTool not loaded.", None, None, None, None, None, "*Error*"
            except Exception as e:
                yield f"Error during pipeline execution: {str(e)}", None, None, None, None, None, "*Error*"

        analyze_btn.click(
            run_pipeline,
            inputs=[image_input],
            outputs=[status_box, review_image, prediction_box, uncertainty_box, ig_heatmap, gc_heatmap_img, clinical_report_box]
        )
        
        def accept_diag(img, preds, role):
            if not img: return "No active case."
            msg = dashboard.save_feedback(img, preds, "Accepted", role)
            return f"✅ Case Accepted. {msg}"
            
        def override_diag(img, preds, notes, role):
            if not img: return "No active case."
            if not notes: return "⚠️ Please provide justification in the notes box before overriding."
            msg = dashboard.save_feedback(img, preds, f"Overridden: {notes}", role)
            return f"⚠️ Case Overridden. {msg}"
            
        accept_btn.click(
            accept_diag,
            inputs=[current_image_path, prediction_box, current_role],
            outputs=[feedback_status]
        )
        
        override_btn.click(
            override_diag,
            inputs=[current_image_path, prediction_box, override_notes, current_role],
            outputs=[feedback_status]
        )

        review_image.change(lambda x: x, inputs=[review_image], outputs=[current_image_path])

    return demo
