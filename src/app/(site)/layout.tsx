import { Footer } from "@/components/layout/footer";
import { Header } from "@/components/layout/header";
import { StickyCta } from "@/components/layout/sticky-cta";

/** Публичная часть сайта: шапка, подвал, липкая CTA на мобильных */
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header />
      <main id="main" className="flex-1">
        {children}
      </main>
      <Footer />
      <StickyCta />
    </>
  );
}
