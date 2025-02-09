"use client";

import { useState, useRef } from "react";
import axios from "axios";

export default function Home() {
  const [query, setQuery] = useState("");
  const [response, setResponse] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setQuery(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  };

  const sendQuery = async () => {
    if (!query.trim()) {
      setError("Please enter a question.");
      return;
    }

    setLoading(true);
    setError(null);
    setResponse(null);

    console.log("🔵 [DEBUG] Sending query:", query);

    try {
      console.log("🟠 [DEBUG] Making API Request...");
      const res = await axios.post("http://127.0.0.1:5000/query", { query });

      console.log("🟢 [DEBUG] Full API Response:", res);
      console.log("🟢 [DEBUG] Retrieved Answer:", res.data.response);

      setResponse(res.data.response);
    } catch (err) {
      console.error("🔴 [ERROR] API Call Failed:", err);
      setError("Failed to get a response. Check console for details.");
    }

    setLoading(false);
  };

  return (
    <div className="flex flex-col items-center justify-start min-h-screen p-5 bg-gray-50">
      <h1 className="text-4xl font-bold mb-6 text-blue-600 text-center">RAG with Flask + Next.js</h1>

      {/* Auto-expanding Input Field */}
      <div className="w-full max-w-3xl">
        <textarea
          ref={textareaRef}
          className="border border-gray-300 p-3 w-full text-lg rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none overflow-hidden"
          placeholder="Ask a question..."
          value={query}
          onChange={handleInputChange}
          rows={1}
        />
      </div>

      {/* Submit Button */}
      <button
        onClick={sendQuery}
        className={`mt-4 px-6 py-3 rounded-lg shadow-md transition-all ${loading ? "bg-gray-400" : "bg-blue-500 hover:bg-blue-700 text-white"}`}
        disabled={loading}
      >
        {loading ? "Loading..." : "Ask"}
      </button>

      {/* Error Message */}
      {error && <p className="mt-3 text-red-600">{error}</p>}

      {/* Dynamic Answer Box */}
      {response && (
        <div className="mt-6 w-full max-w-3xl bg-white p-5 rounded-lg shadow-md overflow-y-auto max-h-[400px]">
          <strong className="text-lg text-gray-700">Answer:</strong>
          <p className="mt-3 text-gray-900 text-lg whitespace-pre-wrap break-words">{response}</p>
        </div>
      )}
    </div>
  );
}
