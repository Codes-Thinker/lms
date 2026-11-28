import { Module } from "@nestjs/common";
import { AttendanceController } from "./attendance.controller";
import { AttendanceService } from "./attendance.service";
import { StaffHoursService } from "./staff-hours.service";
import { SystemModule } from "../system/system.module";

@Module({
  imports: [SystemModule],
  controllers: [AttendanceController],
  providers: [AttendanceService, StaffHoursService],
  exports: [AttendanceService, StaffHoursService],
})
export class AttendanceModule {}
