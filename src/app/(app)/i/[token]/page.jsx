"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

export default function InviteRedirectPage() {
  const { token } = useParams();
  const router = useRouter();

  useEffect(() => {
    if (!token) return;
    router.replace(`/onboarding?invite=${encodeURIComponent(token)}`);
  }, [token, router]);

  return null;
}
