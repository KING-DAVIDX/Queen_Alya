const fs = require('fs');
const path = require('path');
const config = require("../config");
const bot = require("../lib/plugin");
const ai = require("../lib/modules/ai");

const alyaState = new Map();

// Helper function to clean JID
function cleanJid(jid) {
    if (!jid) return jid;
    return jid.replace(/[^0-9]/g, "").replace(/^0+/, "");
}

// Helper function to check if sender is owner
function isOwner(senderJid) {
    const cleanedSender = cleanJid(senderJid);
    const ownerNumber = cleanJid(config.OWNER_NUMBER);
    return cleanedSender === ownerNumber;
}

// Watch for config file changes
const configPath = path.join(__dirname, '../config.js');
let configWatcher;

function setupConfigWatcher() {
    if (configWatcher) {
        configWatcher.close();
    }
    
    configWatcher = fs.watch(configPath, (eventType) => {
        if (eventType === 'change') {
            // Clear require cache and reload config
            delete require.cache[require.resolve('../config')];
            const newConfig = require('../config');
            Object.assign(config, newConfig);
            console.log('Config reloaded due to changes');
        }
    });
}

// Initialize config watcher
setupConfigWatcher();

// Function to update config file
function updateConfig(key, value) {
    try {
        let configContent = fs.readFileSync(configPath, 'utf8');
        
        // Update the specific key in the config content
        const regex = new RegExp(`(${key}:\\s*["'])([^"']*)(["'])`, 'g');
        configContent = configContent.replace(regex, `$1${value}$3`);
        
        fs.writeFileSync(configPath, configContent, 'utf8');
        
        // Manually update the in-memory config
        config[key] = value;
        
        return true;
    } catch (error) {
        console.error('Error updating config:', error);
        return false;
    }
}

// Alya Control Plugin (requires prefix)
bot(
    {
        name: "alya",
        info: "Controls the Alya smart assistant",
        category: "System",
        usage: "alya [on|off]"
    },
    async (message, bot) => {
        const command = message.args[0]?.toLowerCase();
        
        if (command === 'on' || command === 'off') {
            if (!isOwner(message.sender)) {
                return await message.send("❌ Only the owner can control Alya.", { fromMe: true, skipAlya: true });
            }
            
            const success = updateConfig('CHAT_BOT', command === 'on' ? 'true' : 'false');
            if (success) {
                await message.send(`✅ Alya chatbot has been turned ${command}.`, { fromMe: true, skipAlya: true });
            } else {
                await message.send("❌ Failed to update Alya status.", { fromMe: true, skipAlya: true });
            }
        } else {
            await message.send(
                `Alya Control\n\n` +
                `Usage:\n` +
                `${config.PREFIX}alya on - Enable Alya chatbot\n` +
                `${config.PREFIX}alya off - Disable Alya chatbot`,
                { fromMe: true, skipAlya: true }
            );
        }
    }
);

// Alya Listener (no prefix, activates when enabled)
bot(
    {
        on: 'text',
        name: "alya-listener",
        ignoreRestrictions: true
    },
    async (message, bot) => {
        try {
            // Skip processing if:
            // - This message should be ignored by Alya
            // - Message is from the bot itself
            // - Chatbot is disabled in config
            if (message.skipAlya || message.isBot || config.CHAT_BOT !== "true") return;

            let fullText = (message.content || message.text || '').trim().toLowerCase();
            
            // Check if owner says "alya"
            if (message.isOwner(message.sender) && fullText === 'alya') {
                return await message.send(`Yes ${message.pushName || 'Master'}, how can I help you?`, { 
                    fromMe: true, 
                    skipAlya: true 
                });
            }
            
            // Check if message is directed to Alya
            const isReplyToAlya = message.quoted?.fromMe;
            const isDirectMessage = fullText.startsWith('alya') || fullText.startsWith(config.BOT_NAME.toLowerCase());
            
            if (!isReplyToAlya && !isDirectMessage) return;
            
            // Extract query
            let query = fullText;
            if (isDirectMessage) {
                query = query.replace(/^alya\s*/i, '')
                             .replace(new RegExp(`^${config.BOT_NAME.toLowerCase()}\\s*`, 'i'), '')
                             .trim();
            }
            
            if (!query) {
                return await message.send("How can I help you?", { fromMe: true, skipAlya: true });
            }
            
            // Process with AI
            const reply = await ai.aigf(query, cleanJid(message.sender));
            await message.send(reply, { fromMe: true, skipAlya: true });
            
        } catch (error) {
            console.error('Error in alya listener:', error);
            await message.send("Sorry, I encountered an error processing your request.", { fromMe: true, skipAlya: true });
        }
    }
);