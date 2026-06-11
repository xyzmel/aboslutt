const monthNumbers: Record<string, number> = {
  jan: 0,
  januar: 0,
  feb: 1,
  februar: 1,
  mar: 2,
  mars: 2,
  apr: 3,
  april: 3,
  mai: 4,
  jun: 5,
  juni: 5,
  jul: 6,
  juli: 6,
  aug: 7,
  august: 7,
  sep: 8,
  september: 8,
  okt: 9,
  oktober: 9,
  nov: 10,
  november: 10,
  des: 11,
  desember: 11,
};

export function parseNextPaymentDate(value?: string | null, today = startOfDay(new Date())) {
  const trimmedValue = value?.trim();

  if (!trimmedValue || /^ukjent$/i.test(trimmedValue)) {
    return null;
  }

  const isoDateMatch = trimmedValue.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoDateMatch) {
    return validateFutureDate(
      new Date(Number(isoDateMatch[1]), Number(isoDateMatch[2]) - 1, Number(isoDateMatch[3])),
      today,
    );
  }

  const monthPattern = Object.keys(monthNumbers).join("|");
  const dayMonthMatch = trimmedValue.match(
    new RegExp(`(\\d{1,2})\\.?\\s*(${monthPattern})\\.?\\s*(\\d{4})?`, "i"),
  );

  if (dayMonthMatch) {
    const day = Number(dayMonthMatch[1]);
    const month = monthNumbers[dayMonthMatch[2].toLowerCase()];
    const explicitYear = dayMonthMatch[3] ? Number(dayMonthMatch[3]) : null;
    const year = explicitYear ?? today.getFullYear();
    const paymentDate = new Date(year, month, day);

    if (!explicitYear && startOfDay(paymentDate) < today) {
      paymentDate.setFullYear(paymentDate.getFullYear() + 1);
    }

    return validateFutureDate(paymentDate, today);
  }

  return null;
}

export function normalizeDateInputValue(value?: string | null) {
  const date = parseNextPaymentDate(value);
  return date ? toDateInputValue(date) : "";
}

export function formatNextPaymentDate(value?: string | null) {
  const date = parseNextPaymentDate(value);

  if (!date) {
    return "Ukjent";
  }

  return new Intl.DateTimeFormat("nb-NO", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

export function formatShortPaymentDate(date: Date | null) {
  if (!date) {
    return "Ukjent";
  }

  return new Intl.DateTimeFormat("nb-NO", {
    day: "numeric",
    month: "short",
  }).format(date);
}

export function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function validateFutureDate(date: Date, today: Date) {
  if (Number.isNaN(date.getTime()) || startOfDay(date) < today) {
    return null;
  }

  return startOfDay(date);
}

function toDateInputValue(date: Date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}
