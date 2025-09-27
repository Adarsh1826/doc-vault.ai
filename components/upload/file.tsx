"use client";

import { useState } from "react";
import { FileUpload } from "@/components/ui/file-upload";
import { extractTextFromFile, extractExpiryDateFromText } from "@/lib/upload";
import { saveDocument, getAllDocuments } from "@/lib/db";
import { useRouter } from "next/navigation";

export default function UploadAndAskPage() {
  const [file, setFile] = useState<File | null>(null);
  const [text, setText] = useState<string>("");
  const [uploadKey, setUploadKey] = useState(0);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const router = useRouter();

  
  const handleFileChange = async (files: File[]) => {
    const selectedFile = files[0];
    if (!selectedFile) return;
    setFile(selectedFile);
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);

    const extractedText = await extractTextFromFile(file);
    const expiryDate = extractExpiryDateFromText(extractedText);

    await saveDocument(file.name, extractedText, expiryDate);

    setText(extractedText);
    console.log("Extracted Text:", extractedText);
    console.log("Detected Expiry:", expiryDate);

    setUploading(false);
  };

  const handleRemoveFile = () => {
    setFile(null);
    setText("");
    setUploadKey((prev) => prev + 1);
    setAnswer("");
  };

  
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
      console.error(error);
      setAnswer("Error connecting to AI service.");
    }

    setLoading(false);
  };

  return (
    <div className="p-6 max-w-2xl mx-auto flex flex-col gap-6 ">
      
      <div className=" rounded-xl shadow-md p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">📄 Upload Your PDF</h2>

        <FileUpload key={uploadKey} onChange={handleFileChange} />

        {file && (
          <div className="flex items-center justify-between bg-gray-100 p-3 rounded-md mt-3">
            <span className="text-sm font-medium text-gray-700">{file.name}</span>
            <button
              onClick={handleRemoveFile}
              className="text-red-500 hover:text-red-700 text-xl"
              title="Remove file"
            >
              ✖
            </button>
          </div>
        )}

        <button
          onClick={handleUpload}
          disabled={!file || uploading}
          className={`mt-3 px-4 py-2 rounded-md font-medium w-full ${
            file && !uploading
              ? "bg-blue-600 text-white hover:bg-blue-700"
              : "bg-gray-300 text-gray-600"
          }`}
        >
          {uploading ? "Extracting..." : "Upload & Extract"}
        </button>

        {/* {text && (
          <pre className="mt-4 bg-gray-50 p-3 rounded-md text-sm whitespace-pre-wrap border max-h-60 overflow-y-auto">
            {text}
          </pre>
        )} */}
      </div>

     
      {/* {text && ( */}
        <div className="bg-white rounded-xl shadow-md p-6 flex flex-col gap-3">
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
          <button onClick={()=>{router.push('/dashboard')}}>Move to dashboard</button>
        </div>
      {/* )} */}
    </div>
  );
}
