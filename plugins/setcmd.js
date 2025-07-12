const bot = require("../lib/plugin");
const { downloadContentFromMessage } = require('baileys');
const fs = require('fs');
const path = require('path');
const config = require("../config");
const crypto = require('crypto');

// Database for storing sticker commands
const stickerCommands = new Map();

// Load sticker commands from file
function loadStickerCommands() {
    try {
        const data = fs.readFileSync(path.join(__dirname, '../lib/json/sticker_commands.json'), 'utf-8');
        const commands = JSON.parse(data);
        stickerCommands.clear();
        for (const [cmd, stickerData] of Object.entries(commands)) {
            stickerCommands.set(cmd, stickerData);
        }
    } catch (error) {
        if (error.code !== 'ENOENT') {
            console.error('Error loading sticker commands:', error);
        }
    }
}

// Save sticker commands to file
function saveStickerCommands() {
    const commands = {};
    stickerCommands.forEach((value, key) => {
        commands[key] = value;
    });
    
    fs.writeFileSync(
        path.join(__dirname, '../lib/json/sticker_commands.json'),
        JSON.stringify(commands, null, 2),
        'utf-8'
    );
}

// Initialize by loading saved commands
loadStickerCommands();

// Helper function to calculate SHA256 hash
async function getStickerHash(stickerMessage) {
    const downloadStream = await downloadContentFromMessage(stickerMessage, 'sticker');
    let buffer = Buffer.from([]);
    for await (const chunk of downloadStream) {
        buffer = Buffer.concat([buffer, chunk]);
    }
    return crypto.createHash('sha256').update(buffer).digest('hex');
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
            const fileSha256 = await getStickerHash(message.quoted);
            
            const stickerData = {
                name: commandName,
                fileSha256: fileSha256,
                isAnimated: message.quoted.isAnimated || false,
                createdAt: new Date().toISOString(),
                createdBy: message.sender
            };

            // Store the command
            stickerCommands.set(commandName, stickerData);
            saveStickerCommands();

            await bot.reply(`✅ Sticker command "${commandName}" has been set!`);

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

        if (!stickerCommands.has(commandName)) {
            return await bot.reply(`❌ Command "${commandName}" doesn't exist.`);
        }

        stickerCommands.delete(commandName);
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

        if (stickerCommands.size === 0) {
            return await bot.reply("ℹ️ No sticker commands have been set yet.");
        }

        let response = "📜 Sticker Commands List:\n\n";
        stickerCommands.forEach((data, cmd) => {
            response += `• ${config.PREFIX}${cmd} (${data.isAnimated ? 'Animated' : 'Static'})\n`;
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
            if (message.isBot) return;

            const fileSha256 = await getStickerHash(message);
            
            // Find matching command
            for (const [cmd, stickerData] of stickerCommands) {
                if (stickerData.fileSha256 === fileSha256) {
                    // Trigger the command
                    const commandMessage = {
                        ...message,
                        text: `${config.PREFIX}${cmd}`,
                        content: `${config.PREFIX}${cmd}`,
                        command: cmd,
                        args: [],
                        prefix: config.PREFIX
                    };
                    await bot.plugins.system.handleMessage(commandMessage, bot);
                    break;
                }
            }
        } catch (error) {
            console.error('Error in sticker command listener:', error);
        }
    }
);