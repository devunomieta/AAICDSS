"""Visual Question Answering tools for medical images."""

from .llava_med import LlavaMedTool, LlavaMedInput
from .xray_vqa import CheXagentXRayVQATool, XRayVQAToolInput
try:
    from .medgemma.medgemma_client import MedGemmaAPIClientTool, MedGemmaVQAInput
    from .medgemma.medgemma_setup import setup_medgemma_env
except ImportError:
    MedGemmaAPIClientTool = None
    MedGemmaVQAInput = None
    setup_medgemma_env = None

__all__ = [
    "LlavaMedTool",
    "LlavaMedInput",
    "CheXagentXRayVQATool",
    "XRayVQAToolInput",
]
if MedGemmaAPIClientTool:
    __all__.extend(["MedGemmaAPIClientTool", "MedGemmaVQAInput", "setup_medgemma_env"])

