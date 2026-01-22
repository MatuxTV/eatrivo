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
} from "@react-email/components";
import type { ShoppingListNotificationEmailProps } from "@/types/email.types";

export function ShoppingListNotificationEmail({
  clientName,
  shoppingListName,
  shoppingListDate,
  dashboardUrl = "https://eatrivo.sk/dashboard",
  translations,
}: ShoppingListNotificationEmailProps) {
  const firstName = clientName.split(" ")[0];
  const logoRow = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/logo/LOGO_ROW.png`;

  const t = translations?.shoppingList;
  const common = translations?.common;

  return (
    <EmailHtml>
      <Head />
      <Preview>{t?.preview || "Nový nákupný zoznam od Eatrivo"}</Preview>
      <Body style={styles.body}>
        <Container style={styles.container}>
          {/* Header with Logo */}
          <Section style={styles.headerSection}>
            <Img
              src={logoRow}
              alt="Eatrivo Logo"
              width="157"
              height="47"
              style={styles.logo}
            />
            <Heading style={styles.heading}>
              {t?.heading || "Nový Nákupný Zoznam! 🛒"}
            </Heading>
            <Text style={styles.subtitle}>
              {t?.subtitle || "Váš nákupný zoznam je pripravený"}
            </Text>
          </Section>

          {/* Content */}
          <Section style={styles.contentSection}>
            <Text style={styles.greeting}>
              {(t?.greeting || "Ahoj {firstName}! 👋").replace("{firstName}", firstName)}
            </Text>

            <Text style={styles.paragraph}>
              {t?.paragraph || "Náš výživový poradca práve vytvoril nový nákupný zoznam šitý na mieru vašim potrebám. Tento týždeň sa môžete tešiť na chutné a zdravé jedlá, ktoré vám pomôžu dosiahnuť vaše ciele."}
            </Text>
          </Section>

          {/* Info Card */}
          <Section style={styles.infoCard}>
            <table style={{ width: "100%", marginBottom: "12px", paddingBottom: "12px", borderBottom: "1px solid #e9d5ff" }}>
              <tr>
                <td style={styles.infoLabel}>{t?.labels.name || "Názov:"}</td>
                <td style={styles.infoValue}>{shoppingListName}</td>
              </tr>
            </table>

            <table style={{ width: "100%", marginBottom: "12px", paddingBottom: "12px", borderBottom: "1px solid #e9d5ff" }}>
              <tr>
                <td style={styles.infoLabel}>{t?.labels.dateFrom || "Dátum od:"}</td>
                <td style={styles.infoValue}>{shoppingListDate}</td>
              </tr>
            </table>
          </Section>

          {/* Tip Section */}
          <Section style={styles.tipSection}>
            <Text style={styles.tipTitle}>
              {t?.tip.title || "💡 Tip pre efektívny nákup"}
            </Text>
            <Text style={styles.tipText}>
              {t?.tip.text || "Nákupný zoznam je organizovaný podľa kategórií, aby ste mohli nakupovať rýchlejšie a efektívnejšie. Nezabudnite si ho stiahnuť alebo vytlačiť pred odchodom do obchodu!"}
            </Text>
          </Section>

          {/* CTA Button */}
          <Section style={styles.ctaSection}>
            <Button
              href={dashboardUrl}
              style={styles.button}
            >
              {t?.cta || "Zobraziť Nákupný Zoznam"}
            </Button>
          </Section>

          <Section>
            <Text style={styles.helpText}>
              <span dangerouslySetInnerHTML={{ __html: (t?.help || "Váš nákupný zoznam nájdete v sekcii <strong>Dashboard</strong> vo vašom Eatrivo účte.").replace("<strong>Dashboard</strong>", "<strong>" + (common?.links.dashboard || "Dashboard") + "</strong>") }} />
            </Text>
          </Section>

          {/* Footer */}
          <Section style={styles.footer}>
            <Text style={styles.footerBrand}>Eatrivo</Text>
            <Text style={styles.footerTagline}>
              {common?.footerTagline || "Váš partner pre zdravý životný štýl"}
            </Text>
            <Text style={styles.footerDisclaimer}>
              {common?.footerDisclaimerShopping || "Tento email ste dostali, pretože bol pre vás vytvorený nový nákupný zoznam."}
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
    borderRadius: "16px",
    padding: "32px",
    boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
  },
  headerSection: {
    textAlign: "center" as const,
    marginBottom: "32px",
  },
  logo: {
    margin: "0 auto 24px",
    display: "block",
  },
  heading: {
    fontSize: "28px",
    fontWeight: "bold",
    color: "#111827",
    margin: "0 0 8px 0",
  },
  subtitle: {
    fontSize: "16px",
    color: "#6b7280",
    margin: 0,
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
  infoCard: {
    background: "linear-gradient(135deg, #f3e8ff 0%, #e9d5ff 100%)",
    borderRadius: "12px",
    padding: "24px",
    marginBottom: "24px",
    borderLeft: "4px solid #9333ea",
  },
  infoLabel: {
    fontSize: "14px",
    fontWeight: "600",
    color: "#581c87",
    textAlign: "left" as const,
  },
  infoValue: {
    fontSize: "14px",
    color: "#6b21a8",
    textAlign: "right" as const,
  },
  tipSection: {
    backgroundColor: "#f9fafb",
    borderRadius: "8px",
    padding: "16px",
    marginBottom: "24px",
    border: "1px solid #e5e7eb",
  },
  tipTitle: {
    fontSize: "14px",
    fontWeight: "600",
    color: "#111827",
    margin: "0 0 8px 0",
  },
  tipText: {
    fontSize: "14px",
    color: "#6b7280",
    lineHeight: "1.6",
    margin: 0,
  },
  ctaSection: {
    textAlign: "center" as const,
    marginBottom: "24px",
  },
  button: {
    display: "inline-block",
    backgroundColor: "#9333ea",
    color: "#ffffff",
    fontSize: "16px",
    fontWeight: "600",
    textDecoration: "none",
    padding: "12px 32px",
    borderRadius: "12px",
    boxShadow: "0 4px 6px rgba(147, 51, 234, 0.3)",
  },
  helpText: {
    fontSize: "14px",
    color: "#374151",
    lineHeight: "1.6",
  },
  footer: {
    marginTop: "32px",
    paddingTop: "24px",
    borderTop: "1px solid #e5e7eb",
    textAlign: "center" as const,
  },
  footerBrand: {
    fontSize: "16px",
    fontWeight: "600",
    color: "#111827",
    margin: "0 0 4px 0",
  },
  footerTagline: {
    fontSize: "14px",
    color: "#6b7280",
    margin: "0 0 16px 0",
  },
  footerDisclaimer: {
    fontSize: "12px",
    color: "#9ca3af",
    margin: 0,
  },
};

export default ShoppingListNotificationEmail;
