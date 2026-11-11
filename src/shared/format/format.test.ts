import { describe, expect, it } from 'vitest';
import { formatMinorAmount, getCurrencyFractionDigits } from './money';
import { formatDateTime, formatSchoolDate, formatShortDate } from './date';

describe('getCurrencyFractionDigits', () => {
  it('reconnaît les devises sans et avec décimales', () => {
    expect(getCurrencyFractionDigits('XAF')).toBe(0);
    expect(getCurrencyFractionDigits('EUR')).toBe(2);
  });

  it('retombe sur deux décimales pour une devise inconnue', () => {
    expect(getCurrencyFractionDigits('ZZZ')).toBe(2);
  });
});

describe('formatMinorAmount', () => {
  it('ne convertit pas les unités mineures d’une devise sans décimale', () => {
    const formatted = formatMinorAmount(50000, 'XAF', 'fr-CG');
    expect(formatted.replace(/\s/g, ' ')).toBe('50 000 FCFA');
  });

  it('convertit les unités mineures d’une devise à deux décimales', () => {
    const formatted = formatMinorAmount(50000, 'EUR', 'fr-FR');
    expect(formatted.replace(/ | /g, ' ')).toBe('500,00 €');
  });

  it('formate un montant nul', () => {
    expect(formatMinorAmount(0, 'XAF', 'fr-CG').length).toBeGreaterThan(0);
  });
});

describe('formatSchoolDate', () => {
  it('n.translate pas la date d’un jour', () => {
    const formatted = formatSchoolDate('2026-11-06', 'fr-CG');
    expect(formatted).toContain('2026');
    expect(formatted).toContain('06');
  });

  it('accepte une date horodatée', () => {
    expect(formatShortDate('2026-11-06T09:00:00Z', 'fr-CG')).toContain('2026');
  });

  it('renvoie la valeur brute si la date est illisible', () => {
    expect(formatSchoolDate('pas-une-date', 'fr-CG')).toBe('pas-une-date');
    expect(formatDateTime('pas-une-date', 'fr-CG')).toBe('pas-une-date');
  });
});
