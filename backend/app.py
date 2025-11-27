# app.py
from gasmaps import create_app

app = create_app()

@app.route('/')
def home():
    return "Welcome to GasMaps!"

if __name__ == "__main__":
    app.run(debug=True)