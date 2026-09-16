"use client";

import { LockKeyhole } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { LogoMark } from "@/components/ui/logo";

export function LoginForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = (await res.json()) as { ok: boolean; message?: string };
      if (!res.ok || !data.ok) {
        setError(data.message ?? "Не удалось войти");
        return;
      }
      router.refresh();
    } catch {
      setError("Нет соединения с сервером");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-svh items-center justify-center p-4">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-sm rounded-3xl border border-border bg-surface p-8 shadow-card"
      >
        <div className="flex items-center gap-3">
          <LogoMark />
          <div>
            <p className="font-heading font-bold">ШинаПро · Админка</p>
            <p className="text-xs text-muted">Заявки и статусы</p>
          </div>
        </div>
        <Field id="admin-password" label="Пароль" error={error ?? undefined} className="mt-6">
          <Input
            id="admin-password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            invalid={Boolean(error)}
            autoFocus
            required
          />
        </Field>
        <Button type="submit" loading={loading} className="mt-5 w-full" size="lg">
          <LockKeyhole className="size-4" aria-hidden="true" />
          Войти
        </Button>
        <p className="mt-4 text-center text-xs text-muted">
          Пароль задаётся в .env (ADMIN_PASSWORD)
        </p>
      </form>
    </div>
  );
}
