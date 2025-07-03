const fs = require('fs');
const path = require('path');
const bot = require("../lib/plugin");

// Plugin: Command Finder
bot(
  {
    name: "findcmd",
    info: "Find information about a specific command (location and details)",
    category: "Utility",
    usage: "findcmd <command_name>"
  },
  async (message, bot) => {
    try {
      const query = message.query;
      if (!query) {
        return await bot.reply("Please specify a command to search for. Example: *findcmd ping*");
      }

      // Search for the command in plugins directory only
     const pluginsDir = __dirname;
      const commandInfo = await findCommandInfo(query.toLowerCase(), pluginsDir);
      
      if (!commandInfo) {
        return await bot.reply(`❌ Command *${query}* not found in plugins directory.`);
      }

      // Format the response
      let response = `🔍 *Command Found: ${commandInfo.name}*\n\n`;
      response += `📝 *Info:* ${commandInfo.info || 'No description available'}\n`;
      response += `📂 *Category:* ${commandInfo.category || 'Uncategorized'}\n`;
      response += `📌 *File:* ${commandInfo.fileName}\n`;
      
      if (commandInfo.usage) {
        response += `\n💡 *Usage:* ${commandInfo.usage}\n`;
      }

      await bot.reply(response);
      
    } catch (error) {
      console.error('Error finding command:', error);
      await bot.reply("❌ Error finding command. Check console for details.");
    }
  }
);

// Helper function to find command info in plugins directory
async function findCommandInfo(cmdName, pluginsDir) {
  try {
    const pluginFiles = fs.readdirSync(pluginsDir)
      .filter(file => file.endsWith('.js') && file !== 'find.js'); // Skip own file
    
    for (const file of pluginFiles) {
      const filePath = path.join(pluginsDir, file);
      const content = fs.readFileSync(filePath, 'utf-8');
      
      // Extract plugin definition
      const pluginMatch = content.match(/bot\(\s*{([^}]+)}/s); // 's' flag for multiline match
      if (!pluginMatch) continue;

      try {
        const pluginObj = (new Function(`return (${pluginMatch[0]})`))();
        if (pluginObj && pluginObj.name && pluginObj.name.toLowerCase() === cmdName) {
          return {
            name: pluginObj.name,
            info: pluginObj.info,
            category: pluginObj.category,
            usage: pluginObj.usage,
            fileName: file
          };
        }
      } catch (e) {
        console.error(`Error parsing plugin in ${file}:`, e);
        continue;
      }
    }
  } catch (err) {
    console.error('Error reading plugins directory:', err);
  }
  return null;
}