import SetupSelect from "@/components/ui/SetupSelect";
import type { Storage } from "@/types/master.types";

type PhysicalStorageSelectProps = {
  id: string;
  name: string;
  value: string;
  storages: Storage[];
  isLoading?: boolean;
  disabled?: boolean;
  onChange: (event: React.ChangeEvent<HTMLSelectElement>) => void;
};

export function formatPhysicalStorageOption(storage: Storage) {
  return `${storage.kodeKantor} - ${storage.namaKantor} | ${storage.kodeLemari} (${storage.rak})`;
}

export default function PhysicalStorageSelect({
  id,
  name,
  value,
  storages,
  isLoading = false,
  disabled = false,
  onChange,
}: PhysicalStorageSelectProps) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-2">
        Tempat Penyimpanan Fisik <span className="text-red-500">*</span>
      </label>
      <SetupSelect
        id={id}
        name={name}
        value={value}
        onChange={onChange}
        disabled={disabled || isLoading || storages.length === 0}
        required
      >
        <option value="">
          {isLoading ? "Memuat tempat penyimpanan..." : "Pilih Tempat Penyimpanan"}
        </option>
        {storages.map((storage) => (
          <option key={storage.id} value={String(storage.id)}>
            {formatPhysicalStorageOption(storage)}
          </option>
        ))}
      </SetupSelect>
      <p className="mt-2 text-xs text-slate-500">
        Pilih lokasi rak fisik surat dari master Arsip Digital.
      </p>
    </div>
  );
}
