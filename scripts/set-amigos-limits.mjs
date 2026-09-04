/**
 * Configura el cupo anual de reservas "Amigos" por persona y crea el índice
 * único que garantiza la regla a nivel base de datos.
 *
 * Uso:
 *   node scripts/set-amigos-limits.mjs                      # aplica CONFIG_INICIAL + índice
 *   node scripts/set-amigos-limits.mjs --list               # solo muestra el estado actual
 *   node scripts/set-amigos-limits.mjs --set "GG=4"         # cambia una persona
 *   node scripts/set-amigos-limits.mjs --set "Juan Pablo=null"
 *   node scripts/set-amigos-limits.mjs --set "Ana=0"
 *
 * El límite también se puede cambiar por API: PATCH /api/admin/amigos-limits.
 * Nunca hace falta tocar código para modificar un cupo.
 */
import mongoose from 'mongoose';
import { readFileSync } from 'node:fs';

const DEFAULT_LIMITE_AMIGOS_ANUAL = 1;

/** Excepciones acordadas. `null` = sin límite. El resto queda en el default (1). */
const CONFIG_INICIAL = {
  GG: 4,
  'Juan Pablo': null,
};

function loadMongoUri() {
  if (process.env.MONGODB_URI) return process.env.MONGODB_URI;
  try {
    const env = readFileSync(new URL('../.env.local', import.meta.url), 'utf8');
    const match = env.match(/^\s*MONGODB_URI\s*=\s*(.+)\s*$/m);
    if (match) return match[1].trim().replace(/^["']|["']$/g, '');
  } catch {
    /* sin .env.local */
  }
  return null;
}

const UserSchema = new mongoose.Schema(
  {
    name: String,
    email: String,
    limiteAmigosAnual: { type: Number, default: DEFAULT_LIMITE_AMIGOS_ANUAL, min: 0 },
  },
  { collection: 'usuarios' }
);

function parseLimite(raw) {
  if (raw === 'null' || raw === 'ilimitado') return null;
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 0) {
    throw new Error(`Límite inválido: "${raw}". Usá un entero >= 0 o "null".`);
  }
  return n;
}

function describe(limite) {
  if (limite === null) return 'sin límite';
  if (limite === undefined) return `${DEFAULT_LIMITE_AMIGOS_ANUAL} (default, sin configurar)`;
  return String(limite);
}

async function main() {
  const uri = loadMongoUri();
  if (!uri) {
    console.error('❌ Falta MONGODB_URI (variable de entorno o .env.local).');
    process.exit(1);
  }

  await mongoose.connect(uri);
  const User = mongoose.models.Usuario || mongoose.model('Usuario', UserSchema);

  const args = process.argv.slice(2);
  const soloListar = args.includes('--list');
  const setIndex = args.indexOf('--set');

  if (setIndex !== -1) {
    const expr = args[setIndex + 1];
    if (!expr || !expr.includes('=')) {
      throw new Error('Formato esperado: --set "Nombre=4" (o "Nombre=null").');
    }
    const idx = expr.lastIndexOf('=');
    const name = expr.slice(0, idx).trim();
    const limite = parseLimite(expr.slice(idx + 1).trim());
    const res = await User.updateOne({ name }, { $set: { limiteAmigosAnual: limite } });
    if (res.matchedCount === 0) console.error(`⚠️  No se encontró la persona "${name}".`);
    else console.log(`✅ ${name} -> ${describe(limite)}`);
  } else if (!soloListar) {
    // 1) Default explícito para quien no tenga el campo.
    const sinCampo = await User.updateMany(
      { limiteAmigosAnual: { $exists: false } },
      { $set: { limiteAmigosAnual: DEFAULT_LIMITE_AMIGOS_ANUAL } }
    );
    console.log(`✅ Default (${DEFAULT_LIMITE_AMIGOS_ANUAL}) aplicado a ${sinCampo.modifiedCount} persona(s).`);

    // 2) Excepciones.
    for (const [name, limite] of Object.entries(CONFIG_INICIAL)) {
      const res = await User.updateOne({ name }, { $set: { limiteAmigosAnual: limite } });
      if (res.matchedCount === 0) console.error(`⚠️  No se encontró la persona "${name}".`);
      else console.log(`✅ ${name} -> ${describe(limite)}`);
    }

    // 3) Índice único que hace inviolable el cupo, incluso con requests concurrentes.
    await mongoose.connection.db.collection('eventos').createIndex(
      { user: 1, amigosYear: 1, amigosSlot: 1 },
      {
        unique: true,
        name: 'amigos_slot_unico_por_anio',
        partialFilterExpression: { amigosSlot: { $type: 'number' } },
      }
    );
    console.log('✅ Índice único "amigos_slot_unico_por_anio" creado/verificado.');
  }

  const users = await User.find().select('name limiteAmigosAnual').sort({ name: 1 }).lean();
  console.log('\n📋 Cupo anual de Amigos por persona:');
  for (const u of users) console.log(`   - ${u.name}: ${describe(u.limiteAmigosAnual)}`);

  await mongoose.connection.close();
}

main().catch(async (error) => {
  console.error('❌', error.message);
  await mongoose.connection.close().catch(() => {});
  process.exit(1);
});
