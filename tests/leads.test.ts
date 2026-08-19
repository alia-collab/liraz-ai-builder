import { describe, it, expect } from "vitest";
import { parseLeadInput } from "@/lib/runtime/leads";

describe("lead input", () => {
  it("rejects missing name", () => {
    const parsed = parseLeadInput({ projectId: "abc", name: "א" });
    expect(parsed.ok).toBe(false);
  });

  it("accepts a booking lead payload", () => {
    const parsed = parseLeadInput({
      projectId: "proj_1",
      name: "לiraz",
      phone: "0500000000",
      type: "booking",
      message: "צריך טכנאי",
    });
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.data.type).toBe("booking");
      expect(parsed.data.projectId).toBe("proj_1");
    }
  });
});
