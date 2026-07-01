# Vigía 54 - Sistema Inteligente de Predicción y Reporte de Incidencias Delictivas en Arequipa

Este repositorio contiene el código fuente, la infraestructura en la nube y el artículo científico de **"Vigía 54"**, una plataforma integral SaaS web y móvil (PWA) orientada a la gestión, reporte ciudadano y predicción geoespacial de incidencias delictivas en la provincia de Arequipa, Perú. El proyecto se rige por estrictos estándares de **Calidad de Software** basados en la norma **ISO/IEC 25010**.

---

## 📂 Estructura de Directorios del Proyecto

El proyecto está organizado en una arquitectura de monorepositorio que separa claramente el frontend, el backend serverless, el pipeline de CI/CD y los entregables académicos:

```text
calidad de software/
├── .github/
│   └── workflows/
│       └── main.yml           # Pipeline de Integración Continua (GitHub Actions)
├── firebase/                  # Backend Cloud Serverless
│   ├── functions/             # Microservicios (Cloud Functions Node.js)
│   │   ├── src/               # Código TypeScript de lógica de negocio e IA
│   │   └── package.json
│   ├── firestore.rules        # Reglas de seguridad de la base de datos NoSQL
│   ├── firestore.indexes.json # Índices compuestos para optimización geoespacial
│   └── firebase.json          # Configuración del entorno Firebase
├── web/                       # Frontend PWA (Next.js 16 + React 19)
│   ├── src/
│   │   ├── app/               # Enrutamiento basado en App Router y vistas
│   │   │   ├── admin/         # Consola de administración policial
│   │   │   ├── dashboard/     # Consola y reportes de ciudadano
│   │   │   ├── login/         # Acceso unificado por Firebase Auth
│   │   │   └── presentacion/  # Diapositivas web interactivas (Scrolling)
│   │   ├── components/        # Componentes reutilizables (Mapa Leaflet, SOS)
│   │   ├── lib/               # Clientes y proveedores de Auth y Firebase
│   │   ├── store/             # Gestión de estado global con Zustand
│   │   └── types/             # Tipados estáticos TypeScript
│   ├── package.json
│   └── eslint.config.mjs      # Reglas del análisis estático de código
├── informe_proyecto.tex       # Artículo de investigación científica en formato IEEE LaTeX
└── .gitignore                 # Reglas de exclusión unificadas para Git
```

---

## 🛠️ Ecosistema Tecnológico

