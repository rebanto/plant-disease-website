# This file contains the code for the Flask server that will receive sensor data from the Arduino and emit it to the frontend using Socket.IO.

# importing the required libraries
from flask import Flask, jsonify, request
from flask_cors import CORS
from flask_socketio import SocketIO
from dotenv import load_dotenv
import os, json, time, random
from datetime import datetime

load_dotenv() # loading the supabase database keys from the .env file

# intializing the flask app and SocketIO
app = Flask(__name__)
CORS(app)
socketio = SocketIO(app, cors_allowed_origins="*")

# API endpoint to get the supabase keys
@app.route("/get-keys", methods=["GET"])
def get_keys():
    supabase_url = os.getenv('SUPABASE_URL')
    supabase_key = os.getenv('SUPABASE_KEY')

    return jsonify({
        "supabase_url": supabase_url,
        "supabase_key": supabase_key
    })

# API endpoint to receive sensor data from the Arduino
@app.route("/sensor-data", methods=["POST"])
def receive_sensor_data():
    try:
        data = request.json # getting the data from the request

        # splitting the different parts of the data
        sensor_value = data["sensor_value"]
        parts = sensor_value.split("|")
        
        # checking if the data is in the correct format
        if len(parts) != 8:
            return jsonify({"error": f"Incorrect sensor value format"}), 400

        # extracting the different parts of the data
        unix = parts[0]
        nitrogen = float(parts[1])
        phosphorus = float(parts[2])
        potassium = float(parts[3])
        soil_moisture = float(parts[4])
        temperature = float(parts[5])
        humidity = float(parts[6])
        ph = float(parts[7])

        # converting unix timestamp to a human readable format
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

        # emitting the data to the frontend using SocketIO
        socketio.emit("new_data", formatted_data)
        print("sensor data:", formatted_data)

        return jsonify({"message": "Success", "data": formatted_data}), 200 # returning success message
    except Exception as e:
        return jsonify({"error": str(e)}), 500 # returning error message

if __name__ == "__main__":
    socketio.run(app, host="0.0.0.0") # running the flask server