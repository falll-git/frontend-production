"use client";

import { Trash2 } from "lucide-react";

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
    <div className="modal-overlay" onClick={isLoading ? undefined : onClose}>
      <div className="modal-content" onClick={(event) => event.stopPropagation()}>
        <div className="text-center">
          <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
            <Trash2 className="w-8 h-8 text-red-600" aria-hidden="true" />
          </div>
          <h3 className="text-xl font-bold text-gray-800 mb-2">{title}</h3>
          <p className="text-gray-500 mb-6">
            Apakah Anda yakin ingin menghapus {entityLabel}{" "}
            <strong>{itemName}</strong>?
          </p>
          <div className="flex justify-center gap-3">
            <button
              onClick={onClose}
              className="btn btn-outline"
              disabled={isLoading}
            >
              Batal
            </button>
            <button
              onClick={onConfirm}
              className="btn btn-danger"
              disabled={isLoading}
            >
              <Trash2 className="w-4 h-4" aria-hidden="true" />
              {isLoading ? "Menghapus..." : "Hapus"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
