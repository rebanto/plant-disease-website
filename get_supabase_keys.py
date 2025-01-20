from flask import Flask, jsonify
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

if __name__ == "__main__":
    app.run(port=5000)
