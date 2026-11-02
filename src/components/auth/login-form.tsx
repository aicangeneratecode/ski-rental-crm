"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Field, FieldLabel, FieldError } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth-client";

const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
});

type LoginValues = z.infer<typeof loginSchema>;

export default function LoginForm() {
  const t = useTranslations("auth");
  const [error, setError] = useState<
    "failed" | "networkError" | null
  >(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    setError(null);

    try {
      const result = await authClient.signIn.email({
        email: values.email,
        password: values.password,
        rememberMe: true,
      });

      if (result.error) {
        setError("failed");
        return;
      }

      window.location.assign("/");
    } catch {
      setError("networkError");
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      <Field controlId="login-email">
        <FieldLabel>{t("email")}</FieldLabel>

        <Input
          {...register("email")}
          type="email"
          autoComplete="username"
          autoFocus
          disabled={isSubmitting}
          aria-invalid={!!errors.email}
        />

        {errors.email && (
          <FieldError>{t("invalidEmail")}</FieldError>
        )}
      </Field>

      <Field controlId="login-password">
        <FieldLabel>{t("password")}</FieldLabel>

        <Input
          {...register("password")}
          type="password"
          autoComplete="current-password"
          disabled={isSubmitting}
          aria-invalid={!!errors.password}
        />

        {errors.password && (
          <FieldError>{t("requiredPassword")}</FieldError>
        )}
      </Field>

      {error && (
        <p
          role="alert"
          className="text-sm text-red-600 dark:text-red-400"
        >
          {t(error)}
        </p>
      )}

      <Button
        type="submit"
        disabled={isSubmitting}
        className="w-full"
      >
        {t(isSubmitting ? "pending" : "submit")}
      </Button>
    </form>
  );
}