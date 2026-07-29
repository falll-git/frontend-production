export const BRAND_KEYS = [
  "demoruwangarsip",
  "arthamadani",
  "bogotegarberiman",
  "riyalirsyadi",
] as const;

export type BrandKey = (typeof BRAND_KEYS)[number];

export type BrandLogoAsset = {
  src: string;
  alt: string;
  sourceWidth: number;
  sourceHeight: number;
  contentBox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
};

export type BrandConfig = {
  key: BrandKey;
  productName: string;
  institutionName: string | null;
  ruwangLogo: BrandLogoAsset;
  partnerLogo: BrandLogoAsset | null;
  authLogoLayout: {
    ruwangMaxWidth: number;
    partnerMaxWidth: number | null;
    separatorSize: number;
  };
};

const RUWANG_LOGO: BrandLogoAsset = {
  src: "/branding/logo-ruwang-arsip.png",
  alt: "Logo Ruwang Arsip",
  sourceWidth: 1536,
  sourceHeight: 1024,
  contentBox: { x: 0, y: 0, width: 1536, height: 1024 },
};

const BRAND_CONFIGS: Record<BrandKey, BrandConfig> = {
  demoruwangarsip: {
    key: "demoruwangarsip",
    productName: "Ruwang Arsip",
    institutionName: null,
    ruwangLogo: RUWANG_LOGO,
    partnerLogo: null,
    authLogoLayout: {
      ruwangMaxWidth: 405,
      partnerMaxWidth: null,
      separatorSize: 0,
    },
  },
  arthamadani: {
    key: "arthamadani",
    productName: "Ruwang Arsip",
    institutionName: "BPRS Artha Madani",
    ruwangLogo: RUWANG_LOGO,
    partnerLogo: {
      src: "/branding/logo-bprs-artha-madani.png",
      alt: "Logo BPRS Artha Madani",
      sourceWidth: 6142,
      sourceHeight: 3780,
      contentBox: { x: 515, y: 807, width: 5112, height: 2166 },
    },
    authLogoLayout: {
      ruwangMaxWidth: 300,
      partnerMaxWidth: 470,
      separatorSize: 34,
    },
  },
  bogotegarberiman: {
    key: "bogotegarberiman",
    productName: "Ruwang Arsip",
    institutionName: "BPRS Bogor Tegar Beriman",
    ruwangLogo: RUWANG_LOGO,
    partnerLogo: {
      src: "/branding/logo-bprs-bogor-tegar-beriman.png",
      alt: "Logo BPRS Bogor Tegar Beriman",
      sourceWidth: 4016,
      sourceHeight: 886,
      contentBox: { x: 8, y: 25, width: 3999, height: 836 },
    },
    authLogoLayout: {
      ruwangMaxWidth: 315,
      partnerMaxWidth: 540,
      separatorSize: 34,
    },
  },
  riyalirsyadi: {
    key: "riyalirsyadi",
    productName: "Ruwang Arsip",
    institutionName: "Bank Syariah Riyal Irsyadi",
    ruwangLogo: RUWANG_LOGO,
    partnerLogo: {
      src: "/branding/logo-bprs-riyal-irsyadi.png",
      alt: "Logo Bank Syariah Riyal Irsyadi",
      sourceWidth: 2465,
      sourceHeight: 346,
      contentBox: { x: 0, y: 0, width: 2464, height: 345 },
    },
    authLogoLayout: {
      ruwangMaxWidth: 325,
      partnerMaxWidth: 520,
      separatorSize: 34,
    },
  },
};

type BrandDisplayOverrides = {
  ruwangMaxWidth?: string;
  partnerMaxWidth?: string;
  separatorSize?: string;
};

function readBoundedNumber(
  value: string | undefined,
  fallback: number,
  minimum: number,
  maximum: number,
): number {
  if (!value?.trim()) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= minimum && parsed <= maximum
    ? parsed
    : fallback;
}

export function resolveBrandConfig(
  requestedKey: string | undefined,
  overrides: BrandDisplayOverrides = {},
): BrandConfig {
  const normalizedKey = requestedKey?.trim().toLowerCase() || "demoruwangarsip";
  if (!BRAND_KEYS.includes(normalizedKey as BrandKey)) {
    throw new Error(
      `NEXT_PUBLIC_APP_BRAND tidak dikenal: ${normalizedKey}. Pilihan valid: ${BRAND_KEYS.join(", ")}.`,
    );
  }

  const base = BRAND_CONFIGS[normalizedKey as BrandKey];
  return {
    ...base,
    authLogoLayout: {
      ruwangMaxWidth: readBoundedNumber(
        overrides.ruwangMaxWidth,
        base.authLogoLayout.ruwangMaxWidth,
        160,
        720,
      ),
      partnerMaxWidth:
        base.authLogoLayout.partnerMaxWidth === null
          ? null
          : readBoundedNumber(
              overrides.partnerMaxWidth,
              base.authLogoLayout.partnerMaxWidth,
              160,
              720,
            ),
      separatorSize: base.partnerLogo
        ? readBoundedNumber(
            overrides.separatorSize,
            base.authLogoLayout.separatorSize,
            20,
            64,
          )
        : 0,
    },
  };
}

export const appBrand = resolveBrandConfig(
  process.env.NEXT_PUBLIC_APP_BRAND,
  {
    ruwangMaxWidth: process.env.NEXT_PUBLIC_RUWANG_LOGO_MAX_WIDTH,
    partnerMaxWidth: process.env.NEXT_PUBLIC_PARTNER_LOGO_MAX_WIDTH,
    separatorSize: process.env.NEXT_PUBLIC_BRAND_SEPARATOR_SIZE,
  },
);
