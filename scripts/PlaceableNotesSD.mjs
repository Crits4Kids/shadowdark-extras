import SheetLockConfig from "./SheetLockConfig.mjs";

const MODULE_ID = "shadowdark-extras";

/**
 * Enhanced notes for any placeable object
 */
export default class PlaceableNotesSD extends foundry.applications.api.HandlebarsApplicationMixin(
    foundry.applications.api.ApplicationV2
) {
    constructor(object, options = {}) {
        super(options);
        this.object = object;
    }

    static DEFAULT_OPTIONS = {
        id: "sdx-placeable-notes",
        tag: "form",
        classes: ["sdx-notes-app"],
        window: {
            title: "SHADOWDARK_EXTRAS.placeable_notes.title",
            resizable: true,
            controls: []
        },
        position: {
            width: 500,
            height: 450,
        },
        actions: {
            save: PlaceableNotesSD._onSave,
            cancel: (app) => app.close()
        }
    };

    static PARTS = {
        main: {
            template: `modules/${MODULE_ID}/templates/placeable-notes.hbs`,
        }
    };

    async _prepareContext(options) {
        return {
            notes: this.object.getFlag(MODULE_ID, "notes") || "",
            isGM: game.user.isGM,
            objectName: this.object.name || this.object.id
        };
    }

    static async _onSave(event, target) {
        const formData = new FormDataExtended(this.element).object;
        await this.object.setFlag(MODULE_ID, "notes", formData.notes);
        ui.notifications.info("SHADOWDARK_EXTRAS.placeable_notes.saved", { localize: true });
        this.close();
    }

    // ============================================
    // HEADER BUTTON HOOKS
    // ============================================

    /**
     * Add the notes button to supported application headers
     */
    static addHeaderButton(app, buttons) {
        if (!game.user.isGM) return;

        const object = app.document || app.object || app.token;
        if (!object) return;

        const supportedTypes = ["AmbientLight", "AmbientSound", "Token", "Wall", "Tile", "Actor"];
        if (!object.documentName || !supportedTypes.includes(object.documentName)) return;

        const hasNotes = !!object.getFlag(MODULE_ID, "notes");

        const noteButton = {
            label: "SDX Notes",
            class: "open-sdx-notes",
            icon: hasNotes ? "fas fa-sticky-note" : "far fa-sticky-note",
            onclick: () => {
                new PlaceableNotesSD(object).render(true);
            },
            onClick: () => {
                new PlaceableNotesSD(object).render(true);
            },
            // For V2 controls compatibility if passed as controls
            action: "open-sdx-notes",
            handler: () => {
                new PlaceableNotesSD(object).render(true);
            }
        };

        // Add to beginning
        buttons.unshift(noteButton);
    }

    /**
     * Add the SDX Notes entry to an AppV2 sheet's header controls (the ⋮ menu).
     * Placeable config sheets are AppV2 since v13, so the AppV1 get*HeaderButtons hooks never fire.
     * The menu is rebuilt on every open, so the icon always reflects the saved state.
     * @param {foundry.applications.api.ApplicationV2} app
     * @param {ApplicationHeaderControlsEntry[]} controls
     */
    static addHeaderControl(app, controls) {
        if (!game.user.isGM) return;

        const object = app.document;
        const supportedTypes = ["AmbientLight", "AmbientSound", "Token", "Wall", "Tile"];
        if (!supportedTypes.includes(object?.documentName)) return;

        const hasNotes = !!object.getFlag(MODULE_ID, "notes");
        controls.unshift({
            action: "open-sdx-notes",
            label: "SDX Notes",
            icon: hasNotes ? "fas fa-sticky-note" : "far fa-sticky-note",
            onClick: () => new PlaceableNotesSD(object).render(true)
        });
    }

    static _updateHeaderButton(app, html) {
        if (!game.user.isGM) return;

        // In V1 html is [elem], in V2 it is elem
        const elem = Array.isArray(html) ? html[0] : html;

        const object = app.document || app.object || app.token;
        if (!object) return;

        const supportedTypes = ["AmbientLight", "AmbientSound", "Token", "Wall", "Tile", "Actor"];
        if (!object.documentName || !supportedTypes.includes(object.documentName)) return;

        setTimeout(() => {
            // Find the element
            // In V2, elem might be the HTML content, so we look up to window-app
            let appElem = elem instanceof HTMLElement ? elem.closest(".window-app") : null;
            if (!appElem && app.element) appElem = app.element instanceof HTMLElement ? app.element : (app.element[0] || app.element);

            if (!appElem) return;

            const header = appElem.querySelector(".window-header");
            if (!header) return;

            // Find by class or action
            let button = header.querySelector(".open-sdx-notes");
            if (!button) button = header.querySelector("[data-action='open-sdx-notes']");

            if (!button) return;

            const hasNotes = !!object.getFlag(MODULE_ID, "notes");

            // Update icon
            const icon = button.querySelector("i");
            if (icon) {
                icon.className = hasNotes ? "fas fa-sticky-note" : "far fa-sticky-note";
            }

            // Update Color (Green if notes exist)
            if (hasNotes) {
                button.style.color = "#4ade80";
            } else {
                button.style.color = "";
            }
        }, 100);
    }
}

export { PlaceableNotesSD };

export function initPlaceableNotes() {
    if (!game.settings.get(MODULE_ID, "enablePlaceableNotes")) return;

    // Placeable config sheets are AppV2 (v13+): add to their header controls menu
    Hooks.on("getHeaderControlsAmbientLightConfig", PlaceableNotesSD.addHeaderControl);
    Hooks.on("getHeaderControlsAmbientSoundConfig", PlaceableNotesSD.addHeaderControl);
    Hooks.on("getHeaderControlsTokenConfig", PlaceableNotesSD.addHeaderControl);
    Hooks.on("getHeaderControlsWallConfig", PlaceableNotesSD.addHeaderControl);
    Hooks.on("getHeaderControlsTileConfig", PlaceableNotesSD.addHeaderControl);

    // Shadowdark actor sheets are still AppV1
    Hooks.on("getActorSheetHeaderButtons", PlaceableNotesSD.addHeaderButton);
    Hooks.on("renderActorSheet", PlaceableNotesSD._updateHeaderButton);
}
