const config = require("../config");
const fs = require('fs');
const path = require('path');
const { generateWAMessageFromContent, proto, prepareWAMessageMedia } = require("baileys");
const os = require('os');
const fancy = require("../lib/font/fancy");

class MenuModule {
    constructor() {
        this.pluginSystem = null;
        this.sock = null;
        this.store = null;
        this.currentConfig = config;
        this.configPath = path.join(__dirname, '../config.js');
        this.mediaDir = path.join(__dirname, '../media');
        this.startTime = new Date();
        this.menuTypeCache = config.MENUTYPE;
        this.lastConfigUpdate = Date.now();
        this.ensureMediaDirsExist();
    }

    ensureMediaDirsExist() {
        if (!fs.existsSync(this.mediaDir)) {
            fs.mkdirSync(this.mediaDir, { recursive: true });
        }
        ['image', 'video'].forEach(subDir => {
            const dirPath = path.join(this.mediaDir, subDir);
            if (!fs.existsSync(dirPath)) {
                fs.mkdirSync(dirPath);
            }
        });
    }

    detectDeploymentPlatform() {
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

    getUptime() {
        const now = new Date();
        const uptimeMs = now - this.startTime;
        const seconds = Math.floor((uptimeMs / 1000) % 60);
        const minutes = Math.floor((uptimeMs / (1000 * 60)) % 60);
        const hours = Math.floor((uptimeMs / (1000 * 60 * 60)) % 24);
        const days = Math.floor(uptimeMs / (1000 * 60 * 60 * 24));
        const format = (num) => num.toString().padStart(2, '0');
        return days > 0 
            ? `${days}d ${format(hours)}:${format(minutes)}:${format(seconds)}` 
            : `${format(hours)}:${format(minutes)}:${format(seconds)}`;
    }

    getGreeting() {
        const hours = new Date().getHours();
        if (hours >= 5 && hours < 12) return "🌸 *Good Morning* 🌸 - Time for a fresh start!";
        if (hours >= 12 && hours < 18) return "🌞 *Good Afternoon* 🌞 - Keep up the great work!";
        if (hours >= 18 && hours < 22) return "🌆 *Good Evening* 🌆 - Unwind and relax!";
        return "🌙 *Good Night* 🌙 - Rest and recharge!";
    }

    getRandomMedia(type) {
        // First try to get from config.MENU_URLS
        if (config.MENU_URLS && config.MENU_URLS !== "false") {
            const urls = config.MENU_URLS.split(';').filter(url => url.trim());
            const filtered = urls.filter(url => 
                type === 'image' ? url.endsWith('.jpg') || url.endsWith('.png') :
                type === 'video' ? url.endsWith('.mp4') : false
            );
            if (filtered.length > 0) {
                return filtered[Math.floor(Math.random() * filtered.length)];
            }
        }

        // Fallback to local media files
        const mediaPath = path.join(this.mediaDir, type);
        if (fs.existsSync(mediaPath)) {
            const files = fs.readdirSync(mediaPath)
                .filter(file => 
                    type === 'image' ? file.endsWith('.jpg') || file.endsWith('.png') :
                    type === 'video' ? file.endsWith('.mp4') : false
                );
            if (files.length > 0) {
                const randomFile = files[Math.floor(Math.random() * files.length)];
                return path.join(mediaPath, randomFile);
            }
        }

        // Default fallback
        return type === 'image' ? 
            'https://files.catbox.moe/55f24l.jpg' : 
            'https://files.catbox.moe/55f24l.mp4';
    }

    async getFullMenuText(plugins, pushName) {
        const currentTime = new Date();
        const greeting = this.getGreeting();
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

        let menuText = `╭──❍「 *${config.BOT_NAME}* 」❍\n`;
        menuText += `├ *Hi 👋*\n`;
        menuText += `├ *${pushName || "User"}*\n`;
        menuText += `├ ${greeting}\n`;
        menuText += `├ *Plugins:* ${commandPlugins.length}\n`;
        menuText += `├ *Date:* ${currentTime.toLocaleDateString()}\n`;
        menuText += `├ *Time:* ${currentTime.toLocaleTimeString()}\n`;
        menuText += `├ *Uptime:* ${this.getUptime()}\n`;
        menuText += `├ *Platform:* ${this.detectDeploymentPlatform()}\n`;
        menuText += `├ *Version:* v1.0.0\n`;
        menuText += `├ *Mode:* ${config.MODE}\n`;
        menuText += `├ *Menu Type:* ${this.menuTypeCache}\n`;
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
        
        return {
            text: menuText,
            buttons: sortedCategories.map(category => ({
                title: category.toUpperCase(),
                description: `${categories[category].length} commands available`,
                id: `${config.PREFIX}menu ${category}`
            })),
            header: {
                title: config.BOT_NAME,
                subtitle: "Menu Categories"
            }
        };
    }

    async getMenuContent(plugins, query, pushName) {
        if (['v1', 'v3', 'v4', 'v5', 'v6', 'v7'].includes(this.menuTypeCache)) {
            return this.getFullMenuText(plugins, pushName);
        }

        const currentTime = new Date();
        const greeting = this.getGreeting();
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

        // Handle category-specific request
        if (query && categories[query]) {
            let menuText = `╭──❍「 *${config.BOT_NAME}* 」❍\n`;
            menuText += `├ *Hi 👋*\n`;
            menuText += `├ *${pushName || "User"}*\n`;
            menuText += `├ ${greeting}\n`;
            menuText += `├ *Plugins:* ${commandPlugins.length}\n`;
            menuText += `├ *Date:* ${currentTime.toLocaleDateString()}\n`;
            menuText += `├ *Time:* ${currentTime.toLocaleTimeString()}\n`;
            menuText += `├ *Uptime:* ${this.getUptime()}\n`;
            menuText += `├ *Platform:* ${this.detectDeploymentPlatform()}\n`;
            menuText += `├ *Version:* v1.0.0\n`;
            menuText += `├ *Mode:* ${config.MODE}\n`;
            menuText += `├ *Menu Type:* ${this.menuTypeCache}\n`;
            menuText += `╰─┬────❍\n`;
            menuText += `╭─┴❍「 *${query.toUpperCase()}* 」❍\n`;
            
            categories[query].forEach(cmd => {
                menuText += `├ ${fancy.getStyle(37, `${cmd.name}`)}\n`;
            });
            
            menuText += `╰───────❍\n\n`;
            menuText += `> *QUEEN ALYA*`;

            return {
                text: menuText,
                buttons: sortedCategories
                    .filter(cat => cat !== query)
                    .map(category => ({
                        title: category.toUpperCase(),
                        description: `${categories[category].length} commands available`,
                        id: `${config.PREFIX}menu ${category}`
                    })),
                header: {
                    title: config.BOT_NAME,
                    subtitle: `${query.toUpperCase()} Commands`
                }
            };
        }

        // Full menu
        let menuText = `╭──❍「 *${config.BOT_NAME}* 」❍\n`;
        menuText += `├ *Hi 👋*\n`;
        menuText += `├ *${pushName || "User"}*\n`;
        menuText += `├ ${greeting}\n`;
        menuText += `├ *Plugins:* ${commandPlugins.length}\n`;
        menuText += `├ *Date:* ${currentTime.toLocaleDateString()}\n`;
        menuText += `├ *Time:* ${currentTime.toLocaleTimeString()}\n`;
        menuText += `├ *Uptime:* ${this.getUptime()}\n`;
        menuText += `├ *Platform:* ${this.detectDeploymentPlatform()}\n`;
        menuText += `├ *Version:* v1.0.0\n`;
        menuText += `├ *Mode:* ${config.MODE}\n`;
        menuText += `├ *Menu Type:* ${this.menuTypeCache}\n`;
        menuText += `╰─┬────❍\n`;
        menuText += `「 *MENU CATEGORIES BELOW* 」`;

        return {
            text: menuText,
            buttons: sortedCategories.map(category => ({
                title: category.toUpperCase(),
                description: `${categories[category].length} commands available`,
                id: `${config.PREFIX}menu ${category}`
            })),
            header: {
                title: config.BOT_NAME,
                subtitle: "Menu Categories"
            }
        };
    }

    async sendV1Menu(message, menuContent) {
        const mediaType = Math.random() > 0.5 ? 'image' : 'video';
        const mediaUrl = this.getRandomMedia(mediaType);
        
        if (mediaType === 'image') {
            await this.sock.sendMessage(message.chat, {
                image: { url: mediaUrl },
                caption: menuContent.text,
                contextInfo: {
                    forwardingScore: 1,
                    isForwarded: true,
                    forwardedNewsletterMessageInfo: {
                        newsletterJid: "120363418404777886@newsletter",
                        newsletterName: config.BOT_NAME,
                    },
                },
            });
        } else {
            await this.sock.sendMessage(message.chat, {
                video: { url: mediaUrl },
                caption: menuContent.text,
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
        await this.sock.sendMessage(message.chat, { react: { text: '📃', key: message.key } });
    }

    async sendV2Menu(message, menuContent) {
        const imageUrl = this.getRandomMedia('image');
        const msg = generateWAMessageFromContent(message.chat, {
            viewOnceMessage: {
                message: {
                    messageContextInfo: {
                        deviceListMetadata: {},
                        deviceListMetadataVersion: 2
                    },
                    interactiveMessage: proto.Message.InteractiveMessage.create({
                        body: proto.Message.InteractiveMessage.Body.create({ 
                            text: menuContent.text 
                        }),
                        footer: proto.Message.InteractiveMessage.Footer.create({ 
                            text: `© *KING XER*` 
                        }),
                        header: proto.Message.InteractiveMessage.Header.create({
                            ...(await prepareWAMessageMedia(
                                { image: { url: imageUrl } },
                                { upload: this.sock.waUploadToServer }
                            )),
                            title: menuContent.header.title,
                            subtitle: menuContent.header.subtitle,
                            hasMediaAttachment: true
                        }),
                        nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.create({
                            buttons: [{
                                name: "single_select",
                                buttonParamsJson: JSON.stringify({
                                    title: "Menu Categories",
                                    sections: [{
                                        title: "Available Categories",
                                        rows: menuContent.buttons
                                    }]
                                })
                            }]
                        })
                    })
                }
            }
        }, {});

        await this.sock.relayMessage(msg.key.remoteJid, msg.message, { messageId: msg.key.id });
        await this.sock.sendMessage(message.chat, { react: { text: '📃', key: message.key } });
    }

    async sendV3Menu(message, menuContent) {
        const mediaType = Math.random() > 0.5 ? 'image' : 'video';
        const mediaUrl = this.getRandomMedia(mediaType);
        
        if (mediaType === 'image') {
            await this.sock.sendMessage(message.chat, {
                image: { url: mediaUrl },
                caption: menuContent.text,
                contextInfo: {
                    forwardingScore: 1,
                    isForwarded: true
                }
            });
        } else {
            await this.sock.sendMessage(message.chat, {
                video: { url: mediaUrl },
                caption: menuContent.text,
                contextInfo: {
                    forwardingScore: 1,
                    isForwarded: true
                }
            });
        }
        await this.sock.sendMessage(message.chat, { react: { text: '📃', key: message.key } });
    }

    async sendV4Menu(message, menuContent) {
        const mediaType = Math.random() > 0.5 ? 'image' : 'video';
        const mediaUrl = this.getRandomMedia(mediaType);
        
        await this.sock.relayMessage(message.chat, {
            requestPaymentMessage: {
                currencyCodeIso4217: 'INR',
                amount1000: '9999999900',
                requestFrom: message.sender,
                noteMessage: {
                    extendedTextMessage: {
                        text: menuContent.text,
                        contextInfo: {
                            externalAdReply: {
                                showAdAttribution: true,
                                thumbnailUrl: mediaType === 'image' ? mediaUrl : this.getRandomMedia('image')
                            }
                        }
                    }
                }
            }
        }, {});
        await this.sock.sendMessage(message.chat, { react: { text: '📃', key: message.key } });
    }

    async sendV5Menu(message, menuContent) {
        const mediaType = Math.random() > 0.5 ? 'image' : 'video';
        const mediaUrl = this.getRandomMedia(mediaType);
        const thumbnailUrl = this.getRandomMedia('image');
        
        await this.sock.sendMessage(message.chat, {
            document: {
                url: mediaType === 'image' ? mediaUrl : 'https://i.ibb.co/2W0H9Jq/avatar-contact.png'
            },
            caption: menuContent.text,
            mimetype: 'application/zip',
            fileName: config.OWNER_NAME,
            fileLength: "99999999999",
            contextInfo: {
                externalAdReply: {
                    showAdAttribution: true,
                    title: config.BOT_NAME,
                    body: config.OWNER_NAME,
                    thumbnail: { url: thumbnailUrl },
                    sourceUrl: "",
                    mediaType: 1,
                    renderLargerThumbnail: true
                }
            }
        });
        await this.sock.sendMessage(message.chat, { react: { text: '📃', key: message.key } });
    }

    async sendV6Menu(message, menuContent) {
        const mediaType = Math.random() > 0.5 ? 'image' : 'video';
        const mediaUrl = this.getRandomMedia(mediaType);
        const thumbnailUrl = this.getRandomMedia('image');
        
        if (mediaType === 'image') {
            await this.sock.sendMessage(message.chat, {
                image: { url: mediaUrl },
                caption: menuContent.text,
                contextInfo: {
                    externalAdReply: {
                        title: config.BOT_NAME,
                        body: config.OWNER_NAME,
                        thumbnailUrl: thumbnailUrl,
                        sourceUrl: "",
                        mediaType: 1,
                        renderLargerThumbnail: true
                    }
                }
            });
        } else {
            await this.sock.sendMessage(message.chat, {
                video: { url: mediaUrl },
                gifPlayback: true,
                caption: menuContent.text,
                contextInfo: {
                    externalAdReply: {
                        title: config.BOT_NAME,
                        body: config.OWNER_NAME,
                        thumbnailUrl: thumbnailUrl,
                        sourceUrl: "",
                        mediaType: 1,
                        renderLargerThumbnail: true
                    }
                }
            });
        }
        await this.sock.sendMessage(message.chat, { react: { text: '📃', key: message.key } });
    }

    async sendV7Menu(message, menuContent) {
        const mediaType = Math.random() > 0.5 ? 'image' : 'video';
        const mediaUrl = this.getRandomMedia(mediaType);
        const thumbnailUrl = this.getRandomMedia('image');
        
        if (mediaType === 'image') {
            await this.sock.sendMessage(message.chat, {
                image: { url: mediaUrl },
                caption: menuContent.text,
                contextInfo: {
                    forwardingScore: 999,
                    isForwarded: true,
                    mentionedJid: [message.sender],
                    forwardedNewsletterMessageInfo: {
                        newsletterName: `Click Here to Get $69`,
                        newsletterJid: "120363418404777886@newsletter",
                    },
                    externalAdReply: {
                        showAdAttribution: true,
                        title: config.OWNER_NAME,
                        body: config.BOT_NAME,
                        thumbnailUrl: thumbnailUrl,
                        sourceUrl: "",
                        mediaType: 1,
                        renderLargerThumbnail: true
                    }
                }
            });
        } else {
            await this.sock.sendMessage(message.chat, {
                video: { url: mediaUrl },
                caption: menuContent.text,
                gifPlayback: true,
                contextInfo: {
                    forwardingScore: 999,
                    isForwarded: true,
                    mentionedJid: [message.sender],
                    forwardedNewsletterMessageInfo: {
                        newsletterName: `Click Here to Get $69`,
                        newsletterJid: "120363418404777886@newsletter",
                    },
                    externalAdReply: {
                        showAdAttribution: true,
                        title: config.OWNER_NAME,
                        body: config.BOT_NAME,
                        thumbnailUrl: thumbnailUrl,
                        sourceUrl: "",
                        mediaType: 1,
                        renderLargerThumbnail: true
                    }
                }
            });
        }
        await this.sock.sendMessage(message.chat, { react: { text: '📃', key: message.key } });
    }

    async sendV8Menu(message, menuContent) {
    // Check if this is a category-specific request
    const isCategoryRequest = message.text?.includes('menu ');
    const query = message.text?.split(/\s+/)[1]?.toLowerCase();
    
    // If it's a category request, we need to regenerate the menu content
    const finalMenuContent = isCategoryRequest 
        ? await this.getMenuContent(this.pluginSystem.getPlugins(), query, message.pushName)
        : menuContent;

    const buttons = finalMenuContent.buttons.map(btn => ({
        name: "quick_reply",
        buttonParamsJson: JSON.stringify({
            display_text: btn.title,
            id: btn.id
        })
    }));

    // Add some additional buttons
    buttons.push(
        {
            name: "cta_url",
            buttonParamsJson: JSON.stringify({
                display_text: "WhatsApp ☘️",
                url: `https://wa.me/${config.OWNER_NUMBER}`,
                merchant_url: "https://www.google.com"
            })
        },
        {
            name: "quick_reply",
            buttonParamsJson: JSON.stringify({
                display_text: "Owner 👤",
                id: `${config.PREFIX}owner`
            })
        },
        {
            name: "quick_reply",
            buttonParamsJson: JSON.stringify({
                display_text: "Script 📃",
                id: `${config.PREFIX}script`
            })
        }
    );

    const msg = generateWAMessageFromContent(message.chat, {
        viewOnceMessage: {
            message: {
                messageContextInfo: {
                    deviceListMetadata: {},
                    deviceListMetadataVersion: 2
                },
                interactiveMessage: proto.Message.InteractiveMessage.create({
                    body: proto.Message.InteractiveMessage.Body.create({
                        text: finalMenuContent.text
                    }),
                    footer: proto.Message.InteractiveMessage.Footer.create({
                        text: config.BOT_NAME
                    }),
                    header: proto.Message.InteractiveMessage.Header.create({
                        title: finalMenuContent.header.title,
                        subtitle: finalMenuContent.header.subtitle,
                        hasMediaAttachment: false
                    }),
                    nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.create({
                        buttons: buttons
                    })
                })
            }
        }
    }, {});

    await this.sock.relayMessage(msg.key.remoteJid, msg.message, { messageId: msg.key.id });
    await this.sock.sendMessage(message.chat, { react: { text: '📃', key: message.key } });
}

    async handleMenuCommand(message) {
        try {
            if (!this.sock || !this.pluginSystem) return;

            const query = message.text?.split(/\s+/)[1]?.toLowerCase();
            const menuContent = await this.getMenuContent(this.pluginSystem.getPlugins(), query, message.pushName);

            switch (this.menuTypeCache) {
                case 'v1': return this.sendV1Menu(message, menuContent);
                case 'v2': return this.sendV2Menu(message, menuContent);
                case 'v3': return this.sendV3Menu(message, menuContent);
                case 'v4': return this.sendV4Menu(message, menuContent);
                case 'v5': return this.sendV5Menu(message, menuContent);
                case 'v6': return this.sendV6Menu(message, menuContent);
                case 'v7': return this.sendV7Menu(message, menuContent);
                case 'v8': return this.sendV8Menu(message, menuContent);
                default: return this.sendV1Menu(message, menuContent);
            }
        } catch (error) {
            console.error('Error handling menu command:', error);
            await this.sock.sendMessage(message.chat, { 
                text: "❌ Failed to show menu. Please try again later." 
            });
        }
    }

    async handleMenuTypeCommand(message) {
        try {
            const newType = message.query.trim().toLowerCase();
            
            if (newType !== "v1" && newType !== "v2" && newType !== "v3" && 
                newType !== "v4" && newType !== "v5" && newType !== "v6" &&
                newType !== "v7" && newType !== "v8") {
                return await this.sock.sendMessage(message.chat, { 
                    text: "❌ *Invalid menu type!*\nPlease use `menutype v1` to `menutype v8`" 
                });
            }

            // Read the config file
            const configContent = fs.readFileSync(this.configPath, 'utf8');
            
            // Update the MENUTYPE value in the file
            const updatedConfig = configContent.replace(
                /MENUTYPE: "v[0-9]+"/, 
                `MENUTYPE: "${newType}"`
            );
            
            // Write the updated config back to the file
            fs.writeFileSync(this.configPath, updatedConfig);
            
            // Update the cache immediately
            this.menuTypeCache = newType;
            
            // Clear the require cache for the config module
            delete require.cache[require.resolve('../config')];
            
            await this.sock.sendMessage(message.chat, { 
                text: `✅ Menu type changed to *${newType}*\nChanges will take effect immediately.` 
            });
            
        } catch (err) {
            console.error("menutype command error:", err);
            await this.sock.sendMessage(message.chat, { 
                text: "❌ *Error while trying to change menu type!*" 
            });
        }
    }

    async setup(sock, pluginSystem) {
        try {
            this.sock = sock;
            this.pluginSystem = pluginSystem;
            
            // Setup config watcher
            fs.watchFile(this.configPath, (curr, prev) => {
                if (curr.mtime > prev.mtime) {
                    try {
                        delete require.cache[require.resolve('../config')];
                        const newConfig = require('../config');
                        this.currentConfig = newConfig;
                        this.menuTypeCache = newConfig.MENUTYPE;
                        this.lastConfigUpdate = Date.now();
                    } catch (error) {
                        console.error('Error reloading config:', error);
                    }
                }
            });
            
            return this;
        } catch (error) {
            console.error('Error setting up Menu module:', error);
            throw error;
        }
    }

    cleanup() {
        fs.unwatchFile(this.configPath);
    }
}

let menuModule = null;

async function setupMenuModule(sock, pluginSystem) {
    if (!menuModule) {
        menuModule = new MenuModule();
    }
    return menuModule.setup(sock, pluginSystem);
}

function cleanupMenuModule() {
    if (menuModule) {
        menuModule.cleanup();
        menuModule = null;
    }
}

module.exports = {
    setupMenuModule,
    cleanupMenuModule,
    menuModule
};