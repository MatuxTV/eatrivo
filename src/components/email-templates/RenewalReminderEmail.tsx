import * as React from "react";
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html as EmailHtml,
  Img,
  Preview,
  Section,
  Text,
  Hr,
} from "@react-email/components";
import type { RenewalReminderEmailProps } from "@/types/email.types";

export function RenewalReminderEmail({
  userName,
  planName,
  renewalDate,
  amount,
  currency,
  manageUrl = "https://eatrivo.sk/profile",
  translations,
}: RenewalReminderEmailProps) {
  const firstName = userName.split(" ")[0];
  const logoCircle = `${process.env.NEXT_PUBLIC_APP_URL || "https://eatrivo.sk"}/logo/LOGO_CIRCLE.png`;
  const logoRow = `${process.env.NEXT_PUBLIC_APP_URL || "https://eatrivo.sk"}/logo/LOGO_ROW.png`;

  const t = translations?.renewalReminder;
  const common = translations?.common;

  const formattedAmount = `${amount} ${currency.toUpperCase()}`;

  return (
    <EmailHtml>
      <Head />
      <Preview>
        {t?.preview || `Vaše predplatné Eatrivo sa obnoví ${renewalDate}`}
      </Preview>
      <Body style={styles.body}>
        <Container style={styles.container}>
          {/* Header */}
          <Section style={styles.headerSection}>
            <Img
              src={logoRow}
              alt="Eatrivo Logo"
              width="157"
              height="47"
              style={styles.logoHeader}
            />
            <Heading style={styles.heading}>
              {t?.heading || "Pripomienka obnovenia predplatného 🔔"}
            </Heading>
          </Section>

          {/* Greeting */}
          <Section style={styles.contentSection}>
            <Text style={styles.greeting}>
              {(t?.greeting || "Ahoj {firstName},").replace(
                "{firstName}",
                firstName,
              )}
            </Text>

            <Text style={styles.paragraph}>
              {t?.paragraph ||
                "Chceme vás informovať, že vaše predplatné Eatrivo sa čoskoro automaticky obnoví. Nižšie nájdete podrobnosti."}
            </Text>
          </Section>

          {/* Subscription Details */}
          <Section style={styles.detailsSection}>
            <table
              width="100%"
              cellPadding="0"
              cellSpacing="0"
              style={{ borderCollapse: "collapse" as const }}
            >
              <tr>
                <td style={styles.detailLabel}>
                  {t?.details?.plan || "Plán:"}
                </td>
                <td style={styles.detailValue}>{planName}</td>
              </tr>
              <tr>
                <td style={styles.detailLabel}>
                  {t?.details?.renewalDate || "Dátum obnovenia:"}
                </td>
                <td style={styles.detailValue}>{renewalDate}</td>
              </tr>
              <tr>
                <td style={styles.detailLabel}>
                  {t?.details?.amount || "Suma:"}
                </td>
                <td style={styles.detailValue}>{formattedAmount}</td>
              </tr>
            </table>
          </Section>

          {/* Cancel info */}
          <Section style={styles.contentSection}>
            <Text style={styles.cancelInfo}>
              {t?.cancelInfo ||
                "Ak si neželáte pokračovať, môžete predplatné zrušiť kedykoľvek pred dátumom obnovenia vo svojom profile."}
            </Text>
          </Section>

          {/* CTA Buttons */}
          <Section style={styles.ctaSection}>
            <Button href={manageUrl} style={styles.manageButton}>
              {t?.cancelCta || "Spravovať predplatné"}
            </Button>
          </Section>

          <Section style={styles.ctaSection}>
            <Button
              href="https://eatrivo.sk/home"
              style={styles.keepButton}
            >
              {t?.keepCta || "Pokračovať v plánovaní"}
            </Button>
          </Section>

          <Hr style={styles.divider} />

          {/* Footer */}
          <Section style={styles.footer}>
            <Img
              src={logoCircle}
              alt="Eatrivo Logo"
              width="50"
              height="50"
              style={styles.logoFooter}
            />
            <Text style={styles.footerTagline}>
              {common?.footerTagline || "Váš partner pre zdravý životný štýl"}
            </Text>
            <Text style={styles.footerDisclaimer}>
              {t?.footer ||
                "Tento email bol odoslaný, pretože máte aktívne predplatné na Eatrivo."}
            </Text>
          </Section>
        </Container>
      </Body>
    </EmailHtml>
  );
}

const styles: Record<string, React.CSSProperties> = {
  body: {
    backgroundColor: "#f9fafb",
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    margin: 0,
    padding: 0,
  },
  container: {
    maxWidth: "600px",
    margin: "32px auto",
    backgroundColor: "#ffffff",
    borderRadius: "16px",
    padding: "32px",
    boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
  },
  headerSection: {
    textAlign: "center" as const,
    marginBottom: "32px",
  },
  logoHeader: {
    padding: "8px",
    margin: "0 auto 24px",
    display: "block",
  },
  logoFooter: {
    padding: "8px",
    margin: "0 auto 12px",
    display: "block",
  },
  heading: {
    fontSize: "24px",
    fontWeight: "bold",
    color: "#111827",
    margin: "0 0 8px 0",
  },
  contentSection: {
    marginBottom: "24px",
  },
  greeting: {
    fontSize: "18px",
    color: "#111827",
    marginBottom: "16px",
  },
  paragraph: {
    fontSize: "16px",
    color: "#374151",
    lineHeight: "1.6",
    marginBottom: "16px",
  },
  detailsSection: {
    backgroundColor: "#f9fafb",
    borderRadius: "12px",
    padding: "24px",
    marginBottom: "24px",
  },
  detailLabel: {
    fontSize: "14px",
    color: "#6b7280",
    padding: "8px 16px 8px 0",
    fontWeight: 500,
    verticalAlign: "top",
  },
  detailValue: {
    fontSize: "14px",
    color: "#111827",
    padding: "8px 0",
    fontWeight: 600,
    verticalAlign: "top",
  },
  cancelInfo: {
    fontSize: "14px",
    color: "#6b7280",
    lineHeight: "1.6",
  },
  ctaSection: {
    textAlign: "center" as const,
    marginBottom: "12px",
  },
  manageButton: {
    backgroundColor: "#ffffff",
    color: "#7b3ff2",
    border: "2px solid #7b3ff2",
    padding: "12px 32px",
    borderRadius: "8px",
    fontSize: "14px",
    fontWeight: 600,
    textDecoration: "none",
    display: "inline-block",
  },
  keepButton: {
    backgroundColor: "#7b3ff2",
    color: "#ffffff",
    padding: "12px 32px",
    borderRadius: "8px",
    fontSize: "14px",
    fontWeight: 600,
    textDecoration: "none",
    display: "inline-block",
  },
  divider: {
    borderTop: "1px solid #e5e7eb",
    margin: "24px 0",
  },
  footer: {
    textAlign: "center" as const,
  },
  footerTagline: {
    fontSize: "14px",
    color: "#6b7280",
    margin: "0 0 8px 0",
  },
  footerDisclaimer: {
    fontSize: "12px",
    color: "#9ca3af",
    lineHeight: "1.5",
  },
};

export default RenewalReminderEmail;
