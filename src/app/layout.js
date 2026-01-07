import "antd/dist/reset.css";
import "./globals.css";

export const metadata = {
  title: "CaseFlow",
  description: "Mini Dynamics-style Service Desk",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body style={{ margin: 0 }}>{children}</body>
    </html>
  );
}
