const os = require('os');
const bot = require("../lib/plugin");
const { loadPlugins, system: pluginSystem } = require("../lib/plugin");
const config = require("../config");
const axios = require("axios");
const fetch = require("node-fetch");
const { exec } = require("child_process");

// Track bot startup time for uptime calculation
const startTime = new Date();
bot(
    {
        name: "ping",
        info: "Measures response time of the bot",
        category: "System"
    },
    async (message, bot) => {
        const start = new Date().getTime();
        let { key } = await bot.reply(`*Ping 👑*`);
        const end = new Date().getTime();
        const speed = end - start;
        await bot.sock.sendMessage(message.chat, { 
            text: `*Pong*\n${speed} *𝚖𝚜*`, 
            edit: key 
        });
    }
);

// Uptime command
bot(
    {
        name: "uptime",
        info: "Shows how long the bot has been running",
        category: "System"
    },
    async (message, bot) => {
        const currentTime = new Date();
        const uptime = currentTime - startTime;
        
        // Convert milliseconds to days, hours, minutes, seconds
        const seconds = Math.floor(uptime / 1000) % 60;
        const minutes = Math.floor(uptime / (1000 * 60)) % 60;
        const hours = Math.floor(uptime / (1000 * 60 * 60)) % 24;
        const days = Math.floor(uptime / (1000 * 60 * 60 * 24));
        
        let uptimeString = "";
        if (days > 0) uptimeString += `${days} day${days > 1 ? 's' : ''} `;
        if (hours > 0) uptimeString += `${hours} hour${hours > 1 ? 's' : ''} `;
        if (minutes > 0) uptimeString += `${minutes} minute${minutes > 1 ? 's' : ''} `;
        uptimeString += `${seconds} second${seconds !== 1 ? 's' : ''}`;
        
        await bot.reply(`*Bot Uptime*\n${uptimeString}`);
    }
);

