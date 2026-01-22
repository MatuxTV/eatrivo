import * as React from "react";
import {
  Body,
  Container,
  Head,
  Heading,
  Html as EmailHtml,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import type { AdminNotificationEmailProps } from "@/types/email.types";

export function AdminNotificationEmail({
  emailType,
  recipientEmail,
  recipientName,
  additionalInfo,
  translations,
}: AdminNotificationEmailProps) {
  const t = translations?.admin;
  
  const emailTypeLabel = emailType === "welcome" 
    ? (t?.types.welcome || "Welcome Email") 
    : (t?.types.shoppingList || "Shopping List Notification");
  const emoji = emailType === "welcome" ? "" : "";

  return (
    <EmailHtml>
      <Head />
      <Preview>{(t?.preview || "Eatrivo - Email odoslaný: {emailTypeLabel}").replace("{emailTypeLabel}", emailTypeLabel)}</Preview>
      <Body style={styles.body}>
        <Container style={styles.container}>
          <Section style={styles.headerSection}>
            <Heading style={styles.heading}>
              {t?.heading || "Email System Notification"} {emoji}
            </Heading>
            <Text style={styles.subtitle}>
              {t?.subtitle || "Automaticka notifikacia z Eatrivo systemu"}
            </Text>
          </Section>

          <Section style={styles.contentSection}>
            <Text style={styles.infoTitle}>{t?.success || "Email bol úspešne odoslaný"}</Text>
            
            <table style={styles.infoTable}>
              <tr>
                <td style={styles.infoLabel}>{t?.labels.type || "Typ emailu:"}</td>
                <td style={styles.infoValue}>{emailTypeLabel}</td>
              </tr>
            </table>

            <table style={styles.infoTable}>
              <tr>
                <td style={styles.infoLabel}>{t?.labels.recipient || "Príjemca:"}</td>
                <td style={styles.infoValue}>{recipientEmail}</td>
              </tr>
            </table>

            <table style={styles.infoTable}>
              <tr>
                <td style={styles.infoLabel}>{t?.labels.name || "Meno:"}</td>
                <td style={styles.infoValue}>{recipientName}</td>
              </tr>
            </table>

            {additionalInfo && (
              <table style={styles.infoTable}>
                <tr>
                  <td style={styles.infoLabel}>{t?.labels.details || "Detaily:"}</td>
                  <td style={styles.infoValue}>{additionalInfo}</td>
                </tr>
              </table>
            )}

            <table style={styles.infoTable}>
              <tr>
                <td style={styles.infoLabel}>{t?.labels.sentAt || "Čas odoslania:"}</td>
                <td style={styles.infoValue}>{new Date().toLocaleString("sk-SK")}</td>
              </tr>
            </table>
          </Section>

          <Section style={styles.footer}>
            <Text style={styles.footerText}>
              {t?.footer || "Toto je automaticka notifikacia z Eatrivo email systemu."}
            </Text>
          </Section>
        </Container>
      </Body>
    </EmailHtml>
  );
}

const styles = {
  body: {
    backgroundColor: "#f9fafb",
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    margin: 0,
    padding: 0,
  },
  container: {
    maxWidth: "600px",
    margin: "32px auto",
    backgroundColor: "#ffffff",
    borderRadius: "12px",
    padding: "32px",
    boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
  },
  headerSection: {
    textAlign: "center" as const,
    marginBottom: "24px",
    paddingBottom: "16px",
    borderBottom: "2px solid #9333ea",
  },
  heading: {
    fontSize: "24px",
    fontWeight: "bold",
    color: "#111827",
    margin: "0 0 8px 0",
  },
  subtitle: {
    fontSize: "14px",
    color: "#6b7280",
    margin: 0,
  },
  contentSection: {
    marginBottom: "24px",
  },
  infoTitle: {
    fontSize: "16px",
    fontWeight: "600",
    color: "#059669",
    marginBottom: "16px",
  },
  infoTable: {
    width: "100%",
    marginBottom: "12px",
    paddingBottom: "12px",
    borderBottom: "1px solid #e5e7eb",
  },
  infoLabel: {
    fontSize: "14px",
    fontWeight: "600",
    color: "#374151",
    textAlign: "left" as const,
    width: "40%",
  },
  infoValue: {
    fontSize: "14px",
    color: "#111827",
    textAlign: "left" as const,
  },
  footer: {
    marginTop: "24px",
    paddingTop: "16px",
    borderTop: "1px solid #e5e7eb",
    textAlign: "center" as const,
  },
  footerText: {
    fontSize: "12px",
    color: "#9ca3af",
    margin: 0,
  },
};

export default AdminNotificationEmail;
