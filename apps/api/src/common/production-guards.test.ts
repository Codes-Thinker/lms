import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  canAssignOnCourse,
  canAssignToStudent,
  canChangeAccountType,
  canOfficeCheckIn,
  canOpenSupportChatWithUser,
  canSubmitOrMessageFee,
  requiresFeeScreenshot,
  supportSenderIsAdmin,
} from "./production-guards";

describe("1) cross-course task assign", () => {
  it("blocks teacher on another instructor's course", () => {
    const r = canAssignOnCourse({
      accountType: "STAFF",
      teacherId: "t1",
      instructorId: "t2",
    });
    assert.equal(r.ok, false);
  });

  it("blocks STAFF when course has no instructor", () => {
    const r = canAssignOnCourse({
      accountType: "STAFF",
      teacherId: "t1",
      instructorId: null,
    });
    assert.equal(r.ok, false);
  });

  it("allows instructor and admin", () => {
    assert.equal(
      canAssignOnCourse({
        accountType: "STAFF",
        teacherId: "t1",
        instructorId: "t1",
      }).ok,
      true,
    );
    assert.equal(
      canAssignOnCourse({
        accountType: "SUPER_ADMIN",
        teacherId: "admin",
        instructorId: null,
      }).ok,
      true,
    );
  });

  it("blocks assignee not enrolled in course", () => {
    const r = canAssignToStudent({
      assigneeId: "s9",
      courseId: "c1",
      enrolledIds: ["s1", "s2"],
    });
    assert.equal(r.ok, false);
  });

  it("requires courseId when assignee present", () => {
    const r = canAssignToStudent({
      assigneeId: "s1",
      courseId: null,
      enrolledIds: ["s1"],
    });
    assert.equal(r.ok, false);
  });
});

describe("2) privilege escalation via accountType", () => {
  it("blocks STAFF from changing accountType", () => {
    assert.equal(
      canChangeAccountType({ sub: "t1", accountType: "STAFF" }),
      false,
    );
  });

  it("allows SUPER_ADMIN", () => {
    assert.equal(
      canChangeAccountType({ sub: "a1", accountType: "SUPER_ADMIN" }),
      true,
    );
  });
});

describe("3) fee spam after PAID", () => {
  it("blocks submit/message on closed cases", () => {
    assert.equal(canSubmitOrMessageFee("PAID").ok, false);
    assert.equal(canSubmitOrMessageFee("WAIVED").ok, false);
    assert.equal(canSubmitOrMessageFee("DUE").ok, true);
    assert.equal(canSubmitOrMessageFee("SENT").ok, true);
  });

  it("requires screenshot for payment", () => {
    assert.equal(requiresFeeScreenshot(undefined).ok, false);
    assert.equal(requiresFeeScreenshot("").ok, false);
    assert.equal(requiresFeeScreenshot("data:image/png;base64,xxx").ok, true);
  });
});

describe("4) attendance re-check-in after checkout", () => {
  it("blocks second check-in same day", () => {
    assert.equal(canOfficeCheckIn(null).ok, true);
    assert.equal(
      canOfficeCheckIn({ checkInAt: new Date() }).ok,
      false,
    );
  });
});

describe("5) support ADMIN impersonation by teacher", () => {
  it("STAFF cannot open chat with another user", () => {
    assert.equal(
      canOpenSupportChatWithUser({ sub: "t1", accountType: "STAFF" }),
      false,
    );
    assert.equal(
      canOpenSupportChatWithUser({ sub: "a1", accountType: "SUPER_ADMIN" }),
      true,
    );
  });

  it("only SUPER_ADMIN posts as ADMIN on others' threads", () => {
    assert.equal(
      supportSenderIsAdmin({
        actor: { sub: "t1", accountType: "STAFF" },
        ownsThread: false,
      }),
      false,
    );
    assert.equal(
      supportSenderIsAdmin({
        actor: { sub: "a1", accountType: "SUPER_ADMIN" },
        ownsThread: false,
      }),
      true,
    );
    assert.equal(
      supportSenderIsAdmin({
        actor: { sub: "a1", accountType: "SUPER_ADMIN" },
        ownsThread: true,
      }),
      false,
    );
  });
});
