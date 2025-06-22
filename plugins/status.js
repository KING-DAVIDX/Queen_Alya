const bot = require("../lib/plugin");
const { downloadContentFromMessage, jidNormalizedUser } = require("baileys");
const fs = require('fs');
const path = require('path');
const config = require('../config');
const configPath = path.join(__dirname, '..', 'config.js');
const { serializeMessage, normalizeJid } = require('../lib/serialize');

// Helper function to convert string to boolean
function toBoolean(str) {
    return str === "true" || str === true;
}

// Initialize config objects
let autoStatusConfig = {
    currentMode: toBoolean(config.AUTO_STATUS) ? "react" : "off",
    reactEmoji: config.AUTO_STATUS_EMOJI || "✨"
};

// File watcher setup
let configWatcher;

function setupConfigWatcher() {
    if (configWatcher) {
        configWatcher.close();
    }

    configWatcher = fs.watch(configPath, (eventType) => {
        if (eventType === 'change') {
            // Clear require cache and reload config
            delete require.cache[require.resolve(configPath)];
            const newConfig = require(configPath);
            
            // Update configs
            autoStatusConfig.currentMode = toBoolean(newConfig.AUTO_STATUS) ? "react" : "off";
            autoStatusConfig.reactEmoji = newConfig.AUTO_STATUS_EMOJI || "✨";
            
        }
    });
}

// Initialize watcher
setupConfigWatcher();

// Function to update config file
async function updateConfig(updates) {
    try {
        // Read current config
        let configContent = fs.readFileSync(configPath, 'utf8');
        
        // Apply updates
        for (const [key, value] of Object.entries(updates)) {
            // Handle different patterns for different keys
            let regex;
            if (key === 'AUTO_STATUS') {
                regex = new RegExp(`(${key}:\\s*")([^"]*)(")`);
            } else if (key === 'AUTO_STATUS_EMOJI') {
                regex = new RegExp(`(${key}:\\s*")([^"]*)(")`);
            }
            
            if (regex) {
                if (!regex.test(configContent)) {
                    // If the key doesn't exist, add it to the config object
                    const configObj = require(configPath);
                    configObj[key] = value;
                    configContent = `const config = ${JSON.stringify(configObj, null, 2)};\n\nmodule.exports = config;`;
                } else {
                    configContent = configContent.replace(regex, `$1${value}$3`);
                }
            }
        }
        
        // Write back to file
        fs.writeFileSync(configPath, configContent, 'utf8');
        
        // Manually update our configs since we're the ones making changes
        for (const [key, value] of Object.entries(updates)) {
            if (key === 'AUTO_STATUS') {
                autoStatusConfig.currentMode = toBoolean(value) ? "react" : "off";
            }
            if (key === 'AUTO_STATUS_EMOJI') {
                autoStatusConfig.reactEmoji = value;
            }
        }
        
        // Clear cache and reload config
        delete require.cache[require.resolve(configPath)];
        require(configPath);
        
        return true;
    } catch (error) {
        console.error('Error updating config:', error);
        return false;
    }
}

// Status update handler for AutoStatus
bot(
    {
        on: 'status',
        name: "autostatus",
        ignoreRestrictions: true
    },
    async (message, bot) => {
        try {
            if (!message.key || !message.key.remoteJid) return;
            const botJid = jidNormalizedUser(bot.sock.user.id);

            switch (autoStatusConfig.currentMode) {
                case "on":
                    await bot.sock.readMessages([message.key]);
                    break;
                    
                case "react":
                    await bot.sock.readMessages([message.key]);
                    await bot.sock.sendMessage(
                        message.key.remoteJid,
                        {
                            react: {
                                text: autoStatusConfig.reactEmoji,
                                key: message.key
                            }
                        },
                        {
                            statusJidList: [message.key.participant || message.key.remoteJid, botJid]
                        }
                    );
                    break;
            }
        } catch (error) {
            console.error('AutoStatus error:', error);
        }
    }
);

