const bot = require("../lib/plugin");

bot(
  {
    name: 'antidelete',
    info: 'Toggle anti deletion on/off',
    category: "tools",
  },
  async (message, bot) => {
    const fs = require('fs');
    const path = require('path');
    const configPath = path.join(__dirname, '..', 'config.js');

    try {
      // Read the current config file
      let configContent = fs.readFileSync(configPath, 'utf8');

      if (message.query === 'on') {
        // Update DELETE to "true" in config.js
        configContent = configContent.replace(
          /DELETE: "(true|false)"/, 
          'DELETE: "true"'
        );
        fs.writeFileSync(configPath, configContent);
        await bot.reply('Anti deletion has been *enabled* ✅');
      } 
      else if (message.query === 'off') {
        // Update DELETE to "false" in config.js
        configContent = configContent.replace(
          /DELETE: "(true|false)"/, 
          'DELETE: "false"'
        );
        fs.writeFileSync(configPath, configContent);
        await bot.reply('Anti deletion has been *disabled* ❌');
      }
      else {
        // Extract current delete status
        const deleteMatch = configContent.match(/DELETE: "(true|false)"/);
        const currentStatus = deleteMatch ? deleteMatch[1] : 'false';
        const status = currentStatus === "true" ? 'enabled ✅' : 'disabled ❌';
        
        await bot.reply(`Anti deletion is currently *${status}*\n\nUsage:\n.antidelete on - Enable deletion\n.antidelete off - Disable deletion`);
      }
    } catch (error) {
      console.error('Error modifying config:', error);
      await bot.reply('Failed to update deletion configuration. Please check server logs.');
    }
  }
);

bot(
  {
    name: 'mode',
    info: 'Switch between public and private modes',
    category: "tools",
  },
  async (message, bot) => {
    const fs = require('fs');
    const path = require('path');
    const configPath = path.join(__dirname, '..', 'config.js');

    try {
      // Read the current config file
      let configContent = fs.readFileSync(configPath, 'utf8');

      if (message.query === 'public') {
        // Update MODE to "public" in config.js
        configContent = configContent.replace(
          /MODE: "(public|private)"/, 
          'MODE: "public"'
        );
        fs.writeFileSync(configPath, configContent);
        await bot.reply('Bot mode has been set to *public* 🌍');
      } 
      else if (message.query === 'private') {
        // Update MODE to "private" in config.js
        configContent = configContent.replace(
          /MODE: "(public|private)"/, 
          'MODE: "private"'
        );
        fs.writeFileSync(configPath, configContent);
        await bot.reply('Bot mode has been set to *private* 🔒');
      }
      else {
        // Extract current mode status
        const modeMatch = configContent.match(/MODE: "(public|private)"/);
        const currentMode = modeMatch ? modeMatch[1] : 'private';
        const status = currentMode === "public" ? 'public 🌍' : 'private 🔒';
        
        await bot.reply(`Bot is currently in *${status}* mode\n\nUsage:\n.mode public - Set to public mode\n.mode private - Set to private mode`);
      }
    } catch (error) {
      console.error('Error modifying config:', error);
      await bot.reply('Failed to update mode configuration. Please check server logs.');
    }
  }
);