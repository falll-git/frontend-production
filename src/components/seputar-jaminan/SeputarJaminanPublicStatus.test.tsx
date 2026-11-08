import {render,screen,cleanup} from '@testing-library/react';
import {describe,it,expect} from 'vitest';
import {SjPublicStatusBadge,SjStatusBadge} from './SeputarJaminanUI';

describe('public visibility requires observation, not local workflow',()=>{
  for(const state of ['DRAFT','IN_REVIEW','REVISION_REQUIRED','PUBLISHED','UNPUBLISHED','ARCHIVED','HIDDEN','REVOKED']){
    it(`${state} cannot infer presence or absence from an ACK, older version or failure`,()=>{
      for(const syncState of ['NOT_QUEUED','QUEUED','SENDING','ACKNOWLEDGED','FAILED','QUARANTINED']){
        for(const hasPublishedVersion of [false,true]){
          render(<SjPublicStatusBadge state={state} syncState={syncState} hasPublishedVersion={hasPublishedVersion}/>);
          expect(screen.getByText('Lihat pengecekan di detail')).toBeInTheDocument();
          expect(screen.queryByText('Hasil pengecekan ada di detail')).not.toBeInTheDocument();
          expect(screen.queryByText(/^(Tayang|Tidak tayang|Versi lama tayang|Belum tayang)$/)).not.toBeInTheDocument();
          cleanup();
        }
      }
    });
  }
  it('labels local withdrawal and recorded delivery independently',()=>{
    render(<><SjStatusBadge state="UNPUBLISHED"/><SjStatusBadge state="ACKNOWLEDGED" kind="sync"/></>);
    expect(screen.getByText('Ditarik di bank')).toBeInTheDocument();
    expect(screen.getByText('Diterima tujuan')).toBeInTheDocument();
    expect(screen.queryByText('Sudah tersambung')).not.toBeInTheDocument();
  });
});
