import { cache } from 'react';
import { createSupabaseServerClient } from '@/shared/supabase/server';
import {
  mapFeeRow,
  mapPaymentRow,
  type ParentFee,
  type ParentPayment,
} from '../domain/finance';

async function readChildFees(studentId: string, limit: number): Promise<ParentFee[]> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from('fees')
    .select('id, label, amount_minor, due_on')
    .eq('student_id', studentId)
    .order('due_on', { ascending: false })
    .limit(limit);

  if (error) throw new Error('FEES_UNAVAILABLE');

  return (data ?? []).map(mapFeeRow);
}

async function readChildPayments(studentId: string, limit: number): Promise<ParentPayment[]> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from('payments')
    .select('id, fee_id, receipt_number, amount_minor, paid_at, payment_method, note')
    .eq('student_id', studentId)
    .order('paid_at', { ascending: false })
    .limit(limit);

  if (error) throw new Error('PAYMENTS_UNAVAILABLE');

  return (data ?? []).map(mapPaymentRow);
}

export const getChildFees = cache(readChildFees);
export const getChildPayments = cache(readChildPayments);
