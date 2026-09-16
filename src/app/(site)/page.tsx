import { BookingDraftProvider } from "@/components/booking/booking-draft-context";
import { JsonLd } from "@/components/layout/json-ld";
import { Advantages } from "@/components/sections/advantages";
import { BookingSection } from "@/components/sections/booking-section";
import { CalculatorSection } from "@/components/sections/calculator-section";
import { Contacts } from "@/components/sections/contacts";
import { Faq } from "@/components/sections/faq";
import { Hero } from "@/components/sections/hero";
import { HowItWorks } from "@/components/sections/how-it-works";
import { Reviews } from "@/components/sections/reviews";
import { Services } from "@/components/sections/services";

export default function HomePage() {
  return (
    <BookingDraftProvider>
      <JsonLd />
      <Hero />
      <Services />
      <CalculatorSection />
      <HowItWorks />
      <Advantages />
      <Reviews />
      <Faq />
      <Contacts />
      <BookingSection />
    </BookingDraftProvider>
  );
}
