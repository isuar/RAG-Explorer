"use client";
import { useState, useRef, useEffect } from "react";
import Navigation from "./components/Navigation";
import ReactMarkdown from "react-markdown";

export default function Home() {
  const [query, setQuery] = useState("");
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const [sources, setSources] = useState<any[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  const handleSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setAnswer("");
    setSources([]);

    try {
      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });
      const data = await res.json();

      if (data.error) {
        setAnswer(`Error: ${data.error}`);
      } else {
        setAnswer(data.answer || "No answer generated");
        setSources(data.sources || []);
      }
    } catch (error: any) {
      setAnswer(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      handleSearch();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black">
      {/* <Navigation /> */}
      <main className="max-w-4xl mx-auto p-6 md:p-8">
        <header className="mb-10">
          <h1 className="text-4xl font-extrabold text-gray-900 dark:text-white mb-2">
            AI Document Search
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Query your database using natural language and vector similarity.
          </p>
        </header>

        {/* Search Input Section */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6 shadow-sm mb-8 transition-all focus-within:ring-1 focus-within:ring-blue-500">
          <textarea
            ref={textareaRef}
            className="w-full p-4 text-lg border-0 bg-transparent text-gray-900 dark:text-gray-100 resize-none focus:ring-0 placeholder-gray-400"
            placeholder="What is the main conclusion of the document?"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyPress}
            rows={3}
          />
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
            <span className="text-xs text-gray-400 font-medium">
              Ctrl + Enter to search
            </span>
            <button
              onClick={handleSearch}
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-2.5 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed font-bold transition-colors flex items-center gap-2"
              disabled={loading || !query.trim()}
            >
              {loading && (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              )}
              {loading ? "Analyzing..." : "Ask Question"}
            </button>
          </div>
        </div>

        {/* Loading Skeleton */}
        {loading && !answer && (
          <div className="animate-pulse space-y-4 mb-8">
            <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-1/4"></div>
            <div className="h-32 bg-gray-200 dark:bg-gray-800 rounded-xl"></div>
          </div>
        )}

        {/* Answer Section */}
        {answer && (
          <section className="animate-in fade-in slide-in-from-bottom-4 duration-500 mb-8">
            <div className="bg-white dark:bg-gray-900 border border-blue-100 dark:border-blue-900/30 rounded-xl p-8 shadow-sm">
              <h2 className="text-sm uppercase tracking-wider font-bold text-blue-600 dark:text-blue-400 mb-4">
                AI Generated Answer
              </h2>
              <div className="prose dark:prose-invert max-w-none text-gray-800 dark:text-gray-200 leading-relaxed text-lg">
                <ReactMarkdown>{answer}</ReactMarkdown>
              </div>
            </div>
          </section>
        )}

        {/* Sources Section */}
        {sources.length > 0 && (
          <section className="space-y-4">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              Sources{" "}
              <span className="text-sm font-normal text-gray-500">
                ({sources.length} chunks used)
              </span>
            </h2>
            <div className="grid gap-4">
              {sources.map((source, index) => (
                <div
                  key={index}
                  className="p-5 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 hover:border-blue-300 dark:hover:border-blue-700 transition-colors shadow-sm"
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex flex-col gap-1">
                      <span className="text-xs font-bold px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded text-gray-600 dark:text-gray-400 uppercase w-fit">
                        {source.metadata?.file_name || "Document"}
                      </span>
                      {source.file_url && (
                        <a
                          href={source.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-600 hover:underline font-bold"
                        >
                          Open PDF ↗
                        </a>
                      )}
                    </div>
                    {source.similarity && (
                      <span className="text-xs text-green-600 font-mono bg-green-50 dark:bg-green-900/20 px-2 py-1 rounded">
                        {(source.similarity * 100).toFixed(1)}% match
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-700 dark:text-gray-300 italic leading-snug line-clamp-4">
                    "{source.content}"
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
