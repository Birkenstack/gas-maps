# gasmaps/routes/stations.py
import logging
from datetime import datetime, timezone

import requests
from flask import Blueprint, jsonify, request

from config import GOOGLE_MAPS_API_KEY
from ..models import Station
from ..db import db

print("🚨 LOADING stations.py FROM:", __file__)
stations_bp = Blueprint("stations", __name__, url_prefix="/stations")
logger = logging.getLogger(__name__)


def _sample_route():
    return {
        "id": "midland-to-austin",
        "title": "Midland → Austin",
        "summary": "Scenic 5-hour stretch across West Texas.",
        "durationMinutes": 320,
        "etaMinutes": 320,
        "distanceMiles": 345,
        "durationText": "5h 20m",
        "distanceText": "345 miles",
        "origin": {
            "label": "Midland Downtown",
            "coords": {"latitude": 31.9973, "longitude": -102.0779},
        },
        "destination": {
            "label": "Austin Capitol",
            "coords": {"latitude": 30.2672, "longitude": -97.7431},
        },
        "polyline": [
            {"latitude": 31.9973, "longitude": -102.0779},
            {"latitude": 31.8582, "longitude": -102.2985},
            {"latitude": 31.8455, "longitude": -102.3381},
        ],
        "path": [
            {"latitude": 31.9973, "longitude": -102.0779},
            {"latitude": 31.8582, "longitude": -102.2985},
            {"latitude": 31.8455, "longitude": -102.3381},
        ],
        "stops": [
            {
                "id": "odessa",
                "name": "Sunoco - Loop 338",
                "brand": "Sunoco",
                "city": "Odessa, TX",
                "price": "$2.89",
                "fuelBreakdown": {"regular": 2.89, "midgrade": 3.15, "premium": 3.39},
                "etaMinutes": 45,
                "distanceOffsetMiles": 0.5,
                "distanceMiles": 0.4,
                "lastUpdatedMinutes": 28,
                "isOpen": True,
                "rating": 4.7,
                "amenities": ["Restrooms", "Air & water"],
                "coordinates": {"latitude": 31.8455, "longitude": -102.3381},
            },
        ],
    }


SAMPLE_ROUTE = _sample_route()


def _sample_selected_stops():
    return [
        {
            "id": 1,
            "stopId": "odessa",
            "routeId": "midland-to-austin",
            "recordedAt": datetime.now(timezone.utc).isoformat(),
            "station": _sample_route()["stops"][0],
        }
    ]


def decode_polyline(encoded):
    index = 0
    lat = 0
    lng = 0
    coordinates = []

    while index < len(encoded):
        shift = 0
        result = 0
        while True:
            b = ord(encoded[index]) - 63
            index += 1
            result |= (b & 0x1F) << shift
            shift += 5
            if b < 0x20:
                break
        delta_lat = ~(result >> 1) if result & 1 else (result >> 1)
        lat += delta_lat

        shift = 0
        result = 0
        while True:
            b = ord(encoded[index]) - 63
            index += 1
            result |= (b & 0x1F) << shift
            shift += 5
            if b < 0x20:
                break
        delta_lng = ~(result >> 1) if result & 1 else (result >> 1)
        lng += delta_lng

        coordinates.append({
            "latitude": lat / 1e5,
            "longitude": lng / 1e5,
        })

    return coordinates

def _station_to_gasstop(station, distance_miles=0.0, offset_miles=0.0):
    latest = station.latest_price()
    last_updated_minutes = None
    price_value = None

    if latest:
        price_value = latest.price
        diff = datetime.now(timezone.utc) - latest.reported_at.replace(tzinfo=timezone.utc)
        last_updated_minutes = int(diff.total_seconds() // 60)

    return {
        "id": station.id,
        "name": station.name,
        "city": station.city,
        "state": station.state,
        "price": price_value,
        "distanceMiles": distance_miles,
        "distanceOffsetMiles": offset_miles,
        "latitude": station.latitude,
        "longitude": station.longitude,
        "isOpen": station.is_open,
        "lastUpdatedMinutes": last_updated_minutes,
    }


def _convert_location(raw):
    if not isinstance(raw, dict):
        return {}
    lat = raw.get("lat")
    lng = raw.get("lng")
    if lat is None or lng is None:
        return {}
    return {"latitude": lat, "longitude": lng}

@stations_bp.route("", methods=["GET"])
def list_stations():
    """
    Optional query params: lat, lng, radiusMiles
    For now we just ignore distance and return all stations.
    """
    stations = Station.query.all()
    data = [_station_to_gasstop(s) for s in stations]
    return jsonify(data)

@stations_bp.route("/<int:station_id>", methods=["GET"])
def get_station(station_id):
    station = Station.query.get_or_404(station_id)
    return jsonify(_station_to_gasstop(station))

@stations_bp.route("/route", methods=["GET"])
def get_route():
    origin = request.args.get("origin") or "Midland, TX"
    destination = request.args.get("destination") or "Austin, TX"

    try:
        params = {
            "origin": origin,
            "destination": destination,
            "key": GOOGLE_MAPS_API_KEY,
            "mode": "driving",
        }

        if GOOGLE_MAPS_API_KEY:
            try:
                resp = requests.get(
                    "https://maps.googleapis.com/maps/api/directions/json",
                    params=params,
                    timeout=8,
                )
                resp.raise_for_status()
                data = resp.json()

                status = data.get("status")
                print("Directions status:", status)

                routes = data.get("routes") or []
                if status == "OK" and routes:
                    leg = (routes[0].get("legs") or [{}])[0]
                    distance = (leg.get("distance") or {})
                    duration = (leg.get("duration") or {})

                    print("Distance (m):", distance.get("value"))
                    print("Duration (s):", duration.get("value"))

                    return jsonify(
                        {
                            "status": status,
                            "origin": origin,
                            "destination": destination,
                            "distanceMeters": distance.get("value"),
                            "durationSeconds": duration.get("value"),
                            "distanceText": distance.get("text"),
                            "durationText": duration.get("text"),
                            "startLocation": leg.get("start_location"),
                            "endLocation": leg.get("end_location"),
                            "overviewPolyline": routes[0]
                            .get("overview_polyline", {})
                            .get("points"),
                        }
                    ), 200

                print("Directions missing or not OK:", status)
            except Exception as exc:  # noqa: BLE001
                print("Google Directions request failed:", exc)

        return jsonify(SAMPLE_ROUTE), 200
    except Exception as exc:  # noqa: BLE001
        logger.exception("Failed to build route response: %s", exc)
        return jsonify({"error": "Internal server error"}), 500

@stations_bp.route("/selected", methods=["GET", "POST"])
def selected_stations():
    try:
        if request.method == "POST":
            data = request.get_json() or {}
            stop_id = data.get("stopId")
            route_id = data.get("routeId")
            logger.info("Selected stop %s for route %s", stop_id, route_id)
            # In a real app, persist this selection.

        return jsonify(_sample_selected_stops()), 200
    except Exception as exc:  # noqa: BLE001
        logger.exception("Failed to handle selected stops: %s", exc)
        return jsonify({"error": "Internal server error"}), 500


@stations_bp.route("/selected/<int:selection_id>", methods=["DELETE"])
def delete_selected_station(selection_id: int):
    try:
        logger.info("Removing selected stop id %s", selection_id)
        # In a real app, remove the record from persistence.
        return jsonify({"status": "ok", "id": selection_id}), 200
    except Exception as exc:  # noqa: BLE001
        logger.exception("Failed to delete selected stop: %s", exc)
        return jsonify({"error": "Internal server error"}), 500