// Command handler for AutoStatus
bot(
    {
        pattern: "autostatus",
        name: "autostatus",
        info: "Control status viewing and reactions",
        category: "status",
        usage: [
            "autostatus on - View statuses",
            "autostatus react - View and react",
            "autostatus off - Disable",
            "autostatus emoji <emoji> - Change reaction emoji"
        ]
    },
    async (message, bot) => {
        const [command, ...args] = message.query?.toLowerCase().split(' ') || [];
        
        // Handle emoji change
        if (command === 'emoji' && args.length > 0) {
            const newEmoji = args[0].trim();
            const success = await updateConfig({ AUTO_STATUS_EMOJI: newEmoji });
            
            if (success) {
                return bot.reply(`✅ Reaction emoji updated to: ${newEmoji}`);
            } else {
                return bot.reply('❌ Failed to update emoji. Check console for errors.');
            }
        }
        
        // Handle mode changes
        const validModes = ["on", "react", "off"];
        if (validModes.includes(command)) {
            const updates = {
                AUTO_STATUS: command !== 'off' ? "true" : "false"
            };
            
            if (command === 'react') {
                updates.AUTO_STATUS_EMOJI = autoStatusConfig.reactEmoji;
            }
            
            const success = await updateConfig(updates);
            
            if (success) {
                let replyText = `🔄 AutoStatus set to: *${command}*\n\n`;
                replyText += `• Viewing: ${command !== 'off' ? '✅' : '❌'}\n`;
                replyText += `• Reacting: ${command === 'react' ? '✅' : '❌'}`;
                
                if (command === 'react') {
                    replyText += `\n• Emoji: ${autoStatusConfig.reactEmoji}`;
                }
                
                return bot.reply(replyText);
            } else {
                return bot.reply('❌ Failed to update AutoStatus. Check console for errors.');
            }
        }

        // Show current status if no valid command specified
        let replyText = `📱 *AutoStatus*\n\n`;
        replyText += `Current Mode: *${autoStatusConfig.currentMode}*\n`;
        replyText += `Current Emoji: ${autoStatusConfig.reactEmoji}\n\n`;
        replyText += `⚙️ *Commands:*\n`;
        replyText += `• \`autostatus on\` - View statuses\n`;
        replyText += `• \`autostatus react\` - View + react\n`;
        replyText += `• \`autostatus off\` - Disable\n`;
        replyText += `• \`autostatus emoji <emoji>\` - Change reaction emoji`;
        
        return bot.reply(replyText);
    }
);

// Media save handler for owner
bot(
    {
        on: 'text',
        fromMe: true,  // Only process messages sent by the bot owner
        match: /^send$/i,  // Only trigger on the exact word "send" (case insensitive)
        description: "Saves replied media and sends back to owner"
    },
    async (message, bot) => {
        // Only process if the message is a reply
        if (!message.quoted) return;

        // Serialize the quoted message first
        const serializedQuoted = await serializeMessage(message.quoted.fakeObj, bot.sock);
        if (!serializedQuoted) return;

        // Check media type from serialized message
        let mediaType = null;
        if (serializedQuoted.image) mediaType = 'image';
        else if (serializedQuoted.video) mediaType = 'video';
        else if (serializedQuoted.audio) mediaType = 'audio';
        else if (serializedQuoted.sticker) mediaType = 'sticker';
        else if (serializedQuoted.document) mediaType = 'document';
        
        if (!mediaType) return;

        try {
            // Get clean owner JID (remove any suffix after @)
            const botJid = normalizeJid(bot.sock.user.id);
            const ownerJid = config.OWNER_NUMBER ? `${config.OWNER_NUMBER}@s.whatsapp.net` : null;
            
            // Download the media buffer
            const downloadStream = await downloadContentFromMessage(
                message.quoted,
                mediaType
            );
            
            let buffer = Buffer.from([]);
            for await (const chunk of downloadStream) {
                buffer = Buffer.concat([buffer, chunk]);
            }

            // Send to both bot and owner
            const recipients = [botJid];
            if (ownerJid) recipients.push(ownerJid);

            for (const recipient of recipients) {
                await bot.sock.sendMessage(
                    recipient,
                    {
                        [mediaType]: buffer,
                        caption: `Saved ${mediaType} from status`
                    }
                );
            }

        } catch (error) {
            console.error("Media save error:", error);
            // Notify owner of failure
            const botJid = normalizeJid(bot.sock.user.id);
            const ownerJid = config.OWNER_NUMBER ? `${config.OWNER_NUMBER}@s.whatsapp.net` : null;
            
            if (ownerJid) {
                await bot.sock.sendMessage(
                    ownerJid,
                    { text: `Failed to save media: ${error.message}` }
                );
            }
            await bot.sock.sendMessage(
                botJid,
                { text: `Failed to save media: ${error.message}` }
            );
        }
    }
);

