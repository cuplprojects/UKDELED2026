import React, { useEffect, useRef, useState, useCallback } from "react";
import * as pdfjsLib from "pdfjs-dist";
import pdfWorker from "pdfjs-dist/build/pdf.worker.min.js?url";
import {
  FaSearchPlus,
  FaSearchMinus,
  FaExpand,
  FaChevronLeft,
  FaChevronRight,
  FaSyncAlt,
  FaExclamationTriangle
} from "react-icons/fa";

// Configure workerSrc with Vite URL import, local public fallback, and CDN fallback
if (typeof window !== "undefined") {
  pdfjsLib.GlobalWorkerOptions.workerSrc =
    pdfWorker ||
    "/pdf.worker.min.js" ||
    `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version || "3.11.174"}/pdf.worker.min.js`;
}

export default function PdfViewer({ pdfBlob, pdfUrl }) {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const renderTaskRef = useRef(null);

  const [pdfDoc, setPdfDoc] = useState(null);
  const [pageNum, setPageNum] = useState(1);
  const [numPages, setNumPages] = useState(0);
  const [scale, setScale] = useState(1.15); // Default comfortable read scale
  const [loading, setLoading] = useState(true);
  const [renderLoading, setRenderLoading] = useState(false);
  const [error, setError] = useState(null);

  // Load PDF Document
  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);

    const loadDocument = async () => {
      try {
        let loadingTask;
        if (pdfBlob) {
          const arrayBuffer = await pdfBlob.arrayBuffer();
          loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
        } else if (pdfUrl) {
          loadingTask = pdfjsLib.getDocument({ url: pdfUrl });
        } else {
          throw new Error("No PDF source provided.");
        }

        const doc = await loadingTask.promise;
        if (!isMounted) return;

        setPdfDoc(doc);
        setNumPages(doc.numPages);
        setPageNum(1);
        setLoading(false);
      } catch (err) {
        if (!isMounted) return;
        console.error("[PdfViewer] Error loading document:", err);
        setError("Failed to load PDF document. Please verify the file source.");
        setLoading(false);
      }
    };

    loadDocument();

    return () => {
      isMounted = false;
      if (renderTaskRef.current) {
        try {
          renderTaskRef.current.cancel();
        } catch (_) {}
        renderTaskRef.current = null;
      }
    };
  }, [pdfBlob, pdfUrl]);

  // Render current page on canvas with high-DPI Retina scaling
  const renderPage = useCallback(async () => {
    if (!pdfDoc || !canvasRef.current) return;

    // Cancel any ongoing rendering task before starting a new one
    if (renderTaskRef.current) {
      try {
        renderTaskRef.current.cancel();
      } catch (_) {}
      renderTaskRef.current = null;
    }

    setRenderLoading(true);
    try {
      const page = await pdfDoc.getPage(pageNum);
      const canvas = canvasRef.current;
      if (!canvas) return;

      const viewport = page.getViewport({ scale });

      // Automatic high-DPI Retina resolution scaling
      const pixelRatio = Math.min(window.devicePixelRatio || 1, 2.5);
      canvas.width = Math.floor(viewport.width * pixelRatio);
      canvas.height = Math.floor(viewport.height * pixelRatio);
      canvas.style.width = `${Math.floor(viewport.width)}px`;
      canvas.style.height = `${Math.floor(viewport.height)}px`;

      const context = canvas.getContext("2d");
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

      const renderContext = {
        canvasContext: context,
        viewport: viewport
      };

      const task = page.render(renderContext);
      renderTaskRef.current = task;
      await task.promise;
      renderTaskRef.current = null;
    } catch (err) {
      if (err?.name !== "RenderingCancelledException") {
        console.warn("[PdfViewer] Render error:", err);
      }
    } finally {
      setRenderLoading(false);
    }
  }, [pdfDoc, pageNum, scale]);

  useEffect(() => {
    renderPage();
  }, [renderPage]);

  // Zoom Controls
  const handleZoomIn = () => {
    setScale((prev) => Math.min(Math.round((prev + 0.2) * 10) / 10, 2.5));
  };

  const handleZoomOut = () => {
    setScale((prev) => Math.max(Math.round((prev - 0.2) * 10) / 10, 0.6));
  };

  const handleFitWidth = () => {
    if (!containerRef.current || !pdfDoc) return;
    pdfDoc.getPage(pageNum).then((page) => {
      const unscaledViewport = page.getViewport({ scale: 1.0 });
      const containerWidth = containerRef.current.clientWidth - 48; // accounting for padding
      if (containerWidth > 0 && unscaledViewport.width > 0) {
        const fitScale = Math.min(Math.max(containerWidth / unscaledViewport.width, 0.6), 2.0);
        setScale(Math.round(fitScale * 100) / 100);
      }
    });
  };

  const handlePrevPage = () => {
    setPageNum((prev) => Math.max(prev - 1, 1));
  };

  const handleNextPage = () => {
    setPageNum((prev) => Math.min(prev + 1, numPages));
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 select-none overflow-hidden text-slate-200">
      {/* Viewer Toolbar */}
      <div className="px-4 py-2.5 bg-slate-800/90 border-b border-slate-700/80 flex flex-wrap items-center justify-between gap-3 shrink-0">
        {/* Pagination Controls */}
        <div className="flex items-center gap-1.5">
          {numPages > 1 && (
            <>
              <button
                type="button"
                onClick={handlePrevPage}
                disabled={pageNum <= 1 || renderLoading}
                className="p-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 disabled:opacity-40 transition text-white cursor-pointer text-xs"
                title="Previous Page"
              >
                <FaChevronLeft />
              </button>
              <span className="text-xs font-mono font-bold px-2 py-1 bg-slate-900 rounded-md border border-slate-700 text-slate-300">
                {pageNum} / {numPages}
              </span>
              <button
                type="button"
                onClick={handleNextPage}
                disabled={pageNum >= numPages || renderLoading}
                className="p-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 disabled:opacity-40 transition text-white cursor-pointer text-xs"
                title="Next Page"
              >
                <FaChevronRight />
              </button>
            </>
          )}
          {numPages <= 1 && (
            <span className="text-xs font-semibold text-slate-400">
              Page 1 of 1
            </span>
          )}
        </div>

        {/* Zoom & Fit Controls */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleZoomOut}
            disabled={scale <= 0.6 || renderLoading}
            className="p-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 disabled:opacity-40 transition text-white cursor-pointer text-xs flex items-center gap-1"
            title="Zoom Out"
          >
            <FaSearchMinus />
          </button>
          
          <span className="text-xs font-mono font-bold px-2.5 py-1 bg-slate-900 rounded-md border border-slate-700 text-emerald-400 min-w-[54px] text-center">
            {Math.round(scale * 100)}%
          </span>

          <button
            type="button"
            onClick={handleZoomIn}
            disabled={scale >= 2.5 || renderLoading}
            className="p-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 disabled:opacity-40 transition text-white cursor-pointer text-xs flex items-center gap-1"
            title="Zoom In"
          >
            <FaSearchPlus />
          </button>

          <button
            type="button"
            onClick={handleFitWidth}
            className="px-2.5 py-1 rounded-lg bg-slate-700 hover:bg-slate-600 transition text-white cursor-pointer text-xs font-bold flex items-center gap-1 border border-slate-600"
            title="Fit to Width"
          >
            <FaExpand className="text-[10px]" />
            <span>Fit</span>
          </button>
        </div>
      </div>

      {/* Canvas Viewport Container */}
      <div
        ref={containerRef}
        className="flex-1 overflow-auto p-4 sm:p-6 flex items-start justify-center bg-slate-950/90 relative"
      >
        {/* Loading State */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <FaSyncAlt className="w-8 h-8 text-blue-500 animate-spin mb-3" />
            <p className="text-sm font-semibold">Parsing Admit Card PDF...</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="p-6 bg-red-950/60 border border-red-700 text-red-200 rounded-2xl max-w-md text-center flex flex-col items-center my-auto">
            <FaExclamationTriangle className="text-red-400 text-2xl mb-2" />
            <p className="text-sm font-bold">{error}</p>
          </div>
        )}

        {/* Crisp High-DPI PDF Canvas */}
        <div className={`relative transition-all duration-150 shadow-2xl rounded-sm overflow-hidden bg-white ${loading || error ? "hidden" : "block"}`}>
          {renderLoading && (
            <div className="absolute inset-0 bg-slate-900/20 backdrop-blur-[1px] flex items-center justify-center z-10">
              <FaSyncAlt className="w-6 h-6 text-blue-600 animate-spin" />
            </div>
          )}
          <canvas ref={canvasRef} className="block mx-auto shadow-md" />
        </div>
      </div>
    </div>
  );
}
