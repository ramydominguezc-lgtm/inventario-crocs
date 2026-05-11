# Proyecto: App de Inventario — Crocs & Charms

## Contexto del negocio
App móvil de gestión interna para un negocio de venta de Crocs y Charms (Jibbitz).
El dueño necesita gestionar inventario desde su celular, conectado a Supabase como base de datos.

## Stack elegido
- Frontend: React Native con Expo (para correr en celular)
- Base de datos: Supabase (PostgreSQL + Auth + Storage para imágenes)
- Lenguaje: JavaScript / TypeScript

## Estructura de productos
- **Crocs**: tienen Modelos → cada modelo tiene Tallas → cada talla tiene Stock y Precio
- **Charms**: tienen Colecciones → cada colección tiene Stock, Precio y cantidad de piezas
- **Otros** (llaveros, etc.): Nombre, Stock, Precio

## Reglas importantes
- Cada producto/modelo/colección tiene UNA imagen representativa (almacenada en Supabase Storage)
- El stock de Crocs se maneja por talla, no por modelo general
- Los precios pueden ser iguales para todas las tallas de un modelo (opción "mismo precio")
- La app es solo para uso interno del dueño, no para clientes

## Prioridades de desarrollo
1. Schema de Supabase (tablas y relaciones)
2. Pantallas CRUD: Lista → Detalle/Edición por categoría
3. Subida y visualización de imágenes
4. Estadísticas básicas de inventario