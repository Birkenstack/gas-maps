# gasmaps/routes/stations.py
import logging
import os
import re
from datetime import datetime, timezone, timedelta
from typing import Any, Dict, Iterable, List, Optional, Tuple

import requests
from flask import Blueprint, jsonify, request

from config import GOOGLE_MAPS_API_KEY
from ..models import Station

print("🚨 LOADING stations.py FROM:", __file__)
stations_bp = Blueprint("stations", __name__, url_prefix="/stations")
logger = logging.getLogger(__name__)
COLLECTAPI_KEY = os.getenv("COLLECTAPI_KEY") or os.getenv("COLLECT_API_KEY")


# Keep the baked-in Midland → Austin route for demo reliability.
SAMPLE_STOPS: List[Dict[str, Any]] = [
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
    {
        "id": "big-spring",
        "name": "Chevron - I-20 Frontage",
        "brand": "Chevron",
        "city": "Big Spring, TX",
        "price": "$3.01",
        "fuelBreakdown": {"regular": 3.01, "midgrade": 3.29, "premium": 3.55},
        "etaMinutes": 98,
        "distanceOffsetMiles": 0.2,
        "distanceMiles": 0.6,
        "lastUpdatedMinutes": 42,
        "isOpen": True,
        "rating": 4.5,
        "amenities": ["Rewards eligible", "Restrooms"],
        "coordinates": {"latitude": 32.2501, "longitude": -101.4789},
    },
    {
        "id": "abilene",
        "name": "Buc-ee's",
        "brand": "Buc-ee's",
        "city": "Abilene, TX",
        "price": "$2.95",
        "fuelBreakdown": {"regular": 2.95, "midgrade": 3.22, "premium": 3.48},
        "etaMinutes": 160,
        "distanceOffsetMiles": 1.1,
        "distanceMiles": 1.2,
        "lastUpdatedMinutes": 15,
        "isOpen": True,
        "rating": 4.9,
        "amenities": ["Food court", "Restrooms", "EV charging"],
        "coordinates": {"latitude": 32.4473, "longitude": -99.7389},
        "note": "Popular stop — plan for weekend crowds",
    },
    {
        "id": "lampasas",
        "name": "Shell - US-183",
        "brand": "Shell",
        "city": "Lampasas, TX",
        "price": "$3.05",
        "fuelBreakdown": {"regular": 3.05, "midgrade": 3.32, "premium": 3.59},
        "etaMinutes": 235,
        "distanceOffsetMiles": 0.7,
        "distanceMiles": 0.3,
        "lastUpdatedMinutes": 70,
        "isOpen": False,
        "rating": 4.2,
        "amenities": ["Air & water"],
        "coordinates": {"latitude": 31.0636, "longitude": -98.181},
        "note": "Maintenance window 11p–4a",
    },
    {
        "id": "cedar-park",
        "name": "QuikStop - Brushy Creek",
        "brand": "QuikStop",
        "city": "Cedar Park, TX",
        "price": "$2.66",
        "fuelBreakdown": {"regular": 2.66, "midgrade": 2.98, "premium": 3.24},
        "etaMinutes": 280,
        "distanceOffsetMiles": 0.4,
        "distanceMiles": 0.5,
        "lastUpdatedMinutes": 9,
        "isOpen": True,
        "rating": 4.6,
        "amenities": ["Air & water", "Mini-mart"],
        "coordinates": {"latitude": 30.5308, "longitude": -97.816},
        "note": "Short detour for lower premium prices",
    },
]


