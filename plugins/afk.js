const bot = require("../lib/plugin");
const fs = require('fs');
const path = require('path');

// AFK state
const afkState = {
    afkStartTimes: new Map(),
    configFile: path.join(__dirname, '..', 'config.js'),
    globalAFKStartTime: null
};

// File watcher to reload config changes
fs.watch(afkState.configFile, (eventType, filename) => {
    if (eventType === 'change') {
        try {
            delete require.cache[require.resolve(afkState.configFile)];
        } catch (error) {
            console.error('AFK: Error reloading config:', error);
        }
    }
});

// Function to update config
function updateConfig(newValues) {
    try {
        const config = require(afkState.configFile);
        const updatedConfig = {...config, ...newValues};
        fs.writeFileSync(afkState.configFile, `module.exports = ${JSON.stringify(updatedConfig, null, 2)};`);
        delete require.cache[require.resolve(afkState.configFile)];
        return true;
    } catch (error) {
        console.error('AFK: Error updating config:', error);
        return false;
    }
}

// Helper function to format duration
function formatDuration(startTime) {
    const seconds = Math.floor((Date.now() - startTime) / 1000);
    const days = Math.floor(seconds / (3600 * 24));
    const hours = Math.floor((seconds % (3600 * 24)) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    let duration = [];
    if (days > 0) duration.push(`${days} day${days > 1 ? 's' : ''}`);
    if (hours > 0) duration.push(`${hours} hour${hours > 1 ? 's' : ''}`);
    if (minutes > 0) duration.push(`${minutes} minute${minutes > 1 ? 's' : ''}`);
    if (secs > 0 || duration.length === 0) duration.push(`${secs} second${secs !== 1 ? 's' : ''}`);
    
    return duration.join(' ');
}

// Helper function to extract base number from JID
function extractBaseNumber(jid) {
    return jid.split('@')[0];
}

bot(
    {
        name: "afk",
        info: "Manages AFK settings",
        category: "owner",
        usage: [
            "afk [on|off] [reason] - Toggle AFK with optional reason",
            "afk reason [new reason] - Update AFK reason"
        ]
    },
    async (message, bot) => {
        const action = message.args[0]?.toLowerCase();
        const config = require(afkState.configFile);

        // Check if message is from owner
        const isOwner = message.sender === config.OWNER_NUMBER + '@s.whatsapp.net';
        if (!isOwner) return await bot.reply("This command is only available for the owner.");

        switch (action) {
            case 'on':
                const reason = message.args.slice(1).join(' ') || "I'm AFK right now";
                const onSuccess = updateConfig({ 
                    AFK: "true",
                    AFK_REASON: reason
                });
                
                if (onSuccess) {
                    const now = Date.now();
                    afkState.afkStartTimes.set(message.sender, now);
                    afkState.globalAFKStartTime = now;
                    return await bot.reply(`AFK mode has been enabled.\nReason: ${reason}`);
                } else {
                    return await bot.reply("Failed to enable AFK mode.");
                }
                
            case 'off':
                const offSuccess = updateConfig({ 
                    AFK: "false",
                    AFK_REASON: ""
                });
                
                if (offSuccess) {
                    const startTime = afkState.afkStartTimes.get(message.sender);
                    if (startTime) {
                        const duration = formatDuration(startTime);
                        afkState.afkStartTimes.delete(message.sender);
                        return await bot.reply(`AFK mode has been disabled.\nYou were AFK for ${duration}.`);
                    }
                    return await bot.reply("AFK mode has been disabled.");
                } else {
                    return await bot.reply("Failed to disable AFK mode.");
                }
                
            case 'reason':
                if (message.args.length < 2) {
                    return await bot.reply(`Current AFK reason: ${config.AFK_REASON || "Not set"}`);
                }
                
                const newReason = message.args.slice(1).join(' ');
                const reasonSuccess = updateConfig({ AFK_REASON: newReason });
                
                if (reasonSuccess) {
                    return await bot.reply(`AFK reason updated to: ${newReason}`);
                } else {
                    return await bot.reply("Failed to update AFK reason.");
                }
                
            default:
                return await bot.reply(`AFK Status: ${config.AFK === "true" ? 'ON' : 'OFF'}\n` +
                    (config.AFK === "true" ? `Reason: ${config.AFK_REASON || "Not specified"}\n` : '') +
                    `\nUsage:\n` +
                    `${config.PREFIX}afk on [reason] - Enable AFK mode\n` +
                    `${config.PREFIX}afk off - Disable AFK mode\n` +
                    `${config.PREFIX}afk reason [new reason] - Update AFK reason`
                );
        }
    }
);

// AFK message listener for mentions and PMs
bot(
    {
        on: 'text',
        name: "afk-listener",
        ignoreRestrictions: true
    },
    async (message, bot) => {
        try {
            const config = require(afkState.configFile);
            
            // Skip if AFK is disabled or message is from the bot itself
            if (config.AFK !== "true" || message.key?.fromMe) return;
            
            // Check if message is from owner
            const isOwner = message.sender === config.OWNER_NUMBER + '@s.whatsapp.net';
            
            // If owner sends any message and was AFK, welcome them back
            if (isOwner && afkState.afkStartTimes.has(message.sender)) {
                const startTime = afkState.afkStartTimes.get(message.sender);
                const duration = formatDuration(startTime);
                const reason = config.AFK_REASON || "No reason specified";
                
                // Disable AFK
                updateConfig({ 
                    AFK: "false",
                    AFK_REASON: ""
                });
                afkState.afkStartTimes.delete(message.sender);
                
                // Send welcome back message
                await bot.reply(`*Welcome back!*\nYou were AFK for ${duration}.\nReason: ${reason}`);
                return;
            }
            
            // Check if owner is mentioned (only if owner hasn't sent any messages themselves)
            const ownerBaseNumber = extractBaseNumber(config.OWNER_NUMBER + '@s.whatsapp.net');
            const isMentioned = message.text?.includes(`@${ownerBaseNumber}`);
            const isGroup = message.chat?.endsWith('@g.us') ?? false;
            
            // Respond only if:
            // 1. Owner is mentioned in a group, OR
            // 2. It's a PM (non-group chat)
            if ((isGroup && isMentioned) || !isGroup) {
                const startTime = afkState.globalAFKStartTime || Date.now();
                const duration = formatDuration(startTime);
                const reason = config.AFK_REASON || "I'm AFK right now";
                
                await bot.reply(`*AFK*\nI'm currently AFK (for ${duration}).\nReason: ${reason}\nI'll respond when I'm back.`);
            }
            
        } catch (error) {
            console.error('AFK: Error in listener:', error);
        }
    }
);