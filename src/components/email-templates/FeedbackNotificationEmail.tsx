import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";

interface FeedbackNotificationEmailProps {
  userName: string;
  userEmail: string;
  feedbackType: "bug" | "feature" | "improvement";
  title: string;
  description: string;
  feedbackId: string;
}

const FeedbackNotificationEmail = ({
  userName,
  userEmail,
  feedbackType,
  title,
  description,
  feedbackId,
}: FeedbackNotificationEmailProps) => {
  const typeLabels = {
    bug: "Bug Report",
    feature: "Napad na vylepsenie",
    improvement: "Zlepsenie",
  };

  const typeColors = {
    bug: "#ef4444",
    feature: "#8b5cf6",
    improvement: "#10b981",
  };

  return (
    <Html>
      <Head />
      <Preview>Novy feedback od {userName}: {title}</Preview>
      <Body style={{backgroundColor: "#f6f9fc", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"}}>
        <Container style={{margin: "0 auto", padding: "20px 0", maxWidth: "600px"}}>
          <Section style={{backgroundColor: "#9333ea", padding: "30px 20px", borderRadius: "12px 12px 0 0", textAlign: "center"}}>
            <Heading style={{color: "#ffffff", fontSize: "24px", fontWeight: "bold", margin: "0"}}>Novy Feedback - Eatrivo</Heading>
          </Section>
          <Section style={{backgroundColor: "#ffffff", padding: "32px", borderRadius: "0 0 12px 12px"}}>
            <Text style={{fontSize: "18px", fontWeight: "600", color: "#1f2937", margin: "0 0 16px 0"}}>Ahoj Admin,</Text>
            <Text style={{fontSize: "16px", color: "#374151", margin: "0 0 24px 0"}}>Mas novy feedback od pouzivatela.</Text>
            <Section style={{backgroundColor: "#f9fafb", padding: "20px", borderRadius: "8px", marginBottom: "24px", borderLeft: "4px solid" }}>
              <table style={{width: "100%"}}>
                <tbody>
                  <tr>
                    <td style={{fontSize: "14px", color: "#6b7280", paddingBottom: "12px"}}>Typ:</td>
                    <td style={{fontSize: "14px", paddingBottom: "12px"}}><span style={{display: "inline-block", padding: "4px 12px", borderRadius: "12px", color: "#ffffff", fontSize: "13px", fontWeight: "600", backgroundColor: typeColors[feedbackType]}}>{typeLabels[feedbackType]}</span></td>
                  </tr>
                  <tr>
                    <td style={{fontSize: "14px", color: "#6b7280", paddingBottom: "12px"}}>Pouzivatel:</td>
                    <td style={{fontSize: "14px", paddingBottom: "12px"}}>{userName}</td>
                  </tr>
                  <tr>
                    <td style={{fontSize: "14px", color: "#6b7280", paddingBottom: "12px"}}>Email:</td>
                    <td style={{fontSize: "14px", paddingBottom: "12px"}}>{userEmail}</td>
                  </tr>
                  <tr>
                    <td style={{fontSize: "14px", color: "#6b7280", paddingBottom: "12px"}}>Nazov:</td>
                    <td style={{fontSize: "14px", paddingBottom: "12px"}}><strong>{title}</strong></td>
                  </tr>
                </tbody>
              </table>
            </Section>
            <Section style={{marginBottom: "24px"}}>
              <Text style={{fontSize: "14px", color: "#6b7280", margin: "0 0 8px 0", fontWeight: "600"}}>Popis:</Text>
              <div style={{backgroundColor: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: "8px", padding: "16px"}}>
                <Text style={{fontSize: "14px", color: "#374151", margin: "0"}}>{description}</Text>
              </div>
            </Section>
            <Text style={{fontSize: "13px", color: "#6b7280"}}>Feedback ID: <code style={{fontFamily: "monospace", backgroundColor: "#f3f4f6", padding: "2px 6px", borderRadius: "4px", fontSize: "12px", color: "#9333ea"}}>{feedbackId}</code></Text>
          </Section>
          <Section style={{padding: "20px 0", textAlign: "center"}}>
            <Text style={{fontSize: "12px", color: "#9ca3af", margin: "0"}}>Tento email bol odoslany automaticky z Eatrivo Feedback systemu.</Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

export default FeedbackNotificationEmail;
