# gasmaps/models.py
from datetime import datetime
from .db import db

class Station(db.Model):
    __tablename__ = "stations"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False)
    city = db.Column(db.String(80), nullable=False)
    state = db.Column(db.String(2), nullable=False)
    latitude = db.Column(db.Float, nullable=False)
    longitude = db.Column(db.Float, nullable=False)
    is_open = db.Column(db.Boolean, default=True)

    prices = db.relationship("Price", backref="station", lazy=True)

    def latest_price(self):
        return Price.query.filter_by(station_id=self.id) \
                          .order_by(Price.reported_at.desc()) \
                          .first()

class Price(db.Model):
    __tablename__ = "prices"

    id = db.Column(db.Integer, primary_key=True)
    station_id = db.Column(db.Integer, db.ForeignKey("stations.id"), nullable=False)
    fuel_type = db.Column(db.String(20), default="regular")
    price = db.Column(db.Float, nullable=False)
    reported_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

class SelectedStop(db.Model):
    __tablename__ = "selected_stops"

    id = db.Column(db.Integer, primary_key=True)
    station_id = db.Column(db.Integer, db.ForeignKey("stations.id"), nullable=False)
    route_id = db.Column(db.String(80), nullable=False)
    recorded_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    station = db.relationship("Station")
