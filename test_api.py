import requests

url = "http://localhost:5000/sensor-data"
headers = {"Content-Type": "application/json"}
data = {
    "sensor_value": "1/1/2000|0:0:0|0|1|2|6|23|34|4"
}

response = requests.post(url, json=data, headers=headers)
print("Response:", response.json())
