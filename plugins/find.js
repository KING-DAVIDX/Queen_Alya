const fs = require('fs');
const path = require('path');
const bot = require("../lib/plugin");
const config = require("../config");

// Plugin: Command Finder
bot(
  {
    name: "findcmd",
    info: "Find detailed information about a specific command (location, category, usage)",
    category: "Utility",
    usage: "findcmd <command_name>",
    fromMe: false
  },
  async (message, bot) => {
    try {
      const query = message.query;
      if (!query) {
        return await bot.reply("Please specify a command to search for. Example: *findcmd ping*");
      }

      // Get all plugins from the bot's plugin system
      if (!bot.plugins || !Array.isArray(bot.plugins)) {
        return await bot.reply("❌ Plugin system not initialized. Try again later.");
      }
      
      // Filter out non-command plugins and the menu command
      const commandPlugins = bot.plugins.filter(
        cmd => cmd.name && typeof cmd.name === 'string' && cmd.name !== "menu"
      );
      
      // Find the command (case insensitive)
      const command = commandPlugins.find(
        cmd => cmd.name.toLowerCase() === query.toLowerCase()
      );

      if (!command) {
        return await bot.reply(`❌ Command *${query}* not found in available commands.`);
      }

      // Get additional file info
      const fileInfo = await getCommandFileInfo(command.name);
      
      // Format the response with all available information
      let response = `🔍 *Command Found: ${command.name}*\n\n`;
      response += `📝 *Info:* ${command.info || 'No description available'}\n`;
      response += `📂 *Category:* ${command.category || 'Uncategorized'}\n`;
      
      if (command.usage) {
        response += `💡 *Usage:* ${command.usage.replace(/{prefix}/g, config.PREFIX)}\n`;
      }
      
      if (command.fromMe !== undefined) {
        response += `🔐 *Admin Only:* ${command.fromMe ? 'Yes' : 'No'}\n`;
      }
      
      if (fileInfo) {
        response += `📌 *File:* ${fileInfo.fileName}\n`;
        if (fileInfo.location) {
          response += `📍 *Location:* ${fileInfo.location}\n`;
        }
      }
      
      // Add any additional fields that might exist
      const additionalFields = Object.keys(command).filter(
        key => !['name', 'info', 'category', 'usage', 'fromMe'].includes(key)
      );
      
      if (additionalFields.length > 0) {
        response += `\n⚙️ *Additional Info:*\n`;
        additionalFields.forEach(field => {
          response += `▸ *${field}:* ${command[field]}\n`;
        });
      }

      response += `\nUse *${config.PREFIX}menu ${command.category?.toLowerCase() || 'uncategorized'}* to see similar commands`;
      
      await bot.reply(response);
      
    } catch (error) {
      console.error('Error finding command:', error);
      await bot.reply("❌ Error finding command. Check console for details.");
    }
  }
);

// Helper function to get command file info
async function getCommandFileInfo(cmdName) {
  try {
    const pluginsDir = path.join(__dirname, '..', 'plugins');
    if (!fs.existsSync(pluginsDir)) {
      console.error('Plugins directory not found');
      return null;
    }

    const pluginFiles = fs.readdirSync(pluginsDir)
      .filter(file => file.endsWith('.js') && file !== 'find.js');
    
    for (const file of pluginFiles) {
      const filePath = path.join(pluginsDir, file);
      let content;
      
      try {
        content = fs.readFileSync(filePath, 'utf-8');
      } catch (e) {
        console.error(`Error reading file ${file}:`, e);
        continue;
      }
      
      // Extract plugin definition (improved regex)
      const pluginMatch = content.match(/bot\(\s*{([\s\S]*?)}\s*,\s*async\s*\(/);
      if (!pluginMatch) continue;

      try {
        // Safely evaluate the plugin object
        const pluginObj = Function(`return (${pluginMatch[0].replace(/,\s*async\s*\(/, '')})`)();
        if (pluginObj?.name?.toLowerCase() === cmdName.toLowerCase()) {
          return {
            fileName: file,
            location: `plugins/${file}`
          };
        }
      } catch (e) {
        console.error(`Error parsing plugin in ${file}:`, e);
        continue;
      }
    }
  } catch (err) {
    console.error('Error searching plugins:', err);
  }
  return null;
}