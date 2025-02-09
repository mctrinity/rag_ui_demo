# Issue: Character Limitation to 744 Characters in OpenAI Response

## 📌 Problem Description
While testing the Flask-based RAG system, it was observed that responses from the OpenAI API were being **truncated to 744 characters**. This limitation caused incomplete answers, affecting the user experience.

## 🔍 Initial Assumption: Frontend Issue
At first, we thought the issue was caused by the frontend truncating the response. We attempted the following fixes:
1. **Ensuring the response box could expand dynamically** by using CSS properties like `whitespace-pre-wrap`, `break-words`, and `overflow-auto`.
2. **Increasing max-width and height limits** for the answer box in the frontend UI.
3. **Logging full API responses in the Next.js console** to confirm if the truncation was happening client-side.

However, none of these changes resolved the issue, leading us to investigate the backend constraints.

## 🔍 Root Cause
The issue was traced back to the `max_tokens` parameter in the OpenAI API request. By default:
- **`max_tokens=150`** was limiting the response length.
- **Each token roughly equals ~4 characters**, leading to shorter responses.
- The OpenAI API stops generating text when it reaches this limit.

## 🔧 Solution Implemented

### ✅ Updating `requirements.txt` with Gunicorn
To prepare for production deployment, we added `gunicorn` to `requirements.txt`:
```
flask
flask-cors
sentence-transformers
faiss-cpu
numpy
openai
python-dotenv
scikit-learn
gunicorn
```
This allows us to use Gunicorn as a production-ready WSGI server instead of Flask's built-in development server.
To fix this issue, the `max_tokens` parameter was increased to **500**, allowing responses up to approximately **2000 characters**.

### ✅ Updated OpenAI API Call in `app.py`
```python
response = client.chat.completions.create(
    model="gpt-3.5-turbo",
    messages=[
        {"role": "system", "content": "You are a helpful assistant."},
        {"role": "user", "content": prompt},
    ],
    max_tokens=500,  # Increased token limit to allow longer responses
    temperature=0.7,
)
```

## 🛠️ Debugging Steps
To verify the fix, a **print statement** was added to log the response length:
```python
full_response = response.choices[0].message.content.strip()
print(f"🔵 Response Length: {len(full_response)} characters")
```
### 📊 Expected vs. Actual Output
| Test Query | Previous Response Length | Updated Response Length |
|------------|-------------------------|-------------------------|
| "Tell me about Magellan" | 744 chars | ~2000 chars |
| "Explain the Great Wall of China" | 744 chars | ~1800 chars |

## 🎯 Lessons Learned
1. **Always check API limits (`max_tokens`) when using OpenAI.**
2. **Each token ≈ 4 characters**, so increasing `max_tokens` allows longer responses.
3. **Print debug logs** to track response lengths dynamically.

---

# Updated Flask RAG System with Fix

```python
from flask import Flask, request, jsonify
from sentence_transformers import SentenceTransformer
import faiss
import numpy as np
from openai import OpenAI
from dotenv import load_dotenv
import os
from flask_cors import CORS
from sklearn.preprocessing import normalize

# Load API key from .env file
load_dotenv()
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

# Initialize Flask app
app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})  # Allow all origins

# Step 1: Initialize Embedding Model & FAISS Index
embed_model = SentenceTransformer("all-MiniLM-L6-v2")
faiss_index = faiss.IndexFlatL2(384)  # 384-dimensional embeddings

documents = [
    "Ferdinand Magellan was a Portuguese explorer who led the first circumnavigation of the world.",
    "The Eiffel Tower is located in Paris, France.",
    "The Great Wall of China is one of the seven wonders of the world.",
    "The Moon landing happened in 1969.",
    "Water boils at 100 degrees Celsius at sea level.",
]

# Encode and add documents to FAISS index
embeddings = embed_model.encode(documents)
faiss_index.add(np.array(embeddings, dtype=np.float32))


# Step 2: Function to Perform RAG
def retrieve_and_generate(query, top_k=3, similarity_threshold=0.6):
    query_embedding = embed_model.encode([query])
    query_embedding = normalize(query_embedding)

    distances, indices = faiss_index.search(
        np.array(query_embedding, dtype=np.float32), top_k
    )

    # Convert FAISS distances into similarity scores (closer to 1 = more relevant)
    similarities = 1 - distances[0]
    relevant_docs = [
        documents[idx]
        for idx, sim in zip(indices[0], similarities)
        if sim > similarity_threshold
    ]

    # If no document passes the filter, use at least one
    if not relevant_docs:
        relevant_docs = [documents[indices[0][0]]]

    prompt = f"""You are an AI assistant. Answer the question with well-structured details.
    
    Question: {query}
    Retrieved Information: {' '.join(relevant_docs)}

    Explain the answer clearly, expanding when necessary.
    Answer:
    """

    response = client.chat.completions.create(
        model="gpt-3.5-turbo",
        messages=[
            {"role": "system", "content": "You are a helpful assistant."},
            {"role": "user", "content": prompt},
        ],
        max_tokens=500,  # Increased token limit to allow longer responses
        temperature=0.7,
    )

    full_response = response.choices[0].message.content.strip()
    print(f"🔵 Response Length: {len(full_response)} characters")  # Debugging response length

    return {
        "retrieved_docs": relevant_docs,
        "response": full_response,
    }


@app.route("/")
def home():
    return "RAG API is running!", 200


# API Endpoint for React Frontend
@app.route("/query", methods=["POST"])
def handle_query():
    data = request.json
    query = data.get("query", "")

    if not query:
        return jsonify({"error": "Query is required"}), 400

    result = retrieve_and_generate(query)
    return jsonify(result)


# Run the app
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
```
