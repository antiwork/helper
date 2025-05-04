export const formatCurrency = (amountCents: number): string =>
  `$${(amountCents / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
