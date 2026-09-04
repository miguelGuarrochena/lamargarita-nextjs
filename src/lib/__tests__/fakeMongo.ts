/**
 * Doble de prueba de Mongo, suficiente para lo que usa `amigosQuotaDb.ts`.
 *
 * Lo importante: replica el índice único parcial
 * `{ user, amigosYear, amigosSlot }` sobre los documentos que tienen
 * `amigosSlot` numérico. Sin eso, el test de concurrencia no probaría nada.
 *
 * Cada operación pasa por un `await` real, así dos flujos concurrentes se
 * intercalan igual que contra una base de verdad.
 */
import mongoose from 'mongoose';

export type Doc = Record<string, unknown>;

export class DuplicateKeyError extends Error {
  code = 11000;
  constructor() {
    super('E11000 duplicate key error collection: eventos index: amigos_slot_unico_por_anio');
    this.name = 'MongoServerError';
  }
}

const tick = () => Promise.resolve();

function sameId(a: unknown, b: unknown) {
  return String(a) === String(b);
}

function matchesFilter(doc: Doc, filter: Doc): boolean {
  return Object.entries(filter).every(([key, condition]) => {
    const value = doc[key];

    if (condition && typeof condition === 'object' && !(condition instanceof Date)) {
      if ('$ne' in condition) return !sameId(value, (condition as { $ne: unknown }).$ne);
      if ('$type' in condition) return typeof value === (condition as { $type: string }).$type;
      if ('$exists' in condition) {
        return (value !== undefined) === (condition as { $exists: boolean }).$exists;
      }
    }

    if (key === 'user' || key === '_id') return sameId(value, condition);
    return value === condition;
  });
}

function stripUndefined(doc: Doc): Doc {
  const out: Doc = {};
  for (const [k, v] of Object.entries(doc)) if (v !== undefined) out[k] = v;
  return out;
}

class FakeQuery {
  constructor(private readonly rows: Doc[]) {}
  select() {
    return this;
  }
  sort() {
    return this;
  }
  async lean() {
    await tick();
    return this.rows.map((r) => ({ ...r }));
  }
  then(resolve: (v: Doc[]) => unknown, reject?: (e: unknown) => unknown) {
    return this.lean().then(resolve, reject);
  }
}

class FakeSingleQuery {
  constructor(private readonly row: Doc | null) {}
  select() {
    return this;
  }
  async lean() {
    await tick();
    return this.row ? { ...this.row } : null;
  }
  then(resolve: (v: Doc | null) => unknown, reject?: (e: unknown) => unknown) {
    return this.lean().then(resolve, reject);
  }
}

/** El índice único: rechaza dos reservas con el mismo (persona, año, cupo). */
function assertUniqueSlot(store: Doc[], candidate: Doc, ignoreId?: unknown) {
  if (typeof candidate.amigosSlot !== 'number') return;
  const clash = store.some(
    (d) =>
      (ignoreId === undefined || !sameId(d._id, ignoreId)) &&
      typeof d.amigosSlot === 'number' &&
      sameId(d.user, candidate.user) &&
      d.amigosYear === candidate.amigosYear &&
      d.amigosSlot === candidate.amigosSlot
  );
  if (clash) throw new DuplicateKeyError();
}

export class FakeEventModel {
  static store: Doc[] = [];
  private readonly doc: Doc;

  constructor(doc: Doc) {
    this.doc = stripUndefined(doc);
  }

  async save() {
    await tick();
    const inserted = { _id: new mongoose.Types.ObjectId().toHexString(), ...this.doc };
    assertUniqueSlot(FakeEventModel.store, inserted);
    FakeEventModel.store.push(inserted);
    return { ...inserted };
  }

  static find(filter: Doc = {}) {
    return new FakeQuery(FakeEventModel.store.filter((d) => matchesFilter(d, filter)));
  }

  static async findByIdAndUpdate(id: string, update: Doc) {
    await tick();
    const index = FakeEventModel.store.findIndex((d) => sameId(d._id, id));
    if (index === -1) return null;

    const $set = (update.$set ?? {}) as Doc;
    const $unset = (update.$unset ?? {}) as Doc;
    const next: Doc = { ...FakeEventModel.store[index], ...stripUndefined($set) };
    for (const key of Object.keys($unset)) delete next[key];

    assertUniqueSlot(FakeEventModel.store, next, next._id);
    FakeEventModel.store[index] = next;
    return { ...next };
  }

  /** Cancelar una reserva = borrar el documento (así funciona la app hoy). */
  static async findByIdAndDelete(id: string) {
    await tick();
    const index = FakeEventModel.store.findIndex((d) => sameId(d._id, id));
    if (index === -1) return null;
    return FakeEventModel.store.splice(index, 1)[0];
  }

  static reset() {
    FakeEventModel.store = [];
  }
}

export class FakeUserModel {
  static store: Doc[] = [];

  static findById(id: string) {
    return new FakeSingleQuery(FakeUserModel.store.find((u) => sameId(u._id, id)) ?? null);
  }

  static seed(users: Doc[]) {
    FakeUserModel.store = users.map((u) => ({ ...u }));
  }

  static reset() {
    FakeUserModel.store = [];
  }
}
