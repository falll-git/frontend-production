import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TextAnimate } from "./TextAnimate";

describe("TextAnimate", () => {
  it("keeps complete words as animation units so responsive text never breaks mid-word", () => {
    render(
      <TextAnimate as="p" by="word">
        Informasi pembiayaan dalam satu platform.
      </TextAnimate>,
    );

    const paragraph = screen.getByText(
      "Informasi pembiayaan dalam satu platform.",
    ).parentElement;
    const units = Array.from(
      paragraph?.querySelectorAll(".text-animate__unit") ?? [],
    ).map((node) => node.textContent);

    expect(units).toEqual([
      "Informasi",
      "pembiayaan",
      "dalam",
      "satu",
      "platform.",
    ]);
  });
});
