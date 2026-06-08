import { useEffect, useRef, useState } from "react";
import { Bot, Send, Paperclip, X, Loader2, CheckCircle2, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";

const FUNCTIONS_BASE = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;
const ANON = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

type Msg = { role: "user" | "assistant"; content: string };

type State = {
  contact?: string;
  telephone?: string;
  teamviewer_id?: string;
  motif?: string;
  priorite?: string;
  description?: string;
};

async function callFn(path: string, body: any, isForm = false) {
  const init: RequestInit = {
    method: "POST",
    headers: isForm
      ? { Authorization: `Bearer ${ANON}`, apikey: ANON }
      : { "Content-Type": "application/json", Authorization: `Bearer ${ANON}`, apikey: ANON },
    body: isForm ? body : JSON.stringify(body),
  };
  const res = await fetch(`${FUNCTIONS_BASE}/${path}`, init);
  const j = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(j.error ?? `HTTP ${res.status}`);
  return j;
}

export default function ChatMastercam() {
  const [step, setStep] = useState<"company" | "chat" | "done">("company");
  const [companyInput, setCompanyInput] = useState("");
  const [companyErr, setCompanyErr] = useState<string | null>(null);
  const [client, setClient] = useState<{ id: string; entreprise: string } | null>(null);
  const [validating, setValidating] = useState(false);

  const [messages, setMessages] = useState<Msg[]>([]);
  const [state, setState] = useState<State>({});
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);

  const [file, setFile] = useState<{ path: string; name: string } | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const [ticketNumber, setTicketNumber] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.title = "Assistant FICAM — Création de ticket";
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, sending]);

  // ---- Étape 1 : identification entreprise
  async function validateCompany(e: React.FormEvent) {
    e.preventDefault();
    setCompanyErr(null);
    setValidating(true);
    try {
      const r = await callFn("mastercam-chat", { action: "validate_company", entreprise: companyInput });
      if (!r.ok) {
        setCompanyErr("Entreprise introuvable dans notre base. Merci de contacter FICAM au 01 23 45 67 89.");
        return;
      }
      setClient({ id: r.client_id, entreprise: r.entreprise });
      setStep("chat");
      // premier message assistant
      setSending(true);
      const ai = await callFn("mastercam-chat", { action: "chat", messages: [{ role: "user", content: "Bonjour" }], entreprise: r.entreprise });
      setMessages([{ role: "user", content: "Bonjour" }, { role: "assistant", content: ai.reply ?? "Bonjour !" }]);
      if (ai.state_updates) setState((s) => ({ ...s, ...ai.state_updates }));
    } catch (err: any) {
      setCompanyErr(err.message);
    } finally {
      setValidating(false);
      setSending(false);
    }
  }

  // ---- Étape 2 : envoyer message
  async function send() {
    const text = input.trim();
    if (!text || sending) return;
    const next = [...messages, { role: "user" as const, content: text }];
    setMessages(next);
    setInput("");
    setSending(true);
    try {
      const ai = await callFn("mastercam-chat", { action: "chat", messages: next, entreprise: client!.entreprise });
      const newState = { ...state, ...(ai.state_updates ?? {}) };
      setState(newState);
      setMessages((m) => [...m, { role: "assistant", content: ai.reply ?? "…" }]);
      if (ai.ready) {
        // finalize
        const fin = await callFn("mastercam-chat", {
          action: "finalize",
          client_id: client!.id,
          entreprise: client!.entreprise,
          state: newState,
          file_path: file?.path,
          file_name: file?.name,
        });
        if (fin.ok) {
          setTicketNumber(fin.ticket_number);
          setMessages((m) => [
            ...m,
            {
              role: "assistant",
              content: `✅ Votre ticket **${fin.ticket_number}** a bien été créé avec succès. Un technicien FICAM a été alerté et va vous recontacter sur votre numéro ${newState.telephone} dans les plus brefs délais. Vous pouvez fermer cette fenêtre.`,
            },
          ]);
          setStep("done");
        }
      }
    } catch (err: any) {
      setMessages((m) => [...m, { role: "assistant", content: `⚠️ ${err.message}` }]);
    } finally {
      setSending(false);
    }
  }

  async function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", f);
      form.append("client_id", client?.id ?? "anon");
      const r = await callFn("mastercam-upload", form, true);
      setFile({ path: r.path, name: r.name });
    } catch (err: any) {
      alert("Échec envoi fichier : " + err.message);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header compact */}
      <header className="border-b bg-card px-4 py-3 flex items-center gap-2">
        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
          <Bot className="w-4 h-4 text-primary" />
        </div>
        <div className="min-w-0">
          <div className="text-sm font-semibold leading-tight">Assistant FICAM</div>
          <div className="text-xs text-muted-foreground truncate">
            {client ? client.entreprise : "Création de ticket hotline"}
          </div>
        </div>
      </header>

      {/* Étape 1 : entreprise */}
      {step === "company" && (
        <div className="flex-1 flex items-center justify-center p-4">
          <Card className="w-full max-w-sm">
            <CardContent className="p-6 space-y-4">
              <div className="text-center space-y-1">
                <div className="w-12 h-12 rounded-full bg-primary/10 mx-auto flex items-center justify-center">
                  <Building2 className="w-6 h-6 text-primary" />
                </div>
                <h1 className="font-semibold">Bienvenue</h1>
                <p className="text-xs text-muted-foreground">
                  Indiquez le nom de votre entreprise pour démarrer.
                </p>
              </div>
              <form onSubmit={validateCompany} className="space-y-3">
                <Input
                  value={companyInput}
                  onChange={(e) => setCompanyInput(e.target.value)}
                  placeholder="Nom de l'entreprise"
                  autoFocus
                  disabled={validating}
                />
                {companyErr && <p className="text-xs text-destructive">{companyErr}</p>}
                <Button type="submit" className="w-full" disabled={validating || !companyInput.trim()}>
                  {validating ? <Loader2 className="w-4 h-4 animate-spin" /> : "Continuer"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Étape 2 : chat */}
      {(step === "chat" || step === "done") && (
        <>
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.slice(1).map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-sm whitespace-pre-wrap ${
                    m.role === "user"
                      ? "bg-primary text-primary-foreground rounded-br-sm"
                      : "bg-muted rounded-bl-sm"
                  }`}
                >
                  {m.content}
                </div>
              </div>
            ))}
            {sending && (
              <div className="flex justify-start">
                <div className="bg-muted rounded-2xl rounded-bl-sm px-3.5 py-2 text-sm flex gap-1">
                  <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce" />
                  <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce [animation-delay:120ms]" />
                  <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce [animation-delay:240ms]" />
                </div>
              </div>
            )}
          </div>

          {step === "chat" && (
            <div className="border-t bg-card p-3 space-y-2">
              {file && (
                <div className="flex items-center gap-2 text-xs bg-muted rounded-md px-2 py-1.5">
                  <Paperclip className="w-3.5 h-3.5" />
                  <span className="truncate flex-1">{file.name}</span>
                  <button onClick={() => setFile(null)} className="text-muted-foreground hover:text-foreground">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
              <div className="flex gap-2 items-end">
                <input ref={fileRef} type="file" hidden onChange={onPickFile} accept=".emcam,.mcam,.nc,.txt,.pdf,.png,.jpg,.jpeg,.zip" />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading || sending}
                  title="Joindre un fichier"
                >
                  {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Paperclip className="w-4 h-4" />}
                </Button>
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
                  placeholder="Votre réponse…"
                  disabled={sending}
                />
                <Button size="icon" onClick={send} disabled={sending || !input.trim()}>
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}

          {step === "done" && ticketNumber && (
            <div className="border-t bg-green-500/10 p-4 text-center text-sm flex items-center justify-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-600" />
              Ticket <strong>{ticketNumber}</strong> créé. Vous pouvez fermer cette fenêtre.
            </div>
          )}
        </>
      )}
    </div>
  );
}
