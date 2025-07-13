const plugins = require("../lib/plugin");
const bot = require("../lib/plugin");
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

// Simplified sticker ID generation using fileSha256
function generateStickerId(stickerMessage) {
    if (!stickerMessage?.fileSha256) return null;
    return Buffer.from(stickerMessage.fileSha256).toString('hex');
}

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
            const stickerMsg = message.quoted.sticker || message.quoted.fakeObj?.message?.stickerMessage;
            if (!stickerMsg) {
                return await bot.reply("❌ Could not retrieve sticker metadata.");
            }

            const stickerId = generateStickerId(stickerMsg);
            if (!stickerId) {
                return await bot.reply("❌ Failed to generate sticker ID (missing fileSha256).");
            }
            
            // Remove any existing command with this name or same sticker
            stickerCommands = stickerCommands.filter(cmd => 
                cmd.name !== commandName && cmd.stickerId !== stickerId
            );
            
            const commandData = {
                name: commandName,
                stickerId: stickerId,
                createdAt: new Date().toISOString(),
                createdBy: message.sender
            };

            stickerCommands.push(commandData);
            saveStickerCommands();

            await bot.reply(`✅ Sticker command "${commandName}" has been set!\nSticker ID: ${stickerId}`);

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
            response += `${index + 1}. ${config.PREFIX}${cmd.name} (${cmd.isAnimated ? 'Animated' : 'Static'})\n`;
            response += `   ID: ${cmd.stickerId}\n`;
            response += `   Set by: ${cmd.createdBy.split('@')[0]}\n`;
            response += `   Date: ${new Date(cmd.createdAt).toLocaleString()}\n\n`;
        });

        await bot.reply(response);
    }
);

bot(
    {
        on: 'sticker',
        name: "sticker-command-listener",
        ignoreRestrictions: true
    },
    async (message, bot) => {
        try {
            let stickerMsg = message.sticker;
            if (!stickerMsg) {
                const serializedMsg = await serializeMessage(message.fakeObj, bot.sock);
                stickerMsg = serializedMsg?.sticker;
            }

            if (!stickerMsg) return;
            
            const stickerId = generateStickerId(stickerMsg);
            if (!stickerId) return;
            
            const matchedCommand = stickerCommands.find(cmd => cmd.stickerId === stickerId);
            if (!matchedCommand) return;
            
            // Create command message
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
            
            // Execute the command
            await bot.plugins.system.handleMessage(commandMessage, bot);
            
        } catch (error) {
            console.error('Error in sticker command listener:', error);
        }
    }
);