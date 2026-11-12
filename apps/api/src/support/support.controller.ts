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
import { SupportService } from "./support.service";

@Controller("support")
@UseGuards(JwtAuthGuard, RolesGuard)
export class SupportController {
  constructor(private readonly support: SupportService) {}

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

  @Get("chats")
  @Roles("SUPER_ADMIN", "STAFF")
  chats(@Query("kind") kind?: ChatKind) {
    return this.support.listChats(kind);
  }

  @Get("chats/me")
  myChat(
    @CurrentUser() user: AuthUser,
    @Query("kind") kind?: ChatKind
  ) {
    return this.support.myChat(user.sub, kind ?? ChatKind.ADMIN);
  }

  @Post("chats/:id/messages")
  postMessage(
    @Param("id") id: string,
    @CurrentUser() user: AuthUser,
    @Body() body: { text: string }
  ) {
    const isAdmin =
      user.accountType === "SUPER_ADMIN" || user.roles?.includes("SUPER_ADMIN");
    return this.support.postMessage(id, {
      senderId: user.sub,
      senderName: user.email,
      senderRole: isAdmin ? "ADMIN" : "USER",
      text: body.text,
    });
  }
}
