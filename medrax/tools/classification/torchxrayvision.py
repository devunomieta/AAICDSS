from typing import Any, Dict, Optional, Tuple, Type
import os
import gc
import threading
from pydantic import BaseModel, Field

import numpy as np
import torch
import torchvision
import torchxrayvision as xrv
from PIL import Image, ImageOps
import uuid
import matplotlib.pyplot as plt
from matplotlib import cm

from langchain_core.callbacks import (
    AsyncCallbackManagerForToolRun,
    CallbackManagerForToolRun,
)
from langchain_core.tools import BaseTool

from medrax.utils.utils import preprocess_medical_image


INFERENCE_LOCK = threading.Lock()


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
    model: Any = None
    device: Any = "cuda"
    transform: Any = None
    mc_dropout_p: float = 0.3

    def __init__(
        self,
        model_name: str = "densenet121-res224-all",
        device: Optional[str] = "cuda",
        cache_dir: Optional[str] = None,
        mc_dropout_p: float = 0.3,
    ):
        super().__init__()
        if cache_dir is None:
            cache_dir = os.getenv("TORCH_CACHE_DIR") or os.getenv("MODEL_CACHE_DIR")
        self.model = xrv.models.DenseNet(weights=model_name, cache_dir=cache_dir)

        # --- MC Dropout retrofit ---
        # The pretrained densenet121-res224-all weights contain no nn.Dropout layers
        # anywhere in the architecture (verified: only Conv2d/BatchNorm2d/ReLU/Linear/
        # pooling modules are present). Without this, the Monte Carlo Dropout sampling
        # loop below (which toggles any nn.Dropout module to train() mode for 5 passes)
        # has nothing to toggle, so every pass is identical and uncertainty_scores is
        # always exactly zero for every pathology.
        #
        # Fix: insert a Dropout layer immediately before the final classifier. This is
        # the standard way to retrofit MC Dropout into a model that was not trained with
        # it (Gal & Ghahramani, 2016, "Dropout as a Bayesian Approximation"). In eval()
        # mode (the default, used for the single deterministic prediction below),
        # nn.Dropout is a no-op, so this does NOT change the primary classification
        # output -- verified: predictions are bit-identical before and after this change
        # across repeated eval-mode passes. It only introduces stochasticity during the
        # explicit MC sampling passes, where dropout layers are deliberately set to
        # train() mode.
        self.mc_dropout_p = mc_dropout_p
        self.model.classifier = torch.nn.Sequential(
            torch.nn.Dropout(p=self.mc_dropout_p),
            self.model.classifier,
        )

        self.model.eval()
        self.device = torch.device(device) if device else "cuda"
        self.model = self.model.to(self.device)
        self.transform = torchvision.transforms.Compose([
            xrv.datasets.XRayCenterCrop(),
            xrv.datasets.XRayResizer(224, engine="cv2")
        ])

    def _process_image(self, image_path: str) -> torch.Tensor:
        """
        Process the input chest X-ray image for model inference.

        Handles 8-bit, 12-bit, 16-bit, RGBA with transparency, and EXIF orientations
        consistently without clipping or contrast distortion.

        Args:
            image_path (str): The file path to the chest X-ray image.

        Returns:
            torch.Tensor: A processed image tensor ready for model inference (1, 1, 224, 224).
        """
        image = Image.open(image_path)
        
        # 1. Correct EXIF orientation (handles smartphone and rotated captures)
        image = ImageOps.exif_transpose(image)
        
        # 2. Handle transparency/alpha channel by compositing onto black background
        if image.mode in ("RGBA", "LA") or (image.mode == "P" and "transparency" in image.info):
            image = image.convert("RGBA")
            background = Image.new("RGBA", image.size, (0, 0, 0, 255))
            image = Image.alpha_composite(background, image).convert("RGB")

        # 3. Convert to 2D numpy array preserving original bit depth
        if image.mode in ("I;16", "I;16B", "I;16L", "I;16N", "I", "F"):
            # Do NOT use image.convert('L') which clips all values > 255 to 255
            img = np.array(image, dtype=np.float32)
        elif image.mode == "RGB":
            # Luminance conversion
            arr = np.array(image, dtype=np.float32)
            img = 0.2989 * arr[:, :, 0] + 0.5870 * arr[:, :, 1] + 0.1140 * arr[:, :, 2]
        else:
            # Grayscale 'L'
            img = np.array(image.convert("L"), dtype=np.float32)

        # 4. Normalize to TorchXRayVision standard [-1024.0, 1024.0]
        img = preprocess_medical_image(img, target_range=(-1024.0, 1024.0), zero_anchored=True)

        # 5. Center-crop and resize to canonical 224x224
        img = img[None, :, :]
        if self.transform is not None:
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
                                           and any additional metadata.
        """
        with INFERENCE_LOCK:
            try:
                # Enforce strict determinism across CPU and GPU
                torch.manual_seed(42)
                if torch.cuda.is_available():
                    torch.cuda.manual_seed_all(42)
                np.random.seed(42)
                
                if self.model is None:
                    raise ValueError("TorchXRayVisionClassifierTool model has not been initialized.")
                self.model.eval()

                img = self._process_image(image_path)

                # --- standard inference ---
                with torch.inference_mode():
                    preds = self.model(img).cpu()[0]
                    
                # --- MC Dropout for Uncertainty ---
                # Enable ONLY dropout layers to prevent mutating BatchNorm running statistics
                torch.manual_seed(42)
                if torch.cuda.is_available():
                    torch.cuda.manual_seed_all(42)
                for m in self.model.modules():
                    if isinstance(m, torch.nn.Dropout):
                        m.train()
                mc_preds = []
                with torch.inference_mode():
                    for _ in range(5): # 5 passes for uncertainty estimation
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
                attr = ig.attribute(img, target=top_class_idx, n_steps=10)
                
                # generate heatmap image
                attr_np = np.abs(attr.squeeze().cpu().detach().numpy())
                # normalize for visualization
                attr_np = (attr_np - np.min(attr_np)) / (np.max(attr_np) - np.min(attr_np) + 1e-8)
                
                # overlay on anatomically aligned cropped original image
                orig_img = Image.open(image_path)
                orig_img = ImageOps.exif_transpose(orig_img).convert("L")
                w, h = orig_img.size
                min_dim = min(w, h)
                start_x = (w - min_dim) // 2
                start_y = (h - min_dim) // 2
                # Apply identical center crop so heatmap aligns with the anatomy
                cropped_orig = orig_img.crop((start_x, start_y, start_x + min_dim, start_y + min_dim))
                aligned_orig = cropped_orig.resize((attr_np.shape[1], attr_np.shape[0]), Image.Resampling.BILINEAR)
                orig_arr = np.array(aligned_orig) / 255.0
                
                cmap = plt.get_cmap("jet")
                heatmap = np.asarray(cmap(attr_np))[:, :, :3]
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
                    gc_heatmap = np.asarray(cmap(gc_attr_np))[:, :, :3]
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
                # Re-raise rather than returning an {"error": ...} dict shaped like a
                # normal (pathology_name -> probability) output. The previous behaviour
                # caused a confusing second failure: callers (e.g. api.py) iterate this
                # return value expecting float predictions, so float("<the error text>")
                # would raise a *different*, misleading ValueError that masked the real
                # root cause (e.g. a missing dependency such as captum, or a corrupted
                # image) behind "could not convert string to float: ...". Letting the
                # original exception propagate lets the caller's own error handling
                # report the actual cause.
                raise
            finally:
                plt.close('all')
                if 'attr' in locals():
                    del attr
                if 'gc_attr' in locals():
                    del gc_attr
                if 'img' in locals():
                    del img
                if 'mc_preds' in locals():
                    del mc_preds
                gc.collect()
                if torch.cuda.is_available():
                    torch.cuda.empty_cache()

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