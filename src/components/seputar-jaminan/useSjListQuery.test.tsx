import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import useSjListQuery from "./useSjListQuery";

describe("SJ list URL context", () => {
  beforeEach(()=>window.history.replaceState(null,"","/dashboard/seputar-jaminan/publikasi?search=tanah&page=3#hasil"));
  it("restores a bookmarked query and preserves unrelated fields",()=>{
    const {result}=renderHook(()=>useSjListQuery());
    expect(result.current.params.get("page")).toBe("3");
    act(()=>result.current.update({category:"LAND",page:1}));
    expect(result.current.params.get("search")).toBe("tanah");
    expect(result.current.params.has("page")).toBe(false);
    expect(window.location.hash).toBe("#hasil");
  });
  it("follows browser Back and Forward",async()=>{
    const {result}=renderHook(()=>useSjListQuery());
    act(()=>result.current.update({page:4}));
    act(()=>window.history.back());
    await waitFor(()=>expect(result.current.params.get("page")).toBe("3"));
    act(()=>window.history.forward());
    await waitFor(()=>expect(result.current.params.get("page")).toBe("4"));
  });
  it("does not silently normalize an invalid bookmarked filter",()=>{
    window.history.replaceState(null,"","/dashboard/seputar-jaminan/publikasi?state=INVALID&page=wrong");
    const {result}=renderHook(()=>useSjListQuery());
    expect(result.current.params.get("state")).toBe("INVALID");
    expect(result.current.params.get("page")).toBe("wrong");
  });
});
