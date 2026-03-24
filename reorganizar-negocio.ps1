#!/usr/bin/env pwsh
# Script para reorganizar archivos de negocio/ en logica/ y controladores/

$NEGOCIO = "src\negocio"
$LOGICA = "src\negocio\logica"
$CONTROLADORES = "src\negocio\controladores"

# Diccionario: archivo -> carpeta destino
$ARCHIVOS = @{
    # LOGICA
    "Juego.js" = "logica"
    "GestorCiudadanos.js" = "logica"
    "GestorRutas.js" = "logica"
    "MovimientoCiudadanos.js" = "logica"
    "SistemaTurnos.js" = "logica"
    "Puntuacion.js" = "logica"
    "EstadoDeJuego.js" = "logica"
    "estados.js" = "logica"
    "RecoleccionBurbujas.js" = "logica"
    "Ranking.js" = "logica"
    
    # CONTROLADORES
    "menu.js" = "controladores"
    "menuConstruccion.js" = "controladores"
    "AtajosManager.js" = "controladores"
    "ModalPausa.js" = "controladores"
    "Hud.js" = "controladores"
    "HudPanel.js" = "controladores"
    "WidgetsInfo.js" = "controladores"
    "GridRenderer.js" = "controladores"
    "RankingUi.js" = "controladores"
    "grid.js" = "controladores"
    "PartidaManager.js" = "controladores"
}

# Mapeo de imports: usado para actualizar rutas
# Archivo -> lista de (import_viejo, import_nuevo)
$IMPORT_UPDATES = @{
    # Archivos que van a logica/ importan de otros en logica/
    "Juego.js" = @(
        @("./SistemaTurnos.js", "./SistemaTurnos.js"),  # mismo nivel
        @("./EstadoDeJuego.js", "./EstadoDeJuego.js"),
        @("./estados.js", "./estados.js"),
        @("./GestorCiudadanos.js", "./GestorCiudadanos.js"),
        @("./Puntuacion.js", "./Puntuacion.js"),
        @("./RecoleccionBurbujas.js", "./RecoleccionBurbujas.js"),
        @("./RankingUi.js", "../controladores/RankingUi.js"),  # va a controladores
        @("../modelos/", "../../modelos/"),  # modelos sube un nivel
        @("../acceso_datos/", "../../acceso_datos/")  # acceso_datos sube un nivel
    )
    
    "EstadoDeJuego.js" = @(
        @("./estados.js", "./estados.js")
    )
    
    "Ranking.js" = @(
        @("../modelos/", "../../modelos/")
    )
    
    # Archivos que van a controladores/ importan de logica/ y controladores/
    "grid.js" = @(
        @("./Juego.js", "../logica/Juego.js"),  # va a logica/
        @("./MovimientoCiudadanos.js", "../logica/MovimientoCiudadanos.js"),
        @("./GridRenderer.js", "./GridRenderer.js"),  # mismo nivel
        @("../modelos/", "../../modelos/")
    )
    
    "Hud.js" = @(
        @("./HudPanel.js", "./HudPanel.js"),  # mismo nivel
        @("./PartidaManager.js", "./PartidaManager.js"),
        @("./RankingUI.js", "./RankingUi.js"),
        @("./ModalPausa.js", "./ModalPausa.js"),
        @("./AtajosManager.js", "./AtajosManager.js")
    )
    
    "PartidaManager.js" = @(
        @("./HudPanel.js", "./HudPanel.js"),
        @("../acceso_datos/", "../../acceso_datos/")
    )
    
    "ModalPausa.js" = @(
        @("./HudPanel.js", "./HudPanel.js"),
        @("./PartidaManager.js", "./PartidaManager.js"),
        @("./RankingUI.js", "./RankingUi.js")
    )
    
    "RankingUi.js" = @(
        @("./Ranking.js", "../logica/Ranking.js"),
        @("./PartidaManager.js", "./PartidaManager.js"),
        @("./HudPanel.js", "./HudPanel.js")
    )
    
    "AtajosManager.js" = @(
        @("./ModalPausa.js", "./ModalPausa.js"),
        @("./PartidaManager.js", "./PartidaManager.js")
    )
}

Write-Host "═══════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  REORGANIZANDO ARCHIVOS DE NEGOCIO  " -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# Procesar cada archivo
foreach ($archivo in $ARCHIVOS.Keys) {
    $carpetaDestino = $ARCHIVOS[$archivo]
    $rutaOrigen = Join-Path $NEGOCIO $archivo
    $rutaDestino = Join-Path $NEGOCIO $carpetaDestino $archivo
    
    Write-Host "📄 Procesando: $archivo → $carpetaDestino/" -ForegroundColor Yellow
    
    # Verificar que el archivo origen existe
    if (-not (Test-Path $rutaOrigen)) {
        Write-Host "  ⚠️  Archivo no encontrado: $rutaOrigen" -ForegroundColor Red
        continue
    }
    
    # Leer contenido
    $contenido = Get-Content $rutaOrigen -Raw
    
    # Actualizar imports si existe mapeo
    if ($IMPORT_UPDATES.ContainsKey($archivo)) {
        Write-Host "  Actualizando imports..." -ForegroundColor Gray
        foreach ($update in $IMPORT_UPDATES[$archivo]) {
            $viejo = $update[0]
            $nuevo = $update[1]
            $contenido = $contenido -replace ([regex]::Escape($viejo)), $nuevo
        }
    }
    
    # Crear archivo en la carpeta destino
    Set-Content -Path $rutaDestino -Value $contenido -Encoding UTF8
    Write-Host "  ✓ Copiado con imports actualizados" -ForegroundColor Green
}

Write-Host ""
Write-Host "===================================" -ForegroundColor Cyan
Write-Host "  REORGANIZACIÓN COMPLETADA" -ForegroundColor Cyan
Write-Host "===================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Proximos pasos:" -ForegroundColor Cyan
Write-Host "1. Verifica que los imports esten correctos: git diff" -ForegroundColor Gray
Write-Host "2. Elimina los archivos originales en src/negocio/" -ForegroundColor Gray
Write-Host "3. Actualiza imports desde FUERA de negocio" -ForegroundColor Gray
