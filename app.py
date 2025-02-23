from flask import Flask, jsonify, request
from flask_cors import CORS
from flask_socketio import SocketIO
from dotenv import load_dotenv
import os, json, time, random
from datetime import datetime

load_dotenv()

app = Flask(__name__)
CORS(app)
socketio = SocketIO(app, cors_allowed_origins="*")

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

        sensor_value = data["sensor_value"]
        parts = sensor_value.split("|")
        
        if len(parts) != 8:
            return jsonify({"error": "Incorrect sensor value format"}), 400

        unix = parts[0]
        nitrogen = float(parts[1])
        phosphorus = float(parts[2])
        potassium = float(parts[3])
        soil_moisture = float(parts[4])
        temperature = float(parts[5])
        humidity = float(parts[6])
        ph = float(parts[7])

        datetime_object = datetime.fromtimestamp(int(unix))
        formatted_datetime = datetime_object.strftime("%Y-%m-%d %H:%M:%S")
        
        formatted_data = {
            "datetime": formatted_datetime,
            "nitrogen": nitrogen,
            "phosphorus": phosphorus,
            "potassium": potassium,
            "soil_moisture": soil_moisture,
            "temperature": temperature,
            "humidity": humidity,
            "ph": ph
        }

        socketio.emit("new_data", formatted_data)
        print("sensor data:", formatted_data)

        return jsonify({"message": "Success", "data": formatted_data}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# def send_arduino_data():
#     while True:
#         data = {
#             "datetime": time.strftime("%Y-%m-%d %H:%M:%S"),
#             "nitrogen": random.randint(10, 50),
#             "phosphorus": random.randint(5, 30),
#             "potassium": random.randint(5, 30),
#             "soil_moisture": (random.randint(30, 80)),
#             "temperature": random.randint(20, 40),
#             "humidity": (random.randint(40, 80)),
#             "ph": random.randint(5, 8)
#         }
        
#         print(data)
#         socketio.emit("new_data", data)
#         time.sleep(10)

# @socketio.on("connect")
# def handle_connect():
#     socketio.start_background_task(send_arduino_data)

if __name__ == "__main__":
    socketio.run(app, host="0.0.0.0")