const bot = require("../lib/plugin");
const fs = require('fs');
const path = require('path');

// PM blocker state
const pmBlockerState = {
    warningCounts: new Map(), // Tracks warning counts per user
    configFile: path.join(__dirname, '..', 'config.js') // Adjust path as needed
};

// File watcher to reload config changes
fs.watch(pmBlockerState.configFile, (eventType, filename) => {
    if (eventType === 'change') {
        try {
            delete require.cache[require.resolve(pmBlockerState.configFile)];
        } catch (error) {
            console.error('PM Blocker: Error reloading config:', error);
        }
    }
});

// Function to update config
function updateConfig(newValues) {
    try {
        const config = require(pmBlockerState.configFile);
        const updatedConfig = {...config, ...newValues};
        fs.writeFileSync(pmBlockerState.configFile, JSON.stringify(updatedConfig, null, 2));
        delete require.cache[require.resolve(pmBlockerState.configFile)];
        return true;
    } catch (error) {
        console.error('PM Blocker: Error updating config:', error);
        return false;
    }
}

bot(
    {
        name: "pmblocker",
        info: "Manages PM blocker settings",
        category: "owner",
        usage: [
            "pmblocker [on|off] - Toggle PM blocker"
        ]
    },
    async (message, bot) => {
        // Verify owner status before allowing command execution
        if (!message.isOwner(message.sender)) {
            return await bot.reply("This command is only available to the bot owner.");
        }

        const action = message.args[0]?.toLowerCase();
        const config = require(pmBlockerState.configFile);

        switch (action) {
            case 'on':
                const onSuccess = updateConfig({ PM_BLOCKER: "true" });
                if (onSuccess) {
                    return await bot.reply("PM blocker has been enabled.");
                } else {
                    return await bot.reply("Failed to enable PM blocker.");
                }
                
            case 'off':
                const offSuccess = updateConfig({ PM_BLOCKER: "false" });
                if (offSuccess) {
                    // Clear all warning counts when turning off
                    pmBlockerState.warningCounts.clear();
                    return await bot.reply("PM blocker has been disabled.");
                } else {
                    return await bot.reply("Failed to disable PM blocker.");
                }
                
            default:
                return await bot.reply(`PM Blocker Status: ${config.PM_BLOCKER === "true" ? 'ON' : 'OFF'}\n\n` +
                    `Usage:\n` +
                    `${config.PREFIX}pmblocker on - Enable PM blocker\n` +
                    `${config.PREFIX}pmblocker off - Disable PM blocker`
                );
        }
    }
);

// PM message listener
bot(
    {
        on: 'text',
        name: "pm-blocker-listener",
        ignoreRestrictions: true
    },
    async (message, bot) => {
        try {
            // Skip if not a private message or if message is from the bot itself
            if (message.chat.endsWith('@g.us') || 
                message.chat.endsWith('@newsletter') || 
                message.key.fromMe) return;
            
            const config = require(pmBlockerState.configFile);
            
            // Skip if PM blocker is disabled
            if (config.PM_BLOCKER !== "true") return;
            
            const sender = message.sender;
            
            // Skip if sender is owner (with proper verification)
            if (message.isOwner && message.isOwner(sender)) return;
            
            // Get current warning count
            const warningCount = pmBlockerState.warningCounts.get(sender) || 0;
            
            if (warningCount >= 3) {
                // Block user after 3 warnings
                try {
                    await bot.sock.updateBlockStatus(sender, 'block');
                    pmBlockerState.warningCounts.delete(sender);
                    return; // No need to reply after blocking
                } catch (error) {
                    console.error('PM Blocker: Error blocking user:', error);
                }
            }
            
            // Send warning message
            await bot.reply(`*QUEEN ALYA* is the assistant and you are not allowed to message this user until PM blocker is off.\n` +
                `Warning: ${warningCount + 1}/3 - You will be blocked after 3 warnings.`
            );
            
            // Update warning count
            pmBlockerState.warningCounts.set(sender, warningCount + 1);
            
        } catch (error) {
            console.error('PM Blocker: Error in listener:', error);
        }
    }
);