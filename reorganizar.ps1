param()

Write-Host "Copiando y actualizando archivos..." -ForegroundColor Cyan

# LOGICA
Copy-Item "src\negocio\Juego.js" "src\negocio\logica\" -Force
Copy-Item "src\negocio\GestorCiudadanos.js" "src\negocio\logica\" -Force
Copy-Item "src\negocio\GestorRutas.js" "src\negocio\logica\" -Force
Copy-Item "src\negocio\MovimientoCiudadanos.js" "src\negocio\logica\" -Force
Copy-Item "src\negocio\SistemaTurnos.js" "src\negocio\logica\" -Force
Copy-Item "src\negocio\Puntuacion.js" "src\negocio\logica\" -Force
Copy-Item "src\negocio\EstadoDeJuego.js" "src\negocio\logica\" -Force
Copy-Item "src\negocio\estados.js" "src\negocio\logica\" -Force
Copy-Item "src\negocio\RecoleccionBurbujas.js" "src\negocio\logica\" -Force
Copy-Item "src\negocio\Ranking.js" "src\negocio\logica\" -Force

Write-Host "Archivos LOGICA copiados" -ForegroundColor Green

# CONTROLADORES
Copy-Item "src\negocio\menu.js" "src\negocio\controladores\" -Force
Copy-Item "src\negocio\menuConstruccion.js" "src\negocio\controladores\" -Force
Copy-Item "src\negocio\AtajosManager.js" "src\negocio\controladores\" -Force
Copy-Item "src\negocio\ModalPausa.js" "src\negocio\controladores\" -Force
Copy-Item "src\negocio\Hud.js" "src\negocio\controladores\" -Force
Copy-Item "src\negocio\HudPanel.js" "src\negocio\controladores\" -Force
Copy-Item "src\negocio\WidgetsInfo.js" "src\negocio\controladores\" -Force
Copy-Item "src\negocio\GridRenderer.js" "src\negocio\controladores\" -Force
Copy-Item "src\negocio\RankingUi.js" "src\negocio\controladores\" -Force
Copy-Item "src\negocio\grid.js" "src\negocio\controladores\" -Force
Copy-Item "src\negocio\PartidaManager.js" "src\negocio\controladores\" -Force

Write-Host "Archivos CONTROLADORES copiados" -ForegroundColor Green
Write-Host "Ahora hay que actualizar los imports..." -ForegroundColor Yellow
