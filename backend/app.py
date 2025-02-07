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
CORS(app)  # Enable CORS for frontend requests

# Step 1: Initialize Embedding Model & FAISS Index
embed_model = SentenceTransformer('all-MiniLM-L6-v2')
faiss_index = faiss.IndexFlatL2(384)  # 384-dimensional embeddings

documents = [
    "Ferdinand Magellan was a Portuguese explorer who led the first circumnavigation of the world.",
    "The Eiffel Tower is located in Paris, France.",
    "The Great Wall of China is one of the seven wonders of the world.",
    "The Moon landing happened in 1969.",
    "Water boils at 100 degrees Celsius at sea level."
]

# Encode and add documents to FAISS index
embeddings = embed_model.encode(documents)
faiss_index.add(np.array(embeddings, dtype=np.float32))

# Step 2: Function to Perform RAG
def retrieve_and_generate(query, top_k=3, similarity_threshold=0.6):
    query_embedding = embed_model.encode([query])
    query_embedding = normalize(query_embedding)

    distances, indices = faiss_index.search(np.array(query_embedding, dtype=np.float32), top_k)
    
    # Convert FAISS distances into similarity scores (closer to 1 = more relevant)
    similarities = 1 - distances[0]  
    relevant_docs = [documents[idx] for idx, sim in zip(indices[0], similarities) if sim > similarity_threshold]

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
        messages=[{"role": "system", "content": "You are a helpful assistant."},
                  {"role": "user", "content": prompt}],
        max_tokens=150
    )

    return {"retrieved_docs": relevant_docs, "response": response.choices[0].message.content.strip()}

@app.route('/')
def home():
    return "RAG API is running!", 200

# API Endpoint for React Frontend
@app.route('/query', methods=['POST'])
def handle_query():
    data = request.json
    query = data.get("query", "")
    
    if not query:
        return jsonify({"error": "Query is required"}), 400
    
    result = retrieve_and_generate(query)
    return jsonify(result)

# Run the app
if __name__ == '__main__':
    app.run(host="0.0.0.0", port=5000, debug=True)
