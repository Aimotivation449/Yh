from flask import Flask, render_template, request, jsonify, send_from_directory
import os

app = Flask(__name__)
app.secret_key = os.environ.get("SESSION_SECRET", "income-tax-calculator-secret-key")

@app.route('/')
def index():
    return send_from_directory('.', 'index.html')

@app.route('/<path:path>')
def serve_file(path):
    # Serve static files from the root directory
    return send_from_directory('.', path)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)