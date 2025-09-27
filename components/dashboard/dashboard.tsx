"use client";

import { useEffect, useState } from "react";
import { getAllDocuments, clearDocuments } from "@/lib/db";
import { FileText, Trash2, Clock, UploadCloud, RefreshCw, AlertCircle, CheckCircle2 } from "lucide-react";
import Link from "next/link";


interface DocumentData {
  id: number;
  name: string;
  expiryDate?: string | null;
  createdAt?: string | number;
}

export default function DocumentDashboard() {
  const [docs, setDocs] = useState<DocumentData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDocuments();
  }, []);

  const loadDocuments = async () => {
    setLoading(true);
    const allDocs = await getAllDocuments();
    setDocs(allDocs);
    setLoading(false);
  };

  const handleClearAll = async () => {
    if (confirm("Are you sure you want to clear all saved documents?")) {
      await clearDocuments();
      await loadDocuments();
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          📂 Uploaded Documents
        </h2>

        <div className="flex gap-3">
          {docs.length > 0 && (
            <button
              onClick={handleClearAll}
              className="flex items-center gap-1 text-red-600 text-sm font-medium hover:underline"
            >
              <Trash2 className="w-4 h-4" />
              Clear All
            </button>
          )}
          <button
            onClick={loadDocuments}
            className="flex items-center gap-1 text-blue-600 text-sm font-medium hover:underline"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
          <Link
            href="/"
            className="bg-gradient-to-r from-blue-600 to-blue-500 text-white text-sm px-4 py-2 rounded-md shadow-md hover:from-blue-700 hover:to-blue-600 transition"
          >
            + Upload New
          </Link>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex justify-center items-center h-40">
          <p className="text-gray-500 text-sm animate-pulse flex items-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin" />
            Loading documents...
          </p>
        </div>
      ) : docs.length === 0 ? (
        <div className="text-center py-12 bg-gradient-to-br from-gray-50 to-gray-100 border rounded-xl shadow-sm">
          <UploadCloud className="mx-auto w-12 h-12 text-gray-400 mb-3" />
          <p className="text-gray-500 italic text-sm">No uploaded documents yet.</p>
          <Link
            href="/"
            className="inline-block mt-4 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium transition"
          >
            Upload a Document →
          </Link>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {docs.map((doc) => (
            <div
              key={doc.id}
              className="relative bg-white border border-gray-100 rounded-xl p-5 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-200"
            >
              {/* Delete button */}
              <button
                onClick={async () => {
                  const db = (await import("@/lib/db")).getDB;
                  const dbInstance = await db();
                  await dbInstance.delete("documents", doc.id);
                  await loadDocuments();
                }}
                className="absolute top-3 right-3 text-red-500 hover:text-red-700 transition"
                title="Delete document"
              >
                <Trash2 className="w-4 h-4" />
              </button>

              {/* File Icon */}
              <div className="flex items-center gap-2 mb-3">
                <FileText className="w-6 h-6 text-blue-600" />
                <h3 className="font-semibold text-gray-800 text-base truncate max-w-[85%]">
                  {doc.name}
                </h3>
              </div>

              {/* Details */}
              <div className="space-y-1 text-sm">
                <p className="text-gray-600 flex items-center gap-1">
                  <Clock className="w-4 h-4 text-gray-400" />
                  <span className="font-medium text-gray-700">Expiry:</span>
                  <span
                    className={`font-semibold ml-1 ${
                      doc.expiryDate ? "text-blue-700" : "text-red-500"
                    }`}
                  >
                    {doc.expiryDate || "Not Found"}
                  </span>
                </p>

                <p className="text-xs text-gray-400">
                  Uploaded: {new Date(doc.createdAt ?? "").toLocaleString()}
                </p>
              </div>

              {/* Status Badge */}
              <div className="mt-4">
                {doc.expiryDate ? (
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                    <CheckCircle2 className="w-3 h-3" /> Expiry Found
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
                    <AlertCircle className="w-3 h-3" /> Missing Expiry
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
