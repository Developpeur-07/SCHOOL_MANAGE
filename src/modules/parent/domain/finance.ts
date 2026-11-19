/**
 * Lecture des frais et des paiements d’un enfant (lecture seule côté parent).
 *
 * Les montants sont stockés en unités mineures (`amount_minor`) : leur mise en
 * forme dépend de la devise de l’école, dont le nombre de décimales peut
 * varier (XAF n’en a aucune).
 */

export type FeeStatus = 'paid' | 'partial' | 'unpaid';

export interface ParentFee {
  id: string;
  label: string;
  amountMinor: number;
  dueOn: string;
}

export interface ParentPayment {
  id: string;
  receiptNumber: string;
  amountMinor: number;
  paidAt: string;
  method: 'cash' | 'bank_transfer' | 'cheque' | 'other';
  note: string | null;
  feeId: string | null;
}

export interface ParentFeeWithStatus extends ParentFee {
  paidMinor: number;
  remainingMinor: number;
  status: FeeStatus;
}

export interface FinanceSummary {
  totalDueMinor: number;
  totalPaidMinor: number;
  balanceMinor: number;
  overdueCount: number;
  /**
   * Paiements reçus sans être rattachés à un frais (avance, versement non
   * affecté). Ces montants sont comptés dans `totalPaidMinor` et dans le
   * solde, mais ils ne réduisent aucun frais : les signaler évite qu'un
   * parent croie à une somme due alors qu'elle a déjà été versée.
   */
  unallocatedPaidMinor: number;
}

export const PAYMENT_METHODS = ['cash', 'bank_transfer', 'cheque', 'other'] as const;

export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

function readString(value: unknown, prefix: string, field: string): string {
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`${prefix}_ROW_INVALID_${field}`);
  }
  return value;
}

function readAmount(value: unknown, prefix: string, field: string): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0) {
    throw new Error(`${prefix}_ROW_INVALID_${field}`);
  }
  return value;
}

export function mapFeeRow(row: unknown): ParentFee {
  if (!row || typeof row !== 'object') throw new Error('FINANCE_FEE_ROW_INVALID');

  const fee = row as Record<string, unknown>;
  if (!('id' in fee) || !('amount_minor' in fee) || !('due_on' in fee)) {
    throw new Error('FINANCE_FEE_ROW_INVALID');
  }

  const dueOn = fee.due_on;
  if (typeof dueOn !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(dueOn)) {
    throw new Error('FINANCE_FEE_ROW_INVALID_DUE_ON');
  }

  return {
    id: readString(fee.id, 'FINANCE_FEE', 'ID'),
    label: readString(fee.label, 'FINANCE_FEE', 'LABEL'),
    amountMinor: readAmount(fee.amount_minor, 'FINANCE_FEE', 'AMOUNT_MINOR'),
    dueOn,
  };
}

export function mapPaymentRow(row: unknown): ParentPayment {
  if (!row || typeof row !== 'object') throw new Error('FINANCE_PAYMENT_ROW_INVALID');

  const payment = row as Record<string, unknown>;
  if (
    !('id' in payment) ||
    !('amount_minor' in payment) ||
    !('paid_at' in payment) ||
    !('payment_method' in payment)
  ) {
    throw new Error('FINANCE_PAYMENT_ROW_INVALID');
  }

  const method = payment.payment_method;
  if (
    typeof method !== 'string' ||
    !(PAYMENT_METHODS as readonly string[]).includes(method)
  ) {
    throw new Error('FINANCE_PAYMENT_ROW_INVALID_METHOD');
  }

  const note =
    'note' in payment && typeof payment.note === 'string' && payment.note.length > 0
      ? payment.note
      : null;

  const feeId =
    'fee_id' in payment && typeof payment.fee_id === 'string' ? payment.fee_id : null;

  return {
    id: readString(payment.id, 'FINANCE_PAYMENT', 'ID'),
    receiptNumber: readString(payment.receipt_number, 'FINANCE_PAYMENT', 'RECEIPT_NUMBER'),
    amountMinor: readAmount(payment.amount_minor, 'FINANCE_PAYMENT', 'AMOUNT_MINOR'),
    paidAt: readString(payment.paid_at, 'FINANCE_PAYMENT', 'PAID_AT'),
    method: method as PaymentMethod,
    note,
    feeId,
  };
}

