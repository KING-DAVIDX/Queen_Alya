const pluginSystem = require("../lib/plugin");  // This is actually the exportedBot function
const fs = require('fs');
const path = require('path');
const util = require('util');

// Temporary storage for installed plugins (in-memory only)
const installedPlugins = new Map();

// Plugin installation handler (=> prefix)
pluginSystem(
    {
        on: 'text',
        match: /^=>/,  // Match messages starting with =>
        description: "Installs a temporary plugin from code",
        usage: "=> <plugin code>"
    },
    async (message, bot) => {
        await bot.react("⏳");
        const fullText = message.content || message.text;
        const code = fullText.slice(2).trim();  // Remove the => prefix
        
        if (!code) {
            await bot.react("❌");
            return await bot.reply("Please provide plugin code to install after =>");
        }

        try {
            // Test if the code is a valid plugin
            const pluginModule = { exports: {} };
            const requireWrapper = (moduleName) => {
                if (moduleName === "../lib/plugin") return pluginSystem;
                return require(moduleName);
            };
            
            const fn = new Function('exports', 'require', 'module', code);
            fn(pluginModule.exports, requireWrapper, pluginModule);
            
            if (!pluginModule.exports.options || !pluginModule.exports.handler) {
                await bot.react("❌");
                return await bot.reply("Invalid plugin format. The code must export an object with 'options' and 'handler' properties.");
            }
            
            const pluginName = pluginModule.exports.options.name || 
                             (pluginModule.exports.options.on ? 
                              `${pluginModule.exports.options.on}_event` : 
                              'unnamed_plugin');
            
            // Check if plugin already exists
            const allPlugins = pluginSystem.getPlugins();
            const existingPlugin = [...allPlugins.commands, ...allPlugins.events].find(
                p => p.name === pluginName || 
                    (p.options && p.options.name === pluginName)
            );
            
            if (existingPlugin) {
                await bot.react("❌");
                return await bot.reply(`Plugin "${pluginName}" is already installed.`);
            }
            
            // Register the plugin using the plugin system directly
            const added = pluginSystem(pluginModule.exports.options, pluginModule.exports.handler);  // Changed from pluginSystem.bot() to pluginSystem()
            
            if (added) {
                installedPlugins.set(pluginName, code);
                await bot.react("✅");
                await bot.reply(`Temporary plugin "${pluginName}" installed!`);
            } else {
                await bot.react("❌");
                await bot.reply(`Failed to install plugin "${pluginName}".`);
            }
        } catch (error) {
            await bot.react("❌");
            await bot.reply(`⚠️ Plugin Installation Error: ${error.message}`);
        }
    }
);

pluginSystem(
    {
        on: 'text',
        match: /^=</,  // Match messages starting with =<
        description: "Uninstalls a temporary plugin",
        usage: "=< plugin_name"
    },
    async (message, bot) => {
        await bot.react("⏳");
        const fullText = message.content || message.text;
        const pluginName = fullText.slice(2).trim();  // Remove the =< prefix
        
        if (!pluginName) {
            await bot.react("❌");
            return await bot.reply("Please provide a plugin name to uninstall after =<");
        }

        // Check if it's an installed temporary plugin
        if (!installedPlugins.has(pluginName)) {
            await bot.react("❌");
            return await bot.reply(`"${pluginName}" is not a temporary plugin or doesn't exist.`);
        }
        
        // Note: We can't actually unload the plugin from memory due to Node.js limitations
        // But we can remove it from our tracking
        installedPlugins.delete(pluginName);
        await bot.react("✅");
        await bot.reply(`Temporary plugin "${pluginName}" removed`);
    }
);

// List temporary plugins handler
pluginSystem(
    {
        on: 'text',
        match: /^=\?/,  // Match messages starting with =?
        description: "Lists temporary plugins",
        usage: "=?"
    },
    async (message, bot) => {
        await bot.react("ℹ️");
        if (installedPlugins.size === 0) {
            return await bot.reply("No temporary plugins are currently installed.");
        }
        
        const pluginList = Array.from(installedPlugins.keys()).join('\n• ');
        await bot.reply(`Temporary plugins:\n• ${pluginList}`);
    }
);