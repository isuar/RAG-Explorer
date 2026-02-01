"use client";
import { useState, useEffect } from "react";
import Navigation from "../components/Navigation";
import PDFViewerModal from "../components/PDFViewerModal";
import UploadModal from "../components/UploadModal";

interface Document {
  id: string;
  file_name: string;
  file_type: string;
  file_size: number;
  upload_date: string;
  total_chunks: number;
  file_url?: string;
}

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDoc, setSelectedDoc] = useState<{
    url: string;
    name: string;
    id: string;
    isPDF: boolean;
  } | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/documents");
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setDocuments(data.documents || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (
      !confirm(
        `Permanently delete "${name}"? This removes the file and all AI embeddings.`,
      )
    )
      return;

    setDeletingId(id);
    try {
      const res = await fetch(`/api/documents?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      setDocuments((prev) => prev.filter((doc) => doc.id !== id));
    } catch (err: any) {
      alert(err.message);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black">
      {/* <Navigation /> */}

      <main className="max-w-7xl mx-auto p-6 md:p-8">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Knowledge Base
            </h1>
            <p className="text-gray-500 dark:text-gray-400">
              Manage the documents your AI can access.
            </p>
          </div>
          <button
            onClick={() => setShowUploadModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg font-bold transition-all shadow-lg shadow-blue-500/20"
          >
            + Add Document
          </button>
        </header>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-gray-500">Syncing with database...</p>
          </div>
        ) : documents.length === 0 ? (
          <div className="bg-white dark:bg-gray-900 border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-2xl p-16 text-center">
            <div className="text-5xl mb-4">📂</div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
              Your library is empty
            </h3>
            <p className="text-gray-500 mb-6">
              Upload PDFs or Text files to start chatting with them.
            </p>
            <button
              onClick={() => setShowUploadModal(true)}
              className="text-blue-600 font-bold hover:underline"
            >
              Upload your first file &rarr;
            </button>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-800 text-xs uppercase tracking-wider text-gray-500 font-bold">
                  <th className="px-6 py-4">Document</th>
                  <th className="px-6 py-4">Stats</th>
                  <th className="px-6 py-4">Uploaded</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {documents.map((doc) => (
                  <tr
                    key={doc.id}
                    className="group hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-blue-600">
                          {doc.file_type?.includes("pdf") ? "📄" : "📝"}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900 dark:text-gray-100">
                            {doc.file_name}
                          </p>
                          <p className="text-xs text-gray-400">
                            {(doc.file_size / 1024).toFixed(1)} KB
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-600 dark:text-gray-400">
                        {doc.total_chunks} chunks
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {new Date(doc.upload_date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-4">
                        <button
                          onClick={() =>
                            setSelectedDoc({
                              url: `/api/documents?id=${doc.id}&file=true&view=true`,
                              name: doc.file_name,
                              id: doc.id,
                              isPDF: doc.file_name
                                .toLowerCase()
                                .endsWith(".pdf"),
                            })
                          }
                          className="text-blue-600 hover:text-blue-800 font-semibold text-sm"
                        >
                          View
                        </button>
                        <button
                          onClick={() => handleDelete(doc.id, doc.file_name)}
                          disabled={deletingId === doc.id}
                          className="text-red-500 hover:text-red-700 font-semibold text-sm disabled:opacity-30"
                        >
                          {deletingId === doc.id ? "..." : "Delete"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Modals */}
        {selectedDoc && (
          <PDFViewerModal
            isOpen={!!selectedDoc}
            onClose={() => setSelectedDoc(null)}
            fileUrl={selectedDoc.url}
            fileName={selectedDoc.name}
            documentId={selectedDoc.id}
            isPDF={selectedDoc.isPDF}
          />
        )}

        <UploadModal
          isOpen={showUploadModal}
          onClose={() => setShowUploadModal(false)}
          onUploadSuccess={fetchDocuments}
        />
      </main>
    </div>
  );
}
