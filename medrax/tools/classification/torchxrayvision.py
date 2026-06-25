from typing import Dict, Optional, Tuple, Type
import os
from pydantic import BaseModel, Field

import numpy as np
import torch
import torchvision
import torchxrayvision as xrv
from PIL import Image
import uuid
import matplotlib.pyplot as plt
from matplotlib import cm

from langchain_core.callbacks import (
    AsyncCallbackManagerForToolRun,
    CallbackManagerForToolRun,
)
from langchain_core.tools import BaseTool

from medrax.utils.utils import preprocess_medical_image


class TorchXRayVisionInput(BaseModel):
    """Input for TorchXRayVision chest X-ray analysis tools. Only supports JPG or PNG images."""

    image_path: str = Field(..., description="Path to the radiology image file, only supports JPG or PNG images")


class TorchXRayVisionClassifierTool(BaseTool):
    """Tool that classifies chest X-ray images for multiple pathologies.

    This tool uses a pre-trained DenseNet model to analyze chest X-ray images and
    predict the likelihood of various pathologies. The model can classify the following 18 conditions:

    Atelectasis, Cardiomegaly, Consolidation, Edema, Effusion, Emphysema,
    Enlarged Cardiomediastinum, Fibrosis, Fracture, Hernia, Infiltration,
    Lung Lesion, Lung Opacity, Mass, Nodule, Pleural Thickening, Pneumonia, Pneumothorax

    The output values represent the probability (from 0 to 1) of each condition being present in the image.
    A higher value indicates a higher likelihood of the condition being present.
    """

    name: str = "torchxrayvision_classifier"
    description: str = (
        "A tool that analyzes chest X-ray images and classifies them for 18 different pathologies using TorchXRayVision DenseNet. "
        "Input should be the path to a chest X-ray image file. "
        "Output is a dictionary of pathologies and their predicted probabilities (0 to 1). "
        "Pathologies include: Atelectasis, Cardiomegaly, Consolidation, Edema, Effusion, Emphysema, "
        "Enlarged Cardiomediastinum, Fibrosis, Fracture, Hernia, Infiltration, Lung Lesion, "
        "Lung Opacity, Mass, Nodule, Pleural Thickening, Pneumonia, and Pneumothorax. "
        "Higher values indicate a higher likelihood of the condition being present."
    )
    args_schema: Type[BaseModel] = TorchXRayVisionInput
    model: xrv.models.DenseNet = None
    device: Optional[str] = "cuda"
    transform: torchvision.transforms.Compose = None

    def __init__(
        self,
        model_name: str = "densenet121-res224-all",
        device: Optional[str] = "cuda",
        cache_dir: Optional[str] = None,
    ):
        super().__init__()
        if cache_dir is None:
            cache_dir = os.getenv("TORCH_CACHE_DIR") or os.getenv("MODEL_CACHE_DIR")
        self.model = xrv.models.DenseNet(weights=model_name, cache_dir=cache_dir)
        self.model.eval()
        self.device = torch.device(device) if device else "cuda"
        self.model = self.model.to(self.device)
        self.transform = torchvision.transforms.Compose([xrv.datasets.XRayCenterCrop()])

    def _process_image(self, image_path: str) -> torch.Tensor:
        """
        Process the input chest X-ray image for model inference.

        This method loads the image, normalizes it, applies necessary transformations,
        and prepares it as a torch.Tensor for model input.

        Args:
            image_path (str): The file path to the chest X-ray image.

        Returns:
            torch.Tensor: A processed image tensor ready for model inference.

        Raises:
            FileNotFoundError: If the specified image file does not exist.
            ValueError: If the image cannot be properly loaded or processed.
        """
        # Use PIL to load image - more robust with PNG metadata
        image = Image.open(image_path)
        
        # Convert to grayscale if needed
        if image.mode != 'L':
            if image.mode in ('RGB', 'RGBA'):
                # Convert RGB/RGBA to grayscale
                image = image.convert('L')
            else:
                # For other modes, convert to L directly
                image = image.convert('L')
        
        # Convert to numpy array
        img = np.array(image)
        
        # Use robust normalization that handles both 8-bit and 16-bit images
        img = preprocess_medical_image(img, target_range=(-1024.0, 1024.0))

        img = img[None, :, :]
        img = self.transform(img)
        img = torch.from_numpy(img).unsqueeze(0)

        img = img.to(self.device)

        return img

    def _run(
        self,
        image_path: str,
        run_manager: Optional[CallbackManagerForToolRun] = None,
    ) -> Tuple[Dict[str, float], Dict]:
        """Classify the chest X-ray image for multiple pathologies.

        Args:
            image_path (str): The path to the chest X-ray image file.
            run_manager (Optional[CallbackManagerForToolRun]): The callback manager for the tool run.

        Returns:
            Tuple[Dict[str, float], Dict]: A tuple containing the classification results
                                           (pathologies and their probabilities from 0 to 1)
                                           and any additional metadata.

        Raises:
            Exception: If there's an error processing the image or during classification.
        """
        try:
            img = self._process_image(image_path)

            # --- standard inference ---
            with torch.inference_mode():
                preds = self.model(img).cpu()[0]
                
            # --- MC Dropout for Uncertainty ---
            # temporarily set model to train mode to enable dropout
            self.model.train()
            mc_preds = []
            with torch.inference_mode():
                for _ in range(5): # 5 passes for uncertainty estimation (optimized from 10)
                    mc_preds.append(self.model(img).cpu()[0].numpy())
            self.model.eval()
            
            mc_preds_arr = np.array(mc_preds)
            uncertainty_scores = np.std(mc_preds_arr, axis=0) # standard deviation across passes
            
            # --- Integrated Gradients (Explainability) ---
            # explain the top predicted class
            top_class_idx = int(np.argmax(preds.numpy()))
            top_class_name = xrv.datasets.default_pathologies[top_class_idx]
            
            from captum.attr import IntegratedGradients, LayerGradCam, LayerAttribution
            
            # --- Integrated Gradients ---
            ig = IntegratedGradients(self.model)
            img.requires_grad_()
            attr = ig.attribute(img, target=top_class_idx, n_steps=10) # Optimized from 20 to 10
            
            # generate heatmap image
            attr_np = np.abs(attr.squeeze().cpu().detach().numpy())
            # normalize for visualization
            attr_np = (attr_np - np.min(attr_np)) / (np.max(attr_np) - np.min(attr_np) + 1e-8)
            
            # overlay on original image
            orig_img = Image.open(image_path).convert("L")
            # FIX: Resize original image to match the exact shape of the attribution map
            orig_img = orig_img.resize((attr_np.shape[1], attr_np.shape[0]))
            orig_arr = np.array(orig_img) / 255.0
            
            heatmap = cm.jet(attr_np)[:, :, :3]
            overlay = 0.5 * heatmap + 0.5 * np.stack((orig_arr,)*3, axis=-1)
            
            heatmap_dir = os.path.join(os.path.dirname(image_path), "heatmaps")
            os.makedirs(heatmap_dir, exist_ok=True)
            heatmap_path = os.path.join(heatmap_dir, f"ig_{uuid.uuid4().hex}.png")
            plt.imsave(heatmap_path, overlay)
            
            # --- Grad-CAM ---
            try:
                target_layer = self.model.features[-1]
                layer_gc = LayerGradCam(self.model, target_layer)
                gc_attr = layer_gc.attribute(img, target=top_class_idx)
                gc_attr = LayerAttribution.interpolate(gc_attr, attr_np.shape)
                gc_attr_np = np.abs(gc_attr.squeeze().cpu().detach().numpy())
                gc_attr_np = (gc_attr_np - np.min(gc_attr_np)) / (np.max(gc_attr_np) - np.min(gc_attr_np) + 1e-8)
                gc_heatmap = cm.jet(gc_attr_np)[:, :, :3]
                gc_overlay = 0.5 * gc_heatmap + 0.5 * np.stack((orig_arr,)*3, axis=-1)
                gc_heatmap_path = os.path.join(heatmap_dir, f"gc_{uuid.uuid4().hex}.png")
                plt.imsave(gc_heatmap_path, gc_overlay)
            except Exception as e:
                print(f"GradCAM Error: {e}")
                gc_heatmap_path = None

            output = dict(zip(xrv.datasets.default_pathologies, preds.numpy()))
            uncertainty_output = dict(zip(xrv.datasets.default_pathologies, uncertainty_scores))
            
            metadata = {
                "image_path": image_path,
                "analysis_status": "completed",
                "note": "Probabilities range from 0 to 1, with higher values indicating higher likelihood of the condition.",
                "uncertainty_scores": uncertainty_output,
                "heatmap_path": heatmap_path,
                "gradcam_path": gc_heatmap_path,
                "explained_class": top_class_name,
                "explained_class_prob": float(preds.numpy()[top_class_idx]),
            }
            return output, metadata
        except Exception as e:
            return {"error": str(e)}, {
                "image_path": image_path,
                "analysis_status": "failed",
            }

    async def _arun(
        self,
        image_path: str,
        run_manager: Optional[AsyncCallbackManagerForToolRun] = None,
    ) -> Tuple[Dict[str, float], Dict]:
        """Asynchronously classify the chest X-ray image for multiple pathologies.

        This method currently calls the synchronous version, as the model inference
        is not inherently asynchronous. For true asynchronous behavior, consider
        using a separate thread or process.

        Args:
            image_path (str): The path to the chest X-ray image file.
            run_manager (Optional[AsyncCallbackManagerForToolRun]): The async callback manager for the tool run.

        Returns:
            Tuple[Dict[str, float], Dict]: A tuple containing the classification results
                                           (pathologies and their probabilities from 0 to 1)
                                           and any additional metadata.

        Raises:
            Exception: If there's an error processing the image or during classification.
        """
        return self._run(image_path)
