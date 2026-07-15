import { ExternalLink, MapPin } from "lucide-react";

import SetupStatusBadge from "@/components/ui/SetupStatusBadge";
import {
  buildGoogleMapsUrl,
  formatVisitAccuracy,
  formatVisitCoordinate,
  hasValidVisitLocation,
} from "@/lib/visit-location";
import { formatDateTime } from "@/lib/utils/date";

type VisitLocationValues = {
  visit_address?: string | null;
  visit_latitude: number | null;
  visit_longitude: number | null;
  visit_location_accuracy_m: number | null;
  visit_location_recorded_at: string | null;
};

export function VisitLocationStatusBadge({
  latitude,
  longitude,
}: {
  latitude: number | null | undefined;
  longitude: number | null | undefined;
}) {
  const hasLocation = hasValidVisitLocation({
    visit_latitude: latitude,
    visit_longitude: longitude,
  });

  return (
    <SetupStatusBadge
      status={hasLocation ? "Lokasi Tercatat" : "Belum Ada"}
      label={hasLocation ? "Lokasi Tercatat" : "Belum Ada"}
      tone={hasLocation ? "emerald" : "amber"}
    />
  );
}

export default function VisitLocationDetails({
  location,
  recordedAtLabel = "Waktu Lokasi Direkam",
  missingMessage = "Lokasi belum tercatat.",
  availableMessage = "Koordinat tersimpan bersama aktivitas.",
  showAddress = true,
}: {
  location: VisitLocationValues;
  recordedAtLabel?: string;
  missingMessage?: string;
  availableMessage?: string;
  showAddress?: boolean;
}) {
  const hasLocation = hasValidVisitLocation(location);
  const mapsUrl = buildGoogleMapsUrl(
    location.visit_latitude,
    location.visit_longitude,
  );

  return (
    <div className="min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-sky-50 text-[#157ec3]">
            <MapPin className="size-5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-900">Geotag Kunjungan</p>
            <p className="mt-0.5 text-xs leading-5 text-slate-500">
              {hasLocation ? availableMessage : missingMessage}
            </p>
          </div>
        </div>
        <VisitLocationStatusBadge
          latitude={location.visit_latitude}
          longitude={location.visit_longitude}
        />
      </div>

      <dl className="grid min-w-0 border-t border-slate-100 sm:grid-cols-2">
        {showAddress ? (
          <div className="min-w-0 border-b border-slate-100 px-4 py-3 sm:col-span-2">
            <dt className="text-xs font-semibold uppercase tracking-[0.06em] text-slate-500">
              Alamat Kunjungan
            </dt>
            <dd className="mt-1 whitespace-pre-wrap break-words text-sm font-medium text-slate-900">
              {location.visit_address?.trim() || "-"}
            </dd>
          </div>
        ) : null}
        <div className="min-w-0 border-b border-slate-100 px-4 py-3 sm:border-r">
          <dt className="text-xs font-semibold uppercase tracking-[0.06em] text-slate-500">
            Latitude
          </dt>
          <dd className="mt-1 break-all font-mono text-sm font-semibold text-slate-900">
            {formatVisitCoordinate(location.visit_latitude)}
          </dd>
        </div>
        <div className="min-w-0 border-b border-slate-100 px-4 py-3">
          <dt className="text-xs font-semibold uppercase tracking-[0.06em] text-slate-500">
            Longitude
          </dt>
          <dd className="mt-1 break-all font-mono text-sm font-semibold text-slate-900">
            {formatVisitCoordinate(location.visit_longitude)}
          </dd>
        </div>
        <div className="min-w-0 border-b border-slate-100 px-4 py-3 sm:border-r sm:border-b-0">
          <dt className="text-xs font-semibold uppercase tracking-[0.06em] text-slate-500">
            Akurasi
          </dt>
          <dd className="mt-1 text-sm font-semibold text-slate-900">
            {formatVisitAccuracy(location.visit_location_accuracy_m)}
          </dd>
        </div>
        <div className="min-w-0 px-4 py-3">
          <dt className="text-xs font-semibold uppercase tracking-[0.06em] text-slate-500">
            {recordedAtLabel}
          </dt>
          <dd className="mt-1 break-words text-sm font-semibold text-slate-900">
            {formatDateTime(location.visit_location_recorded_at)}
          </dd>
        </div>
      </dl>

      {mapsUrl ? (
        <div className="border-t border-slate-100 px-4 py-3">
          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="uiverse-modal-button uiverse-modal-button--primary w-full justify-center sm:w-auto"
          >
            <ExternalLink className="size-4" aria-hidden="true" />
            <span>Buka di Maps</span>
          </a>
        </div>
      ) : null}
    </div>
  );
}
