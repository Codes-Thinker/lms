import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";

export type InviteMailInput = {
  fullName: string;
  email: string;
  accountType: string;
  invitationLink: string;
};

@Injectable()
export class MailService {
  private readonly log = new Logger(MailService.name);
  private transporter: Transporter | null = null;

  constructor(private readonly config: ConfigService) {
    const host = this.config.get<string>("SMTP_HOST");
    if (host) {
      this.transporter = nodemailer.createTransport({
        host,
        port: Number(this.config.get("SMTP_PORT") ?? 587),
        secure: false,
        auth: {
          user: this.config.get<string>("SMTP_USER") || undefined,
          pass: this.config.get<string>("SMTP_PASS") || undefined,
        },
      });
    }
  }

  private subjectFor(accountType: string): string {
    switch (accountType) {
      case "STUDENT":
        return "Welcome to Codes Thinker LMS — Your Student Account Is Ready";
      case "INTERN":
        return "Welcome to Codes Thinker — Your Internship LMS Account";
      case "STAFF":
        return "Welcome to Codes Thinker — Your Staff LMS Account";
      default:
        return "Welcome to Codes Thinker LMS — Activate Your Account";
    }
  }

  private bodyFor(input: InviteMailInput): string {
    const typeLabel =
      input.accountType.charAt(0) + input.accountType.slice(1).toLowerCase();
    return [
      `Hello ${input.fullName},`,
      "",
      `Your ${typeLabel} account has been created on Codes Thinker LMS.`,
      "",
      `Name: ${input.fullName}`,
      `Email: ${input.email}`,
      `Account Type: ${typeLabel}`,
      "",
      "Set up your password using this secure link:",
      input.invitationLink,
      "",
      "This link expires in 24 hours.",
      "",
      "Best Regards,",
      "Codes Thinker Software House Team",
    ].join("\n");
  }

  async sendInvitation(input: InviteMailInput): Promise<void> {
    const fromName =
      this.config.get<string>("MAIL_FROM_NAME") ?? "Codes Thinker";
    const fromEmail =
      this.config.get<string>("MAIL_FROM_EMAIL") ?? "noreply@codesthinker.com";
    const subject = this.subjectFor(input.accountType);
    const text = this.bodyFor(input);

    if (!this.transporter) {
      this.log.log(`[dev mail] To: ${input.email}\nSubject: ${subject}\n${text}`);
      return;
    }

    await this.transporter.sendMail({
      from: `"${fromName}" <${fromEmail}>`,
      to: input.email,
      subject,
      text,
    });
  }
}
