import { warn, error, debug, i18n } from "./lib/lib";
import CONSTANTS from "./constants";
import { setApi } from "../main";
import API from "./api";

export let BCCBASE: BCconfig;

export const initHooks = async () => {
	// Hooks.once("socketlib.ready", registerSocket);
	// registerSocket();


};

export const setupHooks = async (): Promise<void> => {
	setApi(API);
};

export const readyHooks = () => {

};


// Add multiattack tool button to token control bar.
Hooks.on('getSceneControlButtons', controls => {
    const bar = controls.find(c => c.name === 'token');
    bar.tools.push({
        name: 'multiattackTool',
        title: ma5eLocalize('tool.control.title'),
        icon: 'fa-solid fa-swords',
        onClick: ma5e.multiattackTool.bind(),
        button: true
    })
});

// Add extra attack select to attack/damage roll configuration dialogs.
Hooks.on('renderDialog', async (dialog, $html, appData) => {
    const html = $html[0];
    // Filter for target dialogs.
    const { title } = dialog.data;
    const attackRollText = game.i18n.localize('DND5E.AttackRoll');
    const damageRollText = game.i18n.localize('DND5E.DamageRoll');
    if (!title.includes(attackRollText) && !title.includes(damageRollText)) return;

    // Inject number-of-rolls select element.
    const numberOfRollsSelect = document.createElement('div');
    numberOfRollsSelect.classList.add('form-group');
    numberOfRollsSelect.innerHTML = `
        <label>${ma5eLocalize("dialog.numberOfRolls")}</label>
        <select name="number-of-rolls">
            <option value="1">1</option>
            <option value="2">2</option>
            <option value="3">3</option>
            <option value="4">4</option>
        </select>
    `;
    html.querySelector('form').append(numberOfRollsSelect);
    html.style.height = 'auto';

    // Override roll button callbacks.
    for (const vantage of Object.keys(dialog.data.buttons)) {
        const ogCallback = dialog.data.buttons[vantage].callback;
        dialog.data.buttons[vantage].callback = ([html]) => {
            const isAttackRoll = title.includes(attackRollText);
            const numberOfRolls = parseInt(html.querySelector('select[name="number-of-rolls"]').value) || 1;
            if (numberOfRolls !== 1) {
                const hook = isAttackRoll ? 'rollAttack' : 'rollDamage';
                const sitBonus = html.querySelector('input[name="bonus"]').value; // Get situational bonus from prime roll to apply to future rolls.

                const condenseChatMessages = game.settings.get(CONSTANTS.MODULE_NAME, 'condenseChatMessagesEnabled');
                let messageData;
                // If condenseChatMessages setting enabled, prevent prime roll chat message.
                if (condenseChatMessages) {
                    Hooks.once('preCreateChatMessage', (message, data, options, userID) => {
                        messageData = data;
                        return false;
                    });
                }

                // Prepare to intercept prime roll to create itemIDarray and pass to Multiattack5e.multiattack.
                Hooks.once(`dnd5e.${hook}`, async (item, primeRoll, ammoUpdate) => {
                    const itemIDarray = [];
                    for (let i = 1; i < numberOfRolls; i++) itemIDarray.push(item.id);

                    const ma5eData = {
                        actor: item.parent,
                        itemIDarray,
                        messageData,
                        primeRoll,
                        isAttackRoll,
                        isExtraAttack: true,
                        rollMode: primeRoll.options.rollMode,
                        sitBonus,
                        vantage,
                        isCritical: primeRoll.isCritical
                    };
                    ma5eData.primeRoll.id = item.id;

                    await ma5e.multiattack(ma5eData);
                });
            }

            // Call original callback to initiate prime roll.
            let vantageMode;
            if (isAttackRoll) vantageMode = CONFIG.Dice.D20Roll.ADV_MODE[vantage];
            else vantageMode = vantage === 'critical';

            return ogCallback($html, vantageMode);
        };
    }
});

/**
 * A hook event that fires before an item usage is configured.
 * @function dnd5e.preUseItem
 * @memberof hookEvents
 * @param {Item5e} item                  Item being used.
 * @param {ItemUseConfiguration} config  Configuration data for the item usage being prepared.
 * @param {ItemUseOptions} options       Additional options used for configuring item usage.
 * @returns {boolean}                    Explicitly return `false` to prevent item from being used.
 */
Hooks.on("dnd5e.preUseItem", (item, config, options) => {
// Hooks.on("dnd5e.useItem", (item, config, options) => {
    const actor = item.actor ? item.actor : item.parent;
    if(actor) {
        const labelsToCheck = game.i18n.localize(`${CONSTANTS.MODULE_NAME}.label.multiattack`).toLowerCase().split(",");
        if(labelsToCheck.includes(item.name.toLowerCase())) {
            multiattackTool(actor);
        }
        /*
        const weapons = retrieveAllWeaponsAndSpellNamesFromActor(actor);
        const itemsToRoll = []; // Array of item names on actor.
        for(const itemToRoll of weapons) {
            itemsToRoll.push(itemToRoll.name);
        }

        const ma5eData = {
            actor, // I think item macros define 'actor' as the item owner automatically.
            itemNameArray: itemsToRoll,
        };

        let rollMode;
        // This dialog lets the user decide if they are doing an attack or damage roll.
        // If you're using MIDI (compatibility not confirmed), you can skip this dialog and just run game.modules.get(CONSTANTS.MODULE_NAME).api.multiattack(ma5eData);
        new Dialog({
            title: 'Roll Mode',
            buttons: {
                attack: {
                    label: 'Attack',
                    callback: () => rollMode = 'attack'
                },
                damage: {
                    label: 'Damage',
                    callback: () => rollMode = 'damage'
                }
            },
            close: () => {
                if (!rollMode) return;

                ma5eData.rollMode = rollMode;
                game.modules.get(CONSTANTS.MODULE_NAME).api.multiattack(ma5eData);
            }
        }).render(true);
        */
    }
    // TODO by default we return true for apply the standard behaviour
    // but for our use case is better false ?
    return false;
});
