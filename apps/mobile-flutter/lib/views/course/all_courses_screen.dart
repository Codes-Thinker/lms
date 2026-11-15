import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/constants/app_colors.dart';
import '../../core/constants/app_motion.dart';
import '../../core/responsive.dart';
import '../../models/course.dart';
import '../../providers/auth_provider.dart';
import '../../providers/course_provider.dart';
import '../../widgets/app_loader.dart';
import '../../widgets/course_cover.dart';
import 'course_detail_screen.dart';

class AllCoursesScreen extends StatefulWidget {
  const AllCoursesScreen({super.key});

  @override
  State<AllCoursesScreen> createState() => _AllCoursesScreenState();
}

class _AllCoursesScreenState extends State<AllCoursesScreen> {
  final _searchController = TextEditingController();
  String _sortBy = 'Newest';

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final courses = context.watch<CourseProvider>();
    final auth = context.watch<AuthProvider>();
    final pad = AppResponsive.pagePad(context);
    final bottom = AppResponsive.pageBottom(context);

    var allCourses = courses.allCourses;

    // Sort
    switch (_sortBy) {
      case 'Title':
        allCourses = List.from(allCourses)
          ..sort((a, b) => a.title.compareTo(b.title));
        break;
      case 'Fee (Low to High)':
        allCourses = List.from(allCourses)
          ..sort((a, b) => a.monthlyFee.compareTo(b.monthlyFee));
        break;
      case 'Fee (High to Low)':
        allCourses = List.from(allCourses)
          ..sort((a, b) => b.monthlyFee.compareTo(a.monthlyFee));
        break;
      default: // Newest
        break;
    }

    final myCourseIds = courses.enrolledCourses.map((c) => c.id).toSet();
    final userId = auth.user?.id ?? '';

    return Scaffold(
      backgroundColor: AppColors.bg,
      appBar: AppBar(
        title: const Text('All Courses'),
        backgroundColor: AppColors.bg,
        foregroundColor: AppColors.ink,
        centerTitle: true,
      ),
      body: courses.loading && courses.courses.isEmpty
          ? const Center(child: AppLoader())
          : CustomScrollView(
              physics: const BouncingScrollPhysics(),
              slivers: [
                // Search bar
                SliverPadding(
                  padding: EdgeInsets.fromLTRB(pad, 12, pad, 0),
                  sliver: SliverToBoxAdapter(
                    child: Container(
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: AppColors.line),
                      ),
                      child: TextField(
                        controller: _searchController,
                        onChanged: (value) {
                          courses.setSearchQuery(value);
                        },
                        decoration: const InputDecoration(
                          hintText: 'Search courses...',
                          prefixIcon: Icon(Icons.search, color: AppColors.muted, size: 20),
                          border: InputBorder.none,
                          contentPadding: EdgeInsets.symmetric(vertical: 12),
                        ),
                        style: const TextStyle(fontSize: 14, color: AppColors.ink),
                      ),
                    ),
                  ),
                ),

                // Sort dropdown
                SliverPadding(
                  padding: EdgeInsets.fromLTRB(pad, 12, pad, 0),
                  sliver: SliverToBoxAdapter(
                    child: Row(
                      children: [
                        const Text(
                          'Sort by',
                          style: TextStyle(color: AppColors.muted, fontSize: 13),
                        ),
                        const SizedBox(width: 8),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                          decoration: BoxDecoration(
                            color: Colors.white,
                            borderRadius: BorderRadius.circular(8),
                            border: Border.all(color: AppColors.line),
                          ),
                          child: DropdownButton<String>(
                            value: _sortBy,
                            underline: const SizedBox(),
                            isDense: true,
                            style: const TextStyle(fontSize: 13, color: AppColors.ink, fontWeight: FontWeight.w600),
                            items: const [
                              DropdownMenuItem(value: 'Newest', child: Text('Newest')),
                              DropdownMenuItem(value: 'Title', child: Text('Title A-Z')),
                              DropdownMenuItem(value: 'Fee (Low to High)', child: Text('Fee: Low to High')),
                              DropdownMenuItem(value: 'Fee (High to Low)', child: Text('Fee: High to Low')),
                            ],
                            onChanged: (v) {
                              if (v != null) setState(() => _sortBy = v);
                            },
                          ),
                        ),
                        const Spacer(),
                        Text(
                          '${allCourses.length} courses',
                          style: const TextStyle(color: AppColors.muted, fontSize: 13),
                        ),
                      ],
                    ),
                  ),
                ),

