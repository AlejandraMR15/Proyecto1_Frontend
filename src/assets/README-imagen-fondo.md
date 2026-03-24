# Imagen de Fondo del Menú

## Cómo agregar una imagen de fondo

1. **Coloca tu imagen** en la carpeta `src/assets/images/`
   - Nombre recomendado: `menu-background.jpg` o `menu-background.png`
   - Formatos soportados: JPG, PNG, GIF, WebP
   - Resolución recomendada: Mínimo 1920x1080 para buena calidad

2. **La imagen se aplicará automáticamente** al menú principal y formularios

## Alternativa: Usar gradientes CSS (sin imagen)

Si prefieres no usar una imagen, puedes reemplazar el contenido de `src/presentacion/estilos/menu.css` con el archivo `src/assets/menu-gradientes.css` incluido en este directorio.

## Personalización

### Ajustar la opacidad del overlay (si el texto no se ve bien):

En `src/presentacion/estilos/menu.css`, modifica el valor `0.85` en esta línea:
```css
background: rgba(17, 27, 36, 0.85);
```

- `0.7` = Más transparente (texto más visible)
- `0.9` = Más opaco (imagen más visible)

### Cambiar la imagen:

1. Reemplaza el archivo `menu-background.jpg` en `src/assets/images/`
2. O modifica la ruta en `menu.css` si usas un nombre diferente

## Recomendaciones para la imagen:

- **Tema**: Paisajes urbanos, arquitectura, o imágenes relacionadas con ciudades
- **Contraste**: Evita imágenes muy brillantes que compitan con el texto azul/blanco
- **Peso**: Optimiza la imagen para web si es muy grande (TinyPNG, ImageOptim, etc.)

## Archivos incluidos:

- **`README-imagen-fondo.md`**: Esta documentación
- **`menu-gradientes.css`**: CSS alternativo con gradientes (opcional)

### Overlay (superposición)

El overlay semi-transparente (`rgba(17, 27, 36, 0.85)`) asegura que el texto sea legible sobre cualquier imagen. Puedes ajustar la opacidad modificando el último valor (0.85 = 85% opaco).

### Ejemplos de personalización:

```css
/* Imagen que se repite */
.pantalla {
    background-image: url('../../assets/images/pattern.png');
    background-repeat: repeat;
    background-size: auto;
}

/* Imagen centrada sin cubrir toda el área */
.pantalla {
    background-image: url('../../assets/images/logo.png');
    background-size: contain;
    background-position: center;
    background-repeat: no-repeat;
}

/* Efecto parallax (la imagen se queda fija al hacer scroll) */
.pantalla {
    background-attachment: fixed;
}
```

## Recomendaciones para la imagen:

- **Resolución**: Mínimo 1920x1080 para buena calidad en pantallas grandes
- **Contraste**: Elige imágenes que no compitan demasiado con el texto azul/blanco
- **Tema**: Imágenes relacionadas con ciudades, arquitectura, o paisajes urbanos funcionan bien
- **Peso**: Optimiza la imagen para web (usa herramientas como TinyPNG o ImageOptim)

## Cómo cambiar la imagen

Si quieres cambiar la imagen de fondo:

1. Reemplaza el archivo en `src/assets/images/menu-background.jpg`
2. O modifica la ruta en `src/presentacion/estilos/menu.css`:
   ```css
   background-image: url('../../assets/images/TU_NUEVA_IMAGEN.jpg');
   ```

3. Ajusta el overlay si es necesario:
   ```css
   background: rgba(17, 27, 36, 0.7); /* Más transparente */
   /* o */
   background: rgba(17, 27, 36, 0.9); /* Más opaco */
   ```

## Archivos incluidos en este directorio

- **`README-imagen-fondo.md`**: Esta documentación
- **`menu-gradientes.css`**: CSS alternativo con gradientes y patrones
- **`generador-imagen.html`**: Herramienta web para crear imágenes simples

## Próximos pasos

1. Elige una de las opciones anteriores
2. Implementa la imagen de fondo
3. Prueba en diferentes dispositivos y tamaños de pantalla
4. Ajusta el overlay si es necesario para mantener la legibilidad del texto