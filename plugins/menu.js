const bot = require("../lib/plugin");
const config = require("../config");
const fancy = require("../lib/font/fancy");
const os = require('os');
const fs = require('fs');
const path = require('path');
const { generateWAMessageFromContent, proto, prepareWAMessageMedia } = require("baileys");
const { exec } = require("child_process");

// Get the plugin system instance at the top level
const pluginSystem = bot.system;

// Track when the bot started
const startTime = new Date();

// Cache for menu type to avoid frequent file reads
let menuTypeCache = config.MENUTYPE;
let lastConfigUpdate = Date.now();

// Watch for config file changes
const configPath = path.join(__dirname, '..', 'config.js');
fs.watchFile(configPath, { interval: 1000 }, (curr, prev) => {
    if (curr.mtime > prev.mtime) {
        // Clear the require cache for the config file
        delete require.cache[require.resolve(configPath)];
        
        // Reload the config
        const newConfig = require(configPath);
        menuTypeCache = newConfig.MENUTYPE;
        lastConfigUpdate = Date.now();
    }
});

// Function to detect deployment platform
function detectDeploymentPlatform() {
    const env = process.env;
    if (env.RENDER === 'true' || env.RENDER_EXTERNAL_URL) return 'Render';
    if (env.HEROKU) return 'Heroku';
    if (env.VERCEL || env.NOW_REGION) return 'Vercel';
    if (env.AWS_EXECUTION_ENV || env.EC2) return 'AWS (EC2)';
    if (env.HOSTNAME?.includes('railway')) return 'Railway';
    if (env.FLY_APP_NAME) return 'Fly.io';
    if (env.DETA_RUNTIME) return 'Deta';
    if (env.GLITCH && env.PROJECT_DOMAIN) return 'Glitch';
    return 'VPS';
}

// Function to format uptime
function getUptime() {
    const now = new Date();
    const uptimeMs = now - startTime;
    const seconds = Math.floor((uptimeMs / 1000) % 60);
    const minutes = Math.floor((uptimeMs / (1000 * 60)) % 60);
    const hours = Math.floor((uptimeMs / (1000 * 60 * 60)) % 24);
    const days = Math.floor(uptimeMs / (1000 * 60 * 60 * 24));
    const format = (num) => num.toString().padStart(2, '0');
    return days > 0 
        ? `${days}d ${format(hours)}:${format(minutes)}:${format(seconds)}` 
        : `${format(hours)}:${format(minutes)}:${format(seconds)}`;
}

