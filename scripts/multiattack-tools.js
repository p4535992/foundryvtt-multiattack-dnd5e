export async function multiattackTool(actor) {


    // Build template data from actor's weapons.
    const templateData = {
        items: []
    };
    const weapons = retrieveAllWeaponsAndSpellNamesFromActor(actor);
    for (const item of weapons) {
        if (item.type !== 'weapon' || !item.hasAttack) continue;

        const { id, name, img } = item;
        const itemData = {
            id,
            name,
            img
        };
        templateData.items.push(itemData);
    }
    const content = await renderTemplate(`modules/${"multiattack-5e"}/templates/multiattack-tool-dialog.hbs`, templateData);
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
            const defaultMultiattack = actor.getFlag("multiattack-5e", 'defaultMultiattack');
            if (defaultMultiattack) {
                for (const itemID of defaultMultiattack) {
                    const option = html.querySelector(`div#${itemID}`);
                    if (!option) {
                        continue;
                    }
                    const input = option.querySelector('input[type="number"]');
                    input.value = input.value ? parseInt(input.value) + 1 : 1;
                    const checkbox = option.querySelector('input[type="checkbox"]');
                    checkbox.checked = true;
                }
            }

            // Add click eventListeners for setting/clearing default multiattack.
            html.querySelector('#setDefaultButton').addEventListener('click', setDefault);
            html.querySelector('#clearDefaultButton').addEventListener('click', clearDefault);

            function setDefault() {
                const itemIDarray = toolDataToItemIDarray(html);
                actor.setFlag("multiattack-5e", 'defaultMultiattack', itemIDarray);
                ui.notifications.info(`${ma5eLocalize("ui.setDefault")} ${actor.name}.`);
            }

            function clearDefault() {
                const checkboxes = html.querySelectorAll(`input.${"multiattack-5e"}-checkbox`);
                const inputs = html.querySelectorAll('input.multiattack-5e-input');
                for (let i = 0; i < checkboxes.length; i++) {
                    checkboxes[i].checked = false;
                    inputs[i].value = null;
                }

                actor.unsetFlag("multiattack-5e", 'defaultMultiattack');
                ui.notifications.warn(`${ma5eLocalize('ui.clearDefault')} ${actor.name}`);
            }
        },
        close: async ([html]) => {
            if (!rollType) {
                return;
            }
            // Build itemIDarray and send to Multiattack5e.multiattack.
            const itemIDarray = toolDataToItemIDarray(html);
            await game.modules.get('multiattack-5e').api.multiattack(
                {
                    actor: actor,
                    itemNameArray: [], 
                    itemIDarray: itemIDarray, 
                    chatMessage: true, 
                    messageData: undefined, 
                    primeRoll: undefined,
                    isAttackRoll: rollType === 'attack',
                    isExtraAttack: false,
                    rollMode: game.settings.get('core', 'rollMode'),
                    sitBonus: undefined, 
                    vantage: 'normal', 
                    isCritical: false
                }
            );
        }
    }, dialogOptions).render(true);

}

const ma5eLocalize = key => game.i18n.localize(`${"multiattack-5e"}.${key}`);

function toolDataToItemIDarray(html) {
    const itemIDarray = [];
    const items = html.querySelectorAll(`div.${"multiattack-5e"}-item`);
    items.forEach(div => {
        const checkbox = div.querySelector('input[type="checkbox"]');
        if (!checkbox.checked) {
            return;
        }
        const num = parseInt(div.querySelector(`input[type="number"]`).value) || 1;
        for (let i = 0; i < num; i++) {
            itemIDarray.push(div.id);
        }
    });

    return itemIDarray;
}

