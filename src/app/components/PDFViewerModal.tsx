'use client';
import { useEffect, useState } from 'react';

interface PDFViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  fileUrl: string;
  fileName: string;
  documentId?: string;
  isPDF?: boolean;
}

export default function PDFViewerModal({ 
  isOpen, 
  onClose, 
  fileUrl, 
  fileName, 
  documentId, 
  isPDF = true 
}: PDFViewerModalProps) {
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'preview' | 'content'>('preview');
  const [text, setText] = useState<string>('');
  const [textLoading, setTextLoading] = useState(false);

  // Use our internal API route to ensure headers (like Inline view) are respected
  const internalViewUrl = `/api/documents?id=${documentId}&file=true&view=true`;

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      setActiveTab(isPDF ? 'preview' : 'content');
      setError(null);
      // If it's not a PDF, we should fetch text immediately
      if (!isPDF && documentId) fetchDocumentText();
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [isOpen, isPDF, documentId]);

  // Fetch text only when the user clicks the "Content" tab
  useEffect(() => {
    if (isOpen && activeTab === 'content' && !text && !textLoading) {
      fetchDocumentText();
    }
  }, [activeTab, isOpen]);

  const fetchDocumentText = async () => {
    if (!documentId) return;
    setTextLoading(true);
    try {
      const res = await fetch(`/api/documents?id=${documentId}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setText(data.fullText || 'No text content available');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setTextLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="relative bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex flex-col border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50">
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 truncate flex-1">
              {fileName}
            </h2>
            <button onClick={onClose} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Tabs */}
          {isPDF && (
            <div className="flex bg-white dark:bg-gray-900">
              <button 
                onClick={() => setActiveTab('preview')}
                className={`flex-1 py-3 text-sm font-semibold border-b-2 transition-all ${
                  activeTab === 'preview' ? 'border-blue-600 text-blue-600 bg-blue-50/50' : 'border-transparent text-gray-500'
                }`}
              >
                Document Preview
              </button>
              <button 
                onClick={() => setActiveTab('content')}
                className={`flex-1 py-3 text-sm font-semibold border-b-2 transition-all ${
                  activeTab === 'content' ? 'border-blue-600 text-blue-600 bg-blue-50/50' : 'border-transparent text-gray-500'
                }`}
              >
                Extracted Text (RAG Data)
              </button>
            </div>
          )}
        </div>

        {/* Content Area */}
        <div className="flex-1 bg-gray-100 dark:bg-black/20 overflow-hidden">
          {activeTab === 'preview' && isPDF ? (
            <iframe
              src={internalViewUrl}
              className="w-full h-full border-0"
              title={fileName}
            />
          ) : (
            <div className="h-full p-6 overflow-auto">
              {textLoading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="animate-pulse text-gray-400">Reading document data...</div>
                </div>
              ) : (
                <div className="max-w-4xl mx-auto bg-white dark:bg-gray-800 p-8 shadow-sm rounded-lg">
                   <p className="text-xs font-mono text-blue-500 uppercase tracking-widest mb-4">Raw Text Export</p>
                   <pre className="whitespace-pre-wrap text-sm leading-relaxed text-gray-800 dark:text-gray-200 font-sans">
                    {text || 'No text content available'}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}