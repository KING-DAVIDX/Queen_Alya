const bot = require("../lib/plugin");
const axios = require("axios");
const API_KEY = "_0u5aff45%2C_0l1876s8qc";
const BASE_URL = "https://api.giftedtech.web.id/api/tempmail";
const tempEmails = new Map();
const config = require("../config");

bot(
  {
    name: 'antidelete',
    info: 'Toggle anti deletion on/off',
    category: "tools",
  },
  async (message, bot) => {
    const fs = require('fs');
    const path = require('path');
    const configPath = path.join(__dirname, '..', 'config.js');

    try {
      // Read the current config file
      let configContent = fs.readFileSync(configPath, 'utf8');

      if (message.query === 'on') {
        // Update DELETE to "true" in config.js
        configContent = configContent.replace(
          /DELETE: "(true|false)"/, 
          'DELETE: "true"'
        );
        fs.writeFileSync(configPath, configContent);
        await bot.reply('Anti deletion has been *enabled* ✅');
      } 
      else if (message.query === 'off') {
        // Update DELETE to "false" in config.js
        configContent = configContent.replace(
          /DELETE: "(true|false)"/, 
          'DELETE: "false"'
        );
        fs.writeFileSync(configPath, configContent);
        await bot.reply('Anti deletion has been *disabled* ❌');
      }
      else {
        // Extract current delete status
        const deleteMatch = configContent.match(/DELETE: "(true|false)"/);
        const currentStatus = deleteMatch ? deleteMatch[1] : 'false';
        const status = currentStatus === "true" ? 'enabled ✅' : 'disabled ❌';
        
        await bot.reply(`Anti deletion is currently *${status}*\n\nUsage:\n.antidelete on - Enable deletion\n.antidelete off - Disable deletion`);
      }
    } catch (error) {
      console.error('Error modifying config:', error);
      await bot.reply('Failed to update deletion configuration. Please check server logs.');
    }
  }
);

bot(
  {
    name: 'mode',
    info: 'Switch between public and private modes',
    category: "tools",
  },
  async (message, bot) => {
    const fs = require('fs');
    const path = require('path');
    const configPath = path.join(__dirname, '..', 'config.js');

    try {
      // Read the current config file
      let configContent = fs.readFileSync(configPath, 'utf8');

      if (message.query === 'public') {
        // Update MODE to "public" in config.js
        configContent = configContent.replace(
          /MODE: "(public|private)"/, 
          'MODE: "public"'
        );
        fs.writeFileSync(configPath, configContent);
        await bot.reply('Bot mode has been set to *public* 🌍');
      } 
      else if (message.query === 'private') {
        // Update MODE to "private" in config.js
        configContent = configContent.replace(
          /MODE: "(public|private)"/, 
          'MODE: "private"'
        );
        fs.writeFileSync(configPath, configContent);
        await bot.reply('Bot mode has been set to *private* 🔒');
      }
      else {
        // Extract current mode status
        const modeMatch = configContent.match(/MODE: "(public|private)"/);
        const currentMode = modeMatch ? modeMatch[1] : 'private';
        const status = currentMode === "public" ? 'public 🌍' : 'private 🔒';
        
        await bot.reply(`Bot is currently in *${status}* mode\n\nUsage:\n.mode public - Set to public mode\n.mode private - Set to private mode`);
      }
    } catch (error) {
      console.error('Error modifying config:', error);
      await bot.reply('Failed to update mode configuration. Please check server logs.');
    }
  }
);

bot(
    {
        name: "tempmail",
        info: "Generate a temporary email address",
        category: "tools"
    },
    async (message, bot) => {
        try {
            const response = await axios.get(`${BASE_URL}/generate?apikey=${API_KEY}`);
            if (response.data.success) {
                const email = response.data.result.email;
                // Store the email with the chat ID
                tempEmails.set(message.chat, email);
                
                await bot.reply(`*Temporary Email Generated*\n\n` +
                               `📧 *Email:* ${email}\n` +
                               `⏳ *Expires in:* 10 minutes\n\n` +
                               `Use *${config.PREFIX}checkmail* to check your inbox`);
            } else {
                await bot.reply("Failed to generate temporary email. Please try again later.");
            }
        } catch (error) {
            console.error(error);
            await bot.reply("An error occurred while generating temporary email.");
        }
    }
);

bot(
    {
        name: "checkmail",
        info: "Check inbox of your temporary email",
        category: "tools"
    },
    async (message, bot) => {
        const email = tempEmails.get(message.chat);
        if (!email) {
            return await bot.reply(`No temporary email found. Please generate one first with *${config.PREFIX}tempmail*`);
        }

        try {
            const response = await axios.get(`${BASE_URL}/inbox?apikey=${API_KEY}&email=${encodeURIComponent(email)}`);
            
            if (response.data.message === "Session not found. Sessions auto expire in 10 minutes") {
                await bot.reply(`📭 *Inbox Empty*\n\n` +
                               `No messages found for *${email}*\n` +
                               `Emails expire after 10 minutes of inactivity.`);
            } else if (response.data.success && response.data.result) {
                // Adjust this based on actual API response structure
                const messages = Array.isArray(response.data.result) ? response.data.result : [response.data.result];
                let replyText = `📬 *Inbox for ${email}*\n\n`;
                
                if (messages.length === 0) {
                    replyText += "No messages found";
                } else {
                    messages.forEach((msg, index) => {
                        replyText += `*Message ${index + 1}:*\n` +
                                    `From: ${msg.from || 'Unknown'}\n` +
                                    `Subject: ${msg.subject || 'No Subject'}\n` +
                                    `Use *${config.PREFIX}inbox ${msg.id}* to read full message\n\n`;
                    });
                }
                
                await bot.reply(replyText);
            } else {
                await bot.reply("Failed to check inbox. The email might have expired or doesn't exist.");
            }
        } catch (error) {
            console.error(error);
            await bot.reply("An error occurred while checking the inbox.");
        }
    }
);

bot(
    {
        name: "inbox",
        info: "Read a specific message from your temporary email",
        category: "tools",
        usage: "inbox <messageId>"
    },
    async (message, bot, match) => {
        const email = tempEmails.get(message.chat);
        if (!email) {
            return await bot.reply(`No temporary email found. Please generate one first with *${config.PREFIX}tempmail*`);
        }

        const messageId = match[1]?.trim();
        if (!messageId) {
            return await bot.reply(`Please provide a message ID. Usage: *${config.PREFIX}inbox messageId*`);
        }

        try {
            const response = await axios.get(`${BASE_URL}/message?apikey=${API_KEY}&email=${encodeURIComponent(email)}&messageid=${messageId}`);
            
            if (response.data.success && response.data.result) {
                const msg = response.data.result;
                let replyText = `📩 *Message from ${msg.from || 'Unknown'}*\n\n` +
                             `📌 *Subject:* ${msg.subject || 'No Subject'}\n` +
                             `📅 *Date:* ${msg.date || 'Unknown'}\n\n` +
                             `${msg.body || 'No content'}\n\n`;
                
                if (msg.attachments && msg.attachments.length > 0) {
                    replyText += `*Attachments:* ${msg.attachments.length}\n`;
                    msg.attachments.forEach((att, i) => {
                        replyText += `- ${att.name || `Attachment ${i+1}`}\n`;
                    });
                } else {
                    replyText += `*Attachments:* None`;
                }
                
                await bot.reply(replyText);
            } else {
                await bot.reply("Failed to read message. It might have expired or doesn't exist.");
            }
        } catch (error) {
            console.error(error);
            await bot.reply("An error occurred while reading the message.");
        }
    }
);