function retrieveAllWeaponsAndSpellNamesFromActor(actor) {
    const weaponsItems = ["weapon", "spell"];
    // let totalWeight: number = actorEntity.items.reduce((weight, item) => {
    let weapons = [];
    for(let im of actor.items.contents) {
        if (im && weaponsItems.includes(im.type)) {
            //CHECK FOR SLOTS AND AMMUNITION
            // TODO This should be transfer to multiattack module maybe ?
            const usesForItem = calculateUsesForItem(im);
            if(usesForItem) {
                const available = usesForItem.available;
                const maximum = usesForItem.maximum;
                const isAmmunition = usesForItem.isAmmunition;
                weapons.push(im);
            } else {
                weapons.push(im);
            }
        }
    }
    return weapons;
}

// Calculate slots and ammunition

/**
 * 
 * @param {*} item 
 * @returns {available:number, maximum:number|null, isAmmunition:boolean}
 */
function calculateUsesForItem(item) {
  const itemData = item.system;
  const consume = itemData.consume;
  if (consume && consume.target) {
    return calculateConsumeUses(item.actor, consume);
  }
  const uses = itemData.uses;
  if (uses && (uses.max > 0 || uses.value > 0)) {
    return calculateLimitedUses(itemData);
  }

  const itemType = item.type;
  if (itemType === 'feat') {
    return calculateFeatUses(itemData);
  } else if (itemType === 'consumable' || itemType === 'loot') {
    return {
      available: itemData.quantity,
    };
  } else if (itemType === 'spell') {
    return calculateSpellUses(item);
  } else if (itemType === 'weapon') {
    return calculateWeaponUses(itemData);
  }
  return null;
}

function calculateConsumeUses(actor, consume) {
  let available = null;
  let maximum = null;
  if (consume.type === 'attribute') {
    const value = getProperty(actor.system, consume.target);
    if (typeof value === 'number') {
      available = value;
    } else {
      available = 0;
    }
  } else if (consume.type === 'ammo' || consume.type === 'material') {
    const targetItem = actor.items.get(consume.target);
    if (targetItem) {
      available = targetItem.system.quantity;
    } else {
      available = 0;
    }
  } else if (consume.type === 'charges') {
    const targetItem = actor.items.get(consume.target);
    if (targetItem) {
      ({ available, maximum } = calculateLimitedUses(targetItem.system));
    } else {
      available = 0;
    }
  }
  if (available !== null) {
    if (consume.amount > 1) {
      available = Math.floor(available / consume.amount);
      if (maximum !== null) {
        maximum = Math.floor(maximum / consume.amount);
      }
    }
    return { available, maximum, isAmmunition: true };
  }
  return null;
}

function calculateLimitedUses(itemData) {
  let available = itemData.uses.value;
  let maximum = itemData.uses.max;
  const quantity = itemData.quantity;
  if (quantity) {
    available = available + (quantity - 1) * maximum;
    maximum = maximum * quantity;
  }
  return { available, maximum };
}

function calculateFeatUses(itemData) {
  if (itemData.recharge && itemData.recharge.value) {
    return { available: itemData.recharge.charged ? 1 : 0, maximum: 1 };
  }
  return null;
}

function calculateSpellUses(item) {
  const itemData = item.system;
  const actorData = item.actor.system;
  let available = null;
  let maximum = null;
  const preparationMode = itemData.preparation.mode;
  if (preparationMode === 'pact') {
    available = actorData.spells['pact'].value;
    maximum = actorData.spells['pact'].max;
  } else if (preparationMode === 'innate' || preparationMode === 'atwill') {
    // None
  } else {
    let level = itemData.level;
    if (level > 0) {
      available = actorData.spells['spell' + level].value;
      maximum = actorData.spells['spell' + level].max;
    }
  }
  if (available === null) {
    return null;
  } else {
    return { available, maximum };
  }
}

function calculateWeaponUses(itemData) {
  // If the weapon is a thrown weapon, but not a returning weapon, show quantity
  if (itemData.properties.thr && !itemData.properties.ret) {
    return { available: itemData.quantity, maximum: null };
  }
  return null;
}

