/**
 * Pure production-abuse guards — unit-tested without Nest/Prisma.
 * Real users break LMS via role mix-ups, re-check-in, fee spam, etc.
 */

export type ActorLike = {
  sub: string;
  accountType?: string;
  roles?: string[];
};

export function isSuperAdmin(actor: ActorLike): boolean {
  return (
    actor.accountType === "SUPER_ADMIN" ||
    !!actor.roles?.includes("SUPER_ADMIN")
  );
}

export function isStaff(actor: ActorLike): boolean {
  return (
    actor.accountType === "STAFF" || !!actor.roles?.includes("STAFF")
  );
}

/** 1) Teacher may assign only on courses they instruct (admins bypass). */
export function canAssignOnCourse(input: {
  accountType: string;
  teacherId: string;
  instructorId: string | null | undefined;
}): { ok: true } | { ok: false; reason: string } {
  if (input.accountType === "SUPER_ADMIN") return { ok: true };
  if (!input.instructorId) {
    return {
      ok: false,
      reason: "Course has no instructor; only admin can assign",
    };
  }
  if (input.instructorId !== input.teacherId) {
    return { ok: false, reason: "You can only assign for your courses" };
  }
  return { ok: true };
}

/** Assignee must be enrolled when a courseId is present. */
export function canAssignToStudent(input: {
  assigneeId?: string | null;
  courseId?: string | null;
  enrolledIds: Set<string> | string[];
}): { ok: true } | { ok: false; reason: string } {
  if (!input.assigneeId) return { ok: true };
  if (!input.courseId) {
    return {
      ok: false,
      reason: "courseId required when assigning to a student",
    };
  }
  const set =
    input.enrolledIds instanceof Set
      ? input.enrolledIds
      : new Set(input.enrolledIds);
  if (!set.has(input.assigneeId)) {
    return {
      ok: false,
      reason: "Student is not enrolled in this course",
    };
  }
  return { ok: true };
}

/** 2) Only SUPER_ADMIN may change accountType (privilege escalation). */
export function canChangeAccountType(actor: ActorLike): boolean {
  return isSuperAdmin(actor);
}

/** 3) Closed fee cases cannot accept payment / student reopen spam. */
export function canSubmitOrMessageFee(status: string): {
  ok: true;
} | { ok: false; reason: string } {
  const closed = new Set(["PAID", "WAIVED", "APPROVED"]);
  if (closed.has(status)) {
    return { ok: false, reason: "This fee case is closed" };
  }
  return { ok: true };
}

/** Payment submit requires a screenshot proof. */
export function requiresFeeScreenshot(
  screenshotData: string | null | undefined,
): { ok: true } | { ok: false; reason: string } {
  if (!screenshotData || !String(screenshotData).trim()) {
    return { ok: false, reason: "Payment screenshot is required" };
  }
  return { ok: true };
}

/** 4) One office day = one check-in; no re-check-in after checkout. */
export function canOfficeCheckIn(existing: {
  checkInAt?: Date | string | null;
} | null): { ok: true } | { ok: false; reason: string } {
  if (existing?.checkInAt) {
    return {
      ok: false,
      reason: "Already checked in today. Day is complete after checkout.",
    };
  }
  return { ok: true };
}

/**
 * 5) Only SUPER_ADMIN speaks as ADMIN on support threads they do not own.
 * Teachers (STAFF) must not impersonate Code's Thinker Admin.
 */
export function supportSenderIsAdmin(input: {
  actor: ActorLike;
  ownsThread: boolean;
}): boolean {
  if (input.ownsThread) return false;
  return isSuperAdmin(input.actor);
}

/** Only SUPER_ADMIN may open a support chat with another user. */
export function canOpenSupportChatWithUser(actor: ActorLike): boolean {
  return isSuperAdmin(actor);
}
