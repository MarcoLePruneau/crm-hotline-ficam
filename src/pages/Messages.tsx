import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTechnician } from "@/hooks/useTechnician";
import { TECHNICIENS } from "@/lib/constants";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Paperclip, Send, Search, Download, FileIcon } from "lucide-react";
import { technicianInitials } from "@/lib/ficam";
import { cn } from "@/lib/utils";
import { format, isToday, isYesterday } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";

type Message = {
  id: string;
  sender: string;
  recipient: string;
  content: string | null;
  file_path: string | null;
  file_name: string | null;
  file_size: number | null;
  file_type: string | null;
  read_at: string | null;
  created_at: string;
};

type Presence = { technicien: string; status: string; last_seen: string };

const HEARTBEAT_MS = 25_000;
const ONLINE_THRESHOLD_MS = 60_000;

export default function Messages() {
  const { technicien } = useTechnician();
  const me = technicien!;
  const others = useMemo(() => TECHNICIENS.filter((t) => t !== me), [me]);

  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [presence, setPresence] = useState<Record<string, Presence>>({});
  const [unread, setUnread] = useState<Record<string, number>>({});
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Heartbeat de présence
  useEffect(() => {
    const ping = async () => {
      await supabase.from("technician_presence").upsert({
        technicien: me,
        status: "online",
        last_seen: new Date().toISOString(),
      });
    };
    ping();
    const i = setInterval(ping, HEARTBEAT_MS);
    const onLeave = () => {
      supabase.from("technician_presence").upsert({
        technicien: me,
        status: "offline",
        last_seen: new Date().toISOString(),
      });
    };
    window.addEventListener("beforeunload", onLeave);
    return () => {
      clearInterval(i);
      window.removeEventListener("beforeunload", onLeave);
      onLeave();
    };
  }, [me]);

  // Charger présence + abonnement realtime + toast connexion collègues
  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from("technician_presence").select("*");
      const map: Record<string, Presence> = {};
      (data ?? []).forEach((p: any) => (map[p.technicien] = p));
      setPresence(map);
    };
    load();
    const ch = supabase
      .channel(`presence-changes-${me}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "technician_presence" }, (payload: any) => {
        const row = payload.new as Presence;
        if (!row?.technicien || row.technicien === me) return;
        setPresence((p) => {
          const prev = p[row.technicien];
          const wasOnline = prev?.status === "online" && Date.now() - new Date(prev.last_seen).getTime() < ONLINE_THRESHOLD_MS;
          const isNowOnline = row.status === "online" && Date.now() - new Date(row.last_seen).getTime() < ONLINE_THRESHOLD_MS;
          if (!wasOnline && isNowOnline) {
            toast.success(`${row.technicien} est en ligne`);
          }
          return { ...p, [row.technicien]: row };
        });
      })
      .subscribe();
    const refresh = setInterval(load, 30_000);
    return () => {
      supabase.removeChannel(ch);
      clearInterval(refresh);
    };
  }, [me]);

  // Charger compteurs de non-lus + messages de la conv sélectionnée
  const loadUnread = async () => {
    const { data } = await supabase
      .from("direct_messages")
      .select("sender")
      .eq("recipient", me)
      .is("read_at", null);
    const counts: Record<string, number> = {};
    (data ?? []).forEach((r: any) => {
      counts[r.sender] = (counts[r.sender] ?? 0) + 1;
    });
    setUnread(counts);
  };

  const loadMessages = async (peer: string) => {
    const { data } = await supabase
      .from("direct_messages")
      .select("*")
      .or(`and(sender.eq.${me},recipient.eq.${peer}),and(sender.eq.${peer},recipient.eq.${me})`)
      .order("created_at", { ascending: true })
      .limit(500);
    setMessages((data as Message[]) ?? []);
    // marquer comme lus
    await supabase
      .from("direct_messages")
      .update({ read_at: new Date().toISOString() })
      .eq("sender", peer)
      .eq("recipient", me)
      .is("read_at", null);
    loadUnread();
  };

  useEffect(() => {
    loadUnread();
  }, []);

  useEffect(() => {
    if (selected) loadMessages(selected);
    else setMessages([]);
  }, [selected]);

  // Bip sonore court (WebAudio, sans fichier)
  const beep = () => {
    try {
      const Ctx: any = (window as any).AudioContext || (window as any).webkitAudioContext;
      if (!Ctx) return;
      const ctx = new Ctx();
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "sine"; o.frequency.value = 880;
      g.gain.value = 0.05;
      o.connect(g); g.connect(ctx.destination);
      o.start();
      o.stop(ctx.currentTime + 0.18);
    } catch { /* noop */ }
  };

  // Ref pour lire la sélection courante sans re-souscrire
  const selectedRef = useRef<string | null>(null);
  useEffect(() => { selectedRef.current = selected; }, [selected]);

  // Realtime messages (souscription stable, ne se reconnecte pas à chaque changement de conv)
  useEffect(() => {
    const ch = supabase
      .channel(`dm-changes-${me}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "direct_messages", filter: `recipient=eq.${me}` }, (payload: any) => {
        const m = payload.new as Message;
        const sel = selectedRef.current;
        const inCurrentConv = sel && m.sender === sel;
        if (inCurrentConv) {
          setMessages((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]));
          beep();
          supabase.from("direct_messages").update({ read_at: new Date().toISOString() }).eq("id", m.id).then(() => {});
        } else {
          beep();
          toast.message(`📬 Nouveau message de ${m.sender}`, {
            description: m.content?.slice(0, 80) ?? "Pièce jointe",
          });
          setUnread((u) => ({ ...u, [m.sender]: (u[m.sender] ?? 0) + 1 }));
        }
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "direct_messages", filter: `sender=eq.${me}` }, (payload: any) => {
        const m = payload.new as Message;
        const sel = selectedRef.current;
        if (sel && m.recipient === sel) {
          setMessages((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]));
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [me]);

  // Auto-scroll
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const isOnline = (t: string) => {
    const p = presence[t];
    if (!p) return false;
    if (p.status !== "online") return false;
    return Date.now() - new Date(p.last_seen).getTime() < ONLINE_THRESHOLD_MS;
  };

  const filtered = others.filter((t) => t.toLowerCase().includes(search.toLowerCase()));

  const send = async () => {
    if (!selected) return;
    const value = text.trim();
    if (!value) return;
    setSending(true);
    const { error } = await supabase.from("direct_messages").insert({
      sender: me,
      recipient: selected,
      content: value,
    });
    setSending(false);
    if (error) {
      toast.error("Échec de l'envoi");
      return;
    }
    setText("");
  };

  const onPickFile = () => fileRef.current?.click();

  const uploadFile = async (file: File) => {
    if (!selected) return;
    if (file.size > 25 * 1024 * 1024) {
      toast.error("Fichier trop volumineux (25 Mo max)");
      return;
    }
    setSending(true);
    const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `${me}__${selected}/${Date.now()}_${safe}`;
    const { error: upErr } = await supabase.storage.from("chat-files").upload(path, file);
    if (upErr) {
      setSending(false);
      toast.error("Upload échoué");
      return;
    }
    const { error } = await supabase.from("direct_messages").insert({
      sender: me,
      recipient: selected,
      content: null,
      file_path: path,
      file_name: file.name,
      file_size: file.size,
      file_type: file.type,
    });
    setSending(false);
    if (error) toast.error("Échec de l'envoi du fichier");
  };

  const fileUrl = (path: string) =>
    supabase.storage.from("chat-files").getPublicUrl(path).data.publicUrl;

  const formatDay = (d: Date) =>
    isToday(d) ? "Aujourd'hui" : isYesterday(d) ? "Hier" : format(d, "EEEE d MMMM", { locale: fr });

  // grouper messages par jour
  const grouped = useMemo(() => {
    const out: { day: string; items: Message[] }[] = [];
    messages.forEach((m) => {
      const day = formatDay(new Date(m.created_at));
      const last = out[out.length - 1];
      if (last && last.day === day) last.items.push(m);
      else out.push({ day, items: [m] });
    });
    return out;
  }, [messages]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Messagerie</h1>
        <p className="text-muted-foreground">Discussion directe entre techniciens</p>
      </div>

      <Card className="overflow-hidden">
        <CardContent className="p-0 grid grid-cols-1 md:grid-cols-[300px_1fr] h-[calc(100vh-220px)] min-h-[500px]">
          {/* Liste des techniciens */}
          <div className="border-r flex flex-col min-h-0">
            <div className="p-3 border-b">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Rechercher…"
                  className="pl-9"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
            <div className="flex-1 overflow-auto">
              {filtered.map((t) => {
                const online = isOnline(t);
                const u = unread[t] ?? 0;
                const active = selected === t;
                return (
                  <button
                    key={t}
                    onClick={() => setSelected(t)}
                    className={cn(
                      "w-full text-left px-3 py-2.5 flex items-center gap-3 border-b hover:bg-accent/50 transition-colors",
                      active && "bg-accent",
                    )}
                  >
                    <div className="relative">
                      <div className="w-9 h-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-semibold">
                        {technicianInitials(t)}
                      </div>
                      <span
                        className={cn(
                          "absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-background",
                          online ? "bg-green-500" : "bg-muted-foreground/50",
                        )}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{t}</div>
                      <div className="text-xs text-muted-foreground">
                        {online ? "En ligne" : "Hors ligne"}
                      </div>
                    </div>
                    {u > 0 && <Badge className="ml-auto">{u}</Badge>}
                  </button>
                );
              })}
              {filtered.length === 0 && (
                <div className="p-4 text-sm text-muted-foreground text-center">Aucun technicien</div>
              )}
            </div>
          </div>

          {/* Conversation */}
          <div className="flex flex-col min-h-0">
            {!selected ? (
              <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
                Sélectionnez un technicien pour démarrer une conversation
              </div>
            ) : (
              <>
                <div className="px-4 py-3 border-b flex items-center gap-3">
                  <div className="relative">
                    <div className="w-9 h-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-semibold">
                      {technicianInitials(selected)}
                    </div>
                    <span
                      className={cn(
                        "absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-background",
                        isOnline(selected) ? "bg-green-500" : "bg-muted-foreground/50",
                      )}
                    />
                  </div>
                  <div>
                    <div className="font-semibold text-sm">{selected}</div>
                    <div className="text-xs text-muted-foreground">
                      {isOnline(selected) ? "En ligne" : "Hors ligne"}
                    </div>
                  </div>
                </div>

                <div ref={scrollRef} className="flex-1 overflow-auto p-4 space-y-4 bg-muted/20">
                  {grouped.map((g) => (
                    <div key={g.day} className="space-y-2">
                      <div className="text-center">
                        <span className="text-[11px] uppercase tracking-wide text-muted-foreground bg-background px-2 py-0.5 rounded-full border">
                          {g.day}
                        </span>
                      </div>
                      {g.items.map((m) => {
                        const mine = m.sender === me;
                        return (
                          <div key={m.id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
                            <div
                              className={cn(
                                "max-w-[75%] rounded-2xl px-3 py-2 text-sm shadow-sm",
                                mine
                                  ? "bg-primary text-primary-foreground rounded-br-sm"
                                  : "bg-card border rounded-bl-sm",
                              )}
                            >
                              {m.content && <div className="whitespace-pre-wrap break-words">{m.content}</div>}
                              {m.file_path && m.file_name && (
                                <a
                                  href={fileUrl(m.file_path)}
                                  target="_blank"
                                  rel="noreferrer"
                                  className={cn(
                                    "mt-1 flex items-center gap-2 rounded-lg p-2 text-xs",
                                    mine ? "bg-primary-foreground/15" : "bg-muted",
                                  )}
                                >
                                  {m.file_type?.startsWith("image/") ? (
                                    <img
                                      src={fileUrl(m.file_path)}
                                      alt={m.file_name}
                                      className="max-w-[220px] max-h-[220px] rounded"
                                    />
                                  ) : (
                                    <>
                                      <FileIcon className="w-4 h-4 shrink-0" />
                                      <div className="flex-1 min-w-0">
                                        <div className="truncate font-medium">{m.file_name}</div>
                                        {m.file_size != null && (
                                          <div className="opacity-70">{(m.file_size / 1024).toFixed(1)} Ko</div>
                                        )}
                                      </div>
                                      <Download className="w-3.5 h-3.5 shrink-0" />
                                    </>
                                  )}
                                </a>
                              )}
                              <div
                                className={cn(
                                  "text-[10px] mt-1 opacity-70",
                                  mine ? "text-right" : "text-left",
                                )}
                              >
                                {format(new Date(m.created_at), "HH:mm")}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ))}
                  {messages.length === 0 && (
                    <div className="text-center text-sm text-muted-foreground py-8">
                      Aucun message. Commencez la conversation !
                    </div>
                  )}
                </div>

                <div className="p-3 border-t flex items-end gap-2 bg-background">
                  <input
                    ref={fileRef}
                    type="file"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) uploadFile(f);
                      e.target.value = "";
                    }}
                  />
                  <Button variant="outline" size="icon" onClick={onPickFile} disabled={sending} title="Joindre un fichier">
                    <Paperclip className="w-4 h-4" />
                  </Button>
                  <Input
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        send();
                      }
                    }}
                    placeholder="Votre message…"
                    disabled={sending}
                  />
                  <Button onClick={send} disabled={sending || !text.trim()}>
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
