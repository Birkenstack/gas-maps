from gasmaps.db import db
from gasmaps.models import Station
from app import app  # whatever your Flask entry file is

with app.app_context():
    s1 = Station(
        name="Shell",
        city="Midland",
        state="TX",
        latitude=31.9974,
        longitude=-102.0779,
        is_open=True
    )

    s2 = Station(
        name="Chevron",
        city="Odessa",
        state="TX",
        latitude=31.8457,
        longitude=-102.3676,
        is_open=False
    )

    s3 = Station(
        name="Exxon",
        city="San Angelo",
        state="TX",
        latitude=31.4422,
        longitude=-100.4500,
        is_open=True
    )

    db.session.add_all([s1, s2, s3])
    db.session.commit()

    print("Seeded 3 stations successfully.")