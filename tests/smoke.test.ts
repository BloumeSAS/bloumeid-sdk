import { describe, expect, it } from "vitest";
import { BloumeID, SDK_VERSION } from "../src/index";

describe("@bloume/id smoke", () => {
  it("exports SDK_VERSION", () => {
    const sdk = new BloumeID();
    expect(sdk.version).toBe(SDK_VERSION);
  });
});

