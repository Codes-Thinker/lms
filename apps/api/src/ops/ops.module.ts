import { Module } from "@nestjs/common";
import { AttendanceModule } from "../attendance/attendance.module";
import { FeesModule } from "../fees/fees.module";
import { OpsController } from "./ops.controller";

@Module({
  imports: [FeesModule, AttendanceModule],
  controllers: [OpsController],
})
export class OpsModule {}
