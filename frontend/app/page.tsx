"use client";  // Required for client-side rendering

import { useState } from "react";
import axios from "axios";

export default function Home() {
  const [query, setQuery] = useState("");
  const [response, setResponse] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const sendQuery = async () => {
    if (!query.trim()) return;
    setLoading(true);

    try {
      const res = await axios.post("http://127.0.0.1:5000/query", { query });
      setResponse(res.data.response);
    } catch (error) {
      console.error("Error fetching data:", error);
      setResponse("Error retrieving response.");
    }

    setLoading(false);
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen p-5">
      <h1 className="text-4xl font-bold mb-4 text-blue-500">RAG with Flask + Next.js</h1>
      <input
        type="text"
        className="border p-2 w-96 text-lg"
        placeholder="Ask a question..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <button
        onClick={sendQuery}
        className="mt-4 px-6 py-2 bg-blue-500 text-white rounded hover:bg-blue-700"
        disabled={loading}
      >
        {loading ? "Loading..." : "Ask"}
      </button>

      {response && (
        <div className="mt-6 p-4 bg-gray-100 rounded w-96 text-lg">
          <strong>Answer:</strong>
          <p className="mt-2">{response}</p>
        </div>
      )}
    </div>
  );
}
