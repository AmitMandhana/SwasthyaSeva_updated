import type { SelectOption } from "./SelectField";

export function formatSlotTime(interval: number, format: "24h" | "12h" = "24h"): string {
  const h = Math.floor(interval / 2);
  const m = (interval % 2) * 30;
  if (format === "24h") {
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  }
  const period = h < 12 ? "AM" : "PM";
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${h12}:${String(m).padStart(2, "0")} ${period}`;
}

export const SLOT_TIME_OPTIONS_24H: SelectOption[] =
  Array.from({ length: 48 }, (_, i) => ({ value: String(i), label: formatSlotTime(i, "24h") }));

export const SLOT_TIME_OPTIONS_12H: SelectOption[] =
  Array.from({ length: 48 }, (_, i) => ({ value: String(i), label: formatSlotTime(i, "12h") }));

export const SLOT_TIME_MAP_12H: Record<number, string> =
  Object.fromEntries(Array.from({ length: 48 }, (_, i) => [i, formatSlotTime(i, "12h")]));

export const DAY_ORDER: string[] = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];

export const DAY_LABELS: Record<string, string> = {
  MON: "Monday", TUE: "Tuesday", WED: "Wednesday", THU: "Thursday",
  FRI: "Friday", SAT: "Saturday", SUN: "Sunday",
};

export const DAY_SHORT_LABELS: Record<string, string> = {
  MON: "Mon", TUE: "Tue", WED: "Wed", THU: "Thu",
  FRI: "Fri", SAT: "Sat", SUN: "Sun",
};

export const DAY_SELECT_OPTIONS: SelectOption[] =
  DAY_ORDER.map((d) => ({ value: d, label: DAY_LABELS[d] }));
