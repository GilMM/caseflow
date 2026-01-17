import "antd/dist/reset.css";
import "./globals.css";

export const metadata = {
  title: "CaseFlow",
  description: "Mini Dynamics-style Service Desk",
};

// Root layout must contain <html> and <body>
// The locale-specific layout will update lang and dir attributes
export default function RootLayout({ children }) {
  return (
    <html lang="en" dir="ltr" suppressHydrationWarning>
      <body style={{ margin: 0 }}>{children}</body>
    </html>
  );
}
