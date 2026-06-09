import { Injectable, Logger } from '@nestjs/common';
import { Resend } from 'resend';
import { AppConfigService } from './app-config.service';
import { ContentReviewer, IdentityChecklist } from '../types';

type ApprovalTemplateContext = {
  tutorName: string;
  noteHtml: string;
  frontendUrl: string;
  year: number;
};

type RejectionTemplateContext = {
  tutorName: string;
  noteHtml: string;
  frontendUrl: string;
  year: number;
};

const TEMPLATE_EMAIL = {
  approval: ({ tutorName, noteHtml, frontendUrl, year }: ApprovalTemplateContext): string => `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Application Approved</title>
</head>
<body style="margin:0;padding:0;background:#f3f0ff;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f0ff;padding:48px 16px;">
    <tr>
      <td align="center">
        <table width="620" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 8px 32px rgba(108,92,231,0.12),0 2px 8px rgba(0,0,0,0.06);">
          <!-- Hero Section -->
          <tr>
            <td style="padding:36px 40px 0;text-align:center;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <div style="width:88px;height:88px;border-radius:50%;background:linear-gradient(135deg,#6c5ce7 0%,#a78bfa 100%);display:inline-block;text-align:center;margin-bottom:24px;box-shadow:0 8px 24px rgba(108,92,231,0.3);">
                      <span style="font-size:42px;line-height:88px;color:#ffffff;">&#x2713;</span>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td align="center">
                    <h1 style="margin:0 0 8px;color:#1f1147;font-size:28px;font-weight:800;letter-spacing:-0.5px;line-height:1.2;">
                      Your profile is approved
                    </h1>
                    <p style="margin:0;font-size:15px;color:#6c5ce7;font-weight:600;letter-spacing:0.3px;">
                      You can now complete your tutor setup on Mezonly
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Divider -->
          <tr>
            <td style="padding:28px 40px 0;">
              <div style="height:1px;background:linear-gradient(90deg,transparent,#ede9fe,#a78bfa,#ede9fe,transparent);"></div>
            </td>
          </tr>
          <!-- Body Content -->
          <tr>
            <td style="padding:28px 40px 0;">
              <p style="margin:0 0 16px;font-size:16px;color:#374151;line-height:1.7;">
                Hi <strong style="color:#6c5ce7;">${tutorName}</strong>,
              </p>
              <p style="margin:0 0 20px;font-size:16px;color:#374151;line-height:1.7;">
                Your tutor profile has been reviewed and
                <strong style="color:#6c5ce7;">approved</strong>. You can set up your profile,
                availability, and start accepting students from your dashboard.
              </p>
              ${noteHtml}
              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding:8px 0 32px;">
                    <a href="${frontendUrl}/become-tutor/final" style="display:inline-block;background:linear-gradient(135deg,#6c5ce7 0%,#8b5cf6 50%,#a78bfa 100%);color:#ffffff;text-decoration:none;padding:16px 44px;border-radius:10px;font-size:16px;font-weight:700;letter-spacing:0.3px;box-shadow:0 4px 16px rgba(108,92,231,0.35);">
                      Go to Your Dashboard &#x2192;
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Help Section -->
          <tr>
            <td style="padding:0 40px 32px;">
              <div style="background:#fafafa;border-radius:10px;padding:20px 24px;border:1px solid #f0f0f0;">
                <p style="margin:0;font-size:14px;color:#6b7280;line-height:1.6;text-align:center;">
                  &#x1F4AC; Need help getting started? Our support team is here for you.<br />
                  <a href="${frontendUrl}/support" style="color:#6c5ce7;text-decoration:none;font-weight:600;">Contact Support</a>
                </p>
              </div>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background:linear-gradient(180deg,#f9fafb 0%,#f3f0ff 100%);padding:28px 40px;text-align:center;border-top:1px solid #ede9fe;">
              <p style="margin:0 0 12px;font-size:12px;color:#9ca3af;line-height:1.5;">
                &#x00A9; ${year} Mezonly. All rights reserved.
              </p>
              <p style="margin:0;font-size:12px;color:#b4b4b4;">
                You received this email because you applied to become a tutor on Mezonly.
              </p>
            </td>
          </tr>
        </table>
        <!-- Sub-footer -->
        <table width="620" cellpadding="0" cellspacing="0">
          <tr>
            <td style="padding:20px 40px;text-align:center;">
              <p style="margin:0;font-size:11px;color:#a0a0a0;">
                Mezonly &#x2022; Connecting students with great tutors
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
  rejection: ({
    tutorName,
    noteHtml,
    frontendUrl,
    year,
  }: RejectionTemplateContext): string => `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Application Update</title>
</head>
<body style="margin:0;padding:0;background:#f3f0ff;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f0ff;padding:48px 16px;">
    <tr>
      <td align="center">
        <table width="620" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 8px 32px rgba(108,92,231,0.12),0 2px 8px rgba(0,0,0,0.06);">
          <!-- Hero Section -->
          <tr>
            <td style="padding:36px 40px 0;text-align:center;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <table cellpadding="0" cellspacing="0" style="margin:0 auto 24px;">
                      <tr>
                        <td align="center" valign="middle" style="width:88px;height:88px;border-radius:44px;background:linear-gradient(135deg,#f59e0b 0%,#f97316 100%);box-shadow:0 8px 24px rgba(245,158,11,0.3);text-align:center;font-size:40px;color:#ffffff;">
                          &#x21BB;
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td align="center">
                    <h1 style="margin:0 0 8px;color:#1f1147;font-size:28px;font-weight:800;letter-spacing:-0.5px;line-height:1.2;">
                      Almost There!
                    </h1>
                    <p style="margin:0;font-size:15px;color:#f59e0b;font-weight:600;letter-spacing:0.3px;">
                      Your application needs a few updates
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Divider -->
          <tr>
            <td style="padding:28px 40px 0;">
              <div style="height:1px;background:linear-gradient(90deg,transparent,#fef3c7,#f59e0b,#fef3c7,transparent);"></div>
            </td>
          </tr>
          <!-- Body Content -->
          <tr>
            <td style="padding:28px 40px 0;">
              <p style="margin:0 0 16px;font-size:16px;color:#374151;line-height:1.7;">
                Hi <strong style="color:#6c5ce7;">${tutorName}</strong>,
              </p>
              <p style="margin:0 0 20px;font-size:16px;color:#374151;line-height:1.7;">
                Thank you for applying to become a tutor on Mezonly. After reviewing your
                application, we found a few areas that need improvement before we can
                approve it.
              </p>
              ${noteHtml}
              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding:8px 0 12px;">
                    <a href="${frontendUrl}/become-tutor/final" style="display:inline-block;background:linear-gradient(135deg,#6c5ce7 0%,#8b5cf6 50%,#a78bfa 100%);color:#ffffff;text-decoration:none;padding:16px 44px;border-radius:10px;font-size:16px;font-weight:700;letter-spacing:0.3px;box-shadow:0 4px 16px rgba(108,92,231,0.35);">
                      Update Your Application &#x2192;
                    </a>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding:8px 0 32px;">
                    <p style="margin:0;font-size:13px;color:#9ca3af;">
                      Updating your profile takes approximately 5&#x2013;10 minutes.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Help Section -->
          <tr>
            <td style="padding:0 40px 32px;">
              <div style="background:#fafafa;border-radius:10px;padding:20px 24px;border:1px solid #f0f0f0;">
                <p style="margin:0;font-size:14px;color:#6b7280;line-height:1.6;text-align:center;">
                  &#x1F4AC; Have questions about the feedback? We're happy to help.<br />
                  <a href="${frontendUrl}/support" style="color:#6c5ce7;text-decoration:none;font-weight:600;">Contact Support</a>
                </p>
              </div>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background:linear-gradient(180deg,#f9fafb 0%,#f3f0ff 100%);padding:28px 40px;text-align:center;border-top:1px solid #ede9fe;">
              <p style="margin:0 0 12px;font-size:12px;color:#9ca3af;line-height:1.5;">
                &#x00A9; ${year} Mezonly. All rights reserved.
              </p>
              <p style="margin:0;font-size:12px;color:#b4b4b4;">
                You received this email because you applied to become a tutor on Mezonly.
              </p>
            </td>
          </tr>
        </table>
        <!-- Sub-footer -->
        <table width="620" cellpadding="0" cellspacing="0">
          <tr>
            <td style="padding:20px 40px;text-align:center;">
              <p style="margin:0;font-size:11px;color:#a0a0a0;">
                Mezonly &#x2022; Connecting students with great tutors
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
} as const;

const EMAIL_SENDER_NAME = 'Mezonly';

@Injectable()
export class EmailService {
  private readonly resend: Resend;
  private readonly logger = new Logger(EmailService.name);

  constructor(private readonly config: AppConfigService) {
    this.resend = new Resend(this.config.resendApiKey);
  }

  private get fromAddress(): string {
    return `${EMAIL_SENDER_NAME} <${this.config.resendFromEmail}>`;
  }

  async sendApprovalEmail(
    to: string,
    tutorName: string,
    emailNote?: string,
  ): Promise<void> {
    const { error } = await this.resend.emails.send({
      from: this.fromAddress,
      to,
      subject: 'Your Mezonly tutor profile has been approved',
      text: this.buildApprovalText(tutorName, emailNote),
      html: this.buildApprovalHtml(tutorName, emailNote),
    });

    if (error) {
      this.logger.error(`Failed to send approval email to ${to}: ${error.message}`);
    } else {
      this.logger.log(`Approval email sent to ${to}`);
    }
  }

  async sendRejectionEmail(
    to: string,
    tutorName: string,
    reviewerNotes: ContentReviewer[],
    checklist: IdentityChecklist | null,
    emailNote?: string,
  ): Promise<void> {
    const { error } = await this.resend.emails.send({
      from: this.fromAddress,
      to,
      subject: 'Update on your Mezonly tutor profile',
      text: this.buildRejectionText(tutorName, emailNote),
      html: this.buildRejectionHtml(tutorName, reviewerNotes, checklist, emailNote),
    });

    if (error) {
      this.logger.error(`Failed to send rejection email to ${to}: ${error.message}`);
    } else {
      this.logger.log(`Rejection email sent to ${to}`);
    }
  }

  private buildApprovalHtml(tutorName: string, emailNote?: string): string {
    return TEMPLATE_EMAIL.approval({
      tutorName,
      noteHtml: this.buildApprovalNoteHtml(emailNote),
      frontendUrl: this.config.frontendUrl,
      year: new Date().getFullYear(),
    });
  }

  private buildApprovalText(tutorName: string, emailNote?: string): string {
    const frontendUrl = this.config.frontendUrl;
    const note = emailNote?.trim();
    const noteBlock = note
      ? `\n\nMessage from our team:\n${note}\n`
      : '';

    return [
      `Hi ${tutorName},`,
      '',
      'Your tutor profile on Mezonly has been reviewed and approved.',
      'You can set up your profile, availability, and start accepting students.',
      noteBlock,
      `Go to your dashboard: ${frontendUrl}/become-tutor/final`,
      '',
      `Need help? Contact support: ${frontendUrl}/support`,
      '',
      `© ${new Date().getFullYear()} Mezonly. All rights reserved.`,
      'You received this email because you applied to become a tutor on Mezonly.',
    ]
      .filter((line) => line !== undefined)
      .join('\n');
  }

  private buildApprovalNoteHtml(emailNote?: string): string {
    const trimmed = emailNote?.trim();
    if (!trimmed) return '';

    return `
              <div style="background:linear-gradient(180deg,#faf7ff 0%,#f5f0ff 100%);border-radius:14px;padding:16px 18px;border:1px solid #e8ddff;margin:0 0 24px;">
                <p style="margin:0 0 10px;font-size:13px;font-weight:700;color:#6c5ce7;line-height:1.4;text-transform:uppercase;letter-spacing:0.4px;">
                  &#x1F4AC; Message from our team
                </p>
                <div style="padding:12px 14px;">
                  <p style="margin:0;font-size:18px;color:#312e4d;line-height:1.7;">${this.formatEmailNote(trimmed)}</p>
                </div>
              </div>`;
  }

  private escapeHtml(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  private buildChecklistHtml(checklist: IdentityChecklist | null): string {
    if (!checklist) return '';

    const issues: string[] = [];

    if (!checklist.nameMatch) {
      issues.push('The name on your identity document does not match your profile.');
    }

    if (!checklist.notExpired) {
      issues.push('Your identity document appears to be expired.');
    }

    if (!checklist.photoClarity) {
      issues.push('The photo on your identity document is unclear.');
    }

    if (issues.length === 0) return '';

    return issues
      .map(
        (issue) => `
<tr>
  <td style="padding:12px 0;">
    <table width="100%">
      <tr>
        <td width="28" valign="top" style="font-size:20px;">⚠️</td>
        <td style="font-size:15px;color:#374151;line-height:1.5;">
          ${issue}
        </td>
      </tr>
    </table>
  </td>
</tr>`
      )
      .join('');
  }

  private buildRejectionNoteHtml(emailNote?: string): string {
    const trimmed = emailNote?.trim();
    if (!trimmed) return '';

    return `
              <div style="background:linear-gradient(180deg,#fffaf3 0%,#fff3e6 100%);border-radius:14px;padding:16px 18px;border:1px solid #fed7aa;margin:0 0 24px;">
                <p style="margin:0 0 10px;font-size:13px;font-weight:700;color:#c2410c;line-height:1.4;text-transform:uppercase;letter-spacing:0.4px;">
                  &#x1F4AC; Message from our team
                </p>
                <div style="padding:12px 14px;">
                  <p style="margin:0;font-size:18px;color:#4b3a2c;line-height:1.7;">${this.formatEmailNote(trimmed)}</p>
                </div>
              </div>`;
  }

  private formatEmailNote(value: string): string {
    return this.escapeHtml(value).replace(/\r?\n/g, '<br />');
  }

  private buildRejectionHtml(
    tutorName: string,
    _reviewerNotes: { content: string }[],
    _checklist: IdentityChecklist | null,
    emailNote?: string,
  ): string {
    const noteHtml = this.buildRejectionNoteHtml(emailNote);

    return TEMPLATE_EMAIL.rejection({
      tutorName,
      noteHtml,
      frontendUrl: this.config.frontendUrl,
      year: new Date().getFullYear(),
    });
  }

  private buildRejectionText(tutorName: string, emailNote?: string): string {
    const frontendUrl = this.config.frontendUrl;
    const note = emailNote?.trim();
    const noteBlock = note
      ? `\n\nMessage from our team:\n${note}\n`
      : '';

    return [
      `Hi ${tutorName},`,
      '',
      'Thank you for applying to become a tutor on Mezonly.',
      'After reviewing your application, we found a few areas that need improvement before we can approve it.',
      noteBlock,
      `Update your application: ${frontendUrl}/become-tutor/final`,
      '',
      `Have questions? Contact support: ${frontendUrl}/support`,
      '',
      `© ${new Date().getFullYear()} Mezonly. All rights reserved.`,
      'You received this email because you applied to become a tutor on Mezonly.',
    ]
      .filter((line) => line !== undefined)
      .join('\n');
  }
}
