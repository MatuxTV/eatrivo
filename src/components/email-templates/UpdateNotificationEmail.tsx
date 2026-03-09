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
  Button,
  Hr,
  Img,
} from "@react-email/components";
import type { EmailTranslations } from "@/types/email.types";

interface UpdateItem {
  title: string;
  description: string;
  type: "feature" | "improvement" | "fix";
}

interface UpdateNotificationEmailProps {
  recipientName: string;
  version: string;
  updateTitle: string;
  updateDescription: string;
  updates: UpdateItem[];
  homeUrl?: string;
  translations?: EmailTranslations;
}

export function UpdateNotificationEmail({
  recipientName,
  version,
  updateTitle,
  updateDescription,
  updates,
  homeUrl = "https://eatrivo.sk/home",
  translations,
}: UpdateNotificationEmailProps) {
  const t = translations?.update;

  const getTypeIcon = (type: UpdateItem["type"]) => {
    switch (type) {
      case "feature":
        return { icon: "✦", color: "#7b3ff2" }; // Eatrivo purple
      case "improvement":
        return { icon: "↗", color: "#ec4899" }; // Eatrivo pink
      case "fix":
        return { icon: "◆", color: "#f59e0b" }; // Amber
    }
  };

  return (
    <EmailHtml>
      <Head>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        `}</style>
      </Head>
      <Preview>{(t?.preview || "{updateTitle} - Eatrivo {version}").replace("{updateTitle}", updateTitle).replace("{version}", version)}</Preview>
      <Body style={styles.body}>
        <Container style={styles.container}>
          {/* Minimal Header */}
          <Section style={styles.headerSection}>
            <table width="100%" cellPadding="0" cellSpacing="0" style={{ borderCollapse: "collapse" as const }}>
              <tr>
                <td>
                  <Img 
                    src="https://eatrivo.sk/logo/LOGO_ROW.png" 
                    alt="Eatrivo" 
                    width="120" 
                    height="auto"
                    style={{ display: "block" }}
                  />
                </td>
                <td align="right">
                  <span style={styles.versionBadge}>{version}</span>
                </td>
              </tr>
            </table>
          </Section>

          {/* Hero Section */}
          <Section style={styles.heroSection}>
            <Text style={styles.heroLabel}>{t?.heroLabel || "!NOVÁ AKTUALIZÁCIA!"}</Text>
            <Heading style={styles.heroHeading}>
              {updateTitle}
            </Heading>
            <Text style={styles.heroSubtext}>
              {updateDescription}
            </Text>
          </Section>

          {/* Greeting */}
          <Section style={styles.greetingSection}>
            <Text style={styles.greeting}>
              {(t?.greeting || "Ahoj {recipientName},").replace("{recipientName}", recipientName)}
            </Text>
            <Text style={styles.introText}>
              {t?.intro || "Máme pre teba nové vylepšenia. Pozri sa, čo sme pripravili."}
            </Text>
          </Section>

          {/* Updates List */}
          <Section style={styles.updatesSection}>
            {updates.map((update, index) => {
              const typeStyle = getTypeIcon(update.type);
              return (
                <div key={index} style={styles.updateItem}>
                  <table width="100%" cellPadding="0" cellSpacing="0" style={{ borderCollapse: "collapse" as const }}>
                    <tr>
                      <td width="40" valign="top">
                        <span style={{
                          ...styles.updateIcon,
                          color: typeStyle.color,
                        }}>
                          {typeStyle.icon}
                        </span>
                      </td>
                      <td>
                        <Text style={styles.updateTitle}>{update.title}</Text>
                        <Text style={styles.updateDescription}>
                          {update.description}
                        </Text>
                      </td>
                    </tr>
                  </table>
                </div>
              );
            })}
          </Section>

          {/* CTA Section */}
          <Section style={styles.ctaSection}>
            <Button style={styles.ctaButton} href={homeUrl}>
              {t?.cta || "OTVORIŤ DOMOV"}
            </Button>
          </Section>

          <Hr style={styles.divider} />

          {/* Footer */}
          <Section style={styles.footer}>
            <Img 
              src="https://eatrivo.sk/logo/LOGO_CIRCLE.png" 
              alt="Eatrivo" 
              width="40" 
              height="40"
              style={{ display: "block", margin: "0 auto 16px auto" }}
            />
            <Text style={styles.footerText}>
              {t?.footer || "Ďakujeme, že si súčasťou Eatrivo."}
            </Text>
            <table width="100%" cellPadding="0" cellSpacing="0" style={{ marginTop: "20px", borderCollapse: "collapse" as const }}>
              <tr>
                <td align="center">
                  <Text style={styles.footerLinks}>
                    <a href="https://eatrivo.sk" style={styles.footerLink}>Web</a>
                    <span style={styles.footerDot}>·</span>
                    <a href="https://eatrivo.sk/home" style={styles.footerLink}>Home</a>
                    <span style={styles.footerDot}>·</span>
                    <a href="mailto:support@eatrivo.sk" style={styles.footerLink}>Podpora</a>
                  </Text>
                </td>
              </tr>
            </table>
            <Text style={styles.copyright}>
              © {new Date().getFullYear()} Eatrivo · Všetky práva vyhradené
            </Text>
          </Section>
        </Container>
      </Body>
    </EmailHtml>
  );
}

const styles: Record<string, React.CSSProperties> = {
  body: {
    backgroundColor: "#f5f5f7",
    fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    margin: 0,
    padding: "40px 16px",
  },
  container: {
    maxWidth: "560px",
    margin: "0 auto",
    backgroundColor: "#ffffff",
    borderRadius: "16px",
    overflow: "hidden",
    boxShadow: "0 4px 24px rgba(0, 0, 0, 0.08)",
  },
  headerSection: {
    padding: "28px 32px",
    borderBottom: "1px solid #f0f0f0",
    backgroundColor: "#ffffff",
  },
  logoText: {
    fontSize: "18px",
    fontWeight: 700,
    color: "#1a1a1a",
    letterSpacing: "3px",
    margin: 0,
  },
  versionBadge: {
    display: "inline-block",
    background: "linear-gradient(135deg, #7b3ff2 0%, #ec4899 100%)",
    color: "#ffffff",
    fontSize: "11px",
    fontWeight: 600,
    padding: "5px 12px",
    borderRadius: "20px",
    letterSpacing: "0.5px",
  },
  heroSection: {
    padding: "48px 32px",
    textAlign: "center" as const,
    borderBottom: "1px solid #f0f0f0",
    background: "linear-gradient(180deg, rgba(123, 63, 242, 0.06) 0%, #ffffff 100%)",
  },
  heroLabel: {
    fontSize: "11px",
    fontWeight: 600,
    color: "#7b3ff2",
    letterSpacing: "2px",
    margin: "0 0 16px 0",
    textTransform: "uppercase" as const,
  },
  heroHeading: {
    fontSize: "28px",
    fontWeight: 700,
    color: "#1a1a1a",
    margin: "0 0 16px 0",
    lineHeight: 1.2,
  },
  heroSubtext: {
    fontSize: "15px",
    color: "#666666",
    margin: 0,
    lineHeight: 1.6,
  },
  greetingSection: {
    padding: "32px",
    borderBottom: "1px solid #f0f0f0",
    backgroundColor: "#ffffff",
  },
  greeting: {
    fontSize: "15px",
    fontWeight: 500,
    color: "#1a1a1a",
    margin: "0 0 8px 0",
  },
  introText: {
    fontSize: "14px",
    color: "#666666",
    lineHeight: 1.6,
    margin: 0,
  },
  divider: {
    borderColor: "#f0f0f0",
    borderWidth: "1px",
    margin: 0,
  },
  updatesSection: {
    padding: "32px",
    backgroundColor: "#ffffff",
  },
  updateItem: {
    marginBottom: "24px",
    padding: "16px",
    backgroundColor: "#fafafa",
    borderRadius: "12px",
  },
  updateIcon: {
    fontSize: "18px",
    fontWeight: 700,
  },
  updateTitle: {
    fontSize: "15px",
    fontWeight: 600,
    color: "#1a1a1a",
    margin: "0 0 4px 0",
  },
  updateDescription: {
    fontSize: "14px",
    color: "#666666",
    lineHeight: 1.5,
    margin: 0,
  },
  ctaSection: {
    padding: "0 32px 40px 32px",
    textAlign: "center" as const,
    backgroundColor: "#ffffff",
  },
  ctaButton: {
    display: "inline-block",
    background: "linear-gradient(135deg, #7b3ff2 0%, #ec4899 100%)",
    color: "#ffffff",
    fontSize: "13px",
    fontWeight: 600,
    padding: "14px 32px",
    borderRadius: "8px",
    textDecoration: "none",
    letterSpacing: "0.5px",
  },
  footer: {
    padding: "32px",
    textAlign: "center" as const,
    backgroundColor: "#fafafa",
    borderTop: "1px solid #f0f0f0",
  },
  footerText: {
    fontSize: "13px",
    color: "#666666",
    margin: 0,
  },
  footerLinks: {
    fontSize: "12px",
    margin: 0,
  },
  footerLink: {
    color: "#7b3ff2",
    textDecoration: "none",
  },
  footerDot: {
    color: "#cccccc",
    margin: "0 8px",
  },
  copyright: {
    fontSize: "11px",
    color: "#999999",
    margin: "20px 0 0 0",
  },
};

export default UpdateNotificationEmail;