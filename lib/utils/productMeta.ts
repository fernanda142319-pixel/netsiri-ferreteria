// Encodes description, marca, and talla into the DB description column.
// Format: plain text OR JSON {"d":"...","m":"...","t":"..."} when marca/talla are set.

interface ProductMeta {
  description: string;
  marca: string;
  talla: string;
}

export function encodeProductMeta(meta: ProductMeta): string {
  if (!meta.marca && !meta.talla) return meta.description;
  return JSON.stringify({ d: meta.description, m: meta.marca, t: meta.talla });
}

export function decodeProductMeta(raw: string): ProductMeta {
  if (raw.startsWith("{")) {
    try {
      const parsed = JSON.parse(raw);
      if ("d" in parsed || "m" in parsed || "t" in parsed) {
        return { description: parsed.d ?? "", marca: parsed.m ?? "", talla: parsed.t ?? "" };
      }
    } catch {}
  }
  return { description: raw, marca: "", talla: "" };
}
