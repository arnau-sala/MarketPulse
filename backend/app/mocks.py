"""
Centralised mock data for the MarketPulse UK API.

All numbers are coherent:
  - sum(driver.impact) == expectedGap == -120_000
  - balanced plan forecastAfterAction > monthlyTarget (gap closed)
  - backtest MAPE / WAPE are plausible for a weekly SKU model
"""

MOCK_METRICS = {
    "market": "UK",
    "month": "May 2026",
    "salesToDate": 742000,
    "monthlyTarget": 1200000,
    "baselineForecast": 1080000,
    "expectedGap": -120000,
    "hitProbability": 34,
    "status": "At Risk",
    "lastUpdated": "Today · 09:00",
}

MOCK_FORECAST = [
    {
        "date": "May 01",
        "actual": 38000,
        "target": 40000,
        "forecast": 38000,
        "actionForecast": None,
        "confidenceLow": 35000,
        "confidenceHigh": 41000,
    },
    {
        "date": "May 05",
        "actual": 112000,
        "target": 116000,
        "forecast": 112000,
        "actionForecast": None,
        "confidenceLow": 106000,
        "confidenceHigh": 118000,
    },
    {
        "date": "May 08",
        "actual": 185000,
        "target": 200000,
        "forecast": 188000,
        "actionForecast": None,
        "confidenceLow": 175000,
        "confidenceHigh": 200000,
    },
    {
        "date": "May 12",
        "actual": 290000,
        "target": 310000,
        "forecast": 295000,
        "actionForecast": None,
        "confidenceLow": 278000,
        "confidenceHigh": 312000,
    },
    {
        "date": "May 15",
        "actual": 410000,
        "target": 460000,
        "forecast": 415000,
        "actionForecast": None,
        "confidenceLow": 395000,
        "confidenceHigh": 440000,
    },
    {
        "date": "May 19",
        "actual": 542000,
        "target": 580000,
        "forecast": 550000,
        "actionForecast": None,
        "confidenceLow": 524000,
        "confidenceHigh": 575000,
    },
    {
        "date": "May 22",
        "actual": 620000,
        "target": 720000,
        "forecast": 640000,
        "actionForecast": 690000,
        "confidenceLow": 610000,
        "confidenceHigh": 670000,
    },
    {
        "date": "May 26",
        "actual": None,
        "target": 900000,
        "forecast": 820000,
        "actionForecast": 920000,
        "confidenceLow": 780000,
        "confidenceHigh": 860000,
    },
    {
        "date": "May 31",
        "actual": None,
        "target": 1200000,
        "forecast": 1080000,
        "actionForecast": 1216000,
        "confidenceLow": 1020000,
        "confidenceHigh": 1140000,
    },
]

# Sum of impacts: -52000 + -31000 + -24000 + -13000 = -120000 ✓
MOCK_GAP_DRIVERS = [
    {
        "name": "Off-Trade underperformance",
        "impact": -52000,
        "share": 43,
        "dimension": "Channel",
        "explanation": (
            "Off-Trade is trending below expected pace in the grocery multiple channel "
            "during the second half of the month. Footfall in key accounts dropped "
            "following adverse weather and competing promotions from rival lager brands."
        ),
    },
    {
        "name": "Voll-Damm slowdown",
        "impact": -31000,
        "share": 26,
        "dimension": "Brand",
        "explanation": (
            "Voll-Damm is below its historical May run-rate. The premium double malt segment "
            "has seen softer demand following a price adjustment and lower shelf visibility "
            "in key accounts."
        ),
    },
    {
        "name": "Promo uplift below expectation",
        "impact": -24000,
        "share": 20,
        "dimension": "Promotion",
        "explanation": (
            "Current promotional mechanics are generating lower incremental sales than "
            "comparable Spring campaigns. The multi-buy mechanic in Week 1–2 underperformed "
            "its predicted uplift by 22%."
        ),
    },
    {
        "name": "Weak Week 4 demand signal",
        "impact": -13000,
        "share": 11,
        "dimension": "Timing",
        "explanation": (
            "Forward-looking demand signals for the final week suggest below-average velocity, "
            "partly due to the Bank Holiday timing shift moving key demand to early June."
        ),
    },
]

MOCK_DEMAND_WINDOWS = [
    {
        "week": "Week 1",
        "baselineDemand": "High",
        "promoSensitivity": "Low",
        "opportunityScore": 42,
        "recommendation": "Maintain",
        "explanation": "High baseline demand, but customers are not incrementally responsive to additional promotions. Best to maintain current activity without incremental investment.",
    },
    {
        "week": "Week 2",
        "baselineDemand": "Medium",
        "promoSensitivity": "Medium",
        "opportunityScore": 58,
        "recommendation": "Monitor",
        "explanation": "Stable week with moderate opportunity. Weather improvement may lift Off-Trade, but insufficient lead-time for media or trade support.",
    },
    {
        "week": "Week 3",
        "baselineDemand": "High",
        "promoSensitivity": "High",
        "opportunityScore": 87,
        "recommendation": "Activate",
        "explanation": "Best window: strong demand, high promotional sensitivity and enough lead-time to affect the month closing. Mid-week point-of-sale and Off-Trade push will have maximum effect.",
    },
    {
        "week": "Week 4",
        "baselineDemand": "Low",
        "promoSensitivity": "High",
        "opportunityScore": 76,
        "recommendation": "Tactical Push",
        "explanation": "Lower baseline demand but consumers are very responsive to tactical commercial action. Pulling planned June promotions forward here can generate meaningful incremental revenue.",
    },
]

