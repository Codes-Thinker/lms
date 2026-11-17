import { Module } from "@nestjs/common";
import { CertificatesController } from "./certificates.controller";
import { CertificatesService } from "./certificates.service";
import { QuizzesController } from "./quizzes.controller";
import { QuizzesService } from "./quizzes.service";

@Module({
  controllers: [QuizzesController, CertificatesController],
  providers: [QuizzesService, CertificatesService],
  exports: [QuizzesService, CertificatesService],
})
export class AssessmentsModule {}
