import type { Metadata } from "next";
import { Footer } from "@/components/layout/footer";
import { Header } from "@/components/layout/header";
import { ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/container";

export const metadata: Metadata = {
  title: "Страница не найдена",
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <>
      <Header />
      <main id="main" className="flex flex-1 items-center py-20">
        <Container className="text-center">
          <p
            className="font-heading text-8xl font-extrabold text-accent-text sm:text-9xl"
            aria-hidden="true"
          >
            404
          </p>
          <h1 className="mt-4 text-2xl font-bold sm:text-3xl">Такой страницы нет</h1>
          <p className="mx-auto mt-3 max-w-md text-muted">
            Возможно, ссылка устарела или в адресе опечатка. Колёса точно на месте, а вот страница
            укатилась.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <ButtonLink href="/">На главную</ButtonLink>
            <ButtonLink href="/#calculator" variant="outline">
              Рассчитать стоимость
            </ButtonLink>
          </div>
        </Container>
      </main>
      <Footer />
    </>
  );
}
