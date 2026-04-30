import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import {
  addDays, addMonths, addWeeks, eachDayOfInterval, endOfMonth, endOfWeek,
  format, isSameDay, isSameMonth, startOfDay, startOfMonth, startOfWeek,
} from "date-fns";
import { fr } from "date-fns/locale";
import { STATUT_COLORS } from "@/lib/constants";
import TicketDialog from "@/components/TicketDialog";

type View = "month" | "week" | "day";

export default function CalendarPage() {
  const [view, setView] = useState<View>("week");
  const [cursor, setCursor] = useState(new Date());
  const [tickets, setTickets] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [defaultSlot, setDefaultSlot] = useState<string | null>(null);

  const load = async () => {
    const { data } = await supabase
      .from("tickets")
      .select("id, ticket_number, client_nom, motif, statut, priorite, technicien, scheduled_at, date_ouverture, heure_debut_effectif")
      .order("scheduled_at", { ascending: true })
      .limit(2000);
    setTickets(data ?? []);
  };
  useEffect(() => { load(); }, []);

  const eventDate = (t: any) => new Date(t.scheduled_at || t.heure_debut_effectif || t.date_ouverture);

  const range = useMemo(() => {
    if (view === "day") return { from: startOfDay(cursor), to: addDays(startOfDay(cursor), 1) };
    if (view === "week") {
      const from = startOfWeek(cursor, { weekStartsOn: 1 });
      return { from, to: addDays(from, 7) };
    }
    const from = startOfWeek(startOfMonth(cursor), { weekStartsOn: 1 });
    const to = addDays(endOfWeek(endOfMonth(cursor), { weekStartsOn: 1 }), 1);
    return { from, to };
  }, [view, cursor]);

  const eventsInRange = useMemo(
    () => tickets.filter((t) => {
      const d = eventDate(t);
      return d >= range.from && d < range.to;
    }),
    [tickets, range],
  );

  const goPrev = () => setCursor(view === "day" ? addDays(cursor, -1) : view === "week" ? addWeeks(cursor, -1) : addMonths(cursor, -1));
  const goNext = () => setCursor(view === "day" ? addDays(cursor, 1) : view === "week" ? addWeeks(cursor, 1) : addMonths(cursor, 1));
  const goToday = () => setCursor(new Date());

  const openEvent = (id: string) => { setEditId(id); setDefaultSlot(null); setOpen(true); };
  const openSlot = (date: Date) => {
    setEditId(null);
    setDefaultSlot(date.toISOString());
    setOpen(true);
  };

  const title =
    view === "day"   ? format(cursor, "EEEE d MMMM yyyy", { locale: fr })
  : view === "week"  ? `Semaine du ${format(range.from, "d MMM", { locale: fr })} au ${format(addDays(range.from, 6), "d MMM yyyy", { locale: fr })}`
  : format(cursor, "MMMM yyyy", { locale: fr });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Calendrier</h1>
          <p className="text-muted-foreground capitalize">{title}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-lg border overflow-hidden">
            {(["day", "week", "month"] as View[]).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`px-3 py-1.5 text-sm ${view === v ? "bg-primary text-primary-foreground" : "hover:bg-accent"}`}
              >
                {v === "day" ? "Jour" : v === "week" ? "Semaine" : "Mois"}
              </button>
            ))}
          </div>
          <Button size="sm" variant="outline" onClick={goPrev}><ChevronLeft className="w-4 h-4" /></Button>
          <Button size="sm" variant="outline" onClick={goToday}>Aujourd'hui</Button>
          <Button size="sm" variant="outline" onClick={goNext}><ChevronRight className="w-4 h-4" /></Button>
          <Button size="sm" onClick={() => openSlot(new Date())}><Plus className="w-4 h-4" /> Ticket</Button>
        </div>
      </div>

      {/* Légende */}
      <div className="flex flex-wrap gap-2">
        {Object.entries(STATUT_COLORS).map(([k, c]) => (
          <Badge key={k} style={{ background: c.bg, color: c.fg }}>{c.label}</Badge>
        ))}
      </div>

      <Card>
        <CardContent className="p-0">
          {view === "month" && <MonthView cursor={cursor} events={tickets} onEventClick={openEvent} onDayClick={openSlot} />}
          {view === "week"  && <WeekView from={range.from} events={eventsInRange} onEventClick={openEvent} onSlotClick={openSlot} />}
          {view === "day"   && <DayView day={range.from} events={eventsInRange} onEventClick={openEvent} onSlotClick={openSlot} />}
        </CardContent>
      </Card>

      <TicketDialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) load(); }} ticketId={editId} defaultScheduledAt={defaultSlot} onSaved={load} />
    </div>
  );
}

function EventChip({ t, onClick }: { t: any; onClick: () => void }) {
  const c = STATUT_COLORS[t.statut] ?? STATUT_COLORS.ouvert;
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      className="w-full text-left rounded px-1.5 py-0.5 text-[11px] font-medium truncate hover:opacity-90"
      style={{ background: c.bg, color: c.fg }}
      title={`${t.client_nom} — ${t.ticket_number}`}
    >
      {format(new Date(t.scheduled_at || t.heure_debut_effectif || t.date_ouverture), "HH:mm")} {t.client_nom}
    </button>
  );
}