bot(
    {
        name: "menu",
        info: "Show all available commands",
        category: "general"
    },
    async (message, bot) => {
        try {
            const currentTime = new Date();
            const hours = currentTime.getHours();
            let greeting = "";
            if (hours >= 5 && hours < 12) greeting = "🌸 *Good Morning* 🌸 - Time for a fresh start!";
            else if (hours >= 12 && hours < 18) greeting = "🌞 *Good Afternoon* 🌞 - Keep up the great work!";
            else if (hours >= 18 && hours < 22) greeting = "🌆 *Good Evening* 🌆 - Unwind and relax!";
            else greeting = "🌙 *Good Night* 🌙 - Rest and recharge!";

            const plugins = pluginSystem.getPlugins();
            const commandPlugins = plugins.commands.filter(cmd => cmd.name && cmd.name !== "menu");

            // Organize commands by category
            const categories = {};
            commandPlugins.forEach(cmd => {
                const category = cmd.category?.toLowerCase() || 'uncategorized';
                if (!categories[category]) categories[category] = [];
                categories[category].push({
                    name: cmd.name.charAt(0).toUpperCase() + cmd.name.slice(1),
                    info: cmd.info || 'No description available'
                });
            });

            // Sort categories and commands
            const sortedCategories = Object.keys(categories).sort((a, b) => a.localeCompare(b));
            for (const category of sortedCategories) {
                categories[category].sort((a, b) => a.name.localeCompare(b.name));
            }

            // Extract query from message text
            const query = message.text?.split(/\s+/)[1]?.toLowerCase();
            
            // Get menu type from cache
            const menuType = menuTypeCache;

            // Handle category-specific request
            if (query && categories[query]) {
                if (menuType === 'v2') {
                    // Build the caption with full menu structure
                    let menuText = `╭──❍「 *${config.BOT_NAME}* 」❍\n`;
                    menuText += `├ *Hi 👋*\n`;
                    menuText += `├ *${message.pushName || "User"}*\n`;
                    menuText += `├ ${greeting}\n`;
                    menuText += `├ *Plugins:* ${commandPlugins.length}\n`;
                    menuText += `├ *Date:* ${currentTime.toLocaleDateString()}\n`;
                    menuText += `├ *Time:* ${currentTime.toLocaleTimeString()}\n`;
                    menuText += `├ *Uptime:* ${getUptime()}\n`;
                    menuText += `├ *Platform:* ${detectDeploymentPlatform()}\n`;
                    menuText += `├ *Version:* v1.0.0\n`;
                    menuText += `├ *Mode:* ${config.MODE}\n`;
                    menuText += `├ *Menu Type:* ${menuType}\n`;
                    menuText += `╰─┬────❍\n`;
                    menuText += `╭─┴❍「 *${query.toUpperCase()}* 」❍\n`;
                    
                    categories[query].forEach(cmd => {
                        menuText += `├ ${fancy.getStyle(37, `${cmd.name}`)}\n`;
                    });
                    
                    menuText += `╰───────❍\n\n`;
                    menuText += `> *QUEEN ALYA*`;

                    // Create buttons for other categories
                    const buttons = [];
                    for (const category of sortedCategories) {
                        if (category !== query) {
                            buttons.push({
                                title: category.toUpperCase(),
                                description: `${categories[category].length} commands available`,
                                id: `${config.PREFIX}menu ${category}`
                            });
                        }
                    }

                    const msg = generateWAMessageFromContent(message.chat, {
                        viewOnceMessage: {
                            message: {
                                "messageContextInfo": {
                                    "deviceListMetadata": {},
                                    "deviceListMetadataVersion": 2
                                },
                                interactiveMessage: proto.Message.InteractiveMessage.create({
                                    body: proto.Message.InteractiveMessage.Body.create({
                                        text: menuText
                                    }),
                                    footer: proto.Message.InteractiveMessage.Footer.create({
                                        text: `© *KING XER*`
                                    }),
                                    header: proto.Message.InteractiveMessage.Header.create({
                                        ...(await prepareWAMessageMedia({ image: { url: "https://files.catbox.moe/55f24l.jpg" } }, { upload: bot.sock.waUploadToServer })),
                                        title: config.BOT_NAME,
                                        subtitle: `${query.toUpperCase()} Commands`,
                                        hasMediaAttachment: true
                                    }),
                                    nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.create({
                                        buttons: [
                                            {
                                                "name": "single_select",
                                                "buttonParamsJson": JSON.stringify({
                                                    "title": "Other Categories",
                                                    "sections": [{
                                                        "title": "Available Categories",
                                                        "rows": buttons
                                                    }]
                                                })
                                            }
                                        ]
                                    })
                                })
                            }
                        }
                    }, {});

                    return await bot.sock.relayMessage(msg.key.remoteJid, msg.message, { messageId: msg.key.id });
                } else {
                    // Original v1 category response
                    let menuText = `╭──❍「 *${config.BOT_NAME}* 」❍\n`;
                    menuText += `├ *Hi 👋*\n`;
                    menuText += `├ *${message.pushName || "User"}*\n`;
                    menuText += `├ ${greeting}\n`;
                    menuText += `├ *Mode:* ${config.MODE}\n`;
                    menuText += `├ *Menu Type:* ${menuType}\n`;
                    menuText += `╰─┬────❍\n`;
                    menuText += `╭─┴❍「 *${query.toUpperCase()}* 」❍\n`;
                    
                    categories[query].forEach(cmd => {
                        menuText += `├ ${fancy.getStyle(37, `${cmd.name}`)}\n`;
                    });
                    
                    menuText += `╰───────❍\n\n`;
                    menuText += `> *QUEEN ALYA*`;

                    return await bot.sock.sendMessage(message.chat, {
                        image: { url: "https://files.catbox.moe/55f24l.jpg" },
                        caption: menuText,
                        contextInfo: {
                            forwardingScore: 1,
                            isForwarded: true,
                            forwardedNewsletterMessageInfo: {
                                newsletterJid: "120363418404777886@newsletter",
                                newsletterName: config.BOT_NAME,
                            },
                        },
                    });
                }
            }

            // Full menu
            if (menuType === 'v2') {
                // Create buttons for each category
                const buttons = [];
                for (const category of sortedCategories) {
                    buttons.push({
                        title: category.toUpperCase(),
                        description: `${categories[category].length} commands available`,
                        id: `${config.PREFIX}menu ${category}`
                    });
                }

                const menuText = `╭──❍「 *${config.BOT_NAME}* 」❍\n` +
                    `├ *Hi 👋*\n` +
                    `├ *${message.pushName || "User"}*\n` +
                    `├ ${greeting}\n` +
                    `├ *Plugins:* ${commandPlugins.length}\n` +
                    `├ *Date:* ${currentTime.toLocaleDateString()}\n` +
                    `├ *Time:* ${currentTime.toLocaleTimeString()}\n` +
                    `├ *Uptime:* ${getUptime()}\n` +
                    `├ *Platform:* ${detectDeploymentPlatform()}\n` +
                    `├ *Version:* v1.0.0\n` +
                    `├ *Mode:* ${config.MODE}\n` +
                    `├ *Menu Type:* ${menuType}\n` +
                    `╰─┬────❍\n` +
                    `「 *MENU CATEGORIES BELOW* 」`;

                const msg = generateWAMessageFromContent(message.chat, {
                    viewOnceMessage: {
                        message: {
                            "messageContextInfo": {
                                "deviceListMetadata": {},
                                "deviceListMetadataVersion": 2
                            },
                            interactiveMessage: proto.Message.InteractiveMessage.create({
                                body: proto.Message.InteractiveMessage.Body.create({
                                    text: menuText
                                }),
                                footer: proto.Message.InteractiveMessage.Footer.create({
                                    text: `© *KING XER*`
                                }),
                                header: proto.Message.InteractiveMessage.Header.create({
                                    ...(await prepareWAMessageMedia({ image: { url: "https://files.catbox.moe/55f24l.jpg" } }, { upload: bot.sock.waUploadToServer })),
                                    title: config.BOT_NAME,
                                    subtitle: "Menu Categories",
                                    hasMediaAttachment: true
                                }),
                                nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.create({
                                    buttons: [
                                        {
                                            "name": "single_select",
                                            "buttonParamsJson": JSON.stringify({
                                                "title": "Menu Categories",
                                                "sections": [{
                                                    "title": "Available Categories",
                                                    "rows": buttons
                                                }]
                                            })
                                        }
                                    ]
                                })
                            })
                        }
                    }
                }, {});

                return await bot.sock.relayMessage(msg.key.remoteJid, msg.message, { messageId: msg.key.id });
            } else {
                // Original v1 full menu
                let menuText = `╭──❍「 *${config.BOT_NAME}* 」❍\n`;
                menuText += `├ *Hi 👋*\n`;
                menuText += `├ *${message.pushName || "User"}*\n`;
                menuText += `├ ${greeting}\n`;
                menuText += `├ *Plugins:* ${commandPlugins.length}\n`;
                menuText += `├ *Date:* ${currentTime.toLocaleDateString()}\n`;
                menuText += `├ *Time:* ${currentTime.toLocaleTimeString()}\n`;
                menuText += `├ *Uptime:* ${getUptime()}\n`;
                menuText += `├ *Platform:* ${detectDeploymentPlatform()}\n`;
                menuText += `├ *Version:* v1.0.0\n`;
                menuText += `├ *Mode:* ${config.MODE}\n`;
                menuText += `├ *Menu Type:* ${menuType}\n`;
                menuText += `╰─┬────❍\n`;
                menuText += `╭─┴❍「 *MENU CATEGORIES* 」❍\n\n`;

                for (const category of sortedCategories) {
                    menuText += `╭──❍「 *${category.toUpperCase()}* 」❍\n`;
                    categories[category].forEach(cmd => {
                        menuText += `├ ${fancy.getStyle(37, `${cmd.name}`)}\n`;
                    });
                    menuText += `╰───────❍\n`;
                }

                menuText += `\n> *QUEEN ALYA*`;
                await bot.sock.sendMessage(message.chat, {
                    image: { url: "https://files.catbox.moe/55f24l.jpg" },
                    caption: menuText,
                    contextInfo: {
                        forwardingScore: 1,
                        isForwarded: true,
                        forwardedNewsletterMessageInfo: {
                            newsletterJid: "120363418404777886@newsletter",
                            newsletterName: config.BOT_NAME,
                        },
                    },
                });
            }
        } catch (error) {
            console.error('Error showing menu:', error);
            await bot.reply(message, "❌ Failed to show menu. Please try again later.");
        }
    }
);

bot(
    {
        name: "menutype",
        info: "Change menu type between v1 and v2",
        category: "System",
        usage: "menutype v1 or menutype v2"
    },
    async (message, bot) => {
        try {
            const newType = message.query.trim().toLowerCase();
            
            if (newType !== "v1" && newType !== "v2") {
                return await bot.reply("❌ *Invalid menu type!*\nPlease use `menutype v1` or `menutype v2`");
            }

            // Read the config file
            const configContent = fs.readFileSync(configPath, 'utf8');
            
            // Update the MENUTYPE value in the file
            const updatedConfig = configContent.replace(
                /MENUTYPE: "v[12]"/, 
                `MENUTYPE: "${newType}"`
            );
            
            // Write the updated config back to the file
            fs.writeFileSync(configPath, updatedConfig);
            
            // Update the cache immediately
            menuTypeCache = newType;
            
            // Clear the require cache for the config module
            delete require.cache[require.resolve('../config')];
            
            // Force a reload of the config file
            const newConfig = require('../config');
            
            await bot.reply(`✅ Menu type changed to *${newType}*\nChanges will take effect immediately.`);
            
        } catch (err) {
            console.error("menutype command error:", err);
            await bot.reply("❌ *Error while trying to change menu type!*");
        }
    }
);