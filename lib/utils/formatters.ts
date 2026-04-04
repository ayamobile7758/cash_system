export function formatCurrency(value: number) {
  return new Intl.NumberFormat("ar-JO-u-nu-latn", {
    style: "currency",
    currency: "JOD",
    minimumFractionDigits: 3,
    maximumFractionDigits: 3
  }).format(value);
}

export function formatCompactNumber(value: number) {
  return new Intl.NumberFormat("ar-JO-u-nu-latn", {
    maximumFractionDigits: 0
  }).format(value);
}

const DATE_TIME_ZONE = "Asia/Baghdad";

function getDateParts(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone: DATE_TIME_ZONE,
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  });
  const parts = formatter.formatToParts(date);
  const day = parts.find((part) => part.type === "day")?.value ?? "01";
  const month = parts.find((part) => part.type === "month")?.value ?? "01";
  const year = parts.find((part) => part.type === "year")?.value ?? "1970";

  return { day, month, year, date };
}

function getTimeParts(date: Date) {
  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone: DATE_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  });
  const parts = formatter.formatToParts(date);
  const hour = parts.find((part) => part.type === "hour")?.value ?? "00";
  const minute = parts.find((part) => part.type === "minute")?.value ?? "00";

  return { hour, minute };
}

export function formatDate(value: string) {
  const parts = getDateParts(value);

  if (!parts) {
    return value;
  }

  return `${parts.day}/${parts.month}/${parts.year}`;
}

export function formatDateTime(value: string) {
  const parts = getDateParts(value);

  if (!parts) {
    return value;
  }

  const time = getTimeParts(parts.date);
  return `${parts.day}/${parts.month}/${parts.year} ${time.hour}:${time.minute}`;
}
