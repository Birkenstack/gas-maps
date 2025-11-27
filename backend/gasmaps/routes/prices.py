# gasmaps/routes/prices.py
from datetime import datetime
from flask import Blueprint, jsonify, request, abort
from ..models import Station, Price
from ..db import db

prices_bp = Blueprint("prices", __name__, url_prefix="/stations")

@prices_bp.route("/<int:station_id>/prices", methods=["POST"])
def report_price(station_id):
    station = Station.query.get_or_404(station_id)
    data = request.get_json() or {}
    try:
        price_value = float(data["price"])
    except (KeyError, ValueError):
        abort(400, description="Missing or invalid 'price'")

    fuel_type = data.get("fuelType", "regular")

    price = Price(
        station_id=station.id,
        price=price_value,
        fuel_type=fuel_type,
        reported_at=datetime.utcnow(),
    )
    db.session.add(price)
    db.session.commit()

    return jsonify({
        "message": "Price recorded",
        "stationId": station.id,
        "priceId": price.id,
    }), 201

@prices_bp.route("/<int:station_id>/prices/trend", methods=["GET"])
def price_trend(station_id):
    Station.query.get_or_404(station_id)  # ensure exists
    limit = int(request.args.get("limit", 20))

    prices = (
        Price.query
        .filter_by(station_id=station_id)
        .order_by(Price.reported_at.desc())
        .limit(limit)
        .all()
    )

    return jsonify([
        {
            "id": p.id,
            "fuelType": p.fuel_type,
            "price": p.price,
            "reportedAt": p.reported_at.isoformat() + "Z",
        }
        for p in prices
    ])