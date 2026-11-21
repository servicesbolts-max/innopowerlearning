// @vitest-environment jsdom
import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { expectNoAxeViolations, renderDs } from "../../testing";
import { Monogram } from "./Monogram";

describe("Monogram", () => {
  it("is an image named after the organization when labelled", async () => {
    renderDs(<Monogram text="LS" label="LSETF" />);
    expect(screen.getByRole("img", { name: "LSETF" })).toHaveTextContent("LS");
    await expectNoAxeViolations();
  });

  it("is hidden from assistive technology beside a printed name", async () => {
    const { container } = renderDs(
      <p>
        <Monogram text="GE" size={32} /> God&apos;s Entrepreneurs
      </p>,
    );
    expect(screen.queryByRole("img")).toBeNull();
    expect(container.querySelector("[aria-hidden]")).toHaveTextContent("GE");
    await expectNoAxeViolations();
  });

  it("shows at most three characters", () => {
    renderDs(<Monogram text="ABCD" label="x" size={56} />);
    expect(screen.getByRole("img")).toHaveTextContent(/^ABC$/);
  });
});
