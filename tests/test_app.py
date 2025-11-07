import copy
from fastapi.testclient import TestClient
import pytest

from src import app as app_module
from src.app import app, activities


@pytest.fixture(autouse=True)
def restore_activities():
    """Save and restore the in-memory activities dict between tests."""
    orig = copy.deepcopy(activities)
    yield
    # restore original state
    activities.clear()
    activities.update(orig)


def test_get_activities():
    client = TestClient(app)
    resp = client.get("/activities")
    assert resp.status_code == 200
    data = resp.json()
    # basic sanity checks
    assert isinstance(data, dict)
    assert "Chess Club" in data


def test_signup_and_unregister_flow():
    client = TestClient(app)
    activity = "Chess Club"
    email = "teststudent@example.com"

    # ensure email not present initially
    assert email not in activities[activity]["participants"]

    # sign up
    resp = client.post(f"/activities/{activity}/signup", params={"email": email})
    assert resp.status_code == 200
    body = resp.json()
    assert "Signed up" in body.get("message", "")

    # verify participant added via GET
    resp = client.get("/activities")
    assert resp.status_code == 200
    data = resp.json()
    assert email in data[activity]["participants"]

    # unregister
    resp = client.post(f"/activities/{activity}/unregister", params={"email": email})
    assert resp.status_code == 200
    body = resp.json()
    assert "Unregistered" in body.get("message", "")

    # verify participant removed
    resp = client.get("/activities")
    assert resp.status_code == 200
    data = resp.json()
    assert email not in data[activity]["participants"]
