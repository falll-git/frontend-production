import { beforeEach, describe, expect, it, vi } from "vitest";

const apiMock = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  patch: vi.fn(),
}));

vi.mock("@/lib/axios", () => ({ default: apiMock }));

import { seputarJaminanService } from "@/services/seputar-jaminan.service";

const publication = {
  id: "publication-test", reference_code: "SJ-TEST0001", source_type: "COLLATERAL", source_collateral_id: "source-test",
  owner_division: null, asset_category: "VEHICLE", state: "IN_REVIEW", sync_state: "NOT_QUEUED",
  aggregate_version: 0, lock_version: 4, next_reconfirmation_at: null, last_confirmed_at: null,
  last_sync_error_code: null, title: "Kendaraan uji", city_regency: null, province: null,
  cover: null, current_version: null, published_version: null,
  created_at: "2026-09-19T00:00:00.000Z", updated_at: "2026-09-19T00:00:00.000Z",
};
const media = {id: "media-test", purpose: "PUBLICATION_IMAGE", state: "UPLOADED", file_name: "aset.webp",
  mime_type: "image/webp", size_bytes: 64, width: 32, height: 32, central_ready: false,
  preview_url: "/api/v1/seputar-jaminan/media/media-test/content", created_at: "2026-09-19T00:00:00.000Z"};

