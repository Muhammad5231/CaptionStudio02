import pytest
from fastapi.testclient import TestClient
import sys
from pathlib import Path

# Add backend directory to sys.path
backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

from app.main import app
from app.services.grouping.engine import grouping_engine
from app.services.subtitle_parser.parser import subtitle_parser
from app.services.rendering.ass_generator import ass_generator

client = TestClient(app)

def test_health_check():
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["ffmpeg_available"] is True

def test_presets_endpoint():
    response = client.get("/api/presets")
    assert response.status_code == 200
    presets = response.json()
    assert len(presets) >= 6
    names = [p["id"] for p in presets]
    assert "Modern" in names
    assert "Viral" in names
    assert "Minimal" in names
    assert "Cinematic" in names
    assert "Bold" in names
    assert "Clean" in names

def test_templates_endpoint():
    response = client.get("/api/templates")
    assert response.status_code == 200
    templates = response.json()
    assert len(templates) > 0

def test_projects_crud():
    # 1. Create project
    create_res = client.post("/api/projects", json={"name": "Test Video Project", "style_preset": "Modern"})
    assert create_res.status_code == 201
    project = create_res.json()
    proj_id = project["id"]
    assert project["name"] == "Test Video Project"
    assert project["style_preset"] == "Modern"

    # 2. Get project
    get_res = client.get(f"/api/projects/{proj_id}")
    assert get_res.status_code == 200
    assert get_res.json()["id"] == proj_id

    # 3. Update project
    update_res = client.put(f"/api/projects/{proj_id}", json={
        "name": "Updated Project Name",
        "style_preset": "Viral",
        "captions": [
            {
                "id": "seg-1",
                "start": 0.0,
                "end": 2.0,
                "text": "Hello World",
                "words": [
                    {"text": "Hello", "start": 0.0, "end": 0.8},
                    {"text": "World", "start": 0.9, "end": 2.0}
                ]
            }
        ]
    })
    assert update_res.status_code == 200
    updated = update_res.json()
    assert updated["name"] == "Updated Project Name"
    assert updated["style_preset"] == "Viral"
    assert len(updated["captions"]) == 1

    # 4. Duplicate project
    dup_res = client.post(f"/api/projects/{proj_id}/duplicate")
    assert dup_res.status_code == 200
    dup = dup_res.json()
    assert dup["name"] == "Updated Project Name (Copy)"
    assert dup["id"] != proj_id

    # 5. Delete project
    del_res = client.delete(f"/api/projects/{proj_id}")
    assert del_res.status_code == 200

def test_grouping_engine():
    words = [
        {"text": "You", "start": 0.0, "end": 0.3},
        {"text": "don't", "start": 0.3, "end": 0.6},
        {"text": "need", "start": 0.6, "end": 0.9},
        {"text": "motivation", "start": 0.9, "end": 1.5},
        {"text": "every", "start": 1.6, "end": 1.9},
        {"text": "day.", "start": 1.9, "end": 2.4}
    ]
    grouped = grouping_engine.group_words(words, max_words_per_line=3)
    assert len(grouped) == 2
    assert grouped[0]["text"] == "You don't need"
    assert grouped[1]["text"] == "motivation every day."

def test_subtitle_parser_srt():
    srt_data = """1
00:00:01,000 --> 00:00:03,500
Build something users love.

2
00:00:03,600 --> 00:00:06,000
Keep it simple.
"""
    segments = subtitle_parser.parse_srt(srt_data)
    assert len(segments) == 2
    assert segments[0]["start"] == 1.0
    assert segments[0]["end"] == 3.5
    assert segments[0]["text"] == "Build something users love."
    assert len(segments[0]["words"]) == 4

def test_ass_generator():
    captions = [
        {
            "id": "seg-1",
            "start": 1.0,
            "end": 2.5,
            "text": "Make captions pop",
            "words": [
                {"text": "Make", "start": 1.0, "end": 1.4},
                {"text": "captions", "start": 1.4, "end": 1.9},
                {"text": "pop", "start": 1.9, "end": 2.5}
            ]
        }
    ]
    style = {
        "font_family": "Arial",
        "font_size": 48,
        "text_color": "#FFFFFF",
        "highlight_color": "#38BDF8",
        "outline_width": 2
    }
    ass_text = ass_generator.generate(captions, style)
    assert "[Script Info]" in ass_text
    assert "[V4+ Styles]" in ass_text
    assert "[Events]" in ass_text
    assert "Dialogue:" in ass_text
    assert "Make" in ass_text

def test_create_sample_project():
    response = client.post("/api/demo/create-sample")
    assert response.status_code == 200
    data = response.json()
    assert "id" in data
    assert len(data["captions"]) >= 2
    assert data["style_preset"] == "Viral"

def test_frontend_serving():
    response = client.get("/")
    assert response.status_code == 200
    assert "CaptionStudio" in response.text

