# La Margarita - Sistema de Reservas

Sistema de reservas para campo familiar migrado de React + Express.js a Next.js 14+ con App Router.

## Configuración del Entorno

Antes de ejecutar la aplicación, crea un archivo `.env.local` en la raíz del proyecto con las siguientes variables:

```bash
# MongoDB Connection
MONGODB_URI=mongodb://localhost:27017/lamargarita
# o para MongoDB Atlas:
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/lamargarita

# JWT Secret (genera una clave secreta segura)
JWT_SECRET=tu_jwt_secret_muy_seguro_aqui

# NextAuth Configuration
NEXTAUTH_SECRET=tu_nextauth_secret_aqui
NEXTAUTH_URL=http://localhost:3000

# API URL
NEXT_PUBLIC_API_URL=http://localhost:3000/api
```

## Instalación y Ejecución

1. Instalar dependencias:
```bash
npm install
```

2. Ejecutar el servidor de desarrollo:
```bash
npm run dev
```

3. Abrir [http://localhost:3000](http://localhost:3000) en tu navegador.

## Estructura del Proyecto

- `/src/app` - Páginas y rutas de la aplicación (App Router)
- `/src/components` - Componentes React reutilizables
- `/src/hooks` - Custom hooks para estado y lógica
- `/src/lib` - Utilidades, modelos y configuración
- `/src/store` - Redux store y slices
- `/src/types` - Definiciones de tipos TypeScript

## Funcionalidades

- **Autenticación**: Login/registro con JWT
- **Calendario**: Visualización y gestión de reservas
- **Tipos de Reserva**: CT, PA, PR, CS, NC, FL, FR, VC
- **Gestión de Eventos**: Crear, editar y eliminar reservas
- **Responsive**: Diseño adaptable a dispositivos móviles

## Tecnologías

- Next.js 14+ (App Router)
- TypeScript
- Redux Toolkit
- React Big Calendar
- MongoDB + Mongoose
- Tailwind CSS
- React Modal
- Date-fns

## Migración desde React + Express

Este proyecto fue migrado desde una aplicación React + Express.js manteniendo:
- Toda la lógica de negocio original
- Diseño y estilos idénticos
- Funcionalidad completa del sistema de reservas
- Compatibilidad con la base de datos existente

## Motivo de reserva y cupo anual de "Amigos"

Toda reserva de una persona exige un **Motivo**: `Familiar` o `Amigos`
(los feriados y vacaciones que carga el admin quedan exentos).

Las reservas con motivo **Amigos** tienen un **cupo por año calendario**
configurable por persona, en el campo `limiteAmigosAnual` de la colección
`usuarios`:

| Valor | Significado |
|---|---|
| `1` | Default para toda persona nueva o sin configurar |
| `4` | Máximo 4 reservas de Amigos por año |
| `0` | No puede reservar con motivo Amigos |
| `null` | Sin límite |

Cuentan **todas** las reservas de Amigos del año que no estén canceladas,
incluidas las **futuras** (una reserva de Amigos para octubre ya consume el cupo
de ese año) y las que ya existían antes de esta funcionalidad, sin modificarlas
ni migrarlas. El año de una reserva se deriva **siempre de su fecha de entrada**
(`start`); `amigosYear` existe solo como clave del índice único de cupos y nunca
se usa para contar. Las reservas `Familiar` son ilimitadas y nunca consumen
cupo.

### Cancelación: 24 horas de anticipación

Una reserva solo puede cancelarse si faltan **al menos 24 horas** para su fecha
de entrada. No hay excepción por urgencia, ni para reservas que ya empezaron.
Una cancelación válida libera el cupo de Amigos de inmediato; una cancelación
rechazada no lo libera.

Editar una reserva de Amigos para que deje de consumir cupo (pasarla a
`Familiar`, o moverla a otro año) cuenta como cancelación y pasa por la misma
ventana de 24 horas. Editar cualquier otro dato de la reserva sigue siendo
libre.

Los feriados y vacaciones que carga el admin (`FR`/`VC`) son marcas del
calendario, no reservas de una persona: quedan fuera del motivo obligatorio,
del cupo y de la ventana de cancelación.

La regla se aplica en el backend (`src/lib/amigosQuota.ts` +
`src/lib/amigosQuotaDb.ts`) y está respaldada por el índice único
`amigos_slot_unico_por_anio` en `eventos`, que impide superar el cupo incluso
con requests concurrentes. El frontend solo muestra el estado.

### Configurar los cupos (sin tocar código)

```bash
# Aplica la configuración inicial y crea el índice único
node scripts/set-amigos-limits.mjs

# Ver el estado actual
node scripts/set-amigos-limits.mjs --list

# Cambiar el cupo de una persona
node scripts/set-amigos-limits.mjs --set "GG=4"
node scripts/set-amigos-limits.mjs --set "Juan Pablo=null"
```

También por API, para administradores:
`GET /api/admin/amigos-limits` y
`PATCH /api/admin/amigos-limits` con `{ "userId": "...", "limiteAmigosAnual": 4 }`.

## Tests

```bash
npm test          # vitest
npm run typecheck # tsc --noEmit
npm run lint
```

## Deploy en Vercel

La aplicación está optimizada para deployment en Vercel. Asegúrate de configurar las variables de entorno en el panel de Vercel.
