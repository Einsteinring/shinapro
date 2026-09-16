import { faq } from "@/config/faq";
import { services } from "@/config/services";
import { branches, siteConfig, type Weekday } from "@/config/site";

const DAY_NAMES: Record<Weekday, string> = {
  0: "Sunday",
  1: "Monday",
  2: "Tuesday",
  3: "Wednesday",
  4: "Thursday",
  5: "Friday",
  6: "Saturday",
};

const pad = (h: number) => `${String(h).padStart(2, "0")}:00`;

function openingHours(branch: (typeof branches)[number]) {
  return (Object.keys(branch.schedule) as unknown as Weekday[])
    .map((day) => ({ day: Number(day) as Weekday, hours: branch.schedule[Number(day) as Weekday] }))
    .filter((d) => d.hours !== null)
    .map((d) => ({
      "@type": "OpeningHoursSpecification",
      dayOfWeek: DAY_NAMES[d.day],
      opens: pad(d.hours!.open),
      closes: pad(d.hours!.close),
    }));
}

/** Schema.org: сеть AutoRepair с двумя точками, каталог услуг и FAQ */
export function JsonLd() {
  const data = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "AutoRepair",
        "@id": `${siteConfig.url}/#organization`,
        name: siteConfig.name,
        legalName: siteConfig.legalName,
        url: siteConfig.url,
        telephone: siteConfig.phone,
        email: siteConfig.email,
        description: siteConfig.description,
        priceRange: "₽₽",
        currenciesAccepted: "RUB",
        paymentAccepted: "Cash, Credit Card, SBP",
        areaServed: { "@type": "City", name: "Санкт-Петербург" },
        foundingDate: String(siteConfig.foundedYear),
        location: branches.map((b) => ({ "@id": `${siteConfig.url}/#branch-${b.id}` })),
        hasOfferCatalog: {
          "@type": "OfferCatalog",
          name: "Услуги",
          itemListElement: services.map((s) => ({
            "@type": "Offer",
            url: `${siteConfig.url}/services/${s.slug}`,
            priceCurrency: "RUB",
            price: s.priceFrom,
            itemOffered: { "@type": "Service", name: s.title, description: s.short },
          })),
        },
      },
      ...branches.map((b) => ({
        "@type": "AutoRepair",
        "@id": `${siteConfig.url}/#branch-${b.id}`,
        name: b.name,
        parentOrganization: { "@id": `${siteConfig.url}/#organization` },
        telephone: b.phone,
        address: {
          "@type": "PostalAddress",
          streetAddress: b.address.replace("Санкт-Петербург, ", ""),
          addressLocality: "Санкт-Петербург",
          addressCountry: "RU",
        },
        geo: { "@type": "GeoCoordinates", latitude: b.coords.lat, longitude: b.coords.lng },
        openingHoursSpecification: openingHours(b),
      })),
      {
        "@type": "FAQPage",
        mainEntity: faq.map((item) => ({
          "@type": "Question",
          name: item.question,
          acceptedAnswer: { "@type": "Answer", text: item.answer },
        })),
      },
    ],
  };

  return (
    <script
      type="application/ld+json"
      // JSON.stringify экранирует «</script>» через replace, чтобы нельзя было закрыть тег из данных
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}
