import { differenceInDays, parseISO } from "date-fns";

export type ContractStatus = "expired" | "expiring" | "active" | "none";

export function getContractStatus(dateStr?: string | null): ContractStatus {
  if (!dateStr) return "none";
  const d = typeof dateStr === "string" ? parseISO(dateStr) : dateStr;
  if (isNaN(d.getTime())) return "none";
  const diff = differenceInDays(d, new Date());
  if (diff < 0) return "expired";
  if (diff <= 30) return "expiring";
  return "active";
}

export function formatSeconds(s: number) {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
}
