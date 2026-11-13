import { findRowAction } from './rowAction.test-helper';
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { SjSubmission } from "@/types/seputar-jaminan.types";

import SeputarJaminanSubmissionsClient from "./SeputarJaminanSubmissionsClient";

const service = vi.hoisted(() => ({
  getSettings: vi.fn(),
  getSubmissionPage: vi.fn(),
  getChangeRequestPage: vi.fn(),
  resubmitChangeRequest: vi.fn(),
  getPublication: vi.fn(),
  getProfile: vi.fn(),
  getPublicObservation: vi.fn(),
  readAllowed: true,
  editAllowed: true,
}));

vi.mock("@/services/seputar-jaminan.service", () => ({
  seputarJaminanService: service,
}));

vi.mock("@/components/ui/AppToastProvider", () => ({
  useAppToast: () => ({ showToast: vi.fn() }),
}));
vi.mock('@/hooks/useProtectedAction', () => ({useProtectedAction: () => ({hasCapability: (_path:string, action:string) => action==='read' ? service.readAllowed : action==='update' && service.editAllowed})}));

const submission = {
  id: "profile-version-2",
  kind: "PROFILE",
  request_kind: "CHANGE",
  resource_id: "profile-1",
  resource_label: "BPRS Contoh",
  submitted_by: { id: "user-1", name: "Admin Bank" },
  submitted_at: "2026-09-11T01:00:00.000Z",
  version_number: 2,
  payload_checksum: "sha256:profile-version-2",
  review_state: "REVISION_REQUIRED",
  reviewer_note: "Perjelas wilayah layanan.",
  delivery_state: "RECEIVED_BY_CONTROL",
  bank_application_state: "APPLIED_BY_BANK",
  public_state: "PUBLIC_CONFIRMED",
  snapshot: {
    display_name: "BPRS Contoh",
    short_description: "Deskripsi yang diajukan untuk pemeriksaan pusat.",
    integration_token: "tidak-boleh-tampil",
  },
} satisfies SjSubmission;

