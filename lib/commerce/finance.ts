export type UnitFinancials = {
  revenue: number;
  purchasePrice: number | null;
  marginValue: number | null;
  marginPercent: number | null;
  profitPerUnit: number | null;
};

export type OrderLineFinancials = {
  revenue: number;
  cost: number | null;
  grossProfit: number | null;
};

export type OrderFinancials = {
  revenue: number;
  cost: number | null;
  grossProfit: number | null;
  marginPercent: number | null;
  hasCompleteCostBasis: boolean;
};

function normalizeOptionalMoney(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function getMarginPercent(revenue: number, grossProfit: number | null) {
  if (grossProfit === null || revenue <= 0) {
    return null;
  }

  return Number(((grossProfit / revenue) * 100).toFixed(2));
}

function roundMoney(value: number) {
  return Number(value.toFixed(2));
}

export function calculateTieredMarkup(price: number): number {
  const normalized = Math.max(0, price);

  if (normalized < 1000) {
    return roundMoney(normalized * 1.12);
  }
  if (normalized < 5000) {
    return roundMoney(normalized * 1.07);
  }
  if (normalized < 10000) {
    return roundMoney(normalized * 1.05);
  }

  return roundMoney(normalized * 1.03);
}

export function calculateUnitFinancials(input: {
  price: number;
  purchasePrice: number | null | undefined;
}): UnitFinancials {
  const revenue = Math.max(0, input.price);
  const purchasePrice = normalizeOptionalMoney(input.purchasePrice);

  if (purchasePrice === null) {
    return {
      revenue,
      purchasePrice: null,
      marginValue: null,
      marginPercent: null,
      profitPerUnit: null,
    };
  }

  const marginValue = revenue - purchasePrice;

  return {
    revenue,
    purchasePrice,
    marginValue,
    marginPercent: getMarginPercent(revenue, marginValue),
    profitPerUnit: marginValue,
  };
}

export function calculateOrderLineFinancials(input: {
  quantity: number;
  unitPrice: number;
  unitCost?: number | null;
}): OrderLineFinancials {
  const revenue = Math.max(0, input.unitPrice) * Math.max(0, input.quantity);
  const unitCost = normalizeOptionalMoney(input.unitCost);

  if (unitCost === null) {
    return {
      revenue,
      cost: null,
      grossProfit: null,
    };
  }

  const cost = unitCost * Math.max(0, input.quantity);

  return {
    revenue,
    cost,
    grossProfit: revenue - cost,
  };
}

export function calculateOrderFinancialsFromItems(
  items: Array<{
    quantity: number;
    unitPrice: number;
    unitCost?: number | null;
  }>,
): OrderFinancials {
  const lines = items.map(calculateOrderLineFinancials);
  const revenue = lines.reduce((sum, line) => sum + line.revenue, 0);
  const hasCompleteCostBasis = lines.every((line) => line.cost !== null);
  const cost = hasCompleteCostBasis
    ? lines.reduce((sum, line) => sum + (line.cost ?? 0), 0)
    : null;
  const grossProfit = cost === null ? null : revenue - cost;

  return {
    revenue,
    cost,
    grossProfit,
    marginPercent: getMarginPercent(revenue, grossProfit),
    hasCompleteCostBasis,
  };
}

export function resolveOrderFinancials(input: {
  totalPrice: number;
  totalCost?: number | null;
  grossProfit?: number | null;
  items: Array<{
    quantity: number;
    unitPrice: number;
    unitCost?: number | null;
  }>;
}): OrderFinancials {
  const aggregated = calculateOrderFinancialsFromItems(input.items);
  const storedCost = normalizeOptionalMoney(input.totalCost);
  const storedGrossProfit = normalizeOptionalMoney(input.grossProfit);
  const revenue = Math.max(0, input.totalPrice);
  const cost = storedCost ?? aggregated.cost;
  const grossProfit =
    storedGrossProfit ?? (cost === null ? aggregated.grossProfit : revenue - cost);

  return {
    revenue,
    cost,
    grossProfit,
    marginPercent: getMarginPercent(revenue, grossProfit),
    hasCompleteCostBasis: cost !== null,
  };
}