// Alive command
bot(
    {
        name: "alive",
        info: "Check if bot is running",
        category: "System"
    },
    async (message, bot) => {
        try {
            // Get random quote
            let res = await axios.get("https://ironman.koyeb.app/api/aquote");
            let json = res.data;
            
            let quote;
            if (!json.sukses || !json.result || json.result.length === 0) {
                quote = {
                    english: "The greatest glory in living lies not in never falling, but in rising every time we fall.",
                    character: "Nelson Mandela"
                };
            } else {
                quote = json.result[Math.floor(Math.random() * json.result.length)];
            }

            // Format the quote (no emojis, no anime title)
            const quoteMessage = `*"${quote.english}"*\n\n` +
                                `— *${quote.character}*`;
            
            // Calculate uptime for alive message
            const currentTime = new Date();
            const uptime = currentTime - startTime;
            const hours = Math.floor(uptime / (1000 * 60 * 60));
            const minutes = Math.floor((uptime % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((uptime % (1000 * 60)) / 1000);
            
            const uptimeMessage = `*Uptime:* ${hours}h ${minutes}m ${seconds}s`;
            
            // Send image with caption
            await bot.sendMessage(message.chat, {
                image: { url: "https://files.catbox.moe/55f24l.jpg" },
                caption: `👑 *I'm Alive!* 👑\n\n${uptimeMessage}\n\n${quoteMessage}`,
                mentions: message.sender ? [message.sender] : []
            });
        } catch (error) {
            console.error("Error in alive command:", error);
            await bot.reply("An error occurred while processing your request.");
        }
    }
);
bot(
    {
        name: "restart",
        info: "Restarts the bot using PM2",
        category: "System"
    },
    async (message, bot) => {
        try {
            await bot.reply("🔄 *Restarting bot...*");
            
            exec("pm2 restart alya", (error, stdout, stderr) => {
                if (error) {
                    console.error(`Restart error: ${error}`);
                    return bot.sendMessage(message.chat, { 
                        text: "❌ *Failed to restart bot!*\nCheck server logs." 
                    });
                }
                console.log(`Restart output: ${stdout}`);
            });
        } catch (err) {
            console.error("Restart command error:", err);
            await bot.reply("❌ *Error while trying to restart!*");
        }
    }
);

bot(
    {
        name: "shutdown",
        info: "Stops the bot using PM2",
        category: "System"
    },
    async (message, bot) => {
        try {
            await bot.reply("⏳ *Shutting down bot...*");
            
            exec("pm2 stop alya", (error, stdout, stderr) => {
                if (error) {
                    console.error(`Shutdown error: ${error}`);
                    return bot.sendMessage(message.chat, { 
                        text: "❌ *Failed to shutdown bot!*\nCheck server logs." 
                    });
                }
                console.log(`Shutdown output: ${stdout}`);
            });
        } catch (err) {
            console.error("Shutdown command error:", err);
            await bot.reply("❌ *Error while trying to shutdown!*");
        }
    }
);
bot(
    {
        name: "dev",
        info: "Send my profile information",
        category: "system"
    },
    async (message, bot) => {
        try {
            // Get profile picture URL
            const king = "2349123721026@s.whatsapp.net"
            const profilePicUrl = await bot.sock.profilePictureUrl(king, "image").catch(() => null);
            
            // About me information
            const aboutMe = `
👑 *About Me* 👑

*Name:* KING XER
*Organization:* KING TECH INC
*Skills:* Full Stack Development, AI, Automation
*Philosophy:* Building solutions that make life easier
*Favorite quote:* Nothing to fear no one to fight
*Status:* Always coding something new!
            `.trim();
            
            // Contact vCard
            const vcard = 'BEGIN:VCARD\n' // metadata of the contact card
                + 'VERSION:3.0\n'
                + 'FN:KING XER\n' // full name
                + 'ORG: KING TECH INC;\n'
                + 'TEL;type=CELL;type=VOICE;waid=2349123721026:+2349123721026\n'
                + 'END:VCARD';
            
            // Send profile picture if available
            if (profilePicUrl) {
                await bot.sock.sendMessage(message.chat, {
        image: { url: profilePicUrl },
        caption: aboutMe,
        contextInfo: {
          forwardingScore: 1,
          isForwarded: true,
          forwardedNewsletterMessageInfo: {
            newsletterJid: "120363418404777886@newsletter",
            newsletterName: "KING_XER",
          },
        },
      });
            }
            
            // Send contact card
            await bot.sock.sendMessage(
                message.chat,
                {
                    contacts: {
                        displayName: 'KING XER',
                        contacts: [{ vcard }]
                    }
                }
            );
            
        } catch (error) {
            console.error("Error in profile command:", error);
            await bot.reply("An error occurred while sending my profile information.");
        }
    }
);
bot(
    {
        name: "repo",
        info: "Displays information about the Queen_Alya repository",
        category: "system"
    },
    async (message, bot) => {
        try {
            // Fetch repository data from GitHub API
            const response = await axios.get('https://api.github.com/repos/KING-DAVIDX/Queen_Alya');
            const repoData = await response.data;
            
            const repoInfo = `
👑 *QUEEN ALYA BOT* 👑

🚀 *Repository:* ${repoData.name}
👨‍💻 *Developer:* ${repoData.owner.login}
⭐ *Stars:* ${repoData.stargazers_count}
🍴 *Forks:* ${repoData.forks_count}
📝 *Description:* ${repoData.description || 'Best WhatsApp bot ever ❤️👑'}

🔗 *GitHub:* ${repoData.html_url}

💎 *Where royalty meets technology!* 💎

🚀 *Want to deploy? Contact:* 
https://wa.me/2349123721026`;

            await bot.sock.sendMessage(
                message.chat,
                {
                    text: repoInfo
                }
            );
        } catch (error) {
            // Fallback if API fails
            const repoInfo = `
👑 *QUEEN ALYA BOT* 👑

🚀 *Repository:* Queen_Alya
👨‍💻 *Developer:* KING-DAVIDX
⭐ *Stars:* Loading...
🍴 *Forks:* Loading...
📝 *Description:* Best WhatsApp bot ever ❤️👑

🔗 *GitHub:* https://github.com/KING-DAVIDX/Queen_Alya

💎 *Where royalty meets technology!* 💎

🚀 *Want to deploy? Contact:* 
https://wa.me/2349123721026`;

            await bot.sock.sendMessage(
                message.chat,
                {
                    text: repoInfo
                }
            );
        }
    }
);

bot(
    {
        name: "cpu",
        info: "Displays detailed system CPU and memory information",
        category: "System"
    },
    async (message, bot) => {
        try {
            // Get memory usage
            const memoryUsage = process.memoryUsage();
            const systemMemory = {
                used: os.totalmem() - os.freemem(),
                total: os.totalmem()
            };

            // Process CPU data
            const cpus = os.cpus();
            const cpuSummary = cpus.reduce((acc, cpu) => {
                const totalTime = Object.values(cpu.times).reduce((sum, time) => sum + time, 0);
                acc.total += totalTime;
                acc.speed += cpu.speed / cpus.length;
                Object.keys(acc.times).forEach(key => {
                    acc.times[key] += cpu.times[key];
                });
                return acc;
            }, {
                speed: 0,
                total: 0,
                times: {
                    user: 0,
                    nice: 0,
                    sys: 0,
                    idle: 0,
                    irq: 0
                }
            });

            // Formatting functions
            const formatMemory = bytes => {
                if (bytes >= 1e9) return `${(bytes/1e9).toFixed(2)} GB`;
                if (bytes >= 1e6) return `${(bytes/1e6).toFixed(2)} MB`;
                if (bytes >= 1e3) return `${(bytes/1e3).toFixed(2)} KB`;
                return `${bytes} B`;
            };

            const formatUptime = seconds => {
                const days = Math.floor(seconds / 86400);
                const hours = Math.floor((seconds % 86400) / 3600);
                const minutes = Math.floor((seconds % 3600) / 60);
                return `${days}d ${hours}h ${minutes}m`;
            };

            // Generate report
            const report = `
*🖥️ SYSTEM PERFORMANCE REPORT*

*⏳ UPTIME*
${formatUptime(process.uptime())}

*💾 MEMORY USAGE*
System: ${formatMemory(systemMemory.used)} / ${formatMemory(systemMemory.total)}
Node.js:
${Object.entries(memoryUsage)
    .map(([key, value]) => `• ${key.padEnd(8)}: ${formatMemory(value)}`)
    .join('\n')}

*⚡ CPU INFO*
Model: ${cpus[0].model.split('@')[0].trim()}
Cores: ${cpus.length}
Speed: ${(cpuSummary.speed / 1000).toFixed(2)} GHz

*📊 CPU USAGE*
${Object.entries(cpuSummary.times)
    .map(([type, time]) => 
        `• ${type.padEnd(5)}: ${(time * 100 / cpuSummary.total).toFixed(1)}%`
    ).join('\n')}
`.trim();

            await bot.reply(report);

        } catch (error) {
            console.error("CPU command failed:", error);
            await bot.send(message.chat, { text: "❌ Failed to retrieve system information" });
        }
    }
);

bot(
    {
        name: "feature",
        info: "Displays all available bot features",
        category: "system",
        usage: "Just send /feature"
    },
    async (message, bot) => {
        try {
            // Load plugins and get counts exactly as specified
            const plugins = pluginSystem.getPlugins();
            const commandCount = plugins.commands.length;
            const eventCount = plugins.events.length;
            const totalPlugins = commandCount+eventCount;

            // Build feature text in your preferred format
            let featureText = " *Queen_Alya - ＢＯＴ ＦＥＡＴＵＲＥ*\n\n\n" +
              `  ◦ _Total Features ➪ ${totalPlugins}_\n` +
              "\n*◦ BOT FEATURES*\n\n" +
              `      _Plugins ➪ ${commandCount}_\n` +
              `      _Event Listeners ➪ ${eventCount}_\n` +
              `\n${config.caption || "© Queen Alya"}`;

            // Send the feature list
            await bot.reply(featureText);
            
        } catch (error) {
            console.error("Feature command failed:", error);
            await bot.reply("❌ Failed to retrieve feature information");
        }
    }
);