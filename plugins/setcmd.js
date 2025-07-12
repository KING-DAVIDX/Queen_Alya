const bot = require("../lib/plugin");
const plugins = require("../lib/plugin");
const fs = require('fs');
const path = require('path');
const config = require("../config");
const crypto = require('crypto');
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

// Helper function to convert Uint8Array to hex string
function bufferToHex(buffer) {
    if (!buffer) return null;
    return Buffer.from(buffer).toString('hex');
}

// Helper function to generate consistent sticker ID
function generateStickerId(stickerMessage) {
    if (!stickerMessage) return null;
    
    const hash = crypto.createHash('sha256');
    
    // Include all identifying properties in the hash
    if (stickerMessage.fileSha256) hash.update(bufferToHex(stickerMessage.fileSha256));
    if (stickerMessage.mediaKey) hash.update(bufferToHex(stickerMessage.mediaKey));
    if (stickerMessage.url) hash.update(stickerMessage.url);
    if (stickerMessage.directPath) hash.update(stickerMessage.directPath);
    if (stickerMessage.stickerSentTs) hash.update(stickerMessage.stickerSentTs.toString());
    
    return hash.digest('hex');
}

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
            // Get the raw sticker message
            const stickerMsg = message.quoted.fakeObj?.message?.stickerMessage;
            if (!stickerMsg) {
                return await bot.reply("❌ Could not retrieve sticker metadata.");
            }

            const stickerId = generateStickerId(stickerMsg);
            if (!stickerId) {
                return await bot.reply("❌ Failed to generate unique sticker ID.");
            }
            
            // Remove any existing command with this name or same sticker
            stickerCommands = stickerCommands.filter(cmd => 
                cmd.name !== commandName && cmd.stickerId !== stickerId
            );
            
            const stickerData = {
                name: commandName,
                stickerId: stickerId,
                fileSha256: bufferToHex(stickerMsg.fileSha256),
                mediaKey: bufferToHex(stickerMsg.mediaKey),
                url: stickerMsg.url,
                directPath: stickerMsg.directPath,
                isAnimated: stickerMsg.isAnimated || false,
                createdAt: new Date().toISOString(),
                createdBy: message.sender
            };

            // Add the new command
            stickerCommands.push(stickerData);
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

// 4. Sticker Command Listener - Handle sticker commands
// 4. Sticker Command Listener - Handle sticker commands
bot(
    {
        on: 'sticker',
        name: "sticker-command-listener",
        ignoreRestrictions: true
    },
    async (message, bot) => {
        try {
            // Debug: Log incoming message
            await bot.reply("🔹 Received sticker message");
            
            // Skip if message is from bot itself or not a sticker
            if (message.isBot) {
                await bot.reply("🔹 Skipping: Message is from bot");
                return;
            }
            
            if (!message.fakeObj?.message?.stickerMessage) {
                await bot.reply("🔹 Skipping: Not a sticker message");
                return;
            }
            
            const stickerMsg = message.fakeObj.message.stickerMessage;
            
            // Debug: Show sticker properties
            await bot.reply(
                `🔹 Sticker Properties:\n` +
                `- fileSha256: ${bufferToHex(stickerMsg.fileSha256) || 'null'}\n` +
                `- mediaKey: ${bufferToHex(stickerMsg.mediaKey) || 'null'}\n` +
                `- url: ${stickerMsg.url || 'null'}\n` +
                `- directPath: ${stickerMsg.directPath || 'null'}\n` +
                `- isAnimated: ${stickerMsg.isAnimated || false}\n` +
                `- stickerSentTs: ${stickerMsg.stickerSentTs || 'null'}`,
                { fromMe: true, skipAlya: true }
            );
            
            // Generate unique ID for the sticker
            const stickerId = generateStickerId(stickerMsg);
            if (!stickerId) {
                await bot.reply("❌ Failed to generate sticker ID");
                return;
            }
            
            await bot.reply(`🔹 Generated Sticker ID: ${stickerId}`);
            
            // Find matching command
            const matchedCommand = stickerCommands.find(cmd => cmd.stickerId === stickerId);
            
            if (!matchedCommand) {
                await bot.reply("🔹 No command found for this sticker ID");
                return;
            }
            
            await bot.reply(
                `🔹 Matched Command:\n` +
                `- Name: ${matchedCommand.name}\n` +
                `- Sticker ID: ${matchedCommand.stickerId}\n` +
                `- Created By: ${matchedCommand.createdBy}`,
                { fromMe: true, skipAlya: true }
            );
            
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
            
            await bot.reply(
                `🔹 Created Command Message:\n` +
                `- Text: ${commandMessage.text}\n` +
                `- Command: ${commandMessage.command}\n` +
                `- isCommand: ${commandMessage.isCommand}`,
                { fromMe: true, skipAlya: true }
            );
            
            // Execute the command
            await bot.reply(`🔹 Executing command: ${config.PREFIX}${matchedCommand.name}`);
            await plugins.system.handleMessage(commandMessage, bot);
            
        } catch (error) {
            await bot.reply(
                `❌ Sticker Command Error:\n${error.message}\n\nStack:\n${error.stack}`);
            console.error('Error in sticker command listener:', error);
        }
    }
);