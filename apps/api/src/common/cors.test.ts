import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isTrustedVercelOrigin,
  parseAllowedOrigins,
} from "./cors";

describe("cors allowlist", () => {
  it("includes the live Vercel admin host by default", () => {
    const allowed = parseAllowedOrigins();
    assert.notEqual(allowed, true);
    if (allowed !== true) {
      assert.ok(allowed.includes("https://lms-nu-sepia.vercel.app"));
    }
  });

  it("trusts https *.vercel.app preview hosts", () => {
    assert.equal(
      isTrustedVercelOrigin("https://lms-nu-sepia.vercel.app"),
      true,
    );
    assert.equal(
      isTrustedVercelOrigin("https://lms-git-main-team.vercel.app"),
      true,
    );
    assert.equal(isTrustedVercelOrigin("http://evil.vercel.app"), false);
    assert.equal(isTrustedVercelOrigin("https://evil.com"), false);
  });
});
