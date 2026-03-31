const runtimeSheets = new Map();

/**
 * Devuelve un gestor de reglas CSS en runtime para evitar estilos inline.
 * @param {string} id
 * @returns {{ setRule: (key: string, ruleText: string) => void, removeRule: (key: string) => void }}
 */
export function getRuntimeCss(id) {
    if (!runtimeSheets.has(id)) {
        runtimeSheets.set(id, crearRuntimeSheet(id));
    }
    return runtimeSheets.get(id);
}

function crearRuntimeSheet(id) {
    const styleId = `runtime-css-${id}`;
    let styleTag = document.getElementById(styleId);

    if (!styleTag) {
        styleTag = document.createElement('style');
        styleTag.id = styleId;
        document.head.appendChild(styleTag);
    }

    const rules = new Map();

    const render = () => {
        styleTag.textContent = Array.from(rules.values()).join('\n');
    };

    return {
        setRule(key, ruleText) {
            rules.set(key, ruleText);
            render();
        },
        removeRule(key) {
            if (rules.delete(key)) {
                render();
            }
        },
    };
}
