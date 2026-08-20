import type { ReactNode } from "react";

type SetupModalDetailLayoutProps = {
  summary?: ReactNode;
  information?: ReactNode;
  details?: ReactNode;
  attachments?: ReactNode;
  notes?: ReactNode;
  className?: string;
};

export default function SetupModalDetailLayout({
  summary,
  information,
  details,
  attachments,
  notes,
  className = "",
}: SetupModalDetailLayoutProps) {
  const parts = [
    { key: "summary", content: summary },
    { key: "information", content: information },
    { key: "detail", content: details },
    { key: "attachment", content: attachments },
    { key: "notes", content: notes },
  ].filter(
    (part) =>
      part.content !== null &&
      part.content !== undefined &&
      part.content !== false &&
      part.content !== "",
  );

  return (
    <div
      data-ui="modal-detail-layout"
      className={`min-w-0 max-w-full ${className}`.trim()}
    >
      {parts.map((part, index) => (
        <div
          key={part.key}
          data-modal-detail-part={part.key}
          className={`min-w-0 max-w-full space-y-6 ${
            index > 0 ? "mt-6 border-t border-slate-200 pt-6" : ""
          }`.trim()}
        >
          {part.content}
        </div>
      ))}
    </div>
  );
}