describe("Seputar Jaminan submissions", () => {
  it.each([null, 'event-receipted'])('renders completed lifecycle without claiming central/public completion (outbox=%s)',async(sync_event_id)=>{
    service.getChangeRequestPage.mockResolvedValue({items:[{
      id:'completed-local',state:'COMPLETED',action:'ARCHIVE_PUBLICATION',request_version:1,
      reason:'Arsipkan draf yang tidak digunakan.',submitted_at:'2026-10-07T01:00:00Z',completed_at:'2026-10-07T02:00:00Z',sync_event_id,
      impact:{target_label:'Draf tanpa publikasi pusat',current_state:'DRAFT',blockers:[],affected_publications:0,affected_media:0},
    }],page_info:{next_cursor:null}});
    render(<SeputarJaminanSubmissionsClient/>);
    fireEvent.click(screen.getByRole('tab',{name:'Penarikan & pencabutan'}));
    const row=await screen.findByText('Draf tanpa publikasi pusat');
    expect(row.closest('tr')).toHaveTextContent('Selesai');
    expect(screen.queryByText('Selesai di pusat')).not.toBeInTheDocument();
    expect(screen.getByRole('option',{name:'Selesai'})).toHaveValue('COMPLETED');
    fireEvent.click(await findRowAction('Lihat detail'));
    expect(screen.getByRole('dialog')).toHaveTextContent('Selesai');
    expect(screen.getByRole('dialog')).not.toHaveTextContent(/selesai di pusat|dikonfirmasi pusat|tampil publik|sudah tayang/i);
    expect(screen.getByRole('dialog')).toHaveTextContent('Permintaan selesai');
    expect(screen.getByRole('dialog')).toHaveTextContent('Status permintaan bukan bukti perubahan sudah terlihat di website SJ.');
    expect(service.getPublicObservation).not.toHaveBeenCalled();
    expect(service.resubmitChangeRequest).not.toHaveBeenCalled();
  });
  it.each([
    ['PUBLICATION','/dashboard/seputar-jaminan/publikasi?detail=profile-1'],
    ['CONTACT','/dashboard/seputar-jaminan/kontak?detail=profile-1&edit=1'],
  ])('links a revision to its resource instead of the unfiltered list: %s',async(kind,href)=>{
    service.getSubmissionPage.mockResolvedValue({items:[{...submission,kind}],page_info:{next_cursor:null}});
    render(<SeputarJaminanSubmissionsClient/>);
    fireEvent.click(await findRowAction('Lihat detail'));
    expect(screen.getByRole('link',{name:'Perbaiki pengajuan'})).toHaveAttribute('href',href);
  });
  beforeEach(() => {
    window.history.replaceState(null, "", "/dashboard/seputar-jaminan/pengajuan");
    vi.clearAllMocks();
    service.editAllowed=true;
    service.readAllowed=true;
    service.getSettings.mockResolvedValue({
      review_authority: "central",
      review_submission_ready: true,
    });
    service.getSubmissionPage.mockResolvedValue({
      items: [],
      page_info: { next_cursor: null },
    });
    service.getChangeRequestPage.mockResolvedValue({
      items: [],
      page_info: { next_cursor: null },
    });
  });

  it('recovers a failed filter after another filter succeeds without requiring manual reload', async () => {
    service.getSubmissionPage.mockRejectedValueOnce(new Error('Filter A temporarily unavailable'));
    render(<SeputarJaminanSubmissionsClient />);
    expect(await screen.findByText('Filter A temporarily unavailable')).toBeVisible();
    fireEvent.change(screen.getByLabelText('Filter jenis pengajuan'), {target:{value:'PUBLICATION'}});
    expect(await screen.findByText('Belum ada pengajuan')).toBeVisible();
    fireEvent.change(screen.getByLabelText('Filter jenis pengajuan'), {target:{value:''}});
    await waitFor(() => expect(service.getSubmissionPage).toHaveBeenCalledTimes(3));
    expect(await screen.findByText('Belum ada pengajuan')).toBeVisible();
    expect(screen.queryByText('Filter A temporarily unavailable')).not.toBeInTheDocument();
    expect(screen.queryByText('Pengajuan belum dapat dimuat')).not.toBeInTheDocument();
  });

  it('does not clear the active filter error when an older filter succeeds late', async () => {
    let finishOld!: (value: unknown) => void;
    service.getSubmissionPage
      .mockImplementationOnce(() => new Promise(resolve => { finishOld=resolve; }))
      .mockRejectedValueOnce(new Error('Current filter unavailable'));
    render(<SeputarJaminanSubmissionsClient />);
    fireEvent.change(screen.getByLabelText('Filter jenis pengajuan'), {target:{value:'CONTACT'}});
    expect(await screen.findByText('Current filter unavailable')).toBeVisible();
    await act(async () => { finishOld({items:[submission],page_info:{next_cursor:null}}); });
    expect(screen.getByText('Current filter unavailable')).toBeVisible();
    expect(screen.getByText('Pengajuan belum dapat dimuat')).toBeVisible();
    expect(screen.queryByText('BPRS Contoh')).not.toBeInTheDocument();
  });

  it("shows an honest empty state when no submission exists", async () => {
    render(<SeputarJaminanSubmissionsClient />);

    expect(await screen.findByText("Belum ada pengajuan")).toBeInTheDocument();
    expect(screen.getByText(/profil, kontak, dan publikasi/)).toBeInTheDocument();
  });

  it('loads only the active list and preserves each tab filter and cursor', async()=>{
    window.history.replaceState(null,'','?kind=CONTACT&cursor=content-two&changes_state=FAILED&changes_cursor=change-two');
    render(<SeputarJaminanSubmissionsClient/>);
    await screen.findByText('Belum ada pengajuan');
    expect(service.getSubmissionPage).toHaveBeenLastCalledWith({limit:20,kind:'CONTACT',cursor:'content-two'});
    expect(service.getChangeRequestPage).not.toHaveBeenCalled();
    service.getSubmissionPage.mockClear();
    fireEvent.click(screen.getByRole('tab',{name:'Penarikan & pencabutan'}));
    await screen.findByText('Belum ada permintaan perubahan');
    expect(service.getChangeRequestPage).toHaveBeenLastCalledWith({limit:20,state:'FAILED',cursor:'change-two'});
    expect(service.getSubmissionPage).not.toHaveBeenCalled();
    expect(screen.queryByLabelText('Filter jenis pengajuan')).not.toBeInTheDocument();
    await act(async()=>{window.history.back();});
    await screen.findByText('Belum ada pengajuan');
    expect(screen.getByLabelText('Filter jenis pengajuan')).toHaveValue('CONTACT');
    expect(service.getSubmissionPage).toHaveBeenLastCalledWith({limit:20,kind:'CONTACT',cursor:'content-two'});
    expect(new URLSearchParams(window.location.search).get('changes_cursor')).toBe('change-two');
    await act(async()=>{window.history.forward();});
    await screen.findByText('Belum ada permintaan perubahan');
    expect(screen.getByLabelText('Status permintaan perubahan')).toHaveValue('FAILED');
  });

  it('does not contaminate the other tab after a failed request',async()=>{
    service.getChangeRequestPage.mockRejectedValue(new Error('Jaringan terputus'));
    render(<SeputarJaminanSubmissionsClient/>);
    await screen.findByText('Belum ada pengajuan');
    fireEvent.click(screen.getByRole('tab',{name:'Penarikan & pencabutan'}));
    await screen.findByText('Permintaan perubahan belum dapat dimuat');
    expect(screen.queryByText('Belum ada permintaan perubahan')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab',{name:'Pengajuan konten'}));
    await screen.findByText('Belum ada pengajuan');
    expect(screen.queryByText('Jaringan terputus')).not.toBeInTheDocument();
  });

  it('restores the exact submitted snapshot through Back and Forward',async()=>{
    service.getSubmissionPage.mockResolvedValue({items:[submission],page_info:{next_cursor:null}});
    render(<SeputarJaminanSubmissionsClient/>);
    fireEvent.click(await findRowAction('Lihat detail'));
    expect(new URLSearchParams(window.location.search).get('submission')).toBe(submission.id);
    expect(screen.getByRole('dialog')).toHaveTextContent('Data yang diajukan · versi 2');
    await act(async()=>{window.history.back();});
    await waitFor(()=>expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    await act(async()=>{window.history.forward();});
    expect(await screen.findByRole('dialog')).toHaveTextContent('Deskripsi yang diajukan untuk pemeriksaan pusat.');
    expect(service.getProfile).not.toHaveBeenCalled();
  });

  it('never substitutes another snapshot when a linked version is absent',async()=>{
    window.history.replaceState(null,'','?submission=missing-version');
    service.getSubmissionPage.mockResolvedValue({items:[submission],page_info:{next_cursor:null}});
    render(<SeputarJaminanSubmissionsClient/>);
    await screen.findByText('Detail tidak ada pada halaman ini');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(service.getProfile).not.toHaveBeenCalled();
  });

  it('rejects an unknown tab without fetching either list',async()=>{
    window.history.replaceState(null,'','?tab=unknown');
    render(<SeputarJaminanSubmissionsClient/>);
    await screen.findByText('Tab tidak dikenali');
    expect(service.getSubmissionPage).not.toHaveBeenCalled();
    expect(service.getChangeRequestPage).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('tab',{name:'Pengajuan konten'}));
    await screen.findByText('Belum ada pengajuan');
  });

  it('keeps tab keyboard focus and allows readonly old requests under local authority',async()=>{
    service.getSettings.mockResolvedValue({review_authority:'local'});
    service.readAllowed=false;
    render(<SeputarJaminanSubmissionsClient/>);
    const content=screen.getByRole('tab',{name:'Pengajuan konten'});
    content.focus();fireEvent.keyDown(content,{key:'ArrowRight'});
    await screen.findByText('Belum ada permintaan perubahan');
    const changes=screen.getByRole('tab',{name:'Penarikan & pencabutan'});
    expect(changes).toHaveFocus();expect(changes).toHaveAttribute('aria-selected','true');
    expect(screen.queryByRole('link',{name:'Buka pemeriksaan lokal'})).not.toBeInTheDocument();
    fireEvent.keyDown(changes,{key:'Home'});
    await screen.findByText('Belum ada pengajuan');expect(content).toHaveFocus();
  });

  it.each(['PROFILE','CONTACT','PUBLICATION'] as const)('links approved %s to permitted current data without fetching it in the modal',async kind=>{
    service.getSubmissionPage.mockResolvedValue({items:[{...submission,kind,review_state:'APPROVED'}],page_info:{next_cursor:null}});
    render(<SeputarJaminanSubmissionsClient/>);fireEvent.click(await findRowAction('Lihat detail'));
    expect(screen.getByRole('link',{name:kind==='PROFILE'?'Lihat profil BPRS':kind==='CONTACT'?'Lihat kontak':'Lihat publikasi'})).toBeVisible();
    expect(screen.queryByText('Keadaan terbaru di bank')).not.toBeInTheDocument();
    expect(service.getProfile).not.toHaveBeenCalled();expect(service.getPublication).not.toHaveBeenCalled();expect(service.getPublicObservation).not.toHaveBeenCalled();
  });
  it('does not offer a resource link or revision action without its read permission',async()=>{
    service.readAllowed=false;service.getSubmissionPage.mockResolvedValue({items:[submission],page_info:{next_cursor:null}});
    render(<SeputarJaminanSubmissionsClient/>);fireEvent.click(await findRowAction('Lihat detail'));
    expect(within(screen.getByRole('dialog')).queryByRole('link')).not.toBeInTheDocument();
    expect(screen.getByText('Deskripsi yang diajukan untuk pemeriksaan pusat.')).toBeVisible();
  });
  it('keeps exactly one local examination entry and no technical delivery navigation',async()=>{
    service.getSettings.mockResolvedValue({review_authority:'local'});render(<SeputarJaminanSubmissionsClient/>);
    expect(await screen.findByRole('link',{name:'Buka pemeriksaan lokal'})).toHaveAttribute('href','/dashboard/seputar-jaminan/pemeriksaan');
    expect(screen.queryByRole('link',{name:'Buka pemeriksaan publikasi'})).not.toBeInTheDocument();
    expect(screen.queryByRole('link',{name:'Pengiriman'})).not.toBeInTheDocument();
  });

  it("does not claim zero results or empty changes when reload fails", async () => {
    render(<SeputarJaminanSubmissionsClient />);
    await screen.findByText("Belum ada pengajuan");
    service.getSubmissionPage.mockRejectedValue(new Error("Jaringan terputus"));
    fireEvent.change(screen.getByLabelText("Filter jenis pengajuan"), {target:{value:"PUBLICATION"}});
    expect(await screen.findByText("Jumlah pengajuan belum dapat dimuat.")).toBeInTheDocument();
    expect(screen.queryByText("Permintaan perubahan belum dapat dimuat")).not.toBeInTheDocument();
    expect(service.getChangeRequestPage).not.toHaveBeenCalled();
    expect(screen.queryByText("0 pengajuan ditemukan")).not.toBeInTheDocument();
    expect(screen.queryByText("Belum ada permintaan perubahan")).not.toBeInTheDocument();
  });

  it("loads change requests beyond the first page using their own controls", async()=>{
    service.getChangeRequestPage.mockResolvedValue({items:[],page_info:{next_cursor:'next-change-cursor'}});
    render(<SeputarJaminanSubmissionsClient />);
    fireEvent.click(screen.getByRole('tab',{name:'Penarikan & pencabutan'}));
    fireEvent.click(await screen.findByRole("button",{name:"permintaan perubahan berikutnya"}));
    await waitFor(()=>expect(service.getChangeRequestPage).toHaveBeenLastCalledWith({cursor:'next-change-cursor',limit:20}));
    expect(new URLSearchParams(window.location.search).get("changes_cursor")).toBe("next-change-cursor");
  });

  it("ignores an older request that finishes after the chosen filter", async () => {
    let resolveOld!: (value: unknown) => void;
    service.getSubmissionPage.mockImplementationOnce(()=>new Promise(resolve=>{resolveOld=resolve;}));
    render(<SeputarJaminanSubmissionsClient />);
    fireEvent.change(screen.getByLabelText("Filter jenis pengajuan"), {target:{value:"CONTACT"}});
    await screen.findByText("Belum ada pengajuan");
    await act(async()=>resolveOld({items:[submission],page_info:{next_cursor:null}}));
    expect(screen.queryByText("BPRS Contoh")).not.toBeInTheDocument();
    expect(within(screen.getByRole('navigation',{name:'Halaman pengajuan'})).getByText('0 pengajuan pada halaman ini')).toBeInTheDocument();
  });

  it("disables no action silently when the central receiver is unavailable", async () => {
    service.getSettings.mockResolvedValue({
      review_authority: "central",
      review_submission_ready: false,
    });

    render(<SeputarJaminanSubmissionsClient />);

    expect(
      await screen.findByText("Pemeriksaan pusat belum siap menerima pengajuan"),
    ).toBeInTheDocument();
    expect(screen.getByText(/Draf tetap aman di Ruwang/)).toBeInTheDocument();
  });

  it("keeps the submitted snapshot and decision without fetching current bank/public context", async () => {
    service.getSubmissionPage.mockResolvedValue({
      items: [submission],
      page_info: { next_cursor: null },
    });

    render(<SeputarJaminanSubmissionsClient />);

    fireEvent.click(await findRowAction('Lihat detail'));

    expect(screen.getByRole("dialog", { name: "BPRS Contoh" })).toBeInTheDocument();
    expect(screen.getByText("Catatan pemeriksa")).toBeInTheDocument();
    expect(within(screen.getByRole('dialog')).getByText("Diterapkan di bank")).toBeInTheDocument();
    // Even a legacy PUBLIC_CONFIRMED flag has no identity/time evidence.
    expect(screen.queryByText("Status tampil belum diketahui")).not.toBeInTheDocument();
    expect(screen.queryByText("Keadaan terbaru di bank")).not.toBeInTheDocument();
    expect(service.getProfile).not.toHaveBeenCalled();
    expect(service.getPublication).not.toHaveBeenCalled();
    expect(service.getPublicObservation).not.toHaveBeenCalled();
    expect(screen.queryByText("Tampil publik")).not.toBeInTheDocument();
    expect(screen.getByText("Perbaiki pengajuan")).toHaveAttribute(
      "href",
      "/dashboard/seputar-jaminan/profil",
    );
    expect(screen.getByText("Deskripsi yang diajukan untuk pemeriksaan pusat.")).toBeInTheDocument();
    expect(screen.queryByText("tidak-boleh-tampil")).not.toBeInTheDocument();
  });

  it("sends active filters to the server and resets the page", async () => {
    render(<SeputarJaminanSubmissionsClient />);

    await screen.findByText("Belum ada pengajuan");
    fireEvent.change(screen.getByLabelText("Filter jenis pengajuan"), {
      target: { value: "PUBLICATION" },
    });

    await waitFor(() => {
      expect(service.getSubmissionPage).toHaveBeenLastCalledWith({
        limit: 20,
        kind: "PUBLICATION",
      });
    });
  });

  it("does not invent a public page for a contact, including legacy responses",async()=>{
    service.getSubmissionPage.mockResolvedValue({items:[{...submission,kind:'CONTACT'}],page_info:{next_cursor:null}});
    render(<SeputarJaminanSubmissionsClient />);
    fireEvent.click(await findRowAction('Lihat detail'));
    expect(screen.queryByText('Status publik')).not.toBeInTheDocument();
    expect(screen.getByRole('link',{name:'Perbaiki pengajuan'})).toHaveAttribute('href','/dashboard/seputar-jaminan/kontak?detail=profile-1&edit=1');
    expect(screen.queryByText('Tampil publik')).not.toBeInTheDocument();
  });
  it('restores cursor and filter on browser history navigation',async()=>{
    service.getSubmissionPage.mockResolvedValue({items:[],page_info:{next_cursor:'second-page'}});
    render(<SeputarJaminanSubmissionsClient/>);
    fireEvent.click(await screen.findByRole('button',{name:'pengajuan berikutnya'}));
    await waitFor(()=>expect(service.getSubmissionPage).toHaveBeenLastCalledWith({limit:20,cursor:'second-page'}));
    fireEvent.change(screen.getByLabelText('Filter jenis pengajuan'),{target:{value:'PROFILE'}});
    await waitFor(()=>expect(service.getSubmissionPage).toHaveBeenLastCalledWith({limit:20,kind:'PROFILE'}));
    await act(async()=>{window.history.back();});
    await waitFor(()=>expect(service.getSubmissionPage).toHaveBeenLastCalledWith({limit:20,cursor:'second-page'}));
  });
  it('applies change filters with their own cursor and resets them without losing submission filters', async()=>{
    window.history.replaceState(null,'','?tab=changes&kind=PROFILE&changes_cursor=old');
    render(<SeputarJaminanSubmissionsClient/>);
    fireEvent.change(await screen.findByLabelText('Status permintaan perubahan'),{target:{value:'REVISION_REQUIRED'}});
    await waitFor(()=>expect(service.getChangeRequestPage).toHaveBeenLastCalledWith({limit:20,state:'REVISION_REQUIRED'}));
    fireEvent.change(screen.getByLabelText('Jenis permintaan perubahan'),{target:{value:'UNPUBLISH_PUBLICATION'}});
    await waitFor(()=>expect(service.getChangeRequestPage).toHaveBeenLastCalledWith({limit:20,state:'REVISION_REQUIRED',action:'UNPUBLISH_PUBLICATION'}));
    fireEvent.click(screen.getByRole('button',{name:'Atur ulang permintaan'}));
    await waitFor(()=>expect(service.getChangeRequestPage).toHaveBeenLastCalledWith({limit:20}));
    expect(new URLSearchParams(window.location.search).get('kind')).toBe('PROFILE');
  });
  it('explains a received pending submission without claiming public success',async()=>{
    service.getSubmissionPage.mockResolvedValue({items:[{...submission,review_state:'IN_REVIEW',reviewer_note:null,bank_application_state:'WAITING_FOR_DECISION'}],page_info:{next_cursor:null}});
    render(<SeputarJaminanSubmissionsClient/>);
    fireEvent.click(await findRowAction('Lihat detail'));
    expect(screen.getByText(/Tunggu hasil pemeriksaan/)).toHaveTextContent('Tunggu hasil pemeriksaan');
    expect(screen.getByText(/Data saat diajukan/)).toBeInTheDocument();
    expect(screen.getByRole('link',{name:'Lihat profil BPRS'})).toBeInTheDocument();
    expect(service.getPublicObservation).not.toHaveBeenCalled();
  });
  it('does not offer editing to a reader without update permission',async()=>{
    service.editAllowed=false;service.getSubmissionPage.mockResolvedValue({items:[submission],page_info:{next_cursor:null}});
    render(<SeputarJaminanSubmissionsClient/>);fireEvent.click(await findRowAction('Lihat detail'));
    expect(screen.queryByRole('link',{name:'Perbaiki pengajuan'})).not.toBeInTheDocument();
    expect(screen.getByText('Catatan pemeriksa')).toBeInTheDocument();
  });
  it('shows zero as a valid attribute and excludes technical or unknown nested snapshot fields',async()=>{
    service.getSubmissionPage.mockResolvedValue({items:[{...submission,snapshot:{title:'Judul uji',attributes:{land_area_m2:0,secret:'hidden-secret'},media:[],institution_id:'hidden-tenant',payload_checksum:'hidden-checksum'}}],page_info:{next_cursor:null}});
    render(<SeputarJaminanSubmissionsClient/>);fireEvent.click(await findRowAction('Lihat detail'));
    const dialog=screen.getByRole('dialog');expect(dialog).toHaveTextContent(/Luas tanah.*0/);
    expect(dialog).toHaveTextContent('0 foto diajukan');expect(dialog).not.toHaveTextContent('hidden-secret');expect(dialog).not.toHaveTextContent('hidden-tenant');expect(dialog).not.toHaveTextContent('hidden-checksum');
  });
  it('rejects an old page link rather than showing page one as if it were page two',async()=>{
    window.history.replaceState(null,'','?page=2');
    render(<SeputarJaminanSubmissionsClient/>);
    const reset=await screen.findByRole('button',{name:'Kembali ke awal daftar'});
    expect(service.getSubmissionPage).not.toHaveBeenCalled();
    fireEvent.click(reset);
    await screen.findByText('Belum ada pengajuan');
    expect(service.getSubmissionPage).toHaveBeenCalledWith({limit:20});
  });
  it.each([false,true])('uses server resubmit eligibility, not only revision state (allowed=%s)',async(allowed)=>{
    service.getChangeRequestPage.mockResolvedValue({items:[{
      id:'change-1',state:'REVISION_REQUIRED',action:'HIDE_PROFILE',request_version:2,
      reason:'Perbaikan alasan pengajuan profil.',submitted_at:'2026-09-21T01:00:00Z',
      impact:{target_label:'Profil revisi',current_state:'VERIFIED',blockers:[],affected_publications:0,affected_media:0},
      action_availability:{scope:'START_ACTION',expected_version:2,revalidated_on_submit:true,actions:{resubmit:{
        available:allowed,reason:allowed?null:'Hanya pengaju awal yang bisa mengajukan ulang permintaan ini.',
        reason_code:allowed?null:'SUBMITTER_REQUIRED',mode:'REQUEST_CONTROL',
      }}},
    }],page_info:{next_cursor:null}});
    service.resubmitChangeRequest.mockResolvedValue({});
    render(<SeputarJaminanSubmissionsClient/>);
    fireEvent.click(screen.getByRole('tab',{name:'Penarikan & pencabutan'}));
    fireEvent.click(await findRowAction('Lihat detail'));
    const button=screen.getByRole('button',{name:'Ajukan ulang'});
    if(!allowed){
      expect(button).toBeDisabled();
      expect(screen.getByText('Hanya pengaju awal yang bisa mengajukan ulang permintaan ini.')).toBeInTheDocument();
      fireEvent.click(button);expect(service.resubmitChangeRequest).not.toHaveBeenCalled();
    }else{
      expect(button).toBeEnabled();fireEvent.click(button);
      await waitFor(()=>expect(service.resubmitChangeRequest).toHaveBeenCalledWith('change-1',2,'Perbaikan alasan pengajuan profil.'));
    }
  });
});