function MonthView({ cursor, events, onEventClick, onDayClick }: { cursor: Date; events: any[]; onEventClick: (id: string) => void; onDayClick: (d: Date) => void }) {
  const start = startOfWeek(startOfMonth(cursor), { weekStartsOn: 1 });
  const end = endOfWeek(endOfMonth(cursor), { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start, end });
  const headers = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
  return (
    <div>
      <div className="grid grid-cols-7 border-b text-xs text-muted-foreground">
        {headers.map((h) => <div key={h} className="px-2 py-2 text-center font-medium">{h}</div>)}
      </div>
      <div className="grid grid-cols-7">
        {days.map((d) => {
          const dayEvents = events.filter((t) => isSameDay(new Date(t.scheduled_at || t.heure_debut_effectif || t.date_ouverture), d));
          const today = isSameDay(d, new Date());
          const out = !isSameMonth(d, cursor);
          return (
            <div
              key={d.toISOString()}
              onClick={() => onDayClick(new Date(d.setHours(9, 0, 0, 0)))}
              className={`min-h-[110px] border-b border-r p-1 cursor-pointer hover:bg-accent/40 ${out ? "bg-muted/30 text-muted-foreground" : ""}`}
            >
              <div className={`text-xs mb-1 ${today ? "inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground" : ""}`}>{format(d, "d")}</div>
              <div className="space-y-1">
                {dayEvents.slice(0, 4).map((t) => <EventChip key={t.id} t={t} onClick={() => onEventClick(t.id)} />)}
                {dayEvents.length > 4 && <div className="text-[10px] text-muted-foreground">+{dayEvents.length - 4} autres</div>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function WeekView({ from, events, onEventClick, onSlotClick }: { from: Date; events: any[]; onEventClick: (id: string) => void; onSlotClick: (d: Date) => void }) {
  const days = Array.from({ length: 7 }, (_, i) => addDays(from, i));
  const hours = Array.from({ length: 12 }, (_, i) => i + 8); // 8h-19h
  return (
    <div className="overflow-x-auto">
      <div className="grid" style={{ gridTemplateColumns: "60px repeat(7, minmax(120px, 1fr))" }}>
        <div className="border-b border-r" />
        {days.map((d) => (
          <div key={d.toISOString()} className="border-b border-r px-2 py-2 text-center text-xs font-medium">
            <div className="capitalize">{format(d, "EEE", { locale: fr })}</div>
            <div className={`mt-0.5 inline-flex items-center justify-center w-7 h-7 rounded-full ${isSameDay(d, new Date()) ? "bg-primary text-primary-foreground" : ""}`}>{format(d, "d")}</div>
          </div>
        ))}
        {hours.map((h) => (
          <>
            <div key={`h-${h}`} className="border-b border-r px-1 py-1 text-[10px] text-muted-foreground text-right">{h}h</div>
            {days.map((d) => {
              const slot = new Date(d); slot.setHours(h, 0, 0, 0);
              const inSlot = events.filter((t) => {
                const ed = new Date(t.scheduled_at || t.heure_debut_effectif || t.date_ouverture);
                return isSameDay(ed, d) && ed.getHours() === h;
              });
              return (
                <div
                  key={`${d.toISOString()}-${h}`}
                  className="border-b border-r min-h-[44px] p-0.5 hover:bg-accent/40 cursor-pointer space-y-0.5"
                  onClick={() => onSlotClick(slot)}
                >
                  {inSlot.map((t) => <EventChip key={t.id} t={t} onClick={() => onEventClick(t.id)} />)}
                </div>
              );
            })}
          </>
        ))}
      </div>
    </div>
  );
}

function DayView({ day, events, onEventClick, onSlotClick }: { day: Date; events: any[]; onEventClick: (id: string) => void; onSlotClick: (d: Date) => void }) {
  const hours = Array.from({ length: 13 }, (_, i) => i + 7); // 7h-19h
  return (
    <div className="grid" style={{ gridTemplateColumns: "70px 1fr" }}>
      {hours.map((h) => {
        const slot = new Date(day); slot.setHours(h, 0, 0, 0);
        const inSlot = events.filter((t) => new Date(t.scheduled_at || t.heure_debut_effectif || t.date_ouverture).getHours() === h);
        return (
          <>
            <div key={`h-${h}`} className="border-b border-r px-2 py-3 text-xs text-muted-foreground">{h}h00</div>
            <div key={`d-${h}`} className="border-b min-h-[60px] p-1 hover:bg-accent/40 cursor-pointer space-y-1" onClick={() => onSlotClick(slot)}>
              {inSlot.map((t) => (
                <button
                  key={t.id}
                  onClick={(e) => { e.stopPropagation(); onEventClick(t.id); }}
                  className="block w-full text-left rounded px-2 py-1.5 text-xs font-medium hover:opacity-90"
                  style={{ background: STATUT_COLORS[t.statut]?.bg, color: STATUT_COLORS[t.statut]?.fg }}
                >
                  <div className="font-mono opacity-80 text-[10px]">{t.ticket_number}</div>
                  <div>{t.client_nom}</div>
                </button>
              ))}
            </div>
          </>
        );
      })}
    </div>
  );
}
