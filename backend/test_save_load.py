import os
from main import app, FactorsRequest, FactorItem, ProjectSaveRequest
from fastapi.testclient import TestClient
client = TestClient(app)

def test_save_and_load():
    print("--- Starting Save/Load Test ---")
    
    # 1. 테스트 데이터 준비
    proj_name = "Test_Project_123"
    factors = [
        {"key": "temp", "name": "Temperature", "min": 100, "max": 200, "unit": "C"},
        {"key": "time", "name": "Time", "min": 10, "max": 30, "unit": "min"}
    ]
    runs = [
        {"runOrder": 1, "factor_values": {"temp": 100, "time": 10}, "yieldVal": 85.5},
        {"runOrder": 2, "factor_values": {"temp": 200, "time": 30}, "yieldVal": 92.1}
    ]
    
    # 2. 저장 요청
    print(f"Saving project: {proj_name}")
    save_payload = {
        "name": proj_name,
        "industry": "테스트",
        "factors": factors,
        "runs": runs
    }
    
    try:
        resp = client.post("/api/projects", json=save_payload)
        if resp.status_code != 200:
            print(f"Save failed: {resp.text}")
            return
        
        project_id = resp.json()["id"]
        print(f"Save success! Project ID: {project_id}")
        
        # 3. 로드 테스트
        print(f"Loading project: {project_id}")
        resp_load = client.get(f"/api/projects/{project_id}")
        if resp_load.status_code == 200:
            data = resp_load.json()
            print(f"Load success! Project Name: {data['project']['name']}")
            print(f"Factors loaded: {len(data['factors'])}")
            print(f"Runs loaded: {len(data['runs'])}")
        else:
            print(f"Load failed: {resp_load.text}")
            
        # 4. 삭제 (정리)
        # client.delete(f"/api/projects/{project_id}")
        
    except Exception as e:
        print(f"Test error: {e}")

if __name__ == "__main__":
    test_save_and_load()
