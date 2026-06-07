import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTechnician } from "@/hooks/useTechnician";

export type WidgetKey =
  | "calendar"
  | "tickets"
  | "messages"
  | "notes"
  | "shortcuts"
  | "recurrence"
  | "contracts";

export type Shortcut = { id: string; label: string; url: string };
export type Note = { id: string; text: string; done: boolean };

export type Prefs = {
  widgets: WidgetKey[];
  shortcuts: Shortcut[];
  pense_betes: Note[];
};

const DEFAULTS: Prefs = {
  widgets: ["calendar", "tickets", "messages", "notes", "shortcuts", "recurrence", "contracts"],
  shortcuts: [],
  pense_betes: [],
};

export function useDashboardPrefs() {
  const { technicien } = useTechnician();
  const [prefs, setPrefs] = useState<Prefs>(DEFAULTS);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!technicien) return;
    (async () => {
      const { data } = await supabase
        .from("technician_preferences")
        .select("*")
        .eq("technicien", technicien)
        .maybeSingle();
      if (data) {
        setPrefs({
          widgets: (data.widgets as WidgetKey[]) ?? DEFAULTS.widgets,
          shortcuts: (data.shortcuts as Shortcut[]) ?? [],
          pense_betes: (data.pense_betes as Note[]) ?? [],
        });
      }
      setLoaded(true);
    })();
  }, [technicien]);

  const save = useCallback(
    async (next: Partial<Prefs>) => {
      if (!technicien) return;
      const merged = { ...prefs, ...next };
      setPrefs(merged);
      await supabase.from("technician_preferences").upsert({
        technicien,
        widgets: merged.widgets,
        shortcuts: merged.shortcuts,
        pense_betes: merged.pense_betes,
      });
    },
    [technicien, prefs],
  );

  return { prefs, save, loaded };
}
