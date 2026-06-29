package com.dhiamliki.debttracker.auth;

import com.dhiamliki.debttracker.exception.BusinessException;
import com.resend.Resend;
import com.resend.core.exception.ResendException;
import com.resend.services.emails.model.CreateEmailOptions;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class EmailService {

    private static final String FROM = "onboarding@resend.dev";

    private final Resend resend;
    private final String frontendUrl;

    public EmailService(
            @Value("${resend.api.key}") String apiKey,
            @Value("${app.frontend-url}") String frontendUrl) {
        this.resend = new Resend(apiKey);
        this.frontendUrl = frontendUrl;
    }

    /** Send the post-registration email containing a verification link. */
    public void sendVerificationEmail(String toEmail, String token) {
        String link = frontendUrl + "/verify-email?token=" + token;
        String html = """
                <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; color: #1f2937;">
                  <h2 style="margin: 0 0 16px;">Verify your DebtTracker account</h2>
                  <p style="margin: 0 0 24px; line-height: 1.5;">
                    Thanks for signing up! Please confirm your email address to activate your account.
                  </p>
                  <a href="%s"
                     style="display: inline-block; background: #4f46e5; color: #ffffff; text-decoration: none;
                            padding: 12px 24px; border-radius: 8px; font-weight: 600;">
                    Verify my email
                  </a>
                  <p style="margin: 24px 0 0; font-size: 13px; color: #6b7280; line-height: 1.5;">
                    Or paste this link into your browser:<br>
                    <a href="%s" style="color: #4f46e5;">%s</a>
                  </p>
                  <p style="margin: 16px 0 0; font-size: 13px; color: #6b7280;">
                    This link expires in 24 hours.
                  </p>
                </div>
                """.formatted(link, link, link);

        send(toEmail, "Verify your DebtTracker account", html);
    }

    /** Send the 6-digit one-time code used for two-factor login. */
    public void sendOtpEmail(String toEmail, String otpCode) {
        String html = """
                <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; color: #1f2937;">
                  <h2 style="margin: 0 0 16px;">Your DebtTracker login code</h2>
                  <p style="margin: 0 0 24px; line-height: 1.5;">
                    Use the following code to finish signing in:
                  </p>
                  <div style="font-size: 32px; font-weight: 700; letter-spacing: 8px; text-align: center;
                              background: #f3f4f6; padding: 16px; border-radius: 8px; color: #111827;">
                    %s
                  </div>
                  <p style="margin: 24px 0 0; font-size: 13px; color: #6b7280;">
                    This code expires in 10 minutes. If you didn't try to sign in, you can ignore this email.
                  </p>
                </div>
                """.formatted(otpCode);

        send(toEmail, "Your DebtTracker login code", html);
    }

    private void send(String toEmail, String subject, String html) {
        CreateEmailOptions options = CreateEmailOptions.builder()
                .from(FROM)
                .to(toEmail)
                .subject(subject)
                .html(html)
                .build();
        try {
            resend.emails().send(options);
        } catch (ResendException e) {
            throw new BusinessException("Failed to send email. Please try again later.");
        }
    }
}