                // Category chips
                SliverPadding(
                  padding: EdgeInsets.fromLTRB(pad, 12, pad, 0),
                  sliver: SliverToBoxAdapter(
                    child: SizedBox(
                      height: 36,
                      child: ListView.separated(
                        scrollDirection: Axis.horizontal,
                        itemCount: courses.categoryNames.length,
                        separatorBuilder: (_, __) => const SizedBox(width: 8),
                        itemBuilder: (context, index) {
                          final name = courses.categoryNames[index];
                          final selected = courses.selectedCategory == name;
                          return GestureDetector(
                            onTap: () => courses.setCategory(name),
                            child: AnimatedContainer(
                              duration: AppMotion.fast,
                              curve: AppMotion.curve,
                              padding: const EdgeInsets.symmetric(horizontal: 14),
                              decoration: BoxDecoration(
                                color: selected ? AppColors.blue : Colors.white,
                                borderRadius: BorderRadius.circular(100),
                                border: Border.all(
                                  color: selected ? AppColors.blue : AppColors.line,
                                ),
                              ),
                              child: Center(
                                child: Text(
                                  name,
                                  style: TextStyle(
                                    fontSize: 13,
                                    fontWeight: FontWeight.w600,
                                    color: selected ? Colors.white : AppColors.ink,
                                  ),
                                ),
                              ),
                            ),
                          );
                        },
                      ),
                    ),
                  ),
                ),

                // Course list
                if (allCourses.isEmpty)
                  SliverPadding(
                    padding: EdgeInsets.fromLTRB(pad, 40, pad, 0),
                    sliver: const SliverToBoxAdapter(
                      child: Center(
                        child: Text(
                          'No courses found',
                          style: TextStyle(color: AppColors.muted, fontSize: 15),
                        ),
                      ),
                    ),
                  )
                else
                  SliverPadding(
                    padding: EdgeInsets.fromLTRB(pad, 12, pad, bottom),
                    sliver: SliverList(
                      delegate: SliverChildBuilderDelegate(
                        (context, index) {
                          final course = allCourses[index];
                          final isEnrolled = myCourseIds.contains(course.id);
                          return _courseCard(context, course, courses, isEnrolled);
                        },
                        childCount: allCourses.length,
                      ),
                    ),
                  ),
              ],
            ),
    );
  }

  Widget _courseCard(
    BuildContext context,
    Course course,
    CourseProvider courses,
    bool isEnrolled,
  ) {
    return InkWell(
      onTap: () {
        courses.selectCourse(course);
        Navigator.of(context).push(
          AppMotion.fadeSlide(CourseDetailScreen(courseId: course.id)),
        );
      },
      borderRadius: BorderRadius.circular(14),
      child: Container(
        margin: const EdgeInsets.only(bottom: 10),
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: AppColors.line),
        ),
        child: Row(
          children: [
            CourseCover(
              url: course.thumbnailUrl,
              title: course.title,
              height: 64,
              width: 64,
              borderRadius: BorderRadius.circular(10),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    course.title,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      fontWeight: FontWeight.w700,
                      fontSize: 15,
                      color: AppColors.ink,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    '${course.category} · ${course.durationMonths} months',
                    style: const TextStyle(color: AppColors.muted, fontSize: 12),
                  ),
                  const SizedBox(height: 4),
                  Row(
                    children: [
                      Text(
                        'Rs ${course.monthlyFee}/mo',
                        style: const TextStyle(
                          color: AppColors.ink,
                          fontWeight: FontWeight.w600,
                          fontSize: 13,
                        ),
                      ),
                      const SizedBox(width: 8),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                        decoration: BoxDecoration(
                          color: isEnrolled ? AppColors.softBlue : AppColors.bg,
                          borderRadius: BorderRadius.circular(100),
                        ),
                        child: Text(
                          isEnrolled
                              ? 'Enrolled'
                              : 'Available',
                          style: TextStyle(
                            color: isEnrolled ? AppColors.blue : AppColors.muted,
                            fontSize: 11,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            const Icon(Icons.chevron_right_rounded, color: AppColors.muted, size: 22),
          ],
        ),
      ),
    );
  }
}
