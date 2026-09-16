import {
  Disc3,
  Droplets,
  Gauge,
  LifeBuoy,
  Scale,
  Warehouse,
  Wrench,
  type LucideProps,
} from "lucide-react";
import type { ServiceIcon as ServiceIconName } from "@/config/services";

const icons: Record<ServiceIconName, React.ComponentType<LucideProps>> = {
  tire: LifeBuoy,
  balance: Scale,
  warehouse: Warehouse,
  patch: Wrench,
  disc: Disc3,
  oil: Droplets,
  suspension: Gauge,
};

export function ServiceIcon({ name, className }: { name: ServiceIconName; className?: string }) {
  const Icon = icons[name];
  return <Icon className={className} aria-hidden="true" strokeWidth={1.75} />;
}
