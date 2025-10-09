"use client";

import { useState } from "react";
import { getAllDocuments } from "@/lib/db"; 

export default function AskSection() {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);

  const handleAsk = async () => {
    if (!question.trim()) return;

    setLoading(true);
    setAnswer("");

    try {
      
      const docs = await getAllDocuments();

      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, documents: docs }),
      });

      const data = await res.json();
      setAnswer(data.answer);
    } catch (error) {
      setAnswer("Error connecting to AI service.");
      console.error(error);
    }

    setLoading(false);
  };

  return (
    <div className="p-6 max-w-xl mx-auto bg-white rounded-xl shadow-md flex flex-col gap-3 mt-6">
      <h2 className="text-xl font-semibold text-gray-800">🤖 Ask About Your PDF</h2>

      <div className="flex gap-2">
        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="e.g. What is my membership ID?"
          className="flex-1 border rounded-md p-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          onClick={handleAsk}
          disabled={!question.trim() || loading}
          className={`px-4 py-2 rounded-md font-medium ${
            loading
              ? "bg-gray-400 text-white"
              : "bg-blue-600 text-white hover:bg-blue-700"
          }`}
        >
          {loading ? "Thinking..." : "Ask"}
        </button>
      </div>

      {answer && (
        <div className="mt-3 p-3 bg-gray-50 border rounded-md text-sm whitespace-pre-wrap">
          {answer}
        </div>
      )}
    </div>
  );
}
