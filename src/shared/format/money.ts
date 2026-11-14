/**
 * Mise en forme des montants scolaires.
 *
 * Les montants sont stockés en unités mineures. Le nombre de décimales dépend
 * de la devise : le franc CFA (XAF) n’en a aucune, l’euro en a deux. La
 * conversion utilise donc les decimales de la devise plutôt qu’une division
 * fixe par 100.
 */

export function getCurrencyFractionDigits(currencyCode: string): number {
  try {
    const digits = new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: currencyCode,
    }).resolvedOptions().maximumFractionDigits;

    return typeof digits === 'number' && Number.isInteger(digits) ? digits : 2;
  } catch {
    return 2;
  }
}

export function formatMinorAmount(
  amountMinor: number,
  currencyCode: string,
  locale = 'fr-CG',
): string {
  const digits = getCurrencyFractionDigits(currencyCode);
  const divisor = 10 ** digits;
  const value = amountMinor / divisor;

  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    }).format(value);
  } catch {
    return `${value.toFixed(digits)} ${currencyCode}`;
  }
}
