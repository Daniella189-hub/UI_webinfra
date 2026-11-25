import json
import sys
import time
import urllib.parse
import urllib.request

MIRRORS = [
    "https://overpass.private.coffee/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
    "https://overpass-api.de/api/interpreter",
]

QUERY = (
    '[out:json][timeout:120];'
    'area["ISO3166-1"="RW"][admin_level=2]->.rw;'
    'nwr["amenity"="hospital"](area.rw);'
    'out tags center;'
)

HEADERS = { "user-agent": "Labelens-student-project (https://www.nishimwe.tech)"}

def fetch(url):
    body = urllib.parse.urlencode({"data": QUERY}).encode()
    request = urllib.request.Request(url, data=body, headers=HEADERS)
    with urllib.request.urlopen(request, timeout=150) as response:
        data = json.load(response)
    if not isinstance(data.get("elements"), list):
        raise ValueError("the server sent an unexpected answer")
    return data

def main ():
    for round_number in range(1,4):
        for url in MIRRORS:
            print(f"Round {round_number}: asking {url} ...", flush=True)
            try:
                data =fetch(url)
            except Exception as error:
                print(f" failed:{error}")
                continue
            named = [item for item in data["elements"] if item.get("tags", {}).get("name")]
            if not named:
                print(" answered, but no named hospitals. Trying the next server")
                continue
            with open("hospitals.json", "w", encoding="utf-8") as file:
               json.dump(data, file, ensure_ascii=False)
            print(f"Saved hospitals.json with {len(data['elements'])} places ({len(named)} have names).")
            return 0

        if round_number < 3:
            print("Every server failed. Waiting 20 seconds, then trying again...", flush=True)
            time.sleep(20)

    print("Could not download the hospitals. The public servers are busy. Try again in a few minutes.")
    return 1


if __name__ == "__main__":
    sys.exit(main()) 