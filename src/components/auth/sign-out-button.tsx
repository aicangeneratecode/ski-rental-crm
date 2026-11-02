"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";

export default function SignOutButton() {
  const t = useTranslations("auth");
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);

  async function signOut() {
    setPending(true);
    setFailed(false);

    try {
      const result = await authClient.signOut();

      if (result.error) {
        setFailed(true);
        setPending(false);
        return;
      }

      window.location.assign("/login");
    } catch {
      setFailed(true);
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        variant="outline"
        disabled={pending}
        onClick={signOut}
      >
        {t(pending ? "signingOut" : "signOut")}
      </Button>

      {failed && (
        <p role="alert" className="text-xs text-red-600 dark:text-red-400">
          {t("signOutError")}
        </p>
      )}
    </div>
  );
}