MOCK_ACTION_PLANS = [
    {
        "id": "conservative",
        "name": "Conservative Recovery",
        "label": "Low risk",
        "recommended": False,
        "goal": "Reduce the gap by 50%",
        "expectedImpact": 62000,
        "forecastAfterAction": 1142000,
        "remainingGap": -58000,
        "hitProbability": 52,
        "risk": "Low",
        "explanation": "A low-risk plan focused on one high-confidence lever. Suitable if the team has limited execution bandwidth or wants to minimise budget exposure.",
        "actions": [
            {
                "title": "Push Estrella Damm in Off-Trade (Week 3)",
                "week": "Week 3",
                "impact": 62000,
                "confidence": 82,
                "why": "Targets the largest gap driver — Off-Trade — using the brand with the strongest track record of incremental uplift in grocery multiples.",
            }
        ],
    },
    {
        "id": "balanced",
        "name": "Balanced Recovery",
        "label": "Recommended",
        "recommended": True,
        "goal": "Close the expected gap",
        "expectedImpact": 136000,
        "forecastAfterAction": 1216000,
        "remainingGap": 16000,
        "hitProbability": 74,
        "risk": "Medium",
        "explanation": "The best trade-off between impact, confidence and execution risk. Three coordinated actions targeting the top gap drivers during the strongest demand windows.",
        "actions": [
            {
                "title": "Push Estrella Damm in Off-Trade",
                "week": "Week 3",
                "impact": 58000,
                "confidence": 82,
                "why": "Off-Trade explains 43% of the expected gap and Week 3 is the strongest action window. Estrella Damm dominates this channel with consistently high promotional ROI.",
            },
            {
                "title": "Pull Promo B forward from Week 5 to Week 4",
                "week": "Week 4",
                "impact": 46000,
                "confidence": 71,
                "why": "Moves a planned June mechanic into May closing, bringing confirmed uplift into the current period. No additional budget required.",
            },
            {
                "title": "Increase focus on SKU-128 (Estrella Damm 660ml)",
                "week": "Week 3–4",
                "impact": 32000,
                "confidence": 65,
                "why": "SKU-128 shows strong incremental response in Spring campaigns and is currently underweighted in Off-Trade secondary placements.",
            },
        ],
    },
    {
        "id": "aggressive",
        "name": "Aggressive Recovery",
        "label": "High impact",
        "recommended": False,
        "goal": "Beat the monthly target",
        "expectedImpact": 184000,
        "forecastAfterAction": 1264000,
        "remainingGap": 64000,
        "hitProbability": 81,
        "risk": "High",
        "explanation": "A higher-risk plan that adds an Online flash activation to maximise the upside. Requires cross-functional execution across trade marketing and digital media.",
        "actions": [
            {
                "title": "Push Estrella Damm in Off-Trade",
                "week": "Week 3",
                "impact": 58000,
                "confidence": 82,
                "why": "Targets the largest gap driver with the highest-confidence lever.",
            },
            {
                "title": "Pull Promo B forward from Week 5 to Week 4",
                "week": "Week 4",
                "impact": 46000,
                "confidence": 71,
                "why": "Locks in confirmed promotional uplift before May closes.",
            },
            {
                "title": "Increase focus on SKU-128 (Estrella Damm 660ml)",
                "week": "Week 3–4",
                "impact": 32000,
                "confidence": 65,
                "why": "High incremental potential in Off-Trade secondary positions.",
            },
            {
                "title": "Online flash promo — Estrella Daura",
                "week": "Week 4",
                "impact": 48000,
                "confidence": 54,
                "why": "Captures demand from health-conscious and coeliac segment online. Lower confidence but adds meaningful upside if executed quickly.",
            },
        ],
    },
]

MOCK_BACKTEST = {
    "mape": 8.4,
    "wape": 7.1,
    "historicalForecastVsActual": [
        {"month": "Nov 2025", "actual": 1098000, "forecast": 1075000},
        {"month": "Dec 2025", "actual": 1305000, "forecast": 1270000},
        {"month": "Jan 2026", "actual": 952000,  "forecast": 980000},
        {"month": "Feb 2026", "actual": 1011000, "forecast": 998000},
        {"month": "Mar 2026", "actual": 1142000, "forecast": 1118000},
        {"month": "Apr 2026", "actual": 1205000, "forecast": 1187000},
    ],
    "counterfactualValue": 180000,
    "counterfactualExplanation": (
        "If MarketPulse had been active in the last 6 months, it would have detected the "
        "Q3 2025 gap 3 weeks earlier and recommended actions worth approximately £180,000 "
        "of recovered revenue."
    ),
}
