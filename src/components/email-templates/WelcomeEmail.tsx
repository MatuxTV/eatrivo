import * as React from "react";
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Preview,
  Section,
  Text,
} from "@react-email/components";

interface WelcomeEmailProps {
  userName: string;
}

export function WelcomeEmail({ userName }: WelcomeEmailProps) {
  const firstName = userName.split(" ")[0];
  const logoCircle = `${process.env.NEXT_PUBLIC_APP_URL}/logo/LOGO_CIRCLE.png`;
  const logoRow = `${process.env.NEXT_PUBLIC_APP_URL}/logo/LOGO_ROW.png`;

  return (
    <Html>
      <Head />
      <Preview>Vitajte v Eatrivo! Sme radi, že ste sa k nám pridali.</Preview>
      <Body style={styles.body}>
        <Container style={styles.container}>
          {/* Header with Logo */}
          <Section style={styles.headerSection}>
            <Img
              src={logoRow}
              alt="Eatrivo Logo"
              width="157"
              height="47"
              style={styles.logoHeader}
            />
            <Heading style={styles.heading}>
              Vitajte v Eatrivo! 🎉
            </Heading>
            <Text style={styles.subtitle}>
              Sme radi, že ste sa k nám pridali na ceste za zdravším životným
              štýlom
            </Text>
          </Section>

          {/* Content */}
          <Section style={styles.contentSection}>
            <Text style={styles.greeting}>
              Ahoj {firstName}! 👋
            </Text>

            <Text style={styles.paragraph}>
              Ďakujeme, že ste sa rozhodli začať svoju cestu s Eatrivo. Sme tu,
              aby sme vám pomohli dosiahnuť vaše zdravotné a výživové ciele s
              personalizovanými jedálničkami a inteligentným plánovaním.
            </Text>
          </Section>

          {/* Features */}
          <Section style={styles.featuresSection}>
            {/* Feature 1 */}
            <table style={styles.featureRow}>
              <tr>
                <td style={styles.checkmarkCell}>
                  <div style={styles.checkmark}>✓</div>
                </td>
                <td style={styles.featureContent}>
                  <Text style={styles.featureTitle}>Denný plán</Text>
                  <Text style={styles.featureDescription}>
                    Prispôsobené jedlá obsahujúce potraviny z vytvoreného nákupného zoznamu
                  </Text>
                </td>
              </tr>
            </table>

            {/* Feature 2 */}
            <table style={styles.featureRow}>
              <tr>
                <td style={styles.checkmarkCell}>
                  <div style={styles.checkmark}>✓</div>
                </td>
                <td style={styles.featureContent}>
                  <Text style={styles.featureTitle}>Nákupné zoznamy</Text>
                  <Text style={styles.featureDescription}>
                    Personalizovane a určené všetkým vaším potrebám pre jednoduchšie nakupovanie
                  </Text>
                </td>
              </tr>
            </table>

            {/* Feature 3 */}
            <table style={styles.featureRow}>
              <tr>
                <td style={styles.checkmarkCell}>
                  <div style={styles.checkmark}>✓</div>
                </td>
                <td style={styles.featureContent}>
                  <Text style={styles.featureTitle}>AI asistent</Text>
                  <Text style={styles.featureDescription}>
                    Inteligentné odporúčania a prispôsobenie jedálničkov
                  </Text>
                </td>
              </tr>
            </table>
          </Section>

          {/* CTA Button */}
          <Section style={styles.ctaSection}>
            <Button
              href="https://eatrivo.sk/dashboard"
              style={styles.button}
            >
              Začať používať Eatrivo
            </Button>
          </Section>

          <Section>
            <Text style={styles.helpText}>
              Ak máte akékoľvek otázky alebo potrebujete pomoc, neváhajte nás
              kontaktovať. Sme tu pre vás!
            </Text>
          </Section>

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
              Váš partner pre zdravý životný štýl
            </Text>
            <Text style={styles.footerDisclaimer}>
              Tento email bol odoslaný, pretože ste sa zaregistrovali na Eatrivo.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
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
  featuresSection: {
    backgroundColor: "#f9fafb",
    borderRadius: "12px",
    padding: "24px",
    marginBottom: "24px",
  },
  featureRow: {
    width: "100%",
    marginBottom: "12px",
  },
  checkmarkCell: {
    width: "32px",
    verticalAlign: "top" as const,
    paddingTop: "2px",
  },
  checkmark: {
    width: "24px",
    height: "24px",
    borderRadius: "50%",
    backgroundColor: "#10b981",
    color: "#ffffff",
    fontSize: "14px",
    fontWeight: "bold",
    textAlign: "center" as const,
    lineHeight: "24px",
  },
  featureContent: {
    paddingLeft: "12px",
  },
  featureTitle: {
    fontSize: "16px",
    fontWeight: "600",
    color: "#111827",
    margin: "0 0 4px 0",
  },
  featureDescription: {
    fontSize: "14px",
    color: "#6b7280",
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

export default WelcomeEmail;
