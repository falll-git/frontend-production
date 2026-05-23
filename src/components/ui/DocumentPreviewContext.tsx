"use client";

import {
  createContext,
  useEffect,
  useCallback,
  useContext,
  useMemo,
  useState,
  ReactNode,
} from "react";
import Image from "next/image";
import {
  Download,
  ExternalLink,
  FileText,
  Image as ImageIcon,
  Minus,
  Plus,
} from "lucide-react";

import NewtonsCradleLoader from "@/components/ui/NewtonsCradleLoader";
import SetupModalCloseButton from "@/components/ui/SetupModalCloseButton";
import {
  detectDocumentFileType,
  type DocumentFileType,
} from "@/lib/utils/file";

export type DocumentPreviewFileType = DocumentFileType;

export interface DocumentPreviewState {
  fileUrl: string;
  fileName: string;
  fileType: DocumentPreviewFileType;
}

interface DocumentPreviewContextType {
  isPreviewOpen: boolean;
  preview: DocumentPreviewState | null;
  openPreview: (
    fileUrl: string,
    fileName: string,
    fileType?: DocumentPreviewFileType,
  ) => void;
  closePreview: () => void;
}

interface DocumentPreviewProviderProps {
  children: ReactNode;
}

interface DocumentPreviewProps {
  isOpen: boolean;
  onClose: () => void;
  fileUrl: string;
  fileName: string;
  fileType: DocumentPreviewFileType;
}

const DocumentPreviewContext = createContext<
  DocumentPreviewContextType | undefined
>(undefined);