- **Frontend:** [Next.js](https://nextjs.org/) (React 19, TypeScript), implementado como Progressive Web App (PWA).
- **Backend:** [Firebase Cloud Functions](https://firebase.google.com/docs/functions) (Node.js, TypeScript).
- **Base de Datos NoSQL:** [Cloud Firestore](https://firebase.google.com/docs/firestore) con extensiones geoespaciales.
- **Autenticación:** [Firebase Authentication](https://firebase.google.com/docs/auth) (Google Sign-In y Roles de Usuario).
- **Inteligencia Artificial:** API de [Google Gemini](https://ai.google.dev/) para el triaje asíncrono y clasificación de reportes.
- **Control de Calidad:** [Jest](https://jestjs.io/) para pruebas automatizadas, [ESLint](https://eslint.org/) para análisis estático, y [GitHub Actions](https://github.com/features/actions) para la automatización CI/CD.

---

## ⚙️ Políticas de Gestión de Configuración de Software (SCM)

Para garantizar la mantenibilidad y consistencia del código, el desarrollo se rige por las siguientes políticas de SCM:

### 1. Modelo de Ramas (Git Flow Adaptado)

El desarrollo se realiza utilizando un flujo de trabajo estructurado en ramas:

- **`main`**: Rama de producción. Contiene código altamente estable y auditado que ha superado todas las pruebas y análisis. Cada fusión en `main` genera una compilación de producción.
- **`develop`**: Rama principal de desarrollo. Agrega los cambios listos de las diferentes funcionalidades antes de pasar a producción.
- **`feature/<id-requisito>-<nombre-descriptivo>`**: Ramas temporales creadas para el desarrollo de requisitos específicos (e.g., `feature/rf1-triaje-ia`). Se bifurcan desde `develop` y se reintegran mediante Pull Requests.
- **`hotfix/<nombre-parche>`**: Ramas de emergencia para solucionar errores críticos descubiertos en producción. Se bifurcan desde `main` y se fusionan de vuelta tanto en `main` como en `develop`.

### 2. Convención de Mensajes de Commit (Conventional Commits)

Los mensajes de commit deben seguir la especificación de *Conventional Commits*:
`tipo(alcance): descripción breve en minúsculas`

**Tipos permitidos:**
- `feat`: Adición de un nuevo requisito funcional (e.g., `feat(ui): implement panic button component`).
- `fix`: Corrección de un error o bug (e.g., `fix(map): repair leaflet bounds calculation`).
- `docs`: Modificación o creación de documentación (e.g., `docs(scm): update install instructions`).
- `style`: Cambios estéticos de código que no afectan la lógica (formato, comas faltantes).
- `refactor`: Reestructuración de código existente sin alterar su funcionalidad.
- `test`: Añadir o modificar suites de pruebas unitarias o de integración.
- `chore`: Tareas de mantenimiento o configuración (e.g., actualizar dependencias en `package.json`).

### 3. Política de Integración y Pull Requests (PR)

Ningún cambio se introduce directamente en `main` o `develop`. Todo cambio requiere una Pull Request que cumpla con:
1. **Revisión por Pares (Code Review):** Aprobación por al menos un desarrollador (o revisión exhaustiva automatizada).
2. **Ejecución del Pipeline de CI:** El pipeline de GitHub Actions se dispara en cada PR. La fusión solo se permite si el pipeline finaliza con éxito (**Green Build**).
3. **Mantenimiento del Historial:** Se prefiere el uso de *Squash and Merge* para mantener la rama principal limpia y con commits atómicos.

---

## 📊 Integración del Proceso de Calidad (ISO/IEC 25010)

El aseguramiento de la calidad se integra en el desarrollo bajo cuatro pilares del estándar:

1. **Adecuación Funcional:**
   - Cobertura de la totalidad de los 8 requisitos funcionales propuestos.
   - Suite de pruebas con Jest cubriendo escenarios de éxito y fallo en las funciones principales (cobertura global superior al 80%).
2. **Eficiencia de Desempeño:**
   - Consultas geoespaciales optimizadas en Firestore mediante geohashes para respuestas inferiores a 3 segundos.
   - Renderizado dinámico y diferido (*lazy loading*) de componentes pesados como el mapa en el cliente.
3. **Mantenibilidad:**
   - Calificación de grado **A** en SonarQube.
   - Cumplimiento de linters estrictos (ESLint).
   - Tasa de duplicación de código inferior al 1.0%.
4. **Seguridad:**
   - Cifrado TLS 1.3 en tránsito en todas las conexiones.
   - Reglas de seguridad robustas de Firestore (`firestore.rules`) para proteger documentos e impedir escrituras no autorizadas.
   - Claims de Firebase Auth para separar roles: Ciudadano, Agente y Administrador del Sistema.

---

## 🚀 Guía de Instalación y Despliegue Local

### Requisitos Previos

- **Node.js** v20.x o superior instalado.
- **npm** v10.x o superior.
- **Firebase CLI** instalado globalmente (`npm install -g firebase-tools`).

### Paso 1: Clonar el Repositorio
```bash
git clone <url-del-repositorio>
cd "calidad de software"
```

### Paso 2: Configuración del Frontend
1. Navegar al directorio `web/`:
   ```bash
   cd web
   ```
2. Instalar dependencias:
   ```bash
   npm install
   ```
3. Crear un archivo `.env.local` con las credenciales de Firebase del entorno (puedes guiarte de las variables de Firebase):
   ```env
   NEXT_PUBLIC_FIREBASE_API_KEY=tu_api_key
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=tu_auth_domain
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=tu_project_id
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=tu_storage_bucket
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=tu_sender_id
   NEXT_PUBLIC_FIREBASE_APP_ID=tu_app_id
   ```
4. Iniciar el servidor de desarrollo:
   ```bash
   npm run dev
   ```
5. Acceder a la aplicación en [http://localhost:3000](http://localhost:3000) y a la presentación interactiva en [http://localhost:3000/presentacion](http://localhost:3000/presentacion).

### Paso 3: Configuración del Backend (Firebase Cloud Functions)
1. Navegar al directorio del backend:
   ```bash
   cd ../firebase/functions
   ```
2. Instalar dependencias:
   ```bash
   npm install
   ```
3. Compilar el código TypeScript de las funciones:
   ```bash
   npm run build
   ```
4. Para ejecutar las funciones localmente junto a la base de datos simulada, inicia el Firebase Emulator Suite:
   ```bash
   firebase emulators:start
   ```

---

## 🧪 Comandos de Pruebas y Aseguramiento de Calidad

Los scripts de validación están centralizados y pueden ejecutarse desde el directorio `web/`:

- **Ejecutar Pruebas Unitarias (Jest):**
  ```bash
  npm run test
  ```
- **Obtener Reporte de Cobertura de Pruebas:**
  ```bash
  # Jest genera el reporte HTML en la carpeta /coverage
  npm run test -- --coverage
  ```
- **Ejecutar Análisis Estático de Código (ESLint):**
  ```bash
  npm run lint
  ```
- **Compilar para Producción:**
  ```bash
  npm run build
  ```
