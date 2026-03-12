export default class StorageManager {

    guardar(clave, datos) {
        try {
            const json = JSON.stringify(datos);
            localStorage.setItem(clave, json);
        } catch (error) {
            console.error("Error al guardar datos:", error);
        }
    }

    cargar(clave) {
        try {
            const datos = localStorage.getItem(clave);
            if (!datos) {
                return null;
            }
            return JSON.parse(datos);
        } catch (error) {
            console.error("Error al cargar datos:", error);
            return null;
        }
    }

    eliminar(clave) {
        localStorage.removeItem(clave);
    }

    limpiarTodo() {
        localStorage.clear();
    }


    exportarJSON(clave, nombreArchivo = "datos.json") {
        const datos = this.cargar(clave);
        if (!datos) {
            console.warn("No hay datos para exportar.");
            return;
        }
        const json = JSON.stringify(datos, null, 2);
        const blob = new Blob([json], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const enlace = document.createElement("a");
        enlace.href = url;
        enlace.download = nombreArchivo;
        document.body.appendChild(enlace);
        enlace.click();
        document.body.removeChild(enlace);
        URL.revokeObjectURL(url);
    }
}