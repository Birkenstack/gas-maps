# gasmaps/__init__.py
from pathlib import Path

from flask import Flask

from config import Config
from .db import db, init_extensions  # ← this line must match db.py


def _ensure_sqlite_directory(app):
    uri = app.config.get("SQLALCHEMY_DATABASE_URI", "")
    if not uri.startswith("sqlite:///"):
        return

    db_path = Path(uri.replace("sqlite:///", "", 1))
    db_path.parent.mkdir(parents=True, exist_ok=True)


def create_app(config_class=Config):
    app = Flask(__name__, instance_relative_config=True)
    app.config.from_object(config_class)

    # Ensure the instance folder and sqlite file location exist
    Path(app.instance_path).mkdir(parents=True, exist_ok=True)
    _ensure_sqlite_directory(app)

    # init extensions
    init_extensions(app)

    # lazy imports to avoid circulars
    from .routes.stations import stations_bp
    from .routes.prices import prices_bp

    app.register_blueprint(stations_bp)
    app.register_blueprint(prices_bp)

    @app.route("/ping")
    def ping():
        return {"status": "ok"}

    with app.app_context():
        db.create_all()

    return app
