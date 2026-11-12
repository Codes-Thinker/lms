import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { ChatKind, TicketKind, TicketStatus } from "@prisma/client";
import { AuthUser, CurrentUser } from "../common/decorators/current-user.decorator";
import { Roles } from "../common/decorators/roles.decorator";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { PrismaService } from "../prisma/prisma.service";
import { SupportService } from "./support.service";

@Controller("support")
@UseGuards(JwtAuthGuard, RolesGuard)
export class SupportController {
  constructor(
    private readonly support: SupportService,
    private readonly prisma: PrismaService
  ) {}

  @Get("tickets/me")
  myTickets(@CurrentUser() user: AuthUser) {
    return this.support.listTickets(user.sub);
  }

  @Get("tickets")
  @Roles("SUPER_ADMIN", "STAFF")
  tickets() {
    return this.support.listTickets();
  }

  @Post("tickets")
  createTicket(
    @CurrentUser() user: AuthUser,
    @Body() body: { kind: TicketKind; title: string; body: string }
  ) {
    return this.support.createTicket(user.sub, body);
  }

  @Patch("tickets/:id")
  @Roles("SUPER_ADMIN", "STAFF")
  updateTicket(
    @Param("id") id: string,
    @Body() body: { status: TicketStatus }
  ) {
    return this.support.updateTicketStatus(id, body.status);
  }

  @Get("survey/active")
  activeSurvey() {
    return this.support.activeSurvey();
  }

  @Post("survey/:id/responses")
  submitSurvey(
    @Param("id") id: string,
    @CurrentUser() user: AuthUser,
    @Body() body: { answers: Record<string, string> }
  ) {
    return this.support.submitSurvey(user.sub, id, body.answers ?? {});
  }

  @Get("survey/responses")
  @Roles("SUPER_ADMIN", "STAFF")
  surveyResponses() {
    return this.support.listSurveyResponses();
  }

  @Get("activity-summary")
  @Roles("SUPER_ADMIN", "STAFF")
  activitySummary() {
    return this.support.activitySummary();
  }

  @Get("chats/unread-summary")
  @Roles("SUPER_ADMIN")
  unreadSummary() {
    return this.support.unreadSummary();
  }

  @Get("chats")
  @Roles("SUPER_ADMIN")
  chats(@Query("kind") kind?: ChatKind) {
    return this.support.listChats(kind);
  }

  @Get("chats/me")
  myChat(
    @CurrentUser() user: AuthUser,
    @Query("kind") kind?: ChatKind
  ) {
    // Student, intern, staff, teacher — all can open admin chat.
    return this.support.myChat(user.sub, kind ?? ChatKind.ADMIN);
  }

  @Get("chats/:id")
  @Roles("SUPER_ADMIN")
  getChat(@Param("id") id: string) {
    return this.support.getThread(id);
  }

  @Post("chats/:id/read")
  @Roles("SUPER_ADMIN")
  markRead(@Param("id") id: string) {
    return this.support.markReadByAdmin(id);
  }

  @Post("chats/:id/messages")
  async postMessage(
    @Param("id") id: string,
    @CurrentUser() user: AuthUser,
    @Body() body: { text: string }
  ) {
    const isAdmin =
      user.accountType === "SUPER_ADMIN" || user.roles?.includes("SUPER_ADMIN");

    const dbUser = await this.prisma.user.findUnique({
      where: { id: user.sub },
      select: { fullName: true, email: true },
    });
    const senderName =
      dbUser?.fullName?.trim() ||
      dbUser?.email ||
      (isAdmin ? "Admin" : "User");

    return this.support.postMessage(id, {
      senderId: user.sub,
      senderName,
      senderRole: isAdmin ? "ADMIN" : "USER",
      text: body.text ?? "",
    });
  }
}
