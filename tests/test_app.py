import copy
import urllib.parse

import pytest
from httpx import AsyncClient

from src.app import app, activities


@pytest.fixture(autouse=True)
def reset_activities():
    # Preserve original in-memory activities and restore after each test
    original = copy.deepcopy(activities)
    yield
    activities.clear()
    activities.update(original)


@pytest.mark.asyncio
async def test_get_activities():
    async with AsyncClient(app=app, base_url="http://test") as ac:
        r = await ac.get("/activities")
    assert r.status_code == 200
    data = r.json()
    assert isinstance(data, dict)
    assert "Chess Club" in data


@pytest.mark.asyncio
async def test_signup_and_reflects_in_get():
    activity = "Chess Club"
    email = "tester@example.com"
    encoded = urllib.parse.quote(activity, safe="")
    async with AsyncClient(app=app, base_url="http://test") as ac:
        r = await ac.post(f"/activities/{encoded}/signup", params={"email": email})
        assert r.status_code == 200
        # verify GET shows the participant
        r2 = await ac.get("/activities")
        data = r2.json()
    assert email in data[activity]["participants"]


@pytest.mark.asyncio
async def test_duplicate_signup_rejected():
    activity = "Chess Club"
    email = "duplicate@example.com"
    encoded = urllib.parse.quote(activity, safe="")
    async with AsyncClient(app=app, base_url="http://test") as ac:
        r1 = await ac.post(f"/activities/{encoded}/signup", params={"email": email})
        assert r1.status_code == 200
        r2 = await ac.post(f"/activities/{encoded}/signup", params={"email": email})
    assert r2.status_code == 400
    assert "already" in r2.json().get("detail", "").lower()


@pytest.mark.asyncio
async def test_remove_participant_and_reflects_in_get():
    activity = "Chess Club"
    # use an existing participant from the seeded data
    email = activities[activity]["participants"][0]
    encoded = urllib.parse.quote(activity, safe="")
    async with AsyncClient(app=app, base_url="http://test") as ac:
        r = await ac.delete(f"/activities/{encoded}/participants", params={"email": email})
        assert r.status_code == 200
        # verify GET shows the participant removed
        r2 = await ac.get("/activities")
        data = r2.json()
    assert email not in data[activity]["participants"]


@pytest.mark.asyncio
async def test_remove_nonexistent_participant_returns_400():
    activity = "Chess Club"
    email = "not-registered@example.com"
    encoded = urllib.parse.quote(activity, safe="")
    async with AsyncClient(app=app, base_url="http://test") as ac:
        r = await ac.delete(f"/activities/{encoded}/participants", params={"email": email})
    assert r.status_code == 400


@pytest.mark.asyncio
async def test_signup_nonexistent_activity_returns_404():
    activity = "Nonexistent Activity"
    email = "someone@example.com"
    encoded = urllib.parse.quote(activity, safe="")
    async with AsyncClient(app=app, base_url="http://test") as ac:
        r = await ac.post(f"/activities/{encoded}/signup", params={"email": email})
    assert r.status_code == 404
