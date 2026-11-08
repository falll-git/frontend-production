import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import Notification from "./Notification";

const mocks=vi.hoisted(()=>({getAll:vi.fn(),getUnreadCount:vi.fn(),markRead:vi.fn()}));
vi.mock("next/navigation",()=>({useRouter:()=>({push:vi.fn()})}));
vi.mock("@/services/notification.service",()=>({notificationService:mocks}));

describe("notification dates and dismissal",()=>{
 it("renders the shared compact date without changing the timestamp, Escape returns focus",async()=>{
  const timestamp=new Date(2026,8,26,13,33).toISOString();
  mocks.getAll.mockResolvedValue({data:[{id:"ui-test",title:"Tanggal notifikasi",message:"Pesan uji",module:"SYSTEM",eventType:"INFO",entityType:"GENERAL",entityId:"",priority:"NORMAL",linkUrl:null,isRead:true,readAt:null,createdAt:timestamp}],meta:{total:1,page:1,limit:10,lastPage:1}});
  mocks.getUnreadCount.mockResolvedValue(0);
  render(<Notification/>);
  const trigger=screen.getByRole("button",{name:"Notifikasi"});
  fireEvent.click(trigger);
  expect(await screen.findByText("26 Sep 2026, 13:33")).toBeVisible();
  screen.getByTitle("Bersihkan semua").focus();
  fireEvent.keyDown(document,{key:"Escape"});
  await waitFor(()=>expect(trigger).toHaveAttribute("aria-expanded","false"));
  expect(trigger).toHaveFocus();
  expect(mocks.markRead).not.toHaveBeenCalled();
 });
});
