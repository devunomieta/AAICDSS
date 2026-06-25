import time
import os
import shutil
import json
import uuid
from pathlib import Path
import gradio as gr

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
        return "Feedback successfully saved to Active Learning Repository."

def create_demo(agent, tools_dict):
    dashboard = AffiongAIDashboard(agent, tools_dict)
    
    # Custom Premium Medical Theme
    theme = gr.themes.Soft(
        primary_hue="blue",
        secondary_hue="indigo",
        neutral_hue="slate",
    ).set(
        body_background_fill="*neutral_50",
        body_background_fill_dark="*neutral_950",
    )

    with gr.Blocks(theme=theme, title="AffiongAI CDSS") as demo:
        # Global States
        auth_state = gr.State(False)
        current_role = gr.State("")
        current_image_path = gr.State(None)
        
        # --- LOGIN PAGE ---
        with gr.Column(visible=True) as login_page:
            gr.Markdown("<h1 style='text-align: center; color: #1E3A8A; margin-top: 50px;'>AffiongAI CDSS</h1>")
            gr.Markdown("<p style='text-align: center;'>Clinical Decision Support System</p>")
            
            with gr.Row():
                with gr.Column(scale=1):
                    gr.Markdown(" ") # spacer
                with gr.Column(scale=2):
                    with gr.Box() if hasattr(gr, "Box") else gr.Group():
                        login_error = gr.Markdown("", visible=False)
                        username_input = gr.Textbox(label="Username")
                        password_input = gr.Textbox(label="Password", type="password")
                        login_btn = gr.Button("Secure Login", variant="primary")
                        
                        gr.Markdown("---")
                        gr.Markdown("### External Authentication")
                        with gr.Row():
                            google_btn = gr.Button("Google Sign-in")
                            bio_btn = gr.Button("Biometric Access")
                            
                        gr.Markdown("---")
                        gr.Markdown("### Developer Test Accounts (Click to Autofill)")
                        with gr.Row():
                            fill_radio = gr.Button("Radiologist")
                            fill_comp = gr.Button("Compliance Officer")
                with gr.Column(scale=1):
                    gr.Markdown(" ") # spacer

        # --- MAIN DASHBOARD ---
        with gr.Column(visible=False) as dashboard_page:
            with gr.Row():
                gr.Markdown("## AffiongAI CDSS")
                user_banner = gr.Markdown("Logged in as: ")
                logout_btn = gr.Button("Logout", size="sm")
                
            with gr.Tabs():
                # STAGE 1: Radiographer Pipeline
                with gr.TabItem("Stage 1: Image Upload & Analysis"):
                    with gr.Row():
                        with gr.Column():
                            gr.Markdown("### 1. Upload Patient Scan")
                            image_input = gr.Image(type="filepath", label="Chest X-ray / CT Scan")
                            analyze_btn = gr.Button("Run AffiongAI Pipeline", variant="primary")
                        
                        with gr.Column():
                            gr.Markdown("### 2. Processing Status")
                            status_box = gr.Textbox(label="Pipeline Status", lines=10, interactive=False)
                            
                # STAGE 2: Radiologist Review
                with gr.TabItem("Stage 2: Radiologist Review Dashboard"):
                    with gr.Row():
                        with gr.Column(scale=1):
                            gr.Markdown("### Original Image")
                            review_image = gr.Image(interactive=False, label="Source Scan")
                            
                            gr.Markdown("### Diagnostic Decision")
                            override_notes = gr.Textbox(label="Override Justification (if overriding)")
                            with gr.Row():
                                accept_btn = gr.Button("✅ Accept Diagnosis", variant="primary")
                                override_btn = gr.Button("⚠️ Override Diagnosis", variant="stop")
                            feedback_status = gr.Markdown("")
                            
                        with gr.Column(scale=2):
                            gr.Markdown("### AI Prediction & Uncertainty")
                            prediction_box = gr.JSON(label="CNN Classification Scores")
                            uncertainty_box = gr.JSON(label="Monte Carlo Uncertainty (Variance)")
                            
                            gr.Markdown("### Explainability (XAI)")
                            with gr.Tabs():
                                with gr.TabItem("Integrated Gradients (Captum)"):
                                    ig_heatmap = gr.Image(interactive=False, label="Pixel Attribution")
                                with gr.TabItem("Grad-CAM"):
                                    gr.Markdown("*Heatmap will appear here.*")
                                with gr.TabItem("LIME Local Explanations"):
                                    gr.Markdown("*LIME Superpixels will appear here.*")

        # --- FUNCTIONALITY ---
        
        # Auth Functions
        def autofill_radio():
            return "radiologist@affiong.ai", "radio123"
            
        def autofill_comp():
            return "compliance@affiong.ai", "comp123"
            
        def dummy_sso_warning():
            gr.Warning("Future Update will fix this. SSO is currently disabled.")
            
        def perform_login(user, pwd):
            if user in ["radiologist@affiong.ai", "compliance@affiong.ai"] and pwd != "":
                return gr.update(visible=False), gr.update(visible=True), f"Logged in as: **{user}**", True, user
            return gr.update(visible=True), gr.update(visible=False), "", False, ""
            
        def perform_logout():
            return gr.update(visible=True), gr.update(visible=False), "", False, ""

        fill_radio.click(autofill_radio, outputs=[username_input, password_input])
        fill_comp.click(autofill_comp, outputs=[username_input, password_input])
        google_btn.click(dummy_sso_warning)
        bio_btn.click(dummy_sso_warning)
        
        login_btn.click(
            perform_login, 
            inputs=[username_input, password_input], 
            outputs=[login_page, dashboard_page, user_banner, auth_state, current_role]
        )
        logout_btn.click(
            perform_logout,
            outputs=[login_page, dashboard_page, user_banner, auth_state, current_role]
        )
        
        # Pipeline Function
        def run_pipeline(img_path):
            if not img_path:
                return "Error: No image uploaded.", None, None, None, None
                
            status = "1. Upload Received...\n"
            status += "2. Preprocessing Image (Resizing, Normalization)...\n"
            
            # Save to temp
            ext = os.path.splitext(img_path)[1]
            safe_path = os.path.join(str(dashboard.upload_dir), f"scan_{uuid.uuid4().hex}{ext}")
            shutil.copy2(img_path, safe_path)
            
            status += "3. Running CNN Classification (DenseNet121)...\n"
            status += "4. Calculating Monte Carlo Dropout Uncertainty (10 passes)...\n"
            status += "5. Generating Integrated Gradients Heatmap...\n"
            
            # Execute the PyTorch backend tool directly
            try:
                classifier = dashboard.tools_dict.get("TorchXRayVisionClassifierTool")
                if classifier:
                    out, meta = classifier._run(safe_path)
                    
                    status += "\n✅ Pipeline Complete! Proceed to Stage 2 for Radiologist Review."
                    
                    # Extract the data we injected earlier
                    preds = {k: v for k, v in sorted(out.items(), key=lambda item: item[1], reverse=True)[:5]}
                    uncertainties = meta.get("uncertainty_scores", {})
                    top_uncertainties = {k: uncertainties[k] for k in preds.keys() if k in uncertainties}
                    heatmap = meta.get("heatmap_path")
                    
                    return status, safe_path, preds, top_uncertainties, heatmap
                else:
                    return "Error: TorchXRayVisionClassifierTool not loaded.", None, None, None, None
            except Exception as e:
                return f"Error during pipeline execution: {str(e)}", None, None, None, None

        analyze_btn.click(
            run_pipeline,
            inputs=[image_input],
            outputs=[status_box, review_image, prediction_box, uncertainty_box, ig_heatmap]
        )
        
        # Human in the loop feedback
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

        # Sync hidden state with image
        review_image.change(lambda x: x, inputs=[review_image], outputs=[current_image_path])

    return demo
