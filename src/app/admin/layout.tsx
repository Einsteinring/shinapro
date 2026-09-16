import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Админка",
  robots: { index: false, follow: false },
};

/** Служебный раздел без публичной шапки и подвала */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <main id="main" className="flex-1">
      {children}
    </main>
  );
}