bot(
  {
    name: 'sstatus',
    info: 'Manage status auto-save settings',
    category: "status",
  },
  async (message, bot) => {
    const fs = require('fs');
    const path = require('path');
    const configPath = path.join(__dirname, '..', 'config.js');

    try {
      // Read the current config file
      let configContent = fs.readFileSync(configPath, 'utf8');

      if (message.query === 'off') {
        // Update AUTO_SAVE_STATUS to false
        configContent = configContent.replace(
          /AUTO_SAVE_STATUS: "(true|false)"/, 
          'AUTO_SAVE_STATUS: "false"'
        );
        fs.writeFileSync(configPath, configContent);
        await bot.reply('Status auto-save has been turned *OFF* ⚠️');
      } 
      else if (message.query === 'on') {
        // Update AUTO_SAVE_STATUS to true
        configContent = configContent.replace(
          /AUTO_SAVE_STATUS: "(true|false)"/, 
          'AUTO_SAVE_STATUS: "true"'
        );
        fs.writeFileSync(configPath, configContent);
        await bot.reply('Status auto-save has been turned *ON* ✅');
      }
      else if (message.query.startsWith('view ')) {
        const action = message.query.substring(5).trim();
        
        if (action === 'clear') {
          // Clear all numbers from SAVE_STATUS_FROM
          configContent = configContent.replace(
            /SAVE_STATUS_FROM: "[^"]*"/, 
            'SAVE_STATUS_FROM: ""'
          );
          fs.writeFileSync(configPath, configContent);
          await bot.reply('All numbers have been removed from status auto-save list 🗑️');
        } else {
          // Extract current numbers
          const numbersMatch = configContent.match(/SAVE_STATUS_FROM: "([^"]*)"/);
          let currentNumbers = numbersMatch ? numbersMatch[1].split(',') : [];
          
          // Add new numbers (remove duplicates)
          const newNumbers = action.split(',').map(num => num.trim()).filter(num => num);
          newNumbers.forEach(num => {
            if (!currentNumbers.includes(num)) {
              currentNumbers.push(num);
            }
          });
          
          // Update config
          configContent = configContent.replace(
            /SAVE_STATUS_FROM: "[^"]*"/, 
            `SAVE_STATUS_FROM: "${currentNumbers.join(',')}"`
          );
          fs.writeFileSync(configPath, configContent);
          
          await bot.reply(`Added numbers to status auto-save list: ${newNumbers.join(', ')}\n\nCurrent list: ${currentNumbers.join(', ')}`);
        }
      }
      else {
        // Show current status
        const statusMatch = configContent.match(/AUTO_SAVE_STATUS: "(true|false)"/);
        const numbersMatch = configContent.match(/SAVE_STATUS_FROM: "([^"]*)"/);
        
        const currentStatus = statusMatch ? statusMatch[1] === 'true' ? 'ON ✅' : 'OFF ⚠️' : 'unknown';
        const currentNumbers = numbersMatch ? numbersMatch[1] || 'None' : 'None';
        
        await bot.reply(
          `Status Auto-Save Settings:\n\n` +
          `• Status: *${currentStatus}*\n` +
          `• Saved Numbers: ${currentNumbers}\n\n` +
          `Usage:\n` +
          `.sstatus on - Enable status auto-save\n` +
          `.sstatus off - Disable status auto-save\n` +
          `.sstatus view 234... - Add numbers to save list\n` +
          `.sstatus view clear - Clear all numbers from list`
        );
      }
    } catch (error) {
      console.error('Error modifying config:', error);
      await bot.reply('Failed to update status settings. Please check server logs.');
    }
  }
);

// Cleanup watcher on process exit
process.on('exit', () => {
    if (configWatcher) {
        configWatcher.close();
    }
});