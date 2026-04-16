import os
import requests
import time
import csv
import json

API_KEY = os.getenv("APIFY_API_TOKEN")

if not API_KEY:
    raise Exception("Error: la variable de entorno APIFY_API_TOKEN no está configurada.")

# SCRAPER OFICIAL DE APIFY
ACTOR_ID = "nwua9Gu5YrADL7ZDj"

def ejecutar_scraper():
    print("\n=== Google Maps Scraper OFICIAL ===\n")

    search = input("Categoría o búsqueda (ej: restaurants, shops, offices): ")
    city = input("Ciudad o zona (ej: Asti, Torino, Milano): ")

    # Coordenadas de Asti
    lat = 44.9000
    lng = 8.2000
    zoom = 14

    # URL precisa de Google Maps
    maps_url = f"https://www.google.com/maps/search/{search}/@{lat},{lng},{zoom}z"

    # INPUT OFICIAL
    input_data = {
        "startUrls": [
            {"url": maps_url}
        ],
        "maxCrawledPlaces": 200,
        "language": "it",
        "maxReviews": 0,
        "includeHistogram": False,
        "includeImages": False,
        "includePeopleAlsoSearch": False,
        "includeOpeningHours": True
    }

    print("\nIniciando scraper oficial...")
    run_url = f"https://api.apify.com/v2/acts/{ACTOR_ID}/runs?token={API_KEY}"
    run = requests.post(run_url, json=input_data).json()

    if "data" not in run:
        print("\n❌ ERROR: Apify no devolvió 'data'")
        print("Respuesta completa:")
        print(run)
        return

    run_id = run["data"]["id"]
    print(f"Run ID: {run_id}")

    # Esperar a que el scraper termine
    while True:
        status_url = f"https://api.apify.com/v2/actor-runs/{run_id}"
        status = requests.get(status_url).json()

        if "data" not in status:
            print("\n❌ ERROR: Apify no devolvió 'data' en status")
            print("Respuesta completa:")
            print(status)
            return

        estado = status["data"]["status"]
        print(f"Estado actual: {estado}")

        if estado in ["SUCCEEDED", "FAILED"]:
            break

        time.sleep(3)

    if estado == "FAILED":
        raise Exception("El scraper falló.")

    dataset_id = status["data"]["defaultDatasetId"]
    dataset_url = f"https://api.apify.com/v2/datasets/{dataset_id}/items?token={API_KEY}"

    print("\nDescargando datos...")
    data = requests.get(dataset_url).json()

    # Guardar JSON
    with open("resultados.json", "w", encoding="utf-8") as f:
        json.dump(data, f, indent=4, ensure_ascii=False)

    # Guardar CSV
    with open("resultados.csv", "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow([
            "Nombre", "Teléfono", "Dirección",
            "Lat", "Lng", "Rating", "Reseñas", "Horarios"
        ])

        for p in data:

            # Formatear horarios correctamente
            format_hours = ""
            if p.get("openingHours"):
                try:
                    format_hours = " | ".join(
                        f"{h.get('day', '')}: {h.get('hours', '')}"
                        for h in p["openingHours"]
                        if isinstance(h, dict)
                    )
                except:
                    format_hours = ""

            writer.writerow([
                p.get("title"),
                p.get("phone"),
                p.get("address"),
                p.get("location", {}).get("lat"),
                p.get("location", {}).get("lng"),
                p.get("totalScore"),
                p.get("reviewsCount"),
                format_hours
            ])

    print("\n=== PROCESO COMPLETADO ===")
    print("Archivos generados:")
    print(" - resultados.json")
    print(" - resultados.csv\n")

ejecutar_scraper()
