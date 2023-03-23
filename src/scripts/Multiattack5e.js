export class Multiattack5e {
    static async multiattack({
        actor,
        itemNameArray = [], itemIDarray = [], chatMessage = true, messageData, primeRoll,
        isAttackRoll = true, isExtraAttack = false,
        rollMode = 'publicroll', sitBonus, vantage = 'normal', isCritical = false
    }) {

        actor = actor || canvas.tokens.controlled[0]?.actor;
        if (!actor) return;
        const isIDs = itemIDarray.length;
        const itemArray = isIDs ? itemIDarray : itemNameArray;
        if (!itemArray.length) return;

        // Assume messageData if none provided.
        if (!messageData) {
            messageData = {
                speaker: ChatMessage.getSpeaker({ actor }),
                type: CONST.CHAT_MESSAGE_TYPES.ROLL,
            };
        }

        // Build array of rolls.
        const rollMethod = isAttackRoll ? CONFIG.Item.documentClass.prototype.rollAttack : CONFIG.Item.documentClass.prototype.rollDamage;
        const condenseChatMessages = game.settings.get(moduleID, 'condenseChatMessagesEnabled');
        let rollOptions;
        const commonRollOptions = {
            fastForward: true,
            chatMessage: !condenseChatMessages // Prevent extra roll chat messages if condenseChatMessages enabled.
        };
        if (isAttackRoll) {
            rollOptions = commonRollOptions;
            rollOptions.advantage = vantage === 'advantage';
            rollOptions.disadvantage = vantage === 'disadvantage';
        } else {
            rollOptions = {
                critical: isCritical,
                options: commonRollOptions
            };
        }
        const preHook = isAttackRoll ? 'preRollAttack' : 'preRollDamage';
        const hk = Hooks.on(`dnd5e.${preHook}`, (item, rollConfig) => {
            if (sitBonus) rollConfig.parts.push(sitBonus);
        });
        let rollOrder = 1;
        const rolls = [];
        if (primeRoll) rolls.push(primeRoll);
        for (const id of itemArray) {
            const item = isIDs ? actor.items.get(id) : actor.items.getName(id);
            await delay(100); // Short delay to allow previous roll to complete ammoUpdate.
            const r = await rollMethod.call(item, rollOptions);
            if (r) {
                r.id = id;
                if (rollMode === 'publicroll' && isExtraAttack) {
                    r.dice[0].options.rollOrder = rollOrder;
                    rollOrder++;
                }
                rolls.push(r);
            }

        }
        Hooks.off(`dnd5e.${preHook}`, hk);

        // Build templateData for rendering custom condensed chat message template.
        const templateData = {
            items: {}
        };
        for (const roll of rolls) {
            roll.tooltip = await roll.getTooltip();
            if (isAttackRoll) {
                if (roll.isCritical) roll.highlight = 'critical';
                else if (roll.isFumble) roll.highlight = 'fumble';
                else roll.highlight = '';
            }
            const { id }  = roll;
            if (!templateData.items[id]) {
                templateData.items[id] = {
                    flavor: roll.options.flavor,
                    formula: roll.formula,
                    rolls: [roll]
                };
                if (roll.hasAdvantage) templateData.items[id].flavor += ` (${game.i18n.localize("DND5E.Advantage")})`;
                if (roll.hasDisadvantage) templateData.items[id].flavor += ` (${game.i18n.localize("DND5E.Disadvantage")})`;
            } else templateData.items[id].rolls.push(roll);
        }

        // Subsequent processing only applies to condensed chat messages.
        if (!condenseChatMessages) return rolls;

        // Attach rolls array to messageData for DsN integration and total damage application.
        messageData.rolls = rolls;

        // Calculate total damage if damage roll.
        if (!isAttackRoll) templateData.totalDamage = rolls.reduce((acc, current) => { return acc += current.total }, 0);

        // Render template.
        const content = await renderTemplate(`modules/${moduleID}/templates/condensed-chat-message.hbs`, templateData);
        messageData.content = content;

        messageData.flags = {
            [moduleID]: {
                isMultiattack: true,
            },
            'semi-private-rolls': { // Compatibility with Semi-Private Rolls.

                flavor: messageData.flavor
            }
        };
        // Flavor is already included in custom template.
        delete messageData.flavor;

        // Conditionally hide DsN based on extraAttackDSN setting.
        const dsn = isExtraAttack 
            ? game.settings.get(moduleID, 'extraAttackDSN')
            : game.settings.get(moduleID, 'multiattackDSN');
        if (dsn !== 'enabled' && (extraAttackDSN === 'disabled' || dsn !== rollType)) {
            Hooks.once('diceSoNiceRollStart', (id, context) => { context.blind = true });
        }

        // Create condensed chat message.
        if (chatMessage) await ChatMessage.create(messageData, { rollMode });

        return rolls;
    }

    static async multiattackTool() {
        if (canvas.tokens.controlled.length !== 1) return ui.notifications.warn(ma5eLocalize('ui.selectOneToken')); // Tool only works for a single selected token.

        const [tokenObj] = canvas.tokens.controlled;
        const { actor } = tokenObj;

        // Build template data from actor's weapons.
        const templateData = {
            items: []
        };
        for (const item of actor.items) {
            if (item.type !== 'weapon' || !item.hasAttack) continue;

            const { id, name, img } = item;
            const itemData = {
                id,
                name,
                img
            };
            templateData.items.push(itemData);
        }
        const content = await renderTemplate(`modules/${moduleID}/templates/multiattack-tool-dialog.hbs`, templateData);
        const buttonPosition = document.querySelector(`li.control-tool[data-tool="multiattackTool"]`);
        const dialogOptions = {
            id: 'multiattack-tool-dialog',
            width: 250,
            top: buttonPosition.offsetTop,
            left: buttonPosition.offsetLeft + 50,
            resizable: false
        };

        let rollType;
        new Dialog({
            title: ma5eLocalize('tool.dialog.title'),
            content,
            buttons: {
                attack: {
                    label: game.i18n.localize('DND5E.Attack'),
                    callback: () => rollType = 'attack'
                },
                damage: {
                    label: game.i18n.localize('DND5E.Damage'),
                    callback: () => rollType = 'damage'
                }
            },
            render: ([html]) => {
                // Apply default multiattack data.
                const defaultMultiattack = tokenObj.document.getFlag(moduleID, 'defaultMultiattack');
                if (defaultMultiattack) {
                    for (const itemID of defaultMultiattack) {
                        const option = html.querySelector(`div#${itemID}`);
                        if (!option) continue;

                        const input = option.querySelector('input[type="number"]');
                        input.value = input.value ? parseInt(input.value) + 1 : 1;
                        const checkbox = option.querySelector('input[type="checkbox"]');
                        checkbox.checked = true;
                    }
                }

                // Add click eventListeners for setting/clearing default multiattack.
                html.querySelector('#setDefaultButton').addEventListener('click', setDefault);
                html.querySelector('#clearDefaultButton').addEventListener('click', clearDefault);

                const tokenDoc = tokenObj.document;
                function setDefault() {
                    const itemIDarray = toolDataToItemIDarray(html);
                    tokenDoc.setFlag(moduleID, 'defaultMultiattack', itemIDarray);
                    ui.notifications.info(`${ma5eLocalize("ui.setDefault")} ${tokenDoc.name}.`);
                }

                function clearDefault() {
                    const checkboxes = html.querySelectorAll(`input.${moduleID}-checkbox`);
                    const inputs = html.querySelectorAll('input.multiattack-5e-input');
                    for (let i = 0; i < checkboxes.length; i++) {
                        checkboxes[i].checked = false;
                        inputs[i].value = null;
                    }

                    tokenDoc.unsetFlag(moduleID, 'defaultMultiattack');
                    ui.notifications.warn(`${ma5eLocalize('ui.clearDefault')} ${tokenDoc.name}`);
                }
            },
            close: async ([html]) => {
                if (!rollType) return;

                // Build itemIDarray and send to Multiattack5e.multiattack.
                const itemIDarray = toolDataToItemIDarray(html);
                await ma5e.multiattack({
                    actor,
                    itemIDarray,
                    isAttackRoll: rollType === 'attack',
                    rollMode: game.settings.get('core', 'rollMode')
                });
            }
        }, dialogOptions).render(true);


        function toolDataToItemIDarray(html) {
            const itemIDarray = [];
            const items = html.querySelectorAll(`div.${moduleID}-item`);
            items.forEach(div => {
                const checkbox = div.querySelector('input[type="checkbox"]');
                if (!checkbox.checked) return;

                const num = parseInt(div.querySelector(`input[type="number"]`).value) || 1;
                for (let i = 0; i < num; i++) itemIDarray.push(div.id);
            });

            return itemIDarray;
        }
    }
}