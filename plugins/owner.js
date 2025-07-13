const ass = require("../lib/modules/ai");
const { S_WHATSAPP_NET } = require('baileys');
const bot = require("../lib/plugin");
const { downloadContentFromMessage } = require('baileys');
const { normalizeJid } = require('../lib/serialize');
const config = require ("../config");
bot(
  {
    name: 'fullpp',
    info: 'Set full profile picture from replied image (for user/bot)',
    category: 'owner',
    usage: 'Reply to an image with "fullgpp"'
  },
  async (message, bot) => {
    // Check if replied to an image
    if (!message.quoted?.image) {
      return await bot.reply('Please reply to an image to set as profile picture!');
    }

    try {
      // Download the quoted media (which returns a buffer)
      const buffer = await message.quoted.download();

      // Pass the buffer to the resize function
      const reply = await ass.resize(buffer);
      
      // Update profile picture
      await bot.sock.query({
        tag: 'iq',
        attrs: {
          to: S_WHATSAPP_NET,
          type: 'set',
          xmlns: 'w:profile:picture',
        },
        content: [
          {
            tag: 'picture',
            attrs: { type: 'image' },
            content: reply.buffer,
          },
        ],
      });

      await bot.reply('*Profile picture updated successfully!*');
    } catch (error) {
      console.error('Error updating profile picture:', error);
      await bot.reply(
        `*Failed to update profile picture!*\n` +
        `_Error: ${error.message || 'Unknown error'}_`
      );
    }
  }
);

bot(
    {
        name: "vv",
        info: "Convert view-once media and send to bot only",
        category: "owner",
        fromMe: true
    },
    async (message, bot) => {
        if (!message.quoted) return await bot.reply("Reply to a view-once message");
        if (!message.quoted.viewOnce) return await bot.reply("The replied message is not a view-once message");

        let mediaType = null;
        if (message.quoted.image) mediaType = 'image';
        else if (message.quoted.video) mediaType = 'video';
        else if (message.quoted.audio) mediaType = 'audio';
        else if (message.quoted.sticker) mediaType = 'sticker';
        else if (message.quoted.document) mediaType = 'document';
        
        if (!mediaType) return await bot.reply("No media found in the view-once message");

        try {
            const downloadStream = await downloadContentFromMessage(message.quoted, mediaType);
            let buffer = Buffer.from([]);
            for await (const chunk of downloadStream) {
                buffer = Buffer.concat([buffer, chunk]);
            }

            await bot.sock.sendMessage(
                message.chat,
                {
                    [mediaType]: buffer,
                    caption: "Converted from view-once"
                }
            );

        } catch (error) {
            console.error("View-once conversion error:", error);
            await bot.reply(`Failed to convert view-once media: ${error.message}`);
        }
    }
);
bot(
    {
        name: "vv2",
        info: "Convert view-once media and send to bot only",
        category: "owner",
        fromMe: true
    },
    async (message, bot) => {
        if (!message.quoted) return await bot.reply("Reply to a view-once message");
        if (!message.quoted.viewOnce) return await bot.reply("The replied message is not a view-once message");

        let mediaType = null;
        if (message.quoted.image) mediaType = 'image';
        else if (message.quoted.video) mediaType = 'video';
        else if (message.quoted.audio) mediaType = 'audio';
        else if (message.quoted.sticker) mediaType = 'sticker';
        else if (message.quoted.document) mediaType = 'document';
        
        if (!mediaType) return await bot.reply("No media found in the view-once message");

        try {
            const downloadStream = await downloadContentFromMessage(message.quoted, mediaType);
            let buffer = Buffer.from([]);
            for await (const chunk of downloadStream) {
                buffer = Buffer.concat([buffer, chunk]);
            }

            const botJid = normalizeJid(bot.sock.user.id);
            await bot.sock.sendMessage(
                botJid,
                {
                    [mediaType]: buffer,
                    caption: "Converted from view-once"
                }
            );

        } catch (error) {
            console.error("View-once conversion error:", error);
            await bot.reply(`Failed to convert view-once media: ${error.message}`);
        }
    }
);
bot(
    {
        name: "owner",
        info: "Measures response time of the bot",
        category: "Owner"
    },
    async (message, bot) => {
        const vcard = 'BEGIN:VCARD\n' // metadata of the contact card
                + 'VERSION:3.0\n'
                + `FN:${config.OWNER_NAME}\n` // full name
                + 'ORG: QUEEN_ALYA;\n'
                + `TEL;type=CELL;type=VOICE;waid=${config.OWNER_NUMBER}:+${config.OWNER_NUMBER}\n`
                + 'END:VCARD';
                await bot.sock.sendMessage(
                message.chat,
                {
                    contacts: {
                        displayName: `${config.OWNER_NAME}`,
                        contacts: [{ vcard }]
                    }
                }
            );
    }
);
bot(
  {
    name: "name",
    info: "Update your WhatsApp profile name",
    category: "Owner",
    usage: "[new name]"
  },
  async (message, bot) => {
    try {
      const query = message.query;
      if (!query) {
        return await bot.reply(`Please provide a new name.\nUsage: *${config.PREFIX}name [new name]*`);
      }
      await bot.sock.updateProfileName(query);
      await bot.reply(`✅ Profile name updated to *${query}*`);
    } catch (error) {
      await handleError(error, bot, message, "name");
    }
  }
);
bot(
  {
    name: "bio",
    info: "Update your WhatsApp status/bio",
    category: "Owner",
    usage: "[new bio]"
  },
  async (message, bot) => {
    try {
      const query = message.query;
      if (!query) {
        return await bot.reply(`Please provide a new bio.\nUsage: *${config.PREFIX}bio [new bio]*`);
      }
      await bot.sock.updateProfileStatus(query);
      await bot.reply(`✅ Bio/Status updated to *${query}*`);
    } catch (error) {
      await handleError(error, bot, message, "bio");
    }
  }
);
bot(
    {
        name: "quoted",
        info: "Extracts quoted messages from replied messages",
        category: "Owner",
        fromMe: true
    },
    async (message, bot) => {
        try {
            // Verify quoted message exists
            if (!message.quoted) {
                return await bot.reply("⚠️ Please reply to a message first");
            }

            // Verify message ID exists
            if (!message.quoted.id) {
                return await bot.reply("🔍 Couldn't identify the message ID");
            }

            // Load from database using global.store
            const originalMsg = await store.findMessageById(message.quoted.id);
            if (!originalMsg?.message) {
                return await bot.reply("⏳ Message not found in database");
            }

            // Check for quoted content in the original message
            const quotedContent = originalMsg.message?.extendedTextMessage?.contextInfo?.quotedMessage ||
                                 originalMsg.message?.imageMessage?.contextInfo?.quotedMessage ||
                                 originalMsg.message?.videoMessage?.contextInfo?.quotedMessage ||
                                 originalMsg.message?.stickerMessage?.contextInfo?.quotedMessage ||
                                 originalMsg.message?.documentMessage?.contextInfo?.quotedMessage;

            if (!quotedContent) {
                return await bot.reply("🔄 No quoted content found in this message");
            }

            // Forward the quoted message
            await bot.sock.sendMessage(
                message.chat,
                { 
                    forward: {
                        key: {
                            remoteJid: message.chat,
                            fromMe: false,
                            id: message.quoted.id + "-quoted"
                        },
                        message: quotedContent
                    },
                    mentions: []
                },
                { quoted: message }
            );

        } catch (error) {
            await bot.reply(`❌ Failed: ${error.message}`);
        }
    }
);