def _sample_route():
    return {
        "id": "midland-to-austin",
        "title": "Midland → Austin",
        "summary": "Scenic 5-hour stretch across West Texas with curated fuel stops.",
        "durationMinutes": 320,
        "etaMinutes": 320,
        "distanceMiles": 345,
        "durationText": "5h 20m",
        "distanceText": "345 miles",
        "origin": {
            "label": "Midland Downtown",
            "coordinates": {"latitude": 31.9973, "longitude": -102.0779},
        },
        "destination": {
            "label": "Austin Capitol",
            "coordinates": {"latitude": 30.2672, "longitude": -97.7431},
        },
        "polyline": [
            {"latitude": 31.9973, "longitude": -102.0779},
            {"latitude": 31.8582, "longitude": -102.2985},
            {"latitude": 31.8455, "longitude": -102.3381},
            {"latitude": 32.0451, "longitude": -101.9482},
            {"latitude": 32.2501, "longitude": -101.4789},
            {"latitude": 32.3177, "longitude": -100.9186},
            {"latitude": 32.4724, "longitude": -100.4059},
            {"latitude": 32.4473, "longitude": -99.7389},
            {"latitude": 32.2021, "longitude": -99.1288},
            {"latitude": 31.9076, "longitude": -98.6523},
            {"latitude": 31.4523, "longitude": -98.2635},
            {"latitude": 31.0636, "longitude": -98.181},
            {"latitude": 30.7425, "longitude": -97.9156},
            {"latitude": 30.5052, "longitude": -97.8203},
            {"latitude": 30.387, "longitude": -97.7398},
            {"latitude": 30.2672, "longitude": -97.7431},
        ],
        "path": [
            {"latitude": 31.9973, "longitude": -102.0779},
            {"latitude": 31.8582, "longitude": -102.2985},
            {"latitude": 31.8455, "longitude": -102.3381},
        ],
        "stops": SAMPLE_STOPS,
    }


SAMPLE_ROUTE = _sample_route()


