"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export function LogoutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const onClick = async () => {
    setLoading(true);
    await fetch("/api/admin/logout", { method: "POST" }).catch(() => null);
    router.refresh();
  };

  return (
    <Button variant="outline" size="sm" onClick={onClick} loading={loading}>
      <LogOut className="size-4" aria-hidden="true" />
      Выйти
    </Button>
  );
}
