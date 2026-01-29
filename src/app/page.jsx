// src/app/page.jsx
import { redirect } from "next/navigation";

export default function RootPublicHomePage() {
  // Redirect to localized landing page (next-intl will handle locale detection)
  redirect("/en");
}
