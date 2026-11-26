/** Top-bar + page titles mapped from pathname (FastRide-style shell). */
export function pageTitleForPath(pathname: string): {
  title: string;
  description?: string;
} {
  const path = pathname.split("?")[0] || "/";

  if (path === "/") {
    return {
      title: "Admin Overview",
      description: "Live snapshot of people, fees, and activity",
    };
  }
  if (path.startsWith("/users")) {
    return {
      title: "Users",
      description: "Live user directory with admin-side filters",
    };
  }
  if (path.startsWith("/students")) {
    return { title: "Students", description: "Enrolled learners and batches" };
  }
  if (path.startsWith("/interns")) {
    return { title: "Interns", description: "Internship roster and tracks" };
  }
  if (path.startsWith("/staff")) {
    return { title: "Teachers", description: "Instructors and mentors" };
  }
  if (path.startsWith("/fees")) {
    return { title: "Student fees", description: "Dues, screenshots, and reviews" };
  }
  if (path.startsWith("/leave")) {
    return {
      title: "Leave management",
      description: "Student leave requests, approvals, and balances",
    };
  }
  if (path.startsWith("/attendance")) {
    return { title: "Attendance", description: "Office check-ins and status" };
  }
  if (path.startsWith("/courses/requests")) {
    return { title: "Enrollments", description: "Pending course requests" };
  }
  if (path.startsWith("/courses")) {
    return { title: "Courses", description: "Catalog, batches, and content" };
  }
  if (path.startsWith("/quizzes")) {
    return { title: "Quizzes", description: "Assessments and attempts" };
  }
  if (path.startsWith("/certificates")) {
    return { title: "Certificates", description: "Issued certificates" };
  }
  if (path.startsWith("/ai")) {
    return { title: "AI coach", description: "Coach tips and usage" };
  }
  if (path.startsWith("/inbox")) {
    return { title: "Chat inbox", description: "Support conversations" };
  }
  if (path.startsWith("/feedback")) {
    return { title: "Feedback", description: "Reports, complains, surveys" };
  }
  if (path.startsWith("/system")) {
    return {
      title: "Settings",
      description: "Manage system preferences and office rules",
    };
  }
  return { title: "Admin Overview" };
}
