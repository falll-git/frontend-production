"use client";

type InputDokumenSectionTitleProps = {
  title: string;
  description?: string;
};

export default function InputDokumenSectionTitle({
  title,
  description,
}: InputDokumenSectionTitleProps) {
  return (
    <div>
      <h2 className="text-sm font-semibold uppercase tracking-[0.08em] text-gray-500">
        {title}
      </h2>
      {description ? (
        <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p>
      ) : null}
    </div>
  );
}
