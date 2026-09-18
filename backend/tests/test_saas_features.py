import uuid
import pytest
from fastapi.testclient import TestClient
import sys
from pathlib import Path

backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

from app.main import app

client = TestClient(app)

def test_auth_registration_and_login():
    unique_email = f"sarah_{uuid.uuid4().hex[:8]}@test.com"
    reg_payload = {
        "name": "Sarah Connor",
        "email": unique_email,
        "password": "SecurePassword123!"
    }
    reg_res = client.post("/api/v1/auth/register", json=reg_payload)
    assert reg_res.status_code == 201, reg_res.text
    data = reg_res.json()
    assert "access_token" in data
    assert data["user"]["email"] == unique_email
    token = data["access_token"]

    # 2. Duplicate registration fails
    dup_res = client.post("/api/v1/auth/register", json=reg_payload)
    assert dup_res.status_code == 400

    # 3. Login
    login_res = client.post("/api/v1/auth/login", json={
        "email": unique_email,
        "password": "SecurePassword123!"
    })
    assert login_res.status_code == 200
    assert "access_token" in login_res.json()

    # 4. Profile with token
    me_res = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me_res.status_code == 200
    assert me_res.json()["name"] == "Sarah Connor"

def test_idor_protection():
    email_a = f"alice_{uuid.uuid4().hex[:8]}@test.com"
    email_b = f"bob_{uuid.uuid4().hex[:8]}@test.com"

    # Register User A
    res_a = client.post("/api/v1/auth/register", json={
        "name": "Alice User",
        "email": email_a,
        "password": "Password123!"
    })
    token_a = res_a.json()["access_token"]

    # Register User B
    res_b = client.post("/api/v1/auth/register", json={
        "name": "Bob User",
        "email": email_b,
        "password": "Password123!"
    })
    token_b = res_b.json()["access_token"]

    # User A creates a project
    create_res = client.post(
        "/api/v1/projects",
        json={"name": "Alice Secret Project", "style_preset": "Modern"},
        headers={"Authorization": f"Bearer {token_a}"}
    )
    assert create_res.status_code == 201
    project_id = create_res.json()["id"]

    # User B tries to view Alice's project -> MUST return 404 (IDOR immune)
    get_res = client.get(
        f"/api/v1/projects/{project_id}",
        headers={"Authorization": f"Bearer {token_b}"}
    )
    assert get_res.status_code == 404, "IDOR Vulnerability: User B accessed User A's project!"

    # User B tries to update Alice's project -> MUST return 404
    update_res = client.put(
        f"/api/v1/projects/{project_id}",
        json={"name": "Hacked Title"},
        headers={"Authorization": f"Bearer {token_b}"}
    )
    assert update_res.status_code == 404

    # User B tries to delete Alice's project -> MUST return 404
    del_res = client.delete(
        f"/api/v1/projects/{project_id}",
        headers={"Authorization": f"Bearer {token_b}"}
    )
    assert del_res.status_code == 404

    # User A can access their own project
    own_res = client.get(
        f"/api/v1/projects/{project_id}",
        headers={"Authorization": f"Bearer {token_a}"}
    )
    assert own_res.status_code == 200
    assert own_res.json()["id"] == project_id

def test_admin_authorization_and_audit():
    # User tries to access admin API -> 401 or 403
    member_email = f"member_{uuid.uuid4().hex[:8]}@test.com"
    res_reg = client.post("/api/v1/auth/register", json={
        "name": "Regular Member",
        "email": member_email,
        "password": "Password123!"
    })
    token_user = res_reg.json()["access_token"]

    forbidden_res = client.get(
        "/api/v1/admin/overview",
        headers={"Authorization": f"Bearer {token_user}"}
    )
    assert forbidden_res.status_code == 403, "Security violation: Non-admin accessed admin overview!"

    # Default admin login
    admin_login = client.post("/api/v1/auth/login", json={
        "email": "admin@captionstudio.com",
        "password": "Admin12345!"
    })
    assert admin_login.status_code == 200
    token_admin = admin_login.json()["access_token"]

    # Admin access overview
    admin_res = client.get(
        "/api/v1/admin/overview",
        headers={"Authorization": f"Bearer {token_admin}"}
    )
    assert admin_res.status_code == 200
    overview = admin_res.json()
    assert "total_users" in overview
    assert overview["total_users"] >= 2

    # Admin users list
    users_res = client.get(
        "/api/v1/admin/users",
        headers={"Authorization": f"Bearer {token_admin}"}
    )
    assert users_res.status_code == 200
    assert len(users_res.json()) >= 2

    # Admin health check
    health_res = client.get(
        "/api/v1/admin/health",
        headers={"Authorization": f"Bearer {token_admin}"}
    )
    assert health_res.status_code == 200
    assert health_res.json()["database_connected"] is True

def test_multilingual_tracks_and_activation():
    # Create project with sample captions
    create_res = client.post(
        "/api/v1/projects",
        json={"name": "Multi-Track Test", "style_preset": "Modern"}
    )
    proj_id = create_res.json()["id"]

    # Update with initial captions
    sample_caps = [
        {"id": "seg-1", "start": 0.0, "end": 2.0, "text": "Good morning world", "words": []}
    ]
    client.put(f"/api/v1/projects/{proj_id}", json={"captions": sample_caps})

    # Translate to Spanish
    trans_res = client.post(
        f"/api/v1/projects/{proj_id}/translate",
        json={"target_language": "es"}
    )
    assert trans_res.status_code == 200
    trans_data = trans_res.json()
    assert "track_id" in trans_data

    # Verify multiple tracks exist now
    tracks_res = client.get(f"/api/v1/projects/{proj_id}/tracks")
    assert tracks_res.status_code == 200
    tracks = tracks_res.json()
    assert len(tracks) >= 2
    languages = [t["language"] for t in tracks]
    assert "en" in languages
    assert "es" in languages

    # Switch active track back to English original
    orig_track = next(t for t in tracks if t["language"] == "en")
    act_res = client.post(f"/api/v1/projects/{proj_id}/tracks/{orig_track['id']}/activate")
    assert act_res.status_code == 200
    assert act_res.json()["active_track_id"] == orig_track["id"]

def test_usage_summary():
    # Register a user
    quota_email = f"quota_{uuid.uuid4().hex[:8]}@test.com"
    res = client.post("/api/v1/auth/register", json={
        "name": "Quota User",
        "email": quota_email,
        "password": "Password123!"
    })
    token = res.json()["access_token"]

    usage_res = client.get(
        "/api/v1/usage/me",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert usage_res.status_code == 200
    usage = usage_res.json()
    assert "transcription_minutes_used" in usage
    assert "exports_count_limit" in usage
    assert usage["plan_id"] == "free"

def test_export_cancellation():
    from app.services.projects.job_manager import job_manager
    from app.core.database import SessionLocal

    # 1. Create project
    create_res = client.post("/api/v1/projects", json={"name": "Cancel Export Project"})
    proj_id = create_res.json()["id"]

    # 2. Create job in queued state
    db = SessionLocal()
    job = job_manager.create_job(db, proj_id)
    job_id = job.id
    db.close()

    # 3. Cancel export via API
    cancel_res = client.post(f"/api/v1/jobs/{job_id}/cancel")
    assert cancel_res.status_code == 200
    assert cancel_res.json()["status"] == "cancelled"

    # 4. Verify status
    status_res = client.get(f"/api/v1/jobs/{job_id}")
    assert status_res.status_code == 200
    assert status_res.json()["status"] == "cancelled"

