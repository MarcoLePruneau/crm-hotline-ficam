import { supabase } from "@/integrations/supabase/client";

/**
 * Récupère toutes les lignes d'une table en paginant par tranches de 1000
 * pour contourner la limite par défaut imposée par Supabase.
 */
export async function fetchAll<T = any>(
  table: string,
  build: (q: any) => any = (q) => q,
  pageSize = 1000,
): Promise<T[]> {
  const out: T[] = [];
  let from = 0;
  // Sécurité : jamais plus de 50 pages (50 000 lignes)
  for (let i = 0; i < 50; i++) {
    const to = from + pageSize - 1;
    const query = build((supabase as any).from(table).select("*")).range(from, to);
    const { data, error } = await query;
    if (error) throw error;
    if (!data || data.length === 0) break;
    out.push(...(data as T[]));
    if (data.length < pageSize) break;
    from += pageSize;
  }
  return out;
}
