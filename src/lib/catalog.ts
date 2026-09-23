import { v5 as uuidv5 } from 'uuid'
import {
  SEED_BRANDS,
  SEED_CATEGORIES,
  SEED_COMPATIBILITY,
  SEED_MODELS,
  SEED_PARTS,
} from '../data/seed'

const NS = '6f1c2a8e-4b7d-4e1a-9c33-0a1b2c3d4e5f'

function catalogUuid(id: string) {
  return uuidv5(id, NS)
}

/** Stable UUIDs so the shared catalog can be inserted once into Postgres. */
export function catalogPayload() {
  return {
    brands: SEED_BRANDS.map((b) => ({ ...b, id: catalogUuid(b.id) })),
    categories: SEED_CATEGORIES.map((c) => ({ ...c, id: catalogUuid(c.id) })),
    models: SEED_MODELS.map((m) => ({
      ...m,
      id: catalogUuid(m.id),
      brand_id: catalogUuid(m.brand_id),
    })),
    parts: SEED_PARTS.map((p) => ({
      ...p,
      id: catalogUuid(p.id),
      brand_id: p.brand_id ? catalogUuid(p.brand_id) : null,
      category_id: catalogUuid(p.category_id),
    })),
    compatibility: SEED_COMPATIBILITY.map((c) => ({
      part_id: catalogUuid(c.part_id),
      model_id: catalogUuid(c.model_id),
    })),
  }
}
