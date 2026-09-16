/**
 * Тестовые данные: несколько заявок на ближайшие дни в разных статусах,
 * часть с прикреплённым расчётом. Запуск: npm run db:seed (идемпотентно).
 */
import { PrismaClient } from "@prisma/client";
import { createSnapshot, DEFAULT_CALCULATOR_INPUT } from "../src/lib/calculator";
import { addDays, nowInTimeZone } from "../src/lib/dates";
import { siteConfig } from "../src/config/site";

const prisma = new PrismaClient();

async function main() {
  const today = nowInTimeZone(new Date(), siteConfig.timeZone).date;

  const seasonal = createSnapshot({ ...DEFAULT_CALCULATOR_INPUT, vehicle: "suv", radius: 17 });
  const puncture = createSnapshot({
    ...DEFAULT_CALCULATOR_INPUT,
    wheels: 1,
    punctures: 1,
    services: {
      removeInstall: true,
      mountDemount: true,
      balancing: true,
      wash: false,
      bags: false,
    },
  });
  const storage = createSnapshot({
    ...DEFAULT_CALCULATOR_INPUT,
    storageMonths: 6,
    services: { ...DEFAULT_CALCULATOR_INPUT.services, wash: true, bags: true },
  });

  const rows = [
    {
      name: "Дмитрий",
      phone: "+79215550101",
      car: "Skoda Octavia",
      branchId: "moskovskaya",
      date: addDays(today, 1),
      time: "10:00",
      comment: "Летние шины в багажнике, литые диски.",
      snapshot: seasonal,
      status: "confirmed",
    },
    {
      name: "Анна",
      phone: "+79215550102",
      car: "Kia Sportage",
      branchId: "moskovskaya",
      date: addDays(today, 1),
      time: "10:30",
      comment: null,
      snapshot: puncture,
      status: "new",
    },
    {
      name: "Игорь",
      phone: "+79215550103",
      car: "Toyota RAV4",
      branchId: "primorskaya",
      date: addDays(today, 2),
      time: "12:00",
      comment: "Нужна правка двух дисков, есть биение.",
      snapshot: null,
      status: "new",
    },
    {
      name: "Мария",
      phone: "+79215550104",
      car: "Volkswagen Polo",
      branchId: "moskovskaya",
      date: addDays(today, 3),
      time: "18:30",
      comment: "Забрать шины с хранения и переобуть.",
      snapshot: storage,
      status: "new",
    },
    {
      name: "Сергей",
      phone: "+79215550105",
      car: "Ford Transit",
      branchId: "primorskaya",
      date: addDays(today, -2),
      time: "09:30",
      comment: null,
      snapshot: null,
      status: "done",
    },
    {
      name: "Екатерина",
      phone: "+79215550106",
      car: "Hyundai Creta",
      branchId: "moskovskaya",
      date: addDays(today, -1),
      time: "15:00",
      comment: "Перенесла на другой день",
      snapshot: null,
      status: "cancelled",
    },
  ] as const;

  let created = 0;
  for (const row of rows) {
    const exists = await prisma.booking.findFirst({
      where: { phone: row.phone, date: row.date, time: row.time },
      select: { id: true },
    });
    if (exists) continue;

    await prisma.booking.create({
      data: {
        name: row.name,
        phone: row.phone,
        car: row.car,
        branchId: row.branchId,
        date: row.date,
        time: row.time,
        comment: row.comment,
        calculation: row.snapshot ? JSON.stringify(row.snapshot) : null,
        calcTotal: row.snapshot?.total ?? null,
        status: row.status,
        ip: "127.0.0.1",
      },
    });
    created += 1;
  }

  console.log(`[seed] Добавлено заявок: ${created}, всего в БД: ${await prisma.booking.count()}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
