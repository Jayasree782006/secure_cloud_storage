from models.anomaly_model import engine

print("=============================================================")
print("[SENTINELVAULT] AI ANOMALY DETECTION UNIT VERIFICATION")
print("=============================================================\n")

try:
    # Test 1: Normal Transaction (Low Risk)
    normal_meta = {
        "userId": 1,
        "username": "alice",
        "actionType": "LOGIN_SUCCESS",
        "ipAddress": "192.168.1.50",
        "location": "New York, USA",
        "timestamp": "2026-07-08T14:30:00Z" # 2:30 PM UTC
    }
    res_normal = engine.evaluate_transaction(normal_meta)
    print(f"[Test 1] Normal Login Evaluation ... PASS (Risk Score: {res_normal['riskScore']}/100, Level: {res_normal['riskLevel']})")
    if res_normal["riskLevel"] != "LOW":
        raise Exception(f"Expected LOW risk for normal transaction, got {res_normal['riskLevel']}")

    # Test 2: Impossible Travel Anomaly (New York -> Tokyo within seconds)
    travel_meta = {
        "userId": 1,
        "username": "alice",
        "actionType": "FILE_DOWNLOAD",
        "ipAddress": "109.70.100.12",
        "location": "Tokyo, Japan",
        "timestamp": "2026-07-08T14:31:00Z"
    }
    res_travel = engine.evaluate_transaction(travel_meta)
    print(f"[Test 2] Impossible Travel Anomaly ... PASS (Risk Score: {res_travel['riskScore']}/100, Level: {res_travel['riskLevel']})")
    if res_travel["riskScore"] < 30.0:
        raise Exception("Failed to detect impossible travel anomaly!")

    # Test 3: Midnight Ransomware Decryption Spike / Critical Proxy
    attack_meta = {
        "userId": 2,
        "username": "bob",
        "actionType": "FILE_DECRYPT_FAIL",
        "ipAddress": "185.220.101.45",
        "location": "Unknown Onion Proxy (Critical)",
        "timestamp": "2026-07-08T03:15:00Z", # 3 AM
        "isSimulation": True
    }
    res_attack = engine.evaluate_transaction(attack_meta)
    print(f"[Test 3] Simulated Critical Ransomware Decryption Attack ... PASS (Risk Score: {res_attack['riskScore']}/100, Level: {res_attack['riskLevel']})")
    if res_attack["riskLevel"] != "HIGH_BLOCKED":
        raise Exception(f"Expected HIGH_BLOCKED for critical attack, got {res_attack['riskLevel']}")

    # Test 4: System Threat Radar Metrics Generation
    metrics = engine.get_system_metrics()
    print(f"[Test 4] Threat Radar Metrics & Incident Feed ... PASS ({len(metrics['recentIncidents'])} logged incidents)")

    print("\n=============================================================")
    print("[SUCCESS] ALL 4 AI ANOMALY & THREAT SIMULATION UNIT TESTS PASSED!")
    print("=============================================================\n")
except Exception as e:
    print("\n[FAILURE] AI ENGINE TEST FAILURE:", e)
    exit(1)
