import { describe, expect, it } from 'vitest';
import {
  applyPaymentsToFees,
  mapFeeRow,
  mapPaymentRow,
  summarizeFinance,
  type ParentFee,
  type ParentPayment,
} from './finance';

const feeRow = {
  id: '18000000-0000-4000-8000-000000000001',
  label: 'Frais fictifs A1',
  amount_minor: 50000,
  due_on: '2026-11-01',
};

const paymentRow = {
  id: '19000000-0000-4000-8000-000000000001',
  fee_id: feeRow.id,
  receipt_number: 'REC-DEMO-A1',
  amount_minor: 20000,
  paid_at: '2026-11-02T09:00:00Z',
  payment_method: 'cash',
  note: 'Paiement fictif partiel',
};

describe('mapFeeRow', () => {
  it('mappe un frais', () => {
    expect(mapFeeRow(feeRow)).toEqual({
      id: feeRow.id,
      label: 'Frais fictifs A1',
      amountMinor: 50000,
      dueOn: '2026-11-01',
    });
  });

  it('refuse une ligne invalide', () => {
    expect(() => mapFeeRow(null)).toThrow('FINANCE_FEE_ROW_INVALID');
    expect(() => mapFeeRow({ ...feeRow, due_on: '01/11/2026' })).toThrow(
      'FINANCE_FEE_ROW_INVALID_DUE_ON',
    );
    expect(() => mapFeeRow({ ...feeRow, amount_minor: -1 })).toThrow(
      'FINANCE_FEE_ROW_INVALID_AMOUNT_MINOR',
    );
  });
});

describe('mapPaymentRow', () => {
  it('mappe un règlement', () => {
    expect(mapPaymentRow(paymentRow)).toEqual({
      id: paymentRow.id,
      receiptNumber: 'REC-DEMO-A1',
      amountMinor: 20000,
      paidAt: '2026-11-02T09:00:00Z',
      method: 'cash',
      note: 'Paiement fictif partiel',
      feeId: feeRow.id,
    });
  });

  it('refuse un mode de paiement inconnu', () => {
    expect(() => mapPaymentRow({ ...paymentRow, payment_method: 'crypto' })).toThrow(
      'FINANCE_PAYMENT_ROW_INVALID_METHOD',
    );
  });
});

describe('applyPaymentsToFees', () => {
  const fees: ParentFee[] = [
    { id: 'f1', label: 'Frais 1', amountMinor: 50000, dueOn: '2026-11-01' },
    { id: 'f2', label: 'Frais 2', amountMinor: 30000, dueOn: '2026-11-01' },
  ];

  const payment = (overrides: Partial<ParentPayment>): ParentPayment => ({
    id: 'p1',
    receiptNumber: 'REC-1',
    amountMinor: 10000,
    paidAt: '2026-11-02T09:00:00Z',
    method: 'cash',
    note: null,
    feeId: 'f1',
    ...overrides,
  });

  it('déduit l’état de règlement de chaque frais', () => {
    const result = applyPaymentsToFees(fees, [
      payment({ amountMinor: 20000 }),
      payment({ id: 'p2', amountMinor: 30000, feeId: 'f2' }),
    ]);

    expect(result[0]).toMatchObject({
      paidMinor: 20000,
      remainingMinor: 30000,
      status: 'partial',
    });
    expect(result[1]).toMatchObject({ paidMinor: 30000, remainingMinor: 0, status: 'paid' });
  });

  it('classe un frais sans règlement comme non réglé', () => {
    const result = applyPaymentsToFees(fees, []);
    expect(result[0].status).toBe('unpaid');
    expect(result[0].remainingMinor).toBe(50000);
  });

  it('ne descend jamais sous zéro si les règlements dépassent le frais', () => {
    const result = applyPaymentsToFees(fees, [payment({ amountMinor: 80000 })]);
    expect(result[0].paidMinor).toBe(50000);
    expect(result[0].remainingMinor).toBe(0);
    expect(result[0].status).toBe('paid');
  });

  it('ignore les règlements sans frais rattaché', () => {
    const result = applyPaymentsToFees(fees, [payment({ feeId: null })]);
    expect(result[0].paidMinor).toBe(0);
  });
});

describe('summarizeFinance', () => {
  it('calcule les totaux et compte les échéances dépassées', () => {
    const fees = applyPaymentsToFees(
      [
        { id: 'f1', label: 'Frais 1', amountMinor: 50000, dueOn: '2026-10-01' },
        { id: 'f2', label: 'Frais 2', amountMinor: 30000, dueOn: '2026-12-01' },
      ],
      [
        {
          id: 'p1',
          receiptNumber: 'REC-1',
          amountMinor: 50000,
          paidAt: '2026-11-02T09:00:00Z',
          method: 'cash',
          note: null,
          feeId: 'f1',
        },
      ],
    );

    const summary = summarizeFinance(
      fees,
      [
        {
          id: 'p1',
          receiptNumber: 'REC-1',
          amountMinor: 50000,
          paidAt: '2026-11-02T09:00:00Z',
          method: 'cash',
          note: null,
          feeId: 'f1',
        },
      ],
      '2026-11-07',
    );

    expect(summary).toEqual({
      totalDueMinor: 80000,
      totalPaidMinor: 50000,
      balanceMinor: 30000,
      overdueCount: 0,
    });
  });

  it('compte une échéance dépassée non réglée', () => {
    const fees = applyPaymentsToFees(
      [{ id: 'f1', label: 'Frais 1', amountMinor: 50000, dueOn: '2026-10-01' }],
      [],
    );

    expect(summarizeFinance(fees, [], '2026-11-07').overdueCount).toBe(1);
  });
});
