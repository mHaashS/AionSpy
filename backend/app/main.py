from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import requests

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"message": "AionSpy fonctionne"}

TW_BASE_URL = "https://tw.ncsoft.com/aion2"
KR_BASE_URL = "https://kr.ncsoft.com/aion2"

@app.get("/api/search/{character_name}")
def search_character_tw(character_name: str):
    headers = {"User-Agent": "Mozilla/5.0"}
    url = f"{TW_BASE_URL}/api/search/aion2tw/search/v2/character?keyword={character_name}"
    print(url)
    try:
        response = requests.get(url, timeout=10, headers=headers)
        response.raise_for_status()
        return response.json()
    except requests.exceptions.Timeout:
        return {"error": "Request timed out"}
    except requests.exceptions.RequestException as e:
        return {"error": str(e)}


@app.get("/api/character_info")
def get_character_info(character_id: str, server_id: int):
    headers = {"User-Agent": "Mozilla/5.0"}
    url = f"{TW_BASE_URL}/api/character/info?lang=en&characterId={character_id}&serverId={server_id}"
    print(url)
    try:
        response = requests.get(url, timeout=10, headers=headers)
        response.raise_for_status()
        return response.json()
    except requests.exceptions.Timeout:
        return {"error": "Request timed out"}
    except requests.exceptions.RequestException as e:
        return {"error": str(e)}


@app.get("/api/character_equipment")
def get_character_equipment(character_id: str, server_id: int):
    headers = {"User-Agent": "Mozilla/5.0"}
    url = f"{TW_BASE_URL}/api/character/equipment?lang=en&characterId={character_id}&serverId={server_id}"
    print(url)
    try:
        response = requests.get(url, timeout=10, headers=headers)
        response.raise_for_status()
        return response.json()
    except requests.exceptions.Timeout:
        return {"error": "Request timed out"}
    except requests.exceptions.RequestException as e:
        return {"error": str(e)}