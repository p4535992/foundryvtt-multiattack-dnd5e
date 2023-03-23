import { debug, log, warn, i18n } from "./lib/lib";
import CONSTANTS from "./constants";

export let roller = 'core';

export const registerSettings = function () {

	game.settings.registerMenu(CONSTANTS.MODULE_NAME, "resetAllSettings", {
		name: `${CONSTANTS.MODULE_NAME}.setting.reset.name`,
		hint: `${CONSTANTS.MODULE_NAME}.setting.reset.hint`,
		icon: "fas fa-coins",
		type: ResetSettingsDialog,
		restricted: true
	});

	// =====================================================================

    game.settings.register(CONSTANTS.MODULE_NAME, 'condenseChatMessagesEnabled', {
        name: `${CONSTANTS.MODULE_NAME}.settings.condenseChatMessagesEnabled.name`,
        scope: 'world',
        config: roller === 'core',
        type: Boolean,
        default: true
    });

    game.settings.register(CONSTANTS.MODULE_NAME, 'multiattackToolEnabled', {
        name: `${CONSTANTS.MODULE_NAME}.settings.multiattackToolEnabled.name`,
        scope: 'world',
        config: true,
        type: Boolean,
        default: true,
        onChange: () => ui.controls.render(true)
    });

    game.settings.register(CONSTANTS.MODULE_NAME, 'playerToolEnabled', {
        name: `${CONSTANTS.MODULE_NAME}.settings.playerToolEnabled.name`,
        hint: `${CONSTANTS.MODULE_NAME}.settings.playerToolEnabled.hint`,
        scope: 'world',
        config: true,
        type: Boolean,
        default: false
    });

    game.settings.register(CONSTANTS.MODULE_NAME, 'extraAttackDSN', {
        name: `${CONSTANTS.MODULE_NAME}.settings.extraAttackDSN.name`,
        hint: `${CONSTANTS.MODULE_NAME}.settings.extraAttackDSN.hint`,
        scope: 'world',
        config: game.modules.get('dice-so-nice')?.active && roller === 'core',
        type: String,
        choices: {
            disabled: `${CONSTANTS.MODULE_NAME}.settings.disabled`,
            attack: `${CONSTANTS.MODULE_NAME}.settings.attackOnly`,
            damage: `${CONSTANTS.MODULE_NAME}.settings.damageOnly`,
            enabled: `${CONSTANTS.MODULE_NAME}.settings.enabled`,
        },
        default: 'enabled'
    });

    game.settings.register(CONSTANTS.MODULE_NAME, 'multiattackDSN', {
        name: `${CONSTANTS.MODULE_NAME}.settings.multiattackDSN.name`,
        scope: 'world',
        config: game.modules.get('dice-so-nice')?.active && roller === 'core',
        type: String,
        choices: {
            disabled: `${CONSTANTS.MODULE_NAME}.settings.disabled`,
            attack: `${CONSTANTS.MODULE_NAME}.settings.attackOnly`,
            damage: `${CONSTANTS.MODULE_NAME}.settings.damageOnly`,
            enabled: `${CONSTANTS.MODULE_NAME}.settings.enabled`,
        },
        default: 'enabled'
    });

	// ========================================================================

	game.settings.register(CONSTANTS.MODULE_NAME, "debug", {
		name: `${CONSTANTS.MODULE_NAME}.setting.debug.name`,
		hint: `${CONSTANTS.MODULE_NAME}.setting.debug.hint`,
		scope: "client",
		config: true,
		default: false,
		type: Boolean
	});
};

class ResetSettingsDialog extends FormApplication<FormApplicationOptions, object, any> {
	constructor(...args) {
		//@ts-ignore
		super(...args);
		//@ts-ignore
		return new Dialog({
			title: game.i18n.localize(`${CONSTANTS.MODULE_NAME}.dialogs.resetsettings.title`,
			content:
				'<p style="margin-bottom:1rem;">' +
				game.i18n.localize(`${CONSTANTS.MODULE_NAME}.dialogs.resetsettings.content`) +
				"</p>",
			buttons: {
				confirm: {
					icon: '<i class="fas fa-check"></i>',
					label: game.i18n.localize(`${CONSTANTS.MODULE_NAME}.dialogs.resetsettings.confirm`,
					callback: async () => {
						const worldSettings = game.settings.storage
							?.get("world")
							?.filter((setting) => setting.key.startsWith(`${CONSTANTS.MODULE_NAME}.`));
						for (let setting of worldSettings) {
							console.log(`Reset setting '${setting.key}'`);
							await setting.delete();
						}
						//window.location.reload();
					}
				},
				cancel: {
					icon: '<i class="fas fa-times"></i>',
					label: game.i18n.localize(`${CONSTANTS.MODULE_NAME}.dialogs.resetsettings.cancel`)
				}
			},
			default: "cancel"
		});
	}

	async _updateObject(event: Event, formData?: object): Promise<any> {
		// do nothing
	}
}