export function DocumentPreviewProvider({
  children,
}: DocumentPreviewProviderProps): ReactNode {
  const [preview, setPreview] = useState<DocumentPreviewState | null>(null);

  const isPreviewOpen = preview !== null;

  const openPreview = useCallback(
    (fileUrl: string, fileName: string, fileType?: DocumentPreviewFileType) => {
      const normalizedType =
        fileType ?? detectDocumentFileType(fileUrl, fileName);

      const safeBaseName = (fileName || "document")
        .trim()
        .replace(/[<>:"/\\|?*]+/g, "-");

      const normalizedName =
        normalizedType === "pdf" && !safeBaseName.toLowerCase().endsWith(".pdf")
          ? `${safeBaseName}.pdf`
          : safeBaseName;

      setPreview({
        fileUrl,
        fileName: normalizedName,
        fileType: normalizedType,
      });
    },
    [],
  );

  const closePreview = useCallback(() => setPreview(null), []);

  const value = useMemo(
    () => ({ isPreviewOpen, preview, openPreview, closePreview }),
    [closePreview, isPreviewOpen, openPreview, preview],
  );

  return (
    <DocumentPreviewContext.Provider value={value}>
      {children}
      <DocumentPreview
        isOpen={isPreviewOpen}
        onClose={closePreview}
        fileUrl={preview?.fileUrl ?? ""}
        fileName={preview?.fileName ?? ""}
        fileType={preview?.fileType ?? "pdf"}
      />
    </DocumentPreviewContext.Provider>
  );
}

export function useDocumentPreviewContext(): DocumentPreviewContextType {
  const context = useContext(DocumentPreviewContext);
  if (context === undefined) {
    throw new Error(
      "useDocumentPreviewContext must be used within a DocumentPreviewProvider",
    );
  }
  return context;
}

function DocumentPreview({
  isOpen,
  onClose,
  fileUrl,
  fileName,
  fileType,
}: DocumentPreviewProps): ReactNode {
  const [isClosing, setIsClosing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [zoom, setZoom] = useState(100);

  const handleClose = useCallback(() => {
    setIsClosing(true);
    setTimeout(() => {
      setIsClosing(false);
      onClose();
    }, 200);
  }, [onClose]);

  useEffect(() => {
    if (!isOpen) return;

    const timer = setTimeout(() => {
      setIsLoading(true);
      setZoom(100);
    }, 0);

    return () => clearTimeout(timer);
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }

    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        handleClose();
      }
    };

    if (isOpen) {
      window.addEventListener("keydown", handleEsc);
    }

    return () => {
      window.removeEventListener("keydown", handleEsc);
      document.body.style.overflow = "unset";
    };
  }, [handleClose, isOpen]);

  const handleZoomIn = () => {
    if (zoom < 200) setZoom(zoom + 25);
  };

  const handleZoomOut = () => {
    if (zoom > 50) setZoom(zoom - 25);
  };

  const handleDownload = () => {
    const link = document.createElement("a");
    link.href = fileUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleOpenInNewTab = () => {
    window.open(fileUrl, "_blank", "noopener,noreferrer");
  };

  const documentTypeLabel =
    fileType === "pdf"
      ? "Dokumen PDF"
      : fileType === "image"
        ? "Gambar Dokumen"
        : fileType === "presentation"
          ? "Presentasi PowerPoint"
          : fileType === "office"
            ? "Dokumen Office"
            : "Dokumen";

  if (!isOpen) return null;

  return (
    <div
      data-dashboard-overlay="true"
      className={`doc-preview-overlay ${isClosing ? "closing" : ""}`}
      onClick={handleClose}
    >
      <div
        className={`doc-preview-container ${isClosing ? "closing" : ""}`}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="doc-preview-header">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#e6f2fa]">
              {fileType === "image" ? (
                <ImageIcon className="h-5 w-5 text-slate-900" />
              ) : (
                <FileText className="h-5 w-5 text-slate-900" />
              )}
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-800">{fileName}</h3>
              <p className="text-sm text-gray-500">{documentTypeLabel}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {fileType === "image" ? (
              <div className="mr-2 flex items-center gap-1 rounded-lg bg-gray-100 p-1">
                <button
                  type="button"
                  onClick={handleZoomOut}
                  className="rounded-lg p-2 transition-colors hover:bg-gray-200"
                  title="Perkecil"
                >
                  <Minus className="h-4 w-4 text-gray-600" />
                </button>
                <span className="min-w-12.5 text-center text-sm font-medium text-gray-700">
                  {zoom}%
                </span>
                <button
                  type="button"
                  onClick={handleZoomIn}
                  className="rounded-lg p-2 transition-colors hover:bg-gray-200"
                  title="Perbesar"
                >
                  <Plus className="h-4 w-4 text-gray-600" />
                </button>
              </div>
            ) : null}

            <button
              type="button"
              onClick={handleDownload}
              className="flex items-center gap-2 rounded-lg bg-[#157ec3] p-2.5 text-white transition-colors hover:bg-[#0d5a8f]"
              title="Unduh"
            >
              <Download className="h-5 w-5" />
              <span className="hidden text-sm font-medium sm:inline">Unduh</span>
            </button>

            <SetupModalCloseButton
              onClick={handleClose}
              title="Tutup (Esc)"
              aria-label="Tutup preview"
            />
          </div>
        </div>

        <div className="doc-preview-content">
          {isLoading && fileType !== "other" ? (
            <div className="doc-preview-loading">
              <NewtonsCradleLoader
                size={56}
                color="#157ec3"
                label="Memuat dokumen..."
              />
              <p className="mt-4 font-medium text-gray-600">
                Memuat dokumen...
              </p>
            </div>
          ) : null}

          {fileType === "pdf" ? (
            <iframe
              src={fileUrl}
              className="doc-preview-iframe"
              onLoad={() => setIsLoading(false)}
              title={fileName}
            />
          ) : fileType === "image" ? (
            <div className="doc-preview-image-container" style={{ overflow: "auto" }}>
              <Image
                src={fileUrl}
                alt={fileName}
                className="doc-preview-image"
                style={{
                  transform: `scale(${zoom / 100})`,
                  transformOrigin: "center center",
                }}
                onLoad={() => setIsLoading(false)}
                width={800}
                height={600}
                unoptimized
              />
            </div>
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-4 px-6 text-center">
              <FileText className="h-9 w-9 text-slate-900" />
              <div>
                <p className="text-base font-semibold text-gray-800">
                  Preview inline belum tersedia untuk format ini.
                </p>
                <p className="mt-1 text-sm text-gray-500">
                  File tetap bisa dibuka atau diunduh sesuai izin akses.
                </p>
              </div>
              <div className="flex flex-wrap justify-center gap-2">
                <button
                  type="button"
                  onClick={handleOpenInNewTab}
                  className="flex items-center gap-2 rounded-lg border border-[#157ec3] px-4 py-2 text-sm font-semibold text-[#157ec3] transition-colors hover:bg-[#e6f2fa]"
                >
                  <ExternalLink className="h-4 w-4" aria-hidden="true" />
                  <span>Buka File</span>
                </button>
                <button
                  type="button"
                  onClick={handleDownload}
                  className="flex items-center gap-2 rounded-lg bg-[#157ec3] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#0d5a8f]"
                >
                  <Download className="h-4 w-4" aria-hidden="true" />
                  <span>Unduh</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
