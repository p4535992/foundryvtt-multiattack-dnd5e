![All Downloads](https://img.shields.io/github/downloads/jessev14/Multiattack-5e/total?style=for-the-badge)

![Latest Release Download Count](https://img.shields.io/github/downloads/jessev14/Multiattack-5e/latest/MA5e.zip)
[![Forge Installs](https://img.shields.io/badge/dynamic/json?label=Forge%20Installs&query=package.installs&suffix=%25&url=https%3A%2F%2Fforge-vtt.com%2Fapi%2Fbazaar%2Fpackage%2Fmultiattack-5e&colorB=4aa94a)](https://forge-vtt.com/bazaar#package=multiattack-5e)

[![ko-fi](https://ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/jessev14)


# Multiattack 5e

Multiattack 5e (MA5e) is a FoundryVTT module for the DnD5e system that streamlines the multiattack action.
Users can perform several attack / damage rolls at once, and the output is condensed into a custom chat card.

## Demo

### Default (left) vs MA5e (right)
<img src="/img/default.gif" width="295" height="667"/> <img src="/img/package-preview.png" width="295" height="667"/>

### Multiattack Tool
<img src="/img/tool-preview.png" width="590">


## Instructions

### Extra Attacks with default dnd5e roller 
* Roll the weapon item as normal (create the item chat card in the chat log)
* Select Attack / Damage on the chat card
* An additional input is added to the Attack and Damage dialog boxes
* Select the number of extra attacks to roll

### Multiattack with default dnd5e roller

* Select a single token
* Click the Multiattack tool button in the token layer toolbar on the left (GMs can enable/disable this button for players)
* Check each item to be included in the roll and input how many of that item's attack/damage to roll
* Optional: Use the default buttons to save the entire multiattack configuration for subsequent attacks

# API

The MA5e API has been opened to allow multiattacks to be made programmatically:

```js
// rollType and actor arguments are optional (default to "attack" and "canvas.tokens.controlled[0].actor" respectively)
const context = 
    {
        actor: Actor,  // Optional by default is 'canvas.tokens.controlled[0].actor'
        itemNameArray: String[]|undefined, // Optional ONLY if itemIDarray is not undefined and is not empty
        itemIDarray: String[]|undefined, // Optional ONLY if itemNameArray is not undefined and is not empty
        chatMessage: Boolean, // Optional by default is true
        messageData: MessageData|undefined, // Optional by default is undefined
        primeRoll: Roll|undefined, // Optional by default is undefined
        isAttackRoll: Boolean, // Optional by default is true, if 'primeRoll' is not undefined is used 'primeRoll.options.rollMode'
        isExtraAttack: Boolean, // Optional by default is false, if 'primeRoll' is not undefined is used 'primeRoll.isCritical'
        rollMode: String, // Optional by default is 'game.settings.get('core', 'rollMode')'
        sitBonus: String|undefined, // Optional by default is undefined, e.g. '+1d4'
        vantage: String, // Optional by default is 'normal'
        isCritical: Boolean // Optional by default is false
    }

await game.modules.get("multiattack-5e").api.multiattack({context})
```

### Example

```js
const weapons = ["Longsword", "Longsword", "Dagger"]; // Make two longsword attacks and one dagger attack
const rollType = "attack"; // rollType is set to "attack" by default, but can also be set to "damage"
const actor = canvas.tokens.controlled[0].actor; // GM users could pre-define multiattack rolls for various actors
const context = 
    {
        actor: actor,
        itemNameArray: weapons, 
        itemIDarray: [], 
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
await game.modules.get("multiattack-5e").api.multiattack({context})
```


## Technical Notes

### Extra Attacks with default dnd5e roller 

MA5e hooks onto `renderDialog` and filters for attack/damage roll configuration dialogs. An extra attack selection element is injected into the application. The functions that drive the roll configuration dialog are patched to add the value of the extra attack selection element into the original attack/damage roll.

`Item5e#rollAttack` and `Item5e#rollDamage` are also patched to hook onto `preCreateChatMessage` to get original chat message data and to suppress the creation of that original chat message. The patched functions make extra rolls based on the original "prime" roll to generate an array of rolls which is rendered using a custom handlebars template to create a single chat card with all the roll results.

### Multiattacks

The multiattack workflow takes an array of weapon item names and uses that to build a nested array of attack/damage rolls from the actor. The multiattack tool simply builds the weapon item name array and passes it to the multiattack function.

### Dice So Nice!

Since the number of rolls being made could be quite large, there are world-scope settings that allow for GM users to enable/disable DSN animations. If using the MA5e custom roller, DSN animations can be enabled/disabled for attack rolls or damage rolls or both. This can be set independently for rolls made using the attack/damage chat card buttons or with the Multiattack Tool.

For Better Rolls 5e users, since attack and damage rolls are made simultaneously, the only option is to enable or disable DSN animations entirely (for rolls made using the Multiattack Tool only; other rolls are not effected).


## [Changelog (see individual releases for full release notes)](https://github.com/jessev14/Multiattack-5e/blob/main/CHANGELOG.md)
