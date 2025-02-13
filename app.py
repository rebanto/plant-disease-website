from flask import Flask, jsonify, request
from flask_cors import CORS
from dotenv import load_dotenv
import os

load_dotenv()

app = Flask(__name__)
CORS(app)

@app.route("/get-keys", methods=["GET"])
def get_keys():
    supabase_url = os.getenv('SUPABASE_URL')
    supabase_key = os.getenv('SUPABASE_KEY')

    return jsonify({
        "supabase_url": supabase_url,
        "supabase_key": supabase_key
    })

@app.route("/sensor-data", methods=["POST"])
def receive_sensor_data():
    try:
        data = request.json
        if not data:
            return jsonify({"error": "No data received"}), 400

        print("Received sensor data:", data)

        return jsonify({"message": "Data received successfully", "data": data}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    app.run()
