export default class StorageManager {
    constructor() {
        this.PARTIDA_KEY = "citybuilder_partida";
        this.RANKING_KEY = "citybuilder_ranking";
    }

    // PARTIDA

    guardarPartida(data) {
        try {
            const json = JSON.stringify(data);
            localStorage.setItem(this.PARTIDA_KEY, json);
        } catch (error) {
            console.error("Error al guardar la partida:", error);
        }
    }

    cargarPartida() {
        try {
            const data = localStorage.getItem(this.PARTIDA_KEY);
            return data ? JSON.parse(data) : null;
        } catch (error) {
            console.error("Error al cargar la partida:", error);
            return null;
        }
    }

    eliminarPartida() {
        localStorage.removeItem(this.PARTIDA_KEY);
    }

    // RANKING

    guardarRanking(rankingArray) {
        try {
            const json = JSON.stringify(rankingArray);
            localStorage.setItem(this.RANKING_KEY, json);
        } catch (error) {
            console.error("Error al guardar el ranking:", error);
        }
    }

    cargarRanking() {
        try {
            const data = localStorage.getItem(this.RANKING_KEY);
            return data ? JSON.parse(data) : [];
        } catch (error) {
            console.error("Error al cargar el ranking:", error);
            return [];
        }
    }

    eliminarRanking() {
        localStorage.removeItem(this.RANKING_KEY);
    }

    // EXPORTAR A JSON

    exportarJSON(data, nombreArchivo = "datos.json") {
        try {
            const json = JSON.stringify(data, null, 2);
            const blob = new Blob([json], { type: "application/json" });
            const url = URL.createObjectURL(blob);

            const a = document.createElement("a");
            a.href = url;
            a.download = nombreArchivo;
            document.body.appendChild(a);
            a.click();

            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error("Error al exportar JSON:", error);
        }
    }
}