/**
 * Associe les paiements aux frais et déduit l’état de règlement de chacun.
 *
 * Un paiement est imputé sur un frais tant qu’il reste du dû sur ce frais ;
 * le surplus et les paiements sans frais ne sont pas perdus : ils sont
 * retournés à part pour que le résumé reste cohérent avec le détail.
 */
export interface PaymentAllocation {
  fees: ParentFeeWithStatus[];
  /** Montants reçus au-delà du dû des frais, ou sans frais rattaché. */
  unallocatedPaidMinor: number;
}

export function allocatePaymentsToFees(
  fees: ParentFee[],
  payments: ParentPayment[],
): PaymentAllocation {
  // Reste à imputer, par frais.
  const remainingByFee = new Map<string, number>();
  for (const fee of fees) remainingByFee.set(fee.id, fee.amountMinor);

  const paidByFee = new Map<string, number>();
  let unallocatedPaidMinor = 0;

  // L'ordre des paiements n'a pas d'effet sur le résultat : chaque paiement
  // est imputé sur le seul frais qu'il vise, et le total imputé sur un frais
  // ne dépend que de l'ensemble des paiements qui le concernent.
  for (const payment of payments) {
    if (!payment.feeId) {
      unallocatedPaidMinor += payment.amountMinor;
      continue;
    }

    const remaining = remainingByFee.get(payment.feeId);
    // Un paiement rattaché à un frais absent de la liste lue reste imputé
    // comme non affecté : il ne peut pas réduire un frais invisible.
    if (remaining === undefined) {
      unallocatedPaidMinor += payment.amountMinor;
      continue;
    }

    const imputed = Math.min(remaining, payment.amountMinor);
    paidByFee.set(payment.feeId, (paidByFee.get(payment.feeId) ?? 0) + imputed);
    remainingByFee.set(payment.feeId, remaining - imputed);

    // Le surplus du paiement (au-delà du dû du frais) n’est pas perdu.
    unallocatedPaidMinor += payment.amountMinor - imputed;
  }

  const feesWithStatus = fees.map((fee) => {
    const paidMinor = Math.min(paidByFee.get(fee.id) ?? 0, fee.amountMinor);
    const remainingMinor = fee.amountMinor - paidMinor;
    const status: FeeStatus =
      remainingMinor === 0 ? 'paid' : paidMinor > 0 ? 'partial' : 'unpaid';

    return { ...fee, paidMinor, remainingMinor, status };
  });

  return { fees: feesWithStatus, unallocatedPaidMinor };
}

/**
 * Applique les paiements aux frais et renvoie seulement l’état des frais.
 *
 * Pour le résumé financier, préférer `allocatePaymentsToFees` : elle expose
 * aussi les montants non affectés, que le résumé doit signaler.
 */
export function applyPaymentsToFees(
  fees: ParentFee[],
  payments: ParentPayment[],
): ParentFeeWithStatus[] {
  return allocatePaymentsToFees(fees, payments).fees;
}

/**
 * Résumé financier de l’espace parent.
 *
 * Le solde est la somme des restes dus affichés sur les frais : c’est la
 * seule valeur cohérente avec le détail affiché en dessous. Les montants
 * reçus sans frais rattaché (ou en excès sur un frais) sont signalés à part.
 */
export function summarizeFinance(
  fees: ParentFeeWithStatus[],
  payments: ParentPayment[],
  today: string,
  unallocatedPaidMinor = 0,
): FinanceSummary {
  const totalDueMinor = fees.reduce((total, fee) => total + fee.amountMinor, 0);
  const totalPaidMinor = fees.reduce((total, fee) => total + fee.paidMinor, 0);

  return {
    totalDueMinor,
    totalPaidMinor,
    balanceMinor: totalDueMinor - totalPaidMinor,
    overdueCount: fees.filter(
      (fee) => fee.status !== 'paid' && fee.dueOn < today,
    ).length,
    unallocatedPaidMinor,
  };
}
