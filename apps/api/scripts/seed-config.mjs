import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  await prisma.officeConfig.upsert({
    where: { id: 1 },
    update: {
      radiusMeters: 50,
      studentStartTime: "09:00",
      studentEndTime: "14:00",
      staffStartTime: "08:00",
      staffEndTime: "17:00",
      internStartTime: "10:00",
      internEndTime: "18:00",
    },
    create: {
      id: 1,
      latitude: 29.3931779,
      longitude: 71.6924333,
      radiusMeters: 50,
      timezone: "Asia/Karachi",
      studentStartTime: "09:00",
      studentEndTime: "14:00",
      staffStartTime: "08:00",
      staffEndTime: "17:00",
      internStartTime: "10:00",
      internEndTime: "18:00",
    },
  });
  console.log("OK OfficeConfig seeded (50m + role shifts)");

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

  // Role defaults live on OfficeConfig; per-user overrides optional.
  console.log("OK Role shift defaults on OfficeConfig");
}

main().then(() => prisma.$disconnect()).catch((e) => { console.error(e); process.exit(1); });
