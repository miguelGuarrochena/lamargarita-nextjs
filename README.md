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

## Deploy en Vercel

La aplicación está optimizada para deployment en Vercel. Asegúrate de configurar las variables de entorno en el panel de Vercel.
