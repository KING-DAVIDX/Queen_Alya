const bot = require("../lib/plugin");
const plugins = require("../lib/plugin");
const fs = require('fs');
const path = require('path');
const config = require("../config");
const { serializeMessage } = require('../lib/serialize');

// Database for storing sticker commands
let stickerCommands = [];

// Load sticker commands from file
function loadStickerCommands() {
    try {
        const data = fs.readFileSync(path.join(__dirname, '../lib/json/sticker_commands.json'), 'utf-8');
        stickerCommands = JSON.parse(data);
    } catch (error) {
        if (error.code !== 'ENOENT') {
            console.error('Error loading sticker commands:', error);
        }
    }
}

// Save sticker commands to file
function saveStickerCommands() {
    fs.writeFileSync(
        path.join(__dirname, '../lib/json/sticker_commands.json'),
        JSON.stringify(stickerCommands, null, 2),
        'utf-8'
    );
}

// Initialize by loading saved commands
loadStickerCommands();

// 1. Setcmd - Assign a command to a sticker
bot(
    {
        name: "setcmd",
        info: "Assigns a command to a sticker",
        category: "System",
        usage: "setcmd [command name] (reply to a sticker)"
    },
    async (message, bot) => {
        const isOwner = await message.isOwner(message.sender);
        if (!isOwner) {
            return await bot.reply("❌ This command is only available to the bot owner.");
        }

        if (!message.quoted || !message.quoted.sticker) {
            return await bot.reply("❌ Please reply to a sticker to assign a command.");
        }

        const commandName = message.query?.trim().toLowerCase();
        if (!commandName) {
            return await bot.reply(
                `❌ Please specify a command name.\nUsage: ${config.PREFIX}setcmd [command name] (reply to sticker)`
            );
        }

        try {
            var hash = message.quoted.fileSha256 ? Buffer.from(message.quoted.fileSha256).toString('hex') : null;
            if (!hash) return await bot.reply("couldn't get stk hash");
            
            // Remove any existing command with this name or same hash
            stickerCommands = stickerCommands.filter(cmd => 
                cmd.name !== commandName && cmd.hash !== hash
            );
            
            const commandData = {
                name: commandName,
                hash: hash,
                createdAt: new Date().toISOString(),
                createdBy: message.sender
            };

            // Add the new command
            stickerCommands.push(commandData);
            saveStickerCommands();

            await bot.reply(`✅ Sticker command "${commandName}" has been set!\nHash: ${hash}`);

        } catch (error) {
            console.error("Error setting sticker command:", error);
            await bot.reply("❌ Failed to set sticker command. Please try again.");
        }
    }
);

// 2. Delcmd - Delete a sticker command
bot(
    {
        name: "delcmd",
        info: "Deletes a sticker command",
        category: "System",
        usage: "delcmd [command name]"
    },
    async (message, bot) => {
        const isOwner = await message.isOwner(message.sender);
        if (!isOwner) {
            return await bot.reply("❌ This command is only available to the bot owner.");
        }

        const commandName = message.query?.trim().toLowerCase();
        if (!commandName) {
            return await bot.reply(
                `❌ Please specify a command name to delete.\nUsage: ${config.PREFIX}delcmd [command name]`
            );
        }

        const initialLength = stickerCommands.length;
        stickerCommands = stickerCommands.filter(cmd => cmd.name !== commandName);
        
        if (stickerCommands.length === initialLength) {
            return await bot.reply(`❌ Command "${commandName}" doesn't exist.`);
        }

        saveStickerCommands();
        await bot.reply(`✅ Command "${commandName}" has been deleted.`);
    }
);

// 3. Listcmd - List all sticker commands
bot(
    {
        name: "listcmd",
        info: "Lists all sticker commands",
        category: "System",
        usage: "listcmd"
    },
    async (message, bot) => {
        const isOwner = await message.isOwner(message.sender);
        if (!isOwner) {
            return await bot.reply("❌ This command is only available to the bot owner.");
        }

        if (stickerCommands.length === 0) {
            return await bot.reply("ℹ️ No sticker commands have been set yet.");
        }

        let response = "📜 Sticker Commands List:\n\n";
        stickerCommands.forEach((cmd, index) => {
            response += `${index + 1}. ${config.PREFIX}${cmd.name}\n`;
            response += `   Hash: ${cmd.hash}\n`;
            response += `   Set by: ${cmd.createdBy.split('@')[0]}\n`;
            response += `   Date: ${new Date(cmd.createdAt).toLocaleString()}\n\n`;
        });

        await bot.reply(response);
    }
);

// 4. Sticker Command Listener - Handle sticker commands
bot(
    {
        on: 'sticker',
        name: "sticker-command-listener",
        ignoreRestrictions: true
    },
    async (message, bot) => {
        try {
            var hash = message.msg.fileSha256 ? Buffer.from(message.msg.fileSha256).toString('hex') : null;
            if (!hash) return;
            
            const matchedCommand = stickerCommands.find(cmd => cmd.hash === hash);
            if (!matchedCommand) return;
            
            const commandMessage = {
                ...message,
                raw: message.raw || message,
                text: `${config.PREFIX}${matchedCommand.name}`,
                content: `${config.PREFIX}${matchedCommand.name}`,
                command: matchedCommand.name,
                query: '',
                args: [],
                prefix: config.PREFIX,
                shouldProcess: true,
                shouldProcessCommand: true,
                skipAlya: true,
                isCommand: true,
                fromMe: false,
                isBot: false
            };
            
            bot._currentMessage = commandMessage;
            bot._proxyMessageContext();
            
            const plugin = plugins.system.plugins.get(matchedCommand.name);
            if (plugin) {
                await plugin.handler(commandMessage, bot);
            }
            
        } catch (error) {
            console.error('Error in sticker command listener:', error);
        }
    }
);