def _sample_selected_stops(best_stop_id: str = "odessa"):
    best_stop = next((s for s in SAMPLE_STOPS if s["id"] == best_stop_id), SAMPLE_STOPS[0])
    return [
        {
            "id": 1,
            "stopId": best_stop["id"],
            "routeId": "midland-to-austin",
            "recordedAt": datetime.now(timezone.utc).isoformat(),
            "station": best_stop,
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


def _strip_html(instruction: str) -> str:
    return re.sub("<[^<]+?>", "", instruction)


def _meters_to_miles(value: Optional[float]) -> Optional[float]:
    if value is None:
        return None
    try:
        return round(float(value) / 1609.34, 2)
    except (TypeError, ValueError):
        return None


def _seconds_to_minutes(value: Optional[float]) -> Optional[float]:
    if value is None:
        return None
    try:
        return round(float(value) / 60.0, 1)
    except (TypeError, ValueError):
        return None

def _station_to_gasstop(station, distance_miles=0.0, offset_miles=0.0):
    latest = station.latest_price()
    last_updated_minutes = None
    price_value = None

    if latest:
        price_value = latest.price
        diff = datetime.now(timezone.utc) - latest.reported_at.replace(tzinfo=timezone.utc)
        last_updated_minutes = int(diff.total_seconds() // 60)

    return {
        "id": str(station.id),
        "name": station.name,
        "city": station.city,
        "state": station.state,
        "price": price_value,
        "fuelBreakdown": {"regular": price_value} if price_value is not None else None,
        "distanceMiles": distance_miles,
        "distanceOffsetMiles": offset_miles,
        "coordinates": {
            "latitude": station.latitude,
            "longitude": station.longitude,
        },
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


def _safe_float(value: Any) -> Optional[float]:
    try:
        parsed = float(value)
        if parsed != parsed:  # NaN guard
            return None
        return parsed
    except (TypeError, ValueError):
        return None


def _normalize_city(city: str) -> str:
    if not city:
        return ""
    return city.split(",")[0].strip().lower()


_collectapi_cache: Dict[str, Tuple[datetime, List[Dict[str, Any]]]] = {}
_collectapi_backoff_until: Optional[datetime] = None
_collectapi_last_error: Optional[str] = None


def _fetch_collectapi_prices(state: str = "texas") -> List[Dict[str, Any]]:
    """Fetch state-level gas prices from CollectAPI (cached to protect the 100 req trial)."""
    if not COLLECTAPI_KEY:
        return []

    global _collectapi_backoff_until, _collectapi_last_error

    if _collectapi_backoff_until and datetime.now(timezone.utc) < _collectapi_backoff_until:
        if _collectapi_last_error:
            logger.info("CollectAPI backoff active: %s", _collectapi_last_error)
        return []

    state_key = state.lower()
    cached = _collectapi_cache.get(state_key)
    if cached:
        fetched_at, payload = cached
        # reuse cached data for 15 minutes
        if (datetime.now(timezone.utc) - fetched_at).total_seconds() < 900:
            return payload

    try:
        state_param = state.title()
        resp = requests.get(
            "https://api.collectapi.com/gasPrice/stateUsa",
            params={"state": state_param},
            headers={
                "authorization": f"apikey {COLLECTAPI_KEY}",
                "content-type": "application/json",
            },
            timeout=8,
        )
        resp.raise_for_status()
        json_data = resp.json()
        results = json_data.get("result") or json_data.get("results") or []

        normalized: List[Dict[str, Any]] = []
        for item in results:
            city = item.get("city") or item.get("state") or item.get("name")
            normalized.append(
                {
                    "city": city,
                    "grades": {
                        "regular": _safe_float(
                            item.get("gasoline") or item.get("regular") or item.get("gas")
                        ),
                        "midgrade": _safe_float(item.get("midGrade") or item.get("midgrade")),
                        "premium": _safe_float(item.get("premium")),
                    },
                    "raw": item,
                }
            )

        _collectapi_cache[state_key] = (datetime.now(timezone.utc), normalized)
        _collectapi_backoff_until = None
        _collectapi_last_error = None
        return normalized
    except Exception as exc:  # noqa: BLE001
        logger.warning("CollectAPI request failed: %s", exc)
        _collectapi_last_error = str(exc)
        # Back off for 15 minutes after any failure to avoid burning through the free tier
        _collectapi_backoff_until = datetime.now(timezone.utc) + timedelta(minutes=15)
        return []


def _apply_collectapi_prices(stops: Iterable[Dict[str, Any]], state: str = "texas"):
    prices = _fetch_collectapi_prices(state)
    if not prices:
        return list(stops)

    price_map = {_normalize_city(p.get("city") or ""): p for p in prices if p.get("city")}
    enriched = []
    for stop in stops:
        city_key = _normalize_city(stop.get("city", ""))
        record = price_map.get(city_key)
        payload = dict(stop)
        if record:
            grades = record.get("grades") or {}
            breakdown = dict(payload.get("fuelBreakdown") or {})
            for grade_key, grade_value in grades.items():
                if grade_value is not None:
                    breakdown[grade_key] = grade_value
            payload["fuelBreakdown"] = breakdown
            if breakdown.get("regular") is not None:
                payload["price"] = breakdown["regular"]
            payload["priceSource"] = "collectapi"
            payload["priceFetchedAt"] = datetime.now(timezone.utc).isoformat()
        enriched.append(payload)
    return enriched


def _price_value(stop: Dict[str, Any], grade: str = "regular") -> float:
    breakdown = stop.get("fuelBreakdown") or {}
    price = breakdown.get(grade)
    if price is None:
        price = stop.get("price")
    return float(price) if price is not None else float("inf")


def _pick_best_stop(stops: Iterable[Dict[str, Any]], grade: str = "regular") -> Optional[Dict[str, Any]]:
    scored: List[Tuple[float, float, Dict[str, Any]]] = []
    for stop in stops:
        price = _price_value(stop, grade)
        detour = float(stop.get("distanceOffsetMiles") or 0)
        scored.append((detour, price, stop))

    scored.sort(key=lambda item: (item[0], item[1]))
    return scored[0][2] if scored else None


def _build_turn_by_turn_steps(leg: Dict[str, Any]) -> List[Dict[str, Any]]:
    steps: List[Dict[str, Any]] = []
    for step in leg.get("steps", []):
        instruction = _strip_html(str(step.get("html_instructions") or step.get("maneuver") or "Continue"))
        steps.append(
            {
                "instruction": instruction,
                "distanceText": (step.get("distance") or {}).get("text"),
                "durationText": (step.get("duration") or {}).get("text"),
            }
        )

    if not steps and leg:
        steps.append({"instruction": "Head toward your destination", "distanceText": (leg.get("distance") or {}).get("text")})

    return steps[:50]


def _hydrate_sample_route():
    stops = _apply_collectapi_prices(SAMPLE_STOPS)
    best_stop = _pick_best_stop(stops)
    route = dict(SAMPLE_ROUTE)
    route["stops"] = stops
    if best_stop:
        route["bestStopId"] = best_stop.get("id")
    route["steps"] = [
        {"instruction": "Depart Midland Downtown", "distanceText": "Start"},
        {"instruction": best_stop.get("name") if best_stop else "Fuel up on the way", "distanceText": "Gas stop"},
        {"instruction": "Arrive at Austin Capitol", "distanceText": "Destination"},
    ]
    return route


def _build_route_from_google(origin_label: str, destination_label: str, data: Dict[str, Any]):
    routes = data.get("routes") or []
    leg = (routes[0].get("legs") or [{}])[0] if routes else {}
    distance = leg.get("distance") or {}
    duration = leg.get("duration") or {}

    origin_coordinates = _convert_location(leg.get("start_location")) or SAMPLE_ROUTE["origin"]["coordinates"]
    dest_coordinates = _convert_location(leg.get("end_location")) or SAMPLE_ROUTE["destination"]["coordinates"]

    polyline_raw = routes[0].get("overview_polyline", {}).get("points", "") if routes else ""
    polyline = decode_polyline(polyline_raw) if polyline_raw else SAMPLE_ROUTE["polyline"]

    stops = _apply_collectapi_prices(SAMPLE_STOPS, state="texas")
    best_stop = _pick_best_stop(stops)

    return {
        "id": f"{origin_label}-{destination_label}".replace(" ", "-").lower(),
        "title": f"{origin_label} → {destination_label}",
        "summary": routes[0].get("summary") or "Google Maps directions",
        "durationMinutes": _seconds_to_minutes(duration.get("value")) or SAMPLE_ROUTE["durationMinutes"],
        "etaMinutes": _seconds_to_minutes(duration.get("value")) or SAMPLE_ROUTE["etaMinutes"],
        "distanceMiles": _meters_to_miles(distance.get("value")) or SAMPLE_ROUTE["distanceMiles"],
        "durationText": duration.get("text"),
        "distanceText": distance.get("text"),
        "origin": {"label": origin_label, "coordinates": origin_coordinates},
        "destination": {"label": destination_label, "coordinates": dest_coordinates},
        "polyline": polyline,
        "path": polyline[:3],
        "stops": stops,
        "bestStopId": best_stop.get("id") if best_stop else None,
        "steps": _build_turn_by_turn_steps(leg),
    }

@stations_bp.route("", methods=["GET"])
def list_stations():
    """
    Optional query params: lat, lng, radiusMiles
    For now we just ignore distance and return all stations.
    """
    stations = Station.query.all()
    if stations:
        data = [_station_to_gasstop(s) for s in stations]
        return jsonify(_apply_collectapi_prices(data))

    return jsonify(_apply_collectapi_prices(SAMPLE_STOPS))

@stations_bp.route("/<int:station_id>", methods=["GET"])
def get_station(station_id):
    station = Station.query.get_or_404(station_id)
    return jsonify(_station_to_gasstop(station))

@stations_bp.route("/route", methods=["GET"])
def get_route():
    origin = (request.args.get("origin") or "Midland, TX").strip() or "Midland, TX"
    destination = (request.args.get("destination") or "Austin, TX").strip() or "Austin, TX"

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
                logger.info("Directions status: %s", status)

                routes = data.get("routes") or []
                if status == "OK" and routes:
                    route_payload = _build_route_from_google(origin, destination, data)
                    return jsonify(route_payload), 200

                logger.warning("Directions missing or not OK: %s", status)
            except Exception as exc:  # noqa: BLE001
                logger.warning("Google Directions request failed: %s", exc)

        return jsonify(_hydrate_sample_route()), 200
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

        stops = _apply_collectapi_prices(SAMPLE_STOPS)
        best_stop = _pick_best_stop(stops)
        if not best_stop:
            return jsonify([]), 200

        selection = {
            "id": 1,
            "stopId": best_stop["id"],
            "routeId": "midland-to-austin",
            "recordedAt": datetime.now(timezone.utc).isoformat(),
            "station": best_stop,
        }

        return jsonify([selection]), 200
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
