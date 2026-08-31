import { beforeEach, describe, expect, it, vi } from "vitest";

const apiMock = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  patch: vi.fn(),
}));

vi.mock("@/lib/axios", () => ({ default: apiMock }));

import { seputarJaminanService } from "@/services/seputar-jaminan.service";

describe("seputarJaminanService", () => {
  beforeEach(() => {
    apiMock.get.mockReset();
    apiMock.post.mockReset();
    apiMock.patch.mockReset();
  });

  it("membaca dashboard dari envelope API Ruwang", async () => {
    const dashboard = { totals: { published: 2 } };
    apiMock.get.mockResolvedValueOnce({ data: { data: dashboard } });

    await expect(seputarJaminanService.getDashboard()).resolves.toEqual(dashboard);
    expect(apiMock.get).toHaveBeenCalledWith("/seputar-jaminan/dashboard");
  });

  it("mengirim perintah publikasi dengan optimistic lock yang tepat", async () => {
    const publication = { id: "publication-test", state: "IN_REVIEW" };
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
    apiMock.post.mockResolvedValueOnce({ data: { data: { id: "media-test" } } });

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
});
