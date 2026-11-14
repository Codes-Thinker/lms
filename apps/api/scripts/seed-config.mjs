import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  await prisma.officeConfig.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      latitude: 29.3931779,
      longitude: 71.6924333,
      radiusMeters: 100,
      timezone: "Asia/Karachi",
    },
  });
  console.log("OK OfficeConfig seeded");

  const cats = [
    { name: "Programming", icon: "code", sortOrder: 1 },
    { name: "Flutter Development", icon: "phone_android", sortOrder: 2 },
    { name: "Web Development", icon: "web", sortOrder: 3 },
    { name: "UI/UX Design", icon: "design_services", sortOrder: 4 },
    { name: "Graphic Design", icon: "brush", sortOrder: 5 },
    { name: "Backend Development", icon: "dns", sortOrder: 6 },
  ];
  for (const c of cats) {
    await prisma.courseCategory.upsert({
      where: { name: c.name },
      update: { icon: c.icon, sortOrder: c.sortOrder },
      create: c,
    });
  }
  console.log("OK CourseCategories seeded");

  const courses = await prisma.course.findMany();
  const categories = await prisma.courseCategory.findMany();
  for (const course of courses) {
    if (course.categoryId) continue;
    const match = categories.find((cc) => cc.name.toLowerCase() === course.category.toLowerCase());
    if (match) {
      await prisma.course.update({ where: { id: course.id }, data: { categoryId: match.id } });
    }
  }
  console.log("OK Courses linked to categories");

  const staff = await prisma.user.findMany({ where: { accountType: "STAFF" } });
  for (const s of staff) {
    await prisma.staffSchedule.upsert({
      where: { userId: s.id },
      update: {},
      create: { userId: s.id, startTime: "08:00", endTime: "17:00" },
    });
  }
  console.log("OK Staff schedules seeded: " + staff.length + " staff");
}

main().then(() => prisma.$disconnect()).catch((e) => { console.error(e); process.exit(1); });