describe("seputarJaminanService", () => {
  it('validates list observation facts without inventing freshness or public absence',async()=>{
    const fact={state:'AVAILABLE',started_at:'2026-09-27T00:00:00Z',checked_at:'2026-09-27T00:00:01Z',observed_version:2};
    const summary={scope:'SJ_PUBLIC_API',freshness:'CHECK_TIME_ONLY',last_success:fact,latest_attempt:fact};
    const page=(s:unknown)=>({items:[{...publication,observation_summary:s}],page_info:{limit:20,has_more:false,next_cursor:null,count_scope:'CURRENT_PAGE',order:'CREATED_DESC_ID_DESC'}});
    apiMock.get.mockResolvedValueOnce({data:{data:page(summary)}});await expect(seputarJaminanService.getPublicationPage()).resolves.toEqual(page(summary));
    for(const s of [{...summary,freshness:'CURRENT'},{...summary,last_success:{...fact,state:'FAILED'}},{...summary,latest_attempt:null},{...summary,latest_attempt:{...fact,checked_at:'invalid'}},{...summary,latest_attempt:{...fact,state:'PENDING'}}]){
      apiMock.get.mockResolvedValueOnce({data:{data:page(s)}});await expect(seputarJaminanService.getPublicationPage()).rejects.toThrow();
    }
  });
  it('reads exact contact identity and rejects mismatched or malformed data',async()=>{
    const contact={id:'target',label:'Marketing',phone_e164:'+628123456789',state:'REVOKED',is_default:false,sync_state:'FAILED',aggregate_version:2,lock_version:3,current_version_id:null,draft_version_id:null,rejection_reason:null,last_verified_at:null,revoked_at:'2026-09-27T00:00:00Z',created_at:'2026-09-27T00:00:00Z',updated_at:'2026-09-27T00:00:00Z'};
    apiMock.get.mockResolvedValueOnce({data:{data:contact}});
    await expect(seputarJaminanService.getContact('target')).resolves.toEqual(contact);
    expect(apiMock.get).toHaveBeenCalledWith('/seputar-jaminan/contacts/target');
    apiMock.get.mockResolvedValueOnce({data:{data:{...contact,id:'other'}}});
    await expect(seputarJaminanService.getContact('target')).rejects.toThrow('Identitas kontak tidak sesuai');
    apiMock.get.mockResolvedValueOnce({data:{data:null}});
    await expect(seputarJaminanService.getContact('target')).rejects.toThrow();
  });
  beforeEach(() => {
    apiMock.get.mockReset();
    apiMock.post.mockReset();
    apiMock.patch.mockReset();
  });
  it('riwayat mempertahankan batas versi bank dan menolak klaim versi publik atau cursor rusak',async()=>{
    const item={id:'version',kind:'VERSION',version_number:1,state:'APPROVED',created_at:'2026-09-20T00:00:00Z',submitted_at:null,approved_at:null,rejection_reason:null,checksum:'checksum',bank_working_version:false,bank_approved_version:true,public_version_evidence:'UNAVAILABLE'};
    const page={items:[item],page_info:{limit:1,has_more:false,next_cursor:null,count_scope:'CURRENT_PAGE',order:'CREATED_DESC_ID_DESC'}};
    apiMock.get.mockResolvedValueOnce({data:{data:page}});await expect(seputarJaminanService.getHistory('publication','publication',{limit:1})).resolves.toEqual(page);
    for(const data of [{...page,items:[{...item,public_version_evidence:'CURRENT'}]},{...page,page_info:{...page.page_info,has_more:true,next_cursor:null}}]){
      apiMock.get.mockResolvedValueOnce({data:{data}});await expect(seputarJaminanService.getHistory('profile',null)).rejects.toThrow('Jawaban server tidak lengkap.');
    }
  });

  it('membedakan daftar kosong dan profil belum ada dari respons rusak',async()=>{
    for(const method of [seputarJaminanService.getContacts,seputarJaminanService.getReviews,seputarJaminanService.getMedia]){
      apiMock.get.mockResolvedValueOnce({data:{data:[]}});await expect(method()).resolves.toEqual([]);
      for(const data of [{},{data:null},{data:{}},{data:[null]},{success:false,data:[]}]){
        apiMock.get.mockResolvedValueOnce({data});await expect(method()).rejects.toThrow('Jawaban server tidak lengkap.');
      }
    }
    for(const method of [seputarJaminanService.getProfile,seputarJaminanService.getSettings]){
      apiMock.get.mockResolvedValueOnce({data:{data:null}});await expect(method()).resolves.toBeNull();
      apiMock.get.mockResolvedValueOnce({data:{}});await expect(method()).rejects.toThrow();
    }
  });

  it('mempertahankan nol dan menolak pagination yang tidak bisa dipercaya',async()=>{
    const page={items:[],pagination:{page:1,limit:20,total:0,total_pages:0}};
    apiMock.get.mockResolvedValueOnce({data:{data:page}});await expect(seputarJaminanService.getPublications()).resolves.toEqual(page);
    for(const pagination of [{},{...page.pagination,total:-1},{...page.pagination,total_pages:1},{...page.pagination,page:0}]){
      apiMock.get.mockResolvedValueOnce({data:{data:{items:[],pagination}}});await expect(seputarJaminanService.getPublications()).rejects.toThrow();
    }
    const error=new Error('network');apiMock.get.mockRejectedValueOnce(error);
    await expect(seputarJaminanService.getPublications()).rejects.toBe(error);
  });

  it("membaca dashboard dari envelope API Ruwang", async () => {
    const dashboard = { connection: null, publications: { PUBLISHED: 2 }, synchronization: {}, need_confirmation_soon: 0 };
    apiMock.get.mockResolvedValueOnce({ data: { data: dashboard } });

    await expect(seputarJaminanService.getDashboard()).resolves.toEqual(dashboard);
    expect(apiMock.get).toHaveBeenCalledWith("/seputar-jaminan/dashboard");
  });

  it("mengirim perintah publikasi dengan optimistic lock yang tepat", async () => {
    apiMock.post.mockResolvedValueOnce({ data: { data: publication } });

    await expect(
      seputarJaminanService.publicationCommand("publication-test", "submit", 4),
    ).resolves.toEqual(publication);
    expect(apiMock.post).toHaveBeenCalledWith(
      "/seputar-jaminan/publications/publication-test/submit",
      { expected_version: 4 },
    );
  });

  it("mengirim gambar memakai nama field multipart yang diwajibkan backend", async () => {
    const image = new File([new Uint8Array([1, 2, 3])], "aset.png", {
      type: "image/png",
    });
    apiMock.post.mockResolvedValueOnce({ data: { data: media } });

    await seputarJaminanService.uploadMedia(image, "PUBLICATION_IMAGE");

    const [url, body, config] = apiMock.post.mock.calls[0];
    expect(url).toBe("/seputar-jaminan/media");
    expect(body).toBeInstanceOf(FormData);
    expect(body.get("image")).toBe(image);
    expect(body.get("file")).toBeNull();
    expect(body.get("purpose")).toBe("PUBLICATION_IMAGE");
    expect(config).toEqual({ headers: { "Content-Type": "multipart/form-data" } });
  });

  it("menolak respons record yang tidak lengkap agar UI tidak memakai data tebakan", async () => {
    apiMock.get.mockResolvedValueOnce({ data: { data: null } });

    await expect(seputarJaminanService.getDashboard()).rejects.toThrow(
      "Jawaban server tidak lengkap.",
    );
  });

  it('memvalidasi kelayakan penarikan dari server tanpa menyamakannya dengan izin atau status tayang',async()=>{
    for(const withdrawal of [{eligible:true,reason:null},{eligible:false,reason:'Pemeriksaan belum selesai.'}]){
      const dto={...publication,workflow_eligibility:{withdrawal}};
      apiMock.get.mockResolvedValueOnce({data:{data:dto}});
      await expect(seputarJaminanService.getPublication(publication.id)).resolves.toEqual(dto);
    }
    for(const withdrawal of [{eligible:'true',reason:null},{eligible:true,reason:'Diblokir'},{eligible:false,reason:null},{}]){
      apiMock.get.mockResolvedValueOnce({data:{data:{...publication,workflow_eligibility:{withdrawal}}}});
      await expect(seputarJaminanService.getPublication(publication.id)).rejects.toThrow();
    }
  });

  it('mengikat kontrak urutan cursor ke endpoint dan tidak mengarang total',async()=>{
    const page={items:[publication],page_info:{limit:1,has_more:false,next_cursor:null,count_scope:'CURRENT_PAGE',order:'CREATED_DESC_ID_DESC'}};
    apiMock.get.mockResolvedValueOnce({data:{data:page}});
    await expect(seputarJaminanService.getPublicationPage({category:'VEHICLE'})).resolves.toEqual(page);
    expect(apiMock.get).toHaveBeenLastCalledWith('/seputar-jaminan/publications',{params:{category:'VEHICLE',paged:true}});
    for(const changed of [{order:'SUBMITTED_AT_DESC_CREATED_AT_DESC_ID_DESC_KIND_ASC'},{order:'UPDATED_AT_DESC_ID_DESC'},{has_more:true,next_cursor:null},{has_more:false,next_cursor:'unexpected'}]){
      apiMock.get.mockResolvedValueOnce({data:{data:{...page,page_info:{...page.page_info,...changed}}}});
      await expect(seputarJaminanService.getPublicationPage()).rejects.toThrow('Jawaban server tidak lengkap.');
    }
    apiMock.get.mockResolvedValueOnce({data:{data:{items:[],page_info:{...page.page_info,order:'SUBMITTED_AT_DESC_CREATED_AT_DESC_ID_DESC_KIND_ASC'}}}});
    await expect(seputarJaminanService.getSubmissionPage()).resolves.toHaveProperty('page_info.count_scope','CURRENT_PAGE');
    apiMock.get.mockResolvedValueOnce({data:{data:{items:[],page_info:page.page_info}}});
    await expect(seputarJaminanService.getSubmissionPage()).rejects.toThrow('Jawaban server tidak lengkap.');
  });

  it("menolak status, tanggal, versi dan media rusak sebelum dipakai UI", async () => {
    for (const changed of [{state: "TAYANG"}, {lock_version: -1}, {created_at: "kemarin"}, {cover: {}}, {current_version: {}}, {sync_state: "SUCCESS"}]) {
      apiMock.get.mockResolvedValueOnce({data: {data: {...publication, ...changed}}});
      await expect(seputarJaminanService.getPublication(publication.id)).rejects.toThrow("Jawaban server tidak lengkap.");
    }
    apiMock.get.mockResolvedValueOnce({data: {data: {items: [publication], pagination: {page: 1, limit: 20, total: 1, total_pages: 1}}}});
    const result = await seputarJaminanService.getPublications();
    expect(result.items[0].aggregate_version).toBe(0);
    expect(result.items[0].published_version).toBeNull();
  });

  it("tidak menerima ringkasan atau pengajuan yang mengarang status publik", async () => {
    for (const data of [{totals: {published: 2}}, {connection: null, publications: {PUBLISHED: "2"}, synchronization: {}, need_confirmation_soon: 0}]) {
      apiMock.get.mockResolvedValueOnce({data: {data}});
      await expect(seputarJaminanService.getDashboard()).rejects.toThrow();
    }
    const submission = {id: "submission-test", resource_id: "publication-test", resource_label: "Aset uji", payload_checksum: "a".repeat(64),
      kind: "PUBLICATION", request_kind: "CREATE", submitted_by: null, submitted_at: "2026-09-19T00:00:00.000Z", version_number: 1,
      review_state: "APPROVED", reviewer_note: null, delivery_state: "RECEIVED_BY_CONTROL", bank_application_state: "APPLIED_BY_BANK",
      public_state: "PUBLIC_UNKNOWN", snapshot: {}};
    const page = {items: [submission], pagination: {page: 1, limit: 20, total: 1, total_pages: 1}};
    apiMock.get.mockResolvedValueOnce({data: {data: page}});
    await expect(seputarJaminanService.getSubmissions()).resolves.toEqual(page);
    apiMock.get.mockResolvedValueOnce({data: {data: {...page, items: [{...submission, public_state: "PUBLIC_CONFIRMED"}]}}});
    await expect(seputarJaminanService.getSubmissions()).rejects.toThrow();
  });
  it('menerima bukti versi profil dari API dan menolak versi atau tautan yang tidak konsisten',async()=>{
    const snapshot={public_name:'Nama publik',short_description:'Profil publik',office_city_regency:'Bandung',office_province:'Jawa Barat',published_asset_count:0,public_page_url:'https://catalog.example/bprs/bank-uji'};
    const fact={id:'proof',state:'AVAILABLE',started_at:'2026-09-22T00:00:00Z',checked_at:'2026-09-22T00:00:01Z',source_origin:'https://api.example',public_identity:'bank-uji',institution_slug:'bank-uji',observed_version:7,failure_code:null,profile_snapshot:snapshot};
    const evidence={scope:'SJ_PUBLIC_API',version_evidence:'SOURCE_PROFILE_EVENT',freshness:'CHECK_TIME_ONLY',last_success:fact,latest_attempt:fact};
    apiMock.get.mockResolvedValueOnce({data:{data:evidence}});
    await expect(seputarJaminanService.getPublicObservation('profile','profile')).resolves.toEqual(evidence);
    for(const changed of [{observed_version:0},{observed_version:'7'},{profile_snapshot:null},{profile_snapshot:{...snapshot,published_asset_count:-1}},
      {profile_snapshot:{...snapshot,public_page_url:'javascript:alert(1)'}},{profile_snapshot:{...snapshot,public_page_url:'https://catalog.example/bprs/other'}}]){
      apiMock.get.mockResolvedValueOnce({data:{data:{...evidence,last_success:{...fact,...changed}}}});
      await expect(seputarJaminanService.getPublicObservation('profile','profile')).rejects.toThrow();
    }
  });
  it('memisahkan snapshot publikasi dari profil dan menolak identitas tautan salah',async()=>{
    const snapshot={title:'Isi publik',description:'Deskripsi',category:'KENDARAAN',city_regency:'Bandung',province:'Jawa Barat',attributes:{mileage_km:0},photo_count:1,public_updated_at:'2026-09-23T00:00:00Z',public_page_url:'https://catalog.example/aset/SJ-ABCDEFGH'};
    const fact={id:'asset-proof',state:'AVAILABLE',started_at:'2026-09-23T00:00:00Z',checked_at:'2026-09-23T00:00:01Z',source_origin:'https://api.example',public_identity:'SJ-ABCDEFGH',institution_slug:'bank-uji',observed_version:9,failure_code:null,profile_snapshot:null,publication_snapshot:snapshot};
    const evidence={scope:'SJ_PUBLIC_API',version_evidence:'SOURCE_PUBLICATION_EVENT',freshness:'CHECK_TIME_ONLY',last_success:fact,latest_attempt:fact};
    apiMock.get.mockResolvedValueOnce({data:{data:evidence}});
    await expect(seputarJaminanService.getPublicObservation('publication','asset')).resolves.toEqual(evidence);
    for(const changed of [{observed_version:0},{publication_snapshot:null},{publication_snapshot:{...snapshot,attributes:{internal_secret:'bad'}}},{publication_snapshot:{...snapshot,public_page_url:'https://catalog.example/aset/SJ-ZZZZZZZZ'}}]){
      apiMock.get.mockResolvedValueOnce({data:{data:{...evidence,last_success:{...fact,...changed}}}});
      await expect(seputarJaminanService.getPublicObservation('publication','asset')).rejects.toThrow();
    }
    apiMock.get.mockResolvedValueOnce({data:{data:{...evidence,version_evidence:'SOURCE_PROFILE_EVENT'}}});
    await expect(seputarJaminanService.getPublicObservation('publication','asset')).rejects.toThrow();
  });
});
