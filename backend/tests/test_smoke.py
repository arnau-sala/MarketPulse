"""
Smoke tests — verify that the backend starts correctly and key endpoints respond.

Run from the backend/ directory:
    python -m pytest tests/test_smoke.py -v

No data files required — all endpoints fall back to mock data gracefully.
"""

import sys
import pathlib

# Make sure the backend package is importable
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1]))

import pytest
from fastapi.testclient import TestClient


@pytest.fixture(scope="module")
def client():
    """Import app.main only once — verifies it loads without Groq being called."""
    from app.main import app
    return TestClient(app)


def test_app_imports_without_groq():
    """Backend must start even if groq is not installed / configured."""
    from app.main import app  # noqa: F401 — just checking import succeeds


def test_health(client):
    res = client.get("/api/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "ok"


def test_forecast_returns_list(client):
    res = client.get("/api/forecast?horizon=6")
    assert res.status_code == 200
    data = res.json()
    assert isinstance(data, list)
    assert len(data) > 0


def test_metrics_coherent(client):
    res = client.get("/api/metrics")
    assert res.status_code == 200
    m = res.json()
    # Gap = forecast - target (should be negative for At Risk)
    assert m["expectedGap"] == m["baselineForecast"] - m["monthlyTarget"]
    assert 0 <= m["hitProbability"] <= 100
    assert m["status"] in ("On Track", "At Risk", "Critical", "Ahead")


def test_gap_drivers_sum(client):
    res = client.get("/api/gap-drivers")
    assert res.status_code == 200
    drivers = res.json()
    assert isinstance(drivers, list)
    assert len(drivers) > 0
    total_impact = sum(d["impact"] for d in drivers)
    # Sum should roughly match expectedGap (within 5% tolerance)
    metrics = client.get("/api/metrics").json()
    assert abs(total_impact - metrics["expectedGap"]) / abs(metrics["expectedGap"]) < 0.05


def test_simulate_returns_impact(client):
    res = client.post("/api/simulate", json={
        "intensity": "Medium",
        "channel": "Off-Trade",
        "brand": "Estrella Damm",
        "week": "Week 3",
    })
    assert res.status_code == 200
    data = res.json()
    assert data["incrementalImpact"] > 0
    assert data["newForecast"] > data["incrementalImpact"]


def test_briefing_never_503(client):
    """Briefing must return 200 even without a valid GROQ_API_KEY."""
    res = client.post("/api/briefing", json={"context": {
        "month": "May 2026",
        "salesToDate": 742000,
        "monthlyTarget": 1200000,
        "expectedGap": -120000,
        "status": "At Risk",
    }})
    assert res.status_code == 200
    data = res.json()
    assert "text" in data
    assert len(data["text"]) > 20  # not empty


def test_backtest_returns_metrics(client):
    res = client.get("/api/backtest")
    assert res.status_code == 200
    data = res.json()
    assert "mape" in data
    assert "wape" in data
    assert data["mape"] > 0
