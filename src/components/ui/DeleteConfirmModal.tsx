"use client";

import { Trash2 } from "lucide-react";

import DashboardModal from "@/components/ui/DashboardModal";

type DeleteConfirmModalProps = {
  isOpen: boolean;
  title: string;
  itemName: string;
  entityLabel: string;
  onClose: () => void;
  onConfirm: () => void;
  isLoading?: boolean;
};

export default function DeleteConfirmModal({
  isOpen,
  title,
  itemName,
  entityLabel,
  onClose,
  onConfirm,
  isLoading = false,
}: DeleteConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <DashboardModal
      isOpen={isOpen}
      title={title}
      description={`Tindakan ini akan menghapus ${entityLabel} dari sistem.`}
      onClose={onClose}
      closeDisabled={isLoading}
      maxWidth="md"
      bodyClassName="p-6"
      footer={
        <>
          <button
            onClick={onClose}
            className="uiverse-modal-button uiverse-modal-button--neutral"
            disabled={isLoading}
            type="button"
          >
            Batal
          </button>
          <button
            onClick={onConfirm}
            className="uiverse-modal-button uiverse-modal-button--danger"
            disabled={isLoading}
            type="button"
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
            <span>{isLoading ? "Menghapus..." : "Hapus"}</span>
          </button>
        </>
      }
    >
      <div className="rounded-lg border border-red-100 bg-red-50 px-4 py-4">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-red-100 text-slate-900">
            <Trash2 className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <p className="text-sm font-semibold text-red-900">
              {itemName || "Data terpilih"}
            </p>
            <p className="mt-1 text-sm leading-6 text-red-800">
              Data yang sudah dihapus tidak bisa dikembalikan dari halaman ini.
            </p>
          </div>
        </div>
      </div>
    </DashboardModal>
  );
}
