import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_GUARD } from "@nestjs/core";
import { JwtModule } from "@nestjs/jwt";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { AiModule } from "./ai/ai.module";
import { AssessmentsModule } from "./assessments/assessments.module";
import { AttendanceModule } from "./attendance/attendance.module";
import { AuthModule } from "./auth/auth.module";
import { JwtAuthGuard } from "./common/guards/jwt-auth.guard";
import { RolesGuard } from "./common/guards/roles.guard";
import { CoursesModule } from "./courses/courses.module";
import { FeesModule } from "./fees/fees.module";
import { HealthController, RootController } from "./health.controller";
import { MailModule } from "./mail/mail.module";
import { NotificationsModule } from "./notifications/notifications.module";
import { OpsModule } from "./ops/ops.module";
import { PrismaModule } from "./prisma/prisma.module";
import { RealtimeModule } from "./realtime/realtime.module";
import { ReportsModule } from "./reports/reports.module";
import { SupportModule } from "./support/support.module";
import { SystemModule } from "./system/system.module";
import { TasksModule } from "./tasks/tasks.module";
import { UsersModule } from "./users/users.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    JwtModule.register({ global: true }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 120 }]),
    PrismaModule,
    MailModule,
    RealtimeModule,
    AuthModule,
    UsersModule,
    CoursesModule,
    AttendanceModule,
    FeesModule,
    TasksModule,
    SupportModule,
    NotificationsModule,
    ReportsModule,
    SystemModule,
    OpsModule,
    AssessmentsModule,
    AiModule,
  ],
  controllers: [RootController, HealthController],
  providers: [
    JwtAuthGuard,
    RolesGuard,
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
