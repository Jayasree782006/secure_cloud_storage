from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
from models.anomaly_model import engine

app = FastAPI(
    title="SentinelVault AI Anomaly Detection Microservice",
    description="Real-time multi-vector behavioral threat intelligence and zero-trust risk evaluation engine.",
    version="1.0.0"
)

# Enable CORS for frontend and backend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
def health_check():
    return {
        "status": "ONLINE",
        "service": "SentinelVault AI Threat Intelligence Engine",
        "model": "Isolation-Heuristic Multi-Vector Ensemble v2.4",
        "port": 8001
    }

@app.post("/evaluate-risk")
async def evaluate_risk(request: Request):
    try:
        metadata = await request.json()
    except:
        metadata = {}
    result = engine.evaluate_transaction(metadata)
    return result

@app.get("/metrics")
def get_metrics():
    return engine.get_system_metrics()

@app.post("/simulate-attack")
async def simulate_attack(request: Request):
    try:
        data = await request.json()
    except:
        data = {}
    
    attack_type = data.get("attackType", "MOSCOW_PROXY_FLOOD")
    user_id = data.get("userId", 1)
    username = data.get("username", "alice")

    metadata = {
        "userId": user_id,
        "username": username,
        "actionType": "SIMULATED_ATTACK_" + attack_type,
        "isSimulation": True
    }

    if attack_type == "NORMAL_NEW_YORK":
        metadata["location"] = "New York, USA"
        metadata["ipAddress"] = "203.0.113.1"
    elif attack_type == "MOSCOW_PROXY_FLOOD":
        metadata["location"] = "Moscow, Russia (Untrusted Security Zone)"
        metadata["ipAddress"] = "185.220.101.45"
    elif attack_type == "MIDNIGHT_RANSOMWARE_DEC_SPIKE":
        metadata["location"] = "Unknown Onion Proxy (Critical)"
        metadata["actionType"] = "FILE_DECRYPT_FAIL_BURST"
        metadata["timestamp"] = "2026-07-08T03:15:00Z"  # 3 AM
    elif attack_type == "IMPOSSIBLE_TRAVEL_TOKYO":
        metadata["location"] = "Tokyo, Japan"
        metadata["ipAddress"] = "109.70.100.12"
    elif attack_type == "VPN_TUNNEL_BERLIN":
        metadata["location"] = "Berlin, Germany"
        metadata["ipAddress"] = "185.100.87.202"
        metadata["actionType"] = "VPN_TUNNEL_ACCESS"
    elif attack_type == "BRUTE_FORCE_ATTACK":
        metadata["location"] = "Unknown Onion Proxy (Critical)"
        metadata["ipAddress"] = "185.220.100.240"
        metadata["actionType"] = "LOGIN_FAILED_BAD_PASSWORD"
        # Simulate multiple rapid failures
        for _ in range(12):
            engine.evaluate_transaction({
                **metadata,
                "actionType": "LOGIN_FAILED_BAD_PASSWORD"
            })
    elif attack_type == "PROXY_RELAY_CHAIN":
        metadata["location"] = "Moscow, Russia"
        metadata["ipAddress"] = "109.70.100.12"
        metadata["actionType"] = "MULTI_HOP_PROXY_RELAY"

    result = engine.evaluate_transaction(metadata)
    return {
        "status": "SUCCESS",
        "attackSimulated": attack_type,
        "aiResponse": result
    }

@app.get("/history")
def get_history():
    return {
        "status": "SUCCESS",
        "incidents": list(reversed(engine.incident_history[-50:]))
    }

if __name__ == "__main__":
    print("=============================================================")
    print("[SENTINELVAULT AI] ANOMALY DETECTION ENGINE STARTING...")
    print("[ONLINE] Listening on http://0.0.0.0:8001")
    print("=============================================================")
    uvicorn.run("app:app", host="0.0.0.0", port=8001, reload=False)
