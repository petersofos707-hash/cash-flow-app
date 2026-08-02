import { describe, expect, it } from "vitest";
import manifest from "@/app/manifest";

describe("PWA manifest", () => {
  it("is installable and starts in the protected dashboard", () => {
    const value = manifest();
    expect(value.name).toBe("Cash Flow App");
    expect(value.display).toBe("standalone");
    expect(value.start_url).toBe("/dashboard");
    expect(value.icons).toHaveLength(2);
  });
});
