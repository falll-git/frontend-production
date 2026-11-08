import {expect,it} from 'vitest';
import type {SjSubmission} from '@/types/seputar-jaminan.types';
import {submissionNextStep} from './submissionNextStep';
const item={kind:'PUBLICATION',review_state:'APPROVED',delivery_state:'RECEIVED_BY_CONTROL',bank_application_state:'APPLIED_BY_BANK'} as SjSubmission;
it('distinguishes conflict, revision, failure and waiting without claiming public visibility',()=>{
 expect(submissionNextStep({...item,bank_application_state:'DECISION_REJECTED_BY_BANK'})).toContain('perbedaan versi');
 expect(submissionNextStep({...item,review_state:'REVISION_REQUIRED'})).toContain('catatan pemeriksa');
 expect(submissionNextStep({...item,delivery_state:'DELIVERY_FAILED'})).toContain('gagal dikirim');
 expect(submissionNextStep({...item,review_state:'IN_REVIEW'})).toContain('Tunggu hasil');
 expect(submissionNextStep({...item,review_state:'IN_REVIEW',delivery_state:'NOT_SENT'})).toContain('Belum ada konfirmasi');
 expect(submissionNextStep(item)).toContain('versi sebelumnya bisa masih tampil');
 expect(submissionNextStep({...item,kind:'CONTACT'})).not.toContain('tampil');
});
