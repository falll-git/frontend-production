import api from '@/lib/axios';
import { isRecord } from './api.utils';

export type SjSaveKind = 'PROFILE' | 'CONTACT' | 'PUBLICATION';
export type SjSaveIntent = 'SAVE_DRAFT' | 'SAVE_AND_SUBMIT';
export type SjSaveRequest = { kind: SjSaveKind; intent: SjSaveIntent; resource_id?: string; draft: object };
export type SjSaveReceipt = { operation_id: string; kind: SjSaveKind; intent: SjSaveIntent;
  resource_id: string; lock_version: number; state: 'DRAFT' | 'IN_REVIEW'; completed_at: string; submission_error?: string | null };
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function unwrap(value: unknown): unknown {
  if (!isRecord(value) || value.success !== true || !Object.hasOwn(value,'data')) throw Error('Jawaban server belum lengkap.');
  return value.data;
}
export function validateSaveReceipt(value: unknown, id: string): SjSaveReceipt {
  const savedButNotSubmitted = isRecord(value) && value.kind === 'PUBLICATION'
    && value.intent === 'SAVE_AND_SUBMIT' && value.state === 'DRAFT'
    && typeof value.submission_error === 'string' && value.submission_error.trim().length > 0;
  if (!isRecord(value) || value.operation_id !== id || !uuid.test(id)
    || !['PROFILE','CONTACT','PUBLICATION'].includes(String(value.kind))
    || !['SAVE_DRAFT','SAVE_AND_SUBMIT'].includes(String(value.intent))
    || typeof value.resource_id !== 'string' || !uuid.test(value.resource_id)
    || !Number.isSafeInteger(value.lock_version) || Number(value.lock_version) < 0
    || (!savedButNotSubmitted && (value.state !== (value.intent === 'SAVE_DRAFT' ? 'DRAFT' : 'IN_REVIEW') || value.submission_error != null))
    || typeof value.completed_at !== 'string' || !Number.isFinite(Date.parse(value.completed_at))) throw Error('Jawaban server belum lengkap.');
  return value as SjSaveReceipt;
}
const segments = { PROFILE:'profile', CONTACT:'contacts', PUBLICATION:'publications' };
export const sjSaveService = {
  async execute(id: string, request: SjSaveRequest) {
    const {kind,...body} = request;
    const receipt = validateSaveReceipt(unwrap((await api.post(`/seputar-jaminan/${segments[kind]}/save-operations/${id}`,body)).data),id);
    if (receipt.kind !== kind || receipt.intent !== body.intent || (body.resource_id && receipt.resource_id !== body.resource_id)) throw Error('Hasil penyimpanan tidak cocok.');
    return receipt;
  },
  async read(id: string) {
    const result = unwrap((await api.get(`/seputar-jaminan/save-operations/${id}`)).data);
    if (!isRecord(result)) throw Error('Hasil pemeriksaan belum lengkap.');
    if (result.status === 'NOT_RECORDED' && result.receipt === null) return null;
    if (result.status !== 'COMPLETED') throw Error('Hasil pemeriksaan belum lengkap.');
    return validateSaveReceipt(result.receipt,id);
  },
};
