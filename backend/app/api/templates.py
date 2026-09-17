from typing import List, Dict, Any
from fastapi import APIRouter
from app.services.styling.presets import STYLE_PRESETS
from app.services.styling.templates import DEFAULT_TEMPLATES
from app.schemas.schemas import TemplateResponse

router = APIRouter(tags=["templates"])

@router.get("/templates", response_model=List[TemplateResponse])
def get_templates():
    return DEFAULT_TEMPLATES

@router.get("/presets")
def get_presets():
    return [
        {
            "id": k,
            "name": v["name"],
            "description": v["description"],
            "config": v
        }
        for k, v in STYLE_PRESETS.items()
    ]

@router.get("/recommend-style/{category}")
def recommend_style(category: str) -> Dict[str, Any]:
    cat = category.lower().strip()
    if "podcast" in cat or "interview" in cat:
        return {"preset": "Modern", "reason": "Balanced readability for speech and discussion", "config": STYLE_PRESETS["Modern"]}
    elif "gaming" in cat or "stream" in cat:
        return {"preset": "Viral", "reason": "High-energy bold uppercase captions with pop animation", "config": STYLE_PRESETS["Viral"]}
    elif "motivat" in cat or "gym" in cat or "fitness" in cat:
        return {"preset": "Bold", "reason": "Heavy contrast typography with punchy highlight emphasis", "config": STYLE_PRESETS["Bold"]}
    elif "cinema" in cat or "docu" in cat or "film" in cat:
        return {"preset": "Cinematic", "reason": "Warm golden glow with elegant serif pacing", "config": STYLE_PRESETS["Cinematic"]}
    elif "business" in cat or "saas" in cat or "edu" in cat:
        return {"preset": "Clean", "reason": "Crisp professional captions with subtle underline", "config": STYLE_PRESETS["Clean"]}
    else:
        return {"preset": "Modern", "reason": "All-around crisp modern styling", "config": STYLE_PRESETS["Modern"]}

