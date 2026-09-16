import { Filter, Inbox } from "lucide-react";
import Link from "next/link";
import { LoginForm } from "@/components/admin/login-form";
import { LogoutButton } from "@/components/admin/logout-button";
import { StatusSelect } from "@/components/admin/status-select";
import { buttonClasses } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { LogoMark } from "@/components/ui/logo";
import { branches, getBranch, isBranchId, siteConfig } from "@/config/site";
import { isAdminAuthenticated, isAdminConfigured } from "@/lib/auth";
import { countBookingsByStatus, listBookings } from "@/lib/bookings";
import { formatDateShort, formatDateTimeRu, isValidISODate } from "@/lib/dates";
import { formatBookingNumber, formatPrice } from "@/lib/format";
import { formatPhoneDisplay } from "@/lib/phone";
import { BOOKING_STATUS_LABELS, BOOKING_STATUSES, type BookingStatus } from "@/lib/schemas/booking";
import { parseSnapshot } from "@/lib/telegram";
import { cn } from "@/lib/utils";

// Данные админки всегда свежие: никакого статического кэша
export const dynamic = "force-dynamic";

interface AdminPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

const pick = (value: string | string[] | undefined) =>
  (Array.isArray(value) ? value[0] : value) ?? "";

export default async function AdminPage({ searchParams }: AdminPageProps) {
  if (!isAdminConfigured()) {
    return (
      <Container className="py-20 text-center">
        <h1 className="text-2xl font-bold">Админка не настроена</h1>
        <p className="mt-2 text-muted">
          Задайте ADMIN_PASSWORD и ADMIN_SESSION_SECRET в файле .env и перезапустите сервер.
        </p>
      </Container>
    );
  }

  if (!(await isAdminAuthenticated())) return <LoginForm />;

  const params = await searchParams;
  const statusParam = pick(params.status);
  const status = (BOOKING_STATUSES as readonly string[]).includes(statusParam)
    ? (statusParam as BookingStatus)
    : undefined;
  const from = isValidISODate(pick(params.from)) ? pick(params.from) : undefined;
  const to = isValidISODate(pick(params.to)) ? pick(params.to) : undefined;
  const branchParam = pick(params.branch);
  const branchId = isBranchId(branchParam) ? branchParam : undefined;

  const [bookings, counts] = await Promise.all([
    listBookings({ status, from, to, branchId }),
    countBookingsByStatus(),
  ]);
  const total = Object.values(counts).reduce((s, n) => s + n, 0);

  return (
    <div className="min-h-svh">
      <header className="border-b border-border bg-surface">
        <Container className="flex h-16 items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <LogoMark />
            <div>
              <p className="font-heading text-sm font-bold">ШинаПро · Заявки</p>
              <p className="text-xs text-muted">Всего: {total}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/" className={buttonClasses("ghost", "sm")}>
              На сайт
            </Link>
            <LogoutButton />
          </div>
        </Container>
      </header>

      <Container className="py-8">
        <div
          className="flex flex-wrap gap-2"
          role="navigation"
          aria-label="Быстрые фильтры по статусу"
        >
          <Link href="/admin" className={cn(buttonClasses(status ? "outline" : "secondary", "sm"))}>
            Все · {total}
          </Link>
          {BOOKING_STATUSES.map((s) => (
            <Link
              key={s}
              href={`/admin?status=${s}`}
              className={cn(buttonClasses(status === s ? "secondary" : "outline", "sm"))}
              aria-current={status === s ? "page" : undefined}
            >
              {BOOKING_STATUS_LABELS[s]} · {counts[s]}
            </Link>
          ))}
        </div>

        <form
          method="get"
          className="mt-6 grid gap-3 rounded-2xl border border-border bg-surface p-4 sm:grid-cols-[1fr_1fr_1fr_auto] sm:items-end"
        >
          {status && <input type="hidden" name="status" value={status} />}
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-semibold">С даты</span>
            <input
              type="date"
              name="from"
              defaultValue={from}
              className="h-10 rounded-xl border border-border bg-bg px-3"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-semibold">По дату</span>
            <input
              type="date"
              name="to"
              defaultValue={to}
              className="h-10 rounded-xl border border-border bg-bg px-3"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-semibold">Филиал</span>
            <select
              name="branch"
              defaultValue={branchId ?? ""}
              className="h-10 rounded-xl border border-border bg-bg px-3"
            >
              <option value="">Все филиалы</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.shortName}
                </option>
              ))}
            </select>
          </label>
          <div className="flex gap-2">
            <button type="submit" className={buttonClasses("primary", "md")}>
              <Filter className="size-4" aria-hidden="true" /> Показать
            </button>
            {(from || to || branchId) && (
              <Link
                href={status ? `/admin?status=${status}` : "/admin"}
                className={buttonClasses("ghost", "md")}
              >
                Сбросить
              </Link>
            )}
          </div>
        </form>

        {bookings.length === 0 ? (
          <div className="mt-6 flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border p-12 text-center text-muted">
            <Inbox className="size-8" aria-hidden="true" />
            <p>Заявок по этим условиям нет</p>
          </div>
        ) : (
          <div className="mt-6 overflow-x-auto rounded-2xl border border-border bg-surface">
            <table className="w-full min-w-[900px] text-sm">
              <caption className="sr-only">Список заявок</caption>
              <thead className="bg-surface-2 text-left text-xs text-muted uppercase">
                <tr>
                  <th scope="col" className="px-4 py-3 font-semibold">
                    №
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold">
                    Визит
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold">
                    Филиал
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold">
                    Клиент
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold">
                    Авто / комментарий
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold">
                    Расчёт
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold">
                    Статус
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold">
                    Создана
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {bookings.map((b) => {
                  const snapshot = parseSnapshot(b.calculation);
                  return (
                    <tr key={b.id} className="align-top">
                      <td className="tabular px-4 py-3 font-semibold whitespace-nowrap">
                        {formatBookingNumber(b.id)}
                      </td>
                      <td className="tabular px-4 py-3 whitespace-nowrap">
                        <div className="font-semibold">{formatDateShort(b.date)}</div>
                        <div className="text-muted">{b.time}</div>
                      </td>
                      <td className="px-4 py-3">
                        {getBranch(b.branchId)?.shortName ?? b.branchId}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-semibold">{b.name}</div>
                        <a href={`tel:${b.phone}`} className="whitespace-nowrap text-accent-text">
                          {formatPhoneDisplay(b.phone)}
                        </a>
                      </td>
                      <td className="max-w-[260px] px-4 py-3">
                        {b.car && <div>{b.car}</div>}
                        {b.comment && (
                          <div className="text-xs leading-snug text-muted">{b.comment}</div>
                        )}
                        {!b.car && !b.comment && <span className="text-muted">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        {snapshot ? (
                          <details>
                            <summary className="cursor-pointer font-semibold whitespace-nowrap">
                              {formatPrice(snapshot.total)}
                            </summary>
                            <p className="mt-1 text-xs text-muted">{snapshot.summary}</p>
                            <ul className="mt-1 text-xs">
                              {snapshot.lines.map((l) => (
                                <li key={l.label}>
                                  {l.label} × {l.qty}: {formatPrice(l.total)}
                                </li>
                              ))}
                            </ul>
                          </details>
                        ) : (
                          <span className="text-muted">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <StatusSelect id={b.id} status={b.status as BookingStatus} />
                      </td>
                      <td className="tabular px-4 py-3 text-xs whitespace-nowrap text-muted">
                        {formatDateTimeRu(b.createdAt, siteConfig.timeZone)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Container>
    </div>
  );
}
