# 🏪 Kiosco Manager

Sistema de gestión interno para kiosco. Uso local en PC.

---

## 🚀 Instalación y setup

### Requisitos previos
- Node.js 18+
- npm

### 1. Instalar dependencias

```bash
npm install
```

### 2. Configurar variables de entorno

El archivo `.env` ya está incluido con configuración por defecto:

```env
DATABASE_URL="file:./dev.db"
SESSION_SECRET="kiosco-super-secret-key-change-in-production-32chars"
```

> ⚠️ Cambiar `SESSION_SECRET` en producción.

### 3. Crear la base de datos y tablas

```bash
npm run db:push
```

### 4. Cargar datos iniciales (seed)

```bash
npm run db:seed
```

Esto crea:
- Usuario **admin** / contraseña: `admin123`
- Usuario **colaborador** / contraseña: `colab123`
- 5 productos de ejemplo

### 5. Iniciar el servidor

```bash
npm run dev
```

Acceder en: **http://localhost:3000**

---

## 👥 Usuarios por defecto

| Usuario | Contraseña | Rol |
|---------|-----------|-----|
| admin | admin123 | ADMIN |
| colaborador | colab123 | COLABORADOR |

---

## 🗂 Estructura del proyecto

```
kiosco/
├── app/
│   ├── (auth)/login/         # Página de login
│   ├── (dashboard)/          # Páginas protegidas
│   │   ├── dashboard/        # Inicio con métricas
│   │   ├── products/         # Gestión de productos
│   │   ├── sales/            # Sistema de ventas (carrito)
│   │   ├── cash/             # Control de caja
│   │   ├── stats/            # Estadísticas (ADMIN)
│   │   ├── balance/          # Balance general (ADMIN)
│   │   ├── users/            # Usuarios (ADMIN)
│   │   └── logs/             # Registros (ADMIN)
│   └── api/                  # API Routes
│       ├── auth/             # Login / Logout / Me
│       ├── products/         # CRUD productos
│       ├── sales/            # Registro de ventas
│       ├── cash-register/    # Apertura/cierre de caja
│       ├── cash-movements/   # Movimientos manuales
│       ├── stats/            # Estadísticas
│       ├── balance/          # Balance general
│       ├── users/            # CRUD usuarios
│       └── logs/             # Registros del sistema
├── components/
│   ├── layout/Sidebar.tsx    # Sidebar de navegación
│   └── ui/
│       ├── Toast.tsx         # Notificaciones
│       └── ThemeProvider.tsx # Modo claro/oscuro
├── lib/
│   ├── auth.ts               # Helpers de autenticación
│   ├── log.ts                # Helper para SystemLog
│   ├── prisma.ts             # Cliente Prisma singleton
│   ├── session.ts            # Configuración iron-session
│   └── utils.ts              # Utilidades generales
├── middleware.ts              # Protección de rutas por rol
└── prisma/
    ├── schema.prisma          # Modelo de base de datos
    └── seed.ts               # Datos iniciales
```

---

## 🔐 Roles y permisos

### ADMIN
- Acceso a todo el sistema
- Crear/editar/eliminar productos
- Ver estadísticas y balance
- Gestionar usuarios
- Ver logs del sistema

### COLABORADOR
- Nueva venta (carrito)
- Ver productos (solo lectura)
- Control de caja (apertura, movimientos, cierre)
- Ver su propio historial de ventas

---

## 📊 Funcionalidades

- **Login** con sesión que cierra al cerrar el navegador
- **Productos**: CRUD completo, alertas de stock bajo, búsqueda por nombre/barcode/código
- **Ventas**: carrito interactivo, cálculo de cambio en efectivo, múltiples métodos de pago
- **Caja**: apertura, movimientos manuales, cierre con cálculo de diferencias
- **Estadísticas**: gráficos con Chart.js, filtros por fecha y colaborador
- **Balance**: P&L completo con filtros de fecha
- **Logs**: auditoría completa de acciones del sistema
- **Modo oscuro/claro**: guardado en localStorage

---

## 🛠 Scripts disponibles

```bash
npm run dev       # Servidor de desarrollo
npm run build     # Build de producción
npm run start     # Servidor de producción
npm run db:push   # Crear/actualizar DB
npm run db:seed   # Datos iniciales
npm run db:studio # Prisma Studio (explorador DB)
```
