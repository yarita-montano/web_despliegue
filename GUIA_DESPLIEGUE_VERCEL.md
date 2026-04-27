# Guia de despliegue en Vercel (Angular)

Esta guia aplica al proyecto web Angular de esta carpeta.

## Estado actual del proyecto
- Build command: npm run build
- Carpeta de salida real en Angular 21: dist/panel-talleres/browser
- Rewrite para SPA: configurado en vercel.json

## 1) Requisitos
- Tener el proyecto en GitHub, GitLab o Bitbucket.
- Tener cuenta en Vercel.
- Tener la rama principal actualizada (main o master).

## 2) Configuracion recomendada en Vercel (Dashboard)
1. En Vercel, entra a Add New... > Project.
2. Importa el repositorio de este frontend.
3. En Root Directory, selecciona esta carpeta del proyecto web.
4. En Build and Output Settings, usa:
	 - Build Command: npm run build
	 - Output Directory: dist/panel-talleres/browser
5. Guarda y despliega con Deploy.

Nota: el archivo vercel.json ya incluye un rewrite para que las rutas de Angular funcionen al recargar (por ejemplo /login, /dashboard, etc.).

## 3) Variables de entorno
Si tu frontend consume backend o servicios externos:
1. Ve a Project Settings > Environment Variables.
2. Crea las variables para Production (y Preview si aplica).
3. Vuelve a desplegar para que se apliquen.

Ejemplo:
- API_URL = https://tu-backend.com

Importante: recuerda que en frontend solo son seguras variables pensadas para cliente. No expongas secretos privados.

## 4) Flujo de despliegue continuo
1. Haz commit y push a la rama conectada en Vercel.
2. Vercel ejecuta automaticamente el build.
3. Revisa el estado en Deployments.
4. Abre la URL publica y valida navegacion, login y llamadas API.

## 5) Checklist rapido post-despliegue
- La home carga sin error 404.
- Al recargar una ruta interna no rompe (gracias al rewrite a index.html).
- Las variables de entorno estan cargadas.
- La API responde desde el dominio de Vercel.

## 6) Solucion de problemas
- Error en build:
	- Verifica dependencias en package.json.
	- Revisa los logs de build en Vercel.
- 404 en rutas internas:
	- Verifica que exista vercel.json con rewrite a /index.html.
- Pantalla en blanco por API:
	- Revisa variables de entorno y CORS del backend.

## 7) Opcion por CLI (alternativa)
Si prefieres desplegar por terminal:
1. Instala Vercel CLI: npm i -g vercel
2. Ejecuta: vercel
3. Sigue el asistente y confirma build/output:
	 - Build Command: npm run build
	 - Output Directory: dist/panel-talleres/browser
