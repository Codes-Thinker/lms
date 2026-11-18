import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isPastShiftEnd,
  officeDateKey,
  officeMinutesNow,
  parseHmToMinutes,
  shiftEndInstantOnDate,
} from "./attendance-time";

describe("attendance Karachi wall clock", () => {
  it("parses HH:mm", () => {
    assert.equal(parseHmToMinutes("14:00"), 14 * 60);
    assert.equal(parseHmToMinutes("09:30"), 9 * 60 + 30);
  });

  it("builds shift end as Karachi wall time on attendance date", () => {
    // 2026-11-18 attendance date stored as UTC midnight
    const date = new Date(Date.UTC(2026, 10, 18));
    const end = shiftEndInstantOnDate(date, "14:00");
    // 14:00 Asia/Karachi = 09:00 UTC
    assert.equal(end.toISOString(), "2026-11-18T09:00:00.000Z");
  });

  it("isPastShiftEnd uses office minutes (smoke)", () => {
    const mins = officeMinutesNow();
    assert.ok(mins >= 0 && mins < 24 * 60);
    const key = officeDateKey();
    assert.match(key, /^\d{4}-\d{2}-\d{2}$/);
    // Far-future end should not be past
    assert.equal(isPastShiftEnd("23:59"), mins >= 23 * 60 + 59);
  });
});
