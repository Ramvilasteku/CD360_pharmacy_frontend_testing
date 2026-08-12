export const GST_RATE = 0.18;

export const inr = (n) =>
  `₹${Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

export const normalizeCycle = (cycle) =>
  ({
    monthly: "MONTHLY",
    quarterly: "QUARTERLY",
    annual: "YEARLY",
    yearly: "YEARLY",
    lifetime: "LIFETIME",
  })[String(cycle || "").toLowerCase()] || "";

/* =========================================================
   PLAN REGISTRY
   key         - internal id used by the UI (never sent to API)
   backendName - must match `plan_name` in /api/phonepe/plans
   cycles[]    - what the modal shows. `lineItems` can be a plain
                 array (fixed price) or a function (api) => items
                 that reads the live price off the backend row.
========================================================= */

export const PLANS = {
  software: {
    key: "software",
    name: "Software Plan",
    backendName: "Software",
    cycles: [
      {
        value: "YEARLY",
        label: "One Year",
        note: "(12 Months)",
        lineItems: [
          { label: "Clinic/Hospital Management Software (1 year)", amount: 0 },
        ],
      },
    ],
  },

  website: {
    key: "website",
    name: "Website Plan",
    backendName: "Website",
    cycles: [
      {
        value: "YEARLY",
        label: "Yearly",
        note: "(12 Months)",
        lineItems: (api) => [
          {
            label: "Custom Advanced Website (1 year)",
            amount: api?.yearly_price ?? 10000,
          },
          { label: "Clinic/Hospital Management Software", amount: 0 },
        ],
      },
    ],
  },

  lifetime: {
    key: "lifetime",
    name: "Lifetime Plan",
    backendName: "Lifetime",
    cycles: [
      {
        value: "LIFETIME",
        label: "One Time",
        note: "(10 Years)",
        lineItems: (api) => [
          {
            label: "Lifetime Clinic/Hospital Management Software (10 years)",
            amount: api?.yearly_price ?? 10000,
          },
        ],
      },
    ],
  },

  digitalVisibility: {
    key: "digitalVisibility",
    name: "Digital Visibility Plan",
    backendName: "Digital Visibility",
    cycles: [
      {
        value: "MONTHLY",
        label: "Monthly",
        note: "(1 Month)",
        lineItems: (api) => {
          const perMonth = api?.quarterly_price
            ? Number(api.quarterly_price) / 3
            : 4999;

          return [
            { label: "Website & setup fee (1 year)", amount: 10000 },
            {
              label: `Digital Visibility — ${inr(perMonth)} × 1 month`,
              amount: perMonth,
            },
          ];
        },
      },
      {
        value: "QUARTERLY",
        label: "Quarterly",
        note: "(3 Months)",
        lineItems: (api) => {
          const total = Number(api?.quarterly_price ?? 14997);
          return [
            {
              label: `Digital Visibility — ${inr(total / 3)} × 3 months`,
              amount: total,
            },
          ];
        },
      },
      {
        value: "YEARLY",
        label: "Annual",
        note: "(12 Months)",
        lineItems: (api) => {
          const total = Number(api?.yearly_price ?? 47988);
          return [
            {
              label: `Digital Visibility — ${inr(total / 12)} × 12 months`,
              amount: total,
            },
          ];
        },
      },
    ],
  },
};

/* Merges a registry entry with its backend row.
   Returns null if the plan key is unknown. */

export const resolvePlan = (key, subscriptions = []) => {
  const plan = PLANS[key];
  if (!plan) {
    console.warn(`[planPricing] unknown plan key "${key}"`);
    return null;
  }

  const api = subscriptions.find((p) => p.plan_name === plan.backendName);

  if (!api) {
    console.warn(
      `[planPricing] no backend row for "${plan.backendName}" — using fallback prices`,
    );
  }

  return {
    id: api?.id ?? null,
    key: plan.key,
    name: plan.name,
    isResolved: Boolean(api),
    cycles: plan.cycles.map((c) => ({
      ...c,
      lineItems: typeof c.lineItems === "function" ? c.lineItems(api) : c.lineItems,
    })),
  };
};