import type { Page } from "@playwright/test";

const API_PREFIX = "/api/v1";

const dashboardResponses: Record<string, unknown> = {
  "/notifications": {
    status: true,
    success: true,
    data: [],
    meta: { total: 0, page: 1, limit: 10, last_page: 1 },
  },
  "/notifications/unread-count": {
    status: true,
    success: true,
    data: { unread_count: 0 },
  },
  "/legal/reports/third-party-documents": {
    status: true,
    success: true,
    data: {
      notary: [{ status: "PENDING", total_records: 1 }],
      insurance: [{ status: "PENDING", total_records: 2 }],
      kjpp: [{ status: "COMPLETED", total_records: 1 }],
      claims: [],
    },
  },
  "/legal/reports/third-party-deposit-funds": {
    status: true,
    success: true,
    data: [
      {
        type: "NOTARIS",
        status: "ACTIVE",
        total_records: 1,
        total_deposit_amount: 10_000_000,
        total_payment_amount: 5_000_000,
        total_refund_amount: 0,
        balance_amount: 5_000_000,
      },
    ],
  },
  "/debtor-reports/npf": {
    status: true,
    success: true,
    data: {
      formula: "Outstanding Kol 3-5 / Total outstanding",
      numerator: 30_000_000_000,
      denominator: 100_000_000_000,
      percentage: 30,
      breakdown_per_kol: [
        {
          level: 1,
          code: "KOL_1",
          name: "Lancar",
          contract_count: 100,
          outstanding: 50_000_000_000,
          is_npf: false,
        },
        {
          level: 2,
          code: "KOL_2",
          name: "Dalam Perhatian Khusus",
          contract_count: 20,
          outstanding: 20_000_000_000,
          is_npf: false,
        },
        {
          level: 3,
          code: "KOL_3",
          name: "Kurang Lancar",
          contract_count: 10,
          outstanding: 10_000_000_000,
          is_npf: true,
        },
        {
          level: 4,
          code: "KOL_4",
          name: "Diragukan",
          contract_count: 8,
          outstanding: 8_000_000_000,
          is_npf: true,
        },
        {
          level: 5,
          code: "KOL_5",
          name: "Macet",
          contract_count: 12,
          outstanding: 12_000_000_000,
          is_npf: true,
        },
      ],
      details: [],
      trend: [
        {
          period_month: "2026-04",
          numerator: 30_000_000_000,
          denominator: 100_000_000_000,
          percentage: 30,
        },
      ],
      items: [],
      meta: { total: 0, page: 1, limit: 10, last_page: 1 },
    },
  },
  "/debtor-reports/marketing-activity": {
    status: true,
    success: true,
    data: {
      summary: [],
      recent_activities: [
        {
          id: "00000000-0000-4000-8000-000000000101",
          activity_kind: "HANDLING_STEP",
          status: "PENDING",
          activity_date: "2026-01-18T00:00:00.000Z",
          target_date: "2026-01-27T00:00:00.000Z",
          debtor: {
            id: "00000000-0000-4000-8000-000000000201",
            name: "DEBITUR CONTOH",
            debtor_number: "VISUAL-001",
          },
          contract: {
            id: "00000000-0000-4000-8000-000000000301",
            debtor_id: "00000000-0000-4000-8000-000000000201",
            no_kontrak: "VISUAL-KONTRAK-001",
          },
          handling_step: "Siapkan alternatif jadwal pembayaran.",
          created_at: "2026-01-18T00:00:00.000Z",
        },
        {
          id: "00000000-0000-4000-8000-000000000102",
          activity_kind: "ACTION_PLAN",
          status: "IN_PROGRESS",
          activity_date: "2026-01-16T00:00:00.000Z",
          target_date: "2026-01-23T00:00:00.000Z",
          debtor: {
            id: "00000000-0000-4000-8000-000000000202",
            name: "DEBITUR CONTOH",
            debtor_number: "VISUAL-002",
          },
          contract: {
            id: "00000000-0000-4000-8000-000000000302",
            debtor_id: "00000000-0000-4000-8000-000000000202",
            no_kontrak: "VISUAL-KONTRAK-002",
          },
          action_plan: "Hubungi debitur dan evaluasi kondisi pembayaran.",
          created_at: "2026-01-16T00:00:00.000Z",
        },
      ],
    },
  },
  "/storage-usage/summary": {
    status: true,
    success: true,
    data: {
      config: {
        free_quota_gb: 100,
        free_quota_bytes: 107_374_182_400,
        overage_price_per_gb: 200,
        currency: "IDR",
        billing_model: "TIERED",
        pricing_tiers: [],
        manual_review_threshold_gb: 1_000,
      },
      usage: {
        used_bytes: 0,
        used_gb: 0,
        used_percentage: 0,
        remaining_bytes: 107_374_182_400,
        remaining_gb: 100,
        overage_bytes: 0,
        overage_gb: 0,
        estimated_overage_cost: 0,
        billable_gb: 0,
        manual_review_required: false,
        unpriced_gb: 0,
        file_count: 0,
        status_key: "SAFE",
        status_label: "Aman",
      },
      breakdown: [],
      trend: [
        {
          date: "2026-01-09",
          label: "09 Jan",
          used_bytes: 0,
          used_gb: 0,
          file_count: 0,
          delta_bytes: 0,
          delta_gb: 0,
          limit_gb: 100,
          is_estimated: false,
        },
        {
          date: "2026-01-10",
          label: "10 Jan",
          used_bytes: 0,
          used_gb: 0,
          file_count: 0,
          delta_bytes: 0,
          delta_gb: 0,
          limit_gb: 100,
          is_estimated: false,
        },
        {
          date: "2026-01-11",
          label: "11 Jan",
          used_bytes: 0,
          used_gb: 0,
          file_count: 0,
          delta_bytes: 0,
          delta_gb: 0,
          limit_gb: 100,
          is_estimated: false,
        },
        {
          date: "2026-01-12",
          label: "12 Jan",
          used_bytes: 0,
          used_gb: 0,
          file_count: 0,
          delta_bytes: 0,
          delta_gb: 0,
          limit_gb: 100,
          is_estimated: false,
        },
        {
          date: "2026-01-13",
          label: "13 Jan",
          used_bytes: 0,
          used_gb: 0,
          file_count: 0,
          delta_bytes: 0,
          delta_gb: 0,
          limit_gb: 100,
          is_estimated: false,
        },
        {
          date: "2026-01-14",
          label: "14 Jan",
          used_bytes: 0,
          used_gb: 0,
          file_count: 0,
          delta_bytes: 0,
          delta_gb: 0,
          limit_gb: 100,
          is_estimated: false,
        },
        {
          date: "2026-01-15",
          label: "15 Jan",
          used_bytes: 0,
          used_gb: 0,
          file_count: 0,
          delta_bytes: 0,
          delta_gb: 0,
          limit_gb: 100,
          is_estimated: false,
        },
      ],
      billing: {
        billing_model: "TIERED",
        free_quota_gb: 100,
        billable_gb: 0,
        priced_usage_gb: 0,
        unpriced_gb: 0,
        manual_review_threshold_gb: 1_000,
        manual_review_required: false,
        estimated_cost: 0,
        tier_breakdown: [],
      },
      updated_at: "2026-01-15T08:00:00.000Z",
    },
  },
};

function matchesApiPath(url: URL, path: string) {
  return url.pathname === `${API_PREFIX}${path}`;
}

export async function installDashboardVisualFixtures(page: Page) {
  await page.route(
    (url) => matchesApiPath(url, "/users/me"),
    async (route) => {
      const response = await route.fetch();
      const payload = (await response.json()) as {
        data?: Record<string, unknown>;
      };

      if (payload.data && typeof payload.data === "object") {
        payload.data.name = "Admin Visual";
      }

      await route.fulfill({ response, json: payload });
    },
  );

  for (const [path, payload] of Object.entries(dashboardResponses)) {
    await page.route(
      (url) => matchesApiPath(url, path),
      async (route) => {
        if (route.request().method() !== "GET") {
          await route.fallback();
          return;
        }

        await route.fulfill({
          status: 200,
          contentType: "application/json",
          json: payload,
        });
      },
    );
  }
}
