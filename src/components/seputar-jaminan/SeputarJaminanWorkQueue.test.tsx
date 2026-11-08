import { act, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
const state = vi.hoisted(() => ({ review: true, monitor: true }));
vi.mock("@/hooks/useProtectedAction", () => ({ useProtectedAction: () => ({
  hasCapability: (path: string) => path.endsWith("/ringkasan") ? state.monitor : state.review,
}) }));
vi.mock("./SeputarJaminanSubmissionsClient", () => ({ default: () => <><h1>Pengajuan</h1><p>Protected review content</p></> }));
import WorkQueue from "./SeputarJaminanWorkQueue";

beforeEach(() => { state.review = true; state.monitor = true; window.history.replaceState(null,'','/dashboard/seputar-jaminan/pengajuan'); });
it('replaces the retired view without losing filters, cursor, hash or adding history', async()=>{
  window.history.replaceState(null,'','/dashboard/seputar-jaminan/pengajuan?state=IN_REVIEW&cursor=opaque&view=pengiriman#detail');
  const length=window.history.length;render(<WorkQueue/>);
  await waitFor(()=>expect(window.location.search).toBe('?state=IN_REVIEW&cursor=opaque'));
  expect(window.location.hash).toBe('#detail');expect(window.history.length).toBe(length);
  expect(screen.getByText('Protected review content')).toBeVisible();
  expect(screen.queryByRole('link',{name:'Pengiriman'})).not.toBeInTheDocument();
  expect(screen.queryByRole('link',{name:'Bantuan pengelola'})).not.toBeInTheDocument();
});
it('handles a retired view restored by popstate',async()=>{
  render(<WorkQueue/>);
  act(()=>{window.history.replaceState(null,'','/dashboard/seputar-jaminan/pengajuan?kind=CONTACT&view=pengiriman');window.dispatchEvent(new PopStateEvent('popstate'));});
  await waitFor(()=>expect(window.location.search).toBe('?kind=CONTACT'));
  expect(screen.getByText('Protected review content')).toBeVisible();
});
it('does not require monitoring permission to read submissions',()=>{
  state.monitor=false;render(<WorkQueue/>);expect(screen.getByText('Protected review content')).toBeVisible();
});
it("does not mount review for a monitoring-only role", () => {
  state.review = false; render(<WorkQueue />);
  expect(screen.getByText("Tidak ada akses")).toBeVisible();
  expect(screen.queryByText("Protected review content")).not.toBeInTheDocument();
  expect(screen.queryByRole("link", { name: "Pengajuan" })).not.toBeInTheDocument();
  expect(screen.queryByRole("link", { name: "Bantuan pengelola" })).not.toBeInTheDocument();
});
it("fails closed when neither panel is permitted", () => {
  state.review = false; state.monitor = false; render(<WorkQueue />);
  expect(screen.getByText("Tidak ada akses")).toBeVisible();
  expect(screen.queryByText(/Protected .* content/)).not.toBeInTheDocument();
});
