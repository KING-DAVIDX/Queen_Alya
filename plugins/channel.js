const bot = require("../lib/plugin");
const { downloadContentFromMessage } = require('baileys');
const config = require("../config");
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { fileTypeFromBuffer } = require('file-type'); 

// Add rate limiting variables
const rateLimit = {
  lastRequestTime: 0,
  minDelay: 1000 // 1 second minimum between requests
};


// Create a new channel
bot(
  {
    name: 'chcreate',
    info: 'Create a new WhatsApp channel',
    category: "channel",
    usage: 'chcreate <name> | <description>'
  },
  async (message, bot) => {
    const query = message.query;
    if (!query) return await bot.reply('*Usage:* chcreate <name> | <description>\n_Example: chcreate My Channel | This is my new channel_');

    const parts = query.split('|').map(p => p.trim());
    if (parts.length !== 2) return await bot.reply('*Invalid format!* Please use: chcreate <name> | <description>');

    const [name, description] = parts;

    try {
      const newsletter = await bot.sock.newsletterCreate(name, description);
      const inviteLink = `https://whatsapp.com/channel/${newsletter.invite}`;
      
      await bot.reply(
        `*Channel created!*\n\n` +
        `*Name:* ${name}\n` +
        `*Link:* ${inviteLink}\n` +
        `You are the owner.`
      );
    } catch (error) {
      console.error('Error creating channel:', error);
      await bot.reply(`*Failed to create channel!*\n_Error: ${error.message || 'Unknown error'}_`);
    }
  }
);

// Update channel name
bot(
  {
    name: 'chname',
    info: 'Change channel name',
    category: "channel",
    usage: 'chname <new name>'
  },
  async (message, bot) => {
    if (!message.chat.endsWith('@newsletter')) return await bot.reply('This command is for channels only!');
    
    const newName = message.query;
    if (!newName) return await bot.reply('Example: *!chname New Channel Name*');

    try{
      await bot.sock.newsletterUpdateName(message.chat, newName);
      await bot.reply(`*Channel name updated:* ${newName}`);
    } catch (error) {
      console.error('Error changing name:', error);
      await bot.reply(`*Failed to change name!*\n_Error: ${error.message || 'Unknown error'}_`);
    }
  }
);

// Update channel description
bot(
  {
    name: 'chdesc',
    info: 'Change channel description',
    category: "channel",
    usage: 'chdesc <new description>'
  },
  async (message, bot) => {
    if (!message.chat.endsWith('@newsletter')) return await bot.reply('This command is for channels only!');
    
    const newDesc = message.query;
    if (!newDesc) return await bot.reply('Example: *!chdesc New channel description*');

    try{
      await bot.sock.newsletterUpdateDescription(message.chat, newDesc);
      await bot.reply(`*Description updated:*\n${newDesc}`);
    } catch (error) {
      console.error('Error changing description:', error);
      await bot.reply(`*Failed to update description!*\n_Error: ${error.message || 'Unknown error'}_`);
    }
  }
);

// Set channel profile picture
// For image validation

bot(
  {
    name: 'chpp',
    info: 'Set channel profile picture from URL',
    category: "channel",
    usage: 'Send: *chpp <image-url>*\nExample: chpp https://example.com/image.jpg'
  },
  async (message, bot) => {
    if (!message.chat.endsWith('@newsletter')) {
      return await bot.reply('❌ This command works only in channels!');
    }

    if (!message.query) {
      return await bot.reply('ℹ️ Please provide an image URL!\nExample: *chpp https://example.com/image.jpg*');
    }

    try {
      // Validate URL format
      if (!/^https?:\/\/.+(\.(jpg|jpeg|png|gif|webp))$/i.test(message.query)) {
        return await bot.reply('❌ Invalid image URL! Must start with http/https and end with .jpg, .png, etc.');
      }

      // Download image using Axios
      const response = await axios.get(message.query, {
        responseType: 'arraybuffer',
        timeout: 10000, // 10-second timeout
        maxContentLength: 10 * 1024 * 1024, // Max 10MB
        headers: {
          'User-Agent': 'Mozilla/5.0 (WhatsApp Channel PP Updater)'
        }
      });

      if (response.status !== 200) {
        throw new Error(`HTTP ${response.status}`);
      }

      const buffer = Buffer.from(response.data);

      // Verify it's actually an image
      const fileInfo = await fileTypeFromBuffer(buffer);
      if (!fileInfo?.mime.startsWith('image/')) {
        throw new Error('URL does not point to a valid image');
      }

      // Check image dimensions (optional)
      if (buffer.length > 5 * 1024 * 1024) { // 5MB max
        throw new Error('Image too large (max 5MB)');
      }

      // Update channel picture
      await bot.sock.newsletterUpdatePicture(message.chat, buffer);
      await bot.reply('✅ Channel profile picture updated successfully!');

    } catch (error) {
      console.error('CHPP Error:', error);
      await bot.reply(`❌ Failed to update picture!\nReason: ${error.message || 'Invalid image'}`);
    }
  }
);

// Remove channel profile picture
bot(
  {
    name: 'rchpp',
    info: 'Remove channel profile picture',
    category: "channel",
    usage: 'rchpp'
  },
  async (message, bot) => {
    if (!message.chat.endsWith('@newsletter')) return await bot.reply('This command is for channels only!');
    
    try {

      await bot.sock.newsletterRemovePicture(message.chat);
      await bot.reply('*Profile picture removed!*');
    } catch (error) {
      console.error('Error removing picture:', error);
      await bot.reply(`*Failed to remove picture!*\n_Error: ${error.message || 'Unknown error'}_`);
    }
  }
);

// Get channel info
bot(
  {
    name: 'chinfo',
    info: 'Get channel information',
    category: "channel",
    usage: 'chinfo'
  },
  async (message, bot) => {
    if (!message.chat.endsWith('@newsletter')) return await bot.reply('This command is for channels only!');
    
    try {
      const metadata = await bot.sock.newsletterMetadata('jid', message.chat);
      if (!metadata) return await bot.reply('Failed to get channel info');

      const adminCount = await bot.sock.newsletterAdminCount(message.chat);
      const inviteLink = `https://whatsapp.com/channel/${metadata.invite}`;

      const infoMessage = `*Channel Info*\n\n` +
        `🔹 *Name:* ${metadata.name}\n` +
        `🔹 *Desc:* ${metadata.description || 'None'}\n` +
        `🔹 *Subscribers:* ${metadata.subscribers}\n` +
        `🔹 *Admins:* ${adminCount}\n` +
        `🔹 *Created:* ${new Date(metadata.creation_time * 1000).toLocaleString()}\n` +
        `🔹 *Link:* ${inviteLink}\n` +
        `🔹 *Status:* ${metadata.state.toLowerCase()}\n` +
        `🔹 *Verification:* ${metadata.verification.toLowerCase()}\n`;

      await bot.reply(infoMessage);
    } catch (error) {
      console.error('Error getting info:', error);
      await bot.reply(`*Failed to get info!*\n_Error: ${error.message || 'Unknown error'}_`);
    }
  }
);

// Follow a channel
bot(
  {
    name: 'follow',
    info: 'Follow a WhatsApp channel',
    category: "channel",
    usage: 'follow <channel link>'
  },
  async (message, bot) => {
    let code = message.query.trim();
    if (!code) return await bot.reply('Example: *!follow https://whatsapp.com/channel/EXAMPLE123*');

    if (code.startsWith('https://whatsapp.com/channel/')) {
      code = code.replace('https://whatsapp.com/channel/', '').split('/')[0];
    }

    try{
      await bot.sock.newsletterFollow(`${code}@newsletter`);
      await bot.reply(`*Now following channel!*`);
    } catch (error) {
      console.error('Error following:', error);
      await bot.reply(`*Failed to follow!*\n_Error: ${error.message || 'Unknown error'}_`);
    }
  }
);

// Unfollow a channel
bot(
  {
    name: 'unfollow',
    info: 'Unfollow a WhatsApp channel',
    category: "channel",
    usage: 'unfollow'
  },
  async (message, bot) => {
    if (!message.chat.endsWith('@newsletter')) return await bot.reply('This command is for channels only!');
    
    try{
      await bot.sock.newsletterUnfollow(message.chat);
      await bot.reply(`*Unfollowed channel.*`);
    } catch (error) {
      console.error('Error unfollowing:', error);
      await bot.reply(`*Failed to unfollow!*\n_Error: ${error.message || 'Unknown error'}_`);
    }
  }
);

// Mute a channel
bot(
  {
    name: 'chmute',
    info: 'Mute a WhatsApp channel',
    category: "channel",
    usage: 'chmute'
  },
  async (message, bot) => {
    if (!message.chat.endsWith('@newsletter')) return await bot.reply('This command is for channels only!');
    
    try{
      await bot.sock.newsletterMute(message.chat);
      await bot.reply(`*Channel muted.*`);
    } catch (error) {
      console.error('Error muting:', error);
      await bot.reply(`*Failed to mute!*\n_Error: ${error.message || 'Unknown error'}_`);
    }
  }
);

// Unmute a channel
bot(
  {
    name: 'chunmute',
    info: 'Unmute a WhatsApp channel',
    category: "channel",
    usage: 'chunmute'
  },
  async (message, bot) => {
    if (!message.chat.endsWith('@newsletter')) return await bot.reply('This command is for channels only!');
    
    try{
      await bot.sock.newsletterUnmute(message.chat);
      await bot.reply(`*Channel unmuted.*`);
    } catch (error) {
      console.error('Error unmuting:', error);
      await bot.reply(`*Failed to unmute!*\n_Error: ${error.message || 'Unknown error'}_`);
    }
  }
);

bot(
  {
    name: 'react',
    info: 'React to a channel message',
    category: "channel",
    usage: 'react <message link> | <emoji>'
  },
  async (message, bot) => {
    const parts = message.query.split('|').map(p => p.trim());
    if (parts.length !== 2) return await bot.reply('Example: *!react https://whatsapp.com/channel/0029Vb6UJZf8PgsJuYq7pQ2V/296 | ❤️*');

    const [link, emoji] = parts;
    if (!link || !emoji) return await bot.reply('Need both link and emoji!');

    try {
      // Extract serverId from link (last part after /)
      const serverId = link.split('/').pop();
      if (!serverId || isNaN(serverId)) return await bot.reply('Invalid message link format!');

      // Extract channel code from link
      const channelCode = link.split('/channel/')[1]?.split('/')[0];
      if (!channelCode) return await bot.reply('Invalid channel link format!');

      // Get channel JID
      const metadata = await bot.sock.newsletterMetadata('invite', channelCode);
      const channelJid = metadata.id;

      await bot.sock.newsletterReactMessage(channelJid, serverId, emoji);
      await bot.reply(`Reacted with ${emoji} to message ${serverId}`);
    } catch (error) {
      console.error('Error reacting:', error);
      await bot.reply(`*Failed to react!*\n_Error: ${error.message || 'Unknown error'}_`);
    }
  }
);

// Delete a channel
bot(
  {
    name: 'chdelete',
    info: 'Delete a WhatsApp channel',
    category: "channel",
    usage: 'chdelete'
  },
  async (message, bot) => {
    if (!message.chat.endsWith('@newsletter')) return await bot.reply('This command is for channels only!');
    
    try {
      
      await bot.sock.newsletterDelete(message.chat);
      await bot.reply(`*Channel deleted.*`);
    } catch (error) {
      console.error('Error deleting:', error);
      await bot.reply(`*Failed to delete!*\n_Error: ${error.message || 'Unknown error'}_`);
    }
  }
);

// Change channel owner
bot(
  {
    name: 'chowner',
    info: 'Transfer channel ownership',
    category: "channel",
    usage: 'chowner @user'
  },
  async (message, bot) => {
    if (!message.chat.endsWith('@newsletter')) return await bot.reply('This command is for channels only!');
    
    try {
      

      const userJid = message.query;
      if (!userJid) return await bot.reply('use number as query e.g chowner 234xxxxxx');
      await bot.sock.newsletterChangeOwner(message.chat, userJid);
      
      await bot.reply(
        `*Ownership transferred!*\n` +
        `@${userJid} is now owner.`,
        { mentions: [userJid] }
      );
    } catch (error) {
      console.error('Error transferring:', error);
      await bot.reply(`*Failed to transfer!*\n_Error: ${error.message || 'Unknown error'}_`);
    }
  }
);

bot(
  {
    name: 'chreact',
    info: 'Toggle reactions',
    category: "channel",
    usage: 'chreact <on/off>'
  },
  async (message, bot) => {
    if (!message.chat.endsWith('@newsletter')) return await bot.reply('This command is for channels only!');
    
    const mode = message.query?.toLowerCase();
    if (!mode || (mode !== 'on' && mode !== 'off')) return await bot.reply('*Usage:* chreact on/off');

    try {

      await bot.sock.newsletterReactionMode(message.chat, mode === 'on' ? 'enabled' : 'disabled');
      await bot.reply(`*Reactions ${mode === 'on' ? 'enabled' : 'disabled'}*`);
    } catch (error) {
      console.error('Error toggling:', error);
      await bot.reply(`*Failed to toggle!*\n_Error: ${error.message || 'Unknown error'}_`);
    }
  }
);

// Fetch channel messages
bot(
  {
    name: 'chmsgs',
    info: 'Fetch channel messages',
    category: "channel",
    usage: 'chmsgs <count>'
  },
  async (message, bot) => {
    if (!message.chat.endsWith('@newsletter')) return await bot.reply('This command is for channels only!');
    
    const count = parseInt(message.query) || 5;
    if (count < 1 || count > 20) return await bot.reply('Between 1-20 only!');

    try {
      const messages = await bot.sock.newsletterFetchMessages('direct', message.chat.split('@')[0], count.toString());

      if (!messages?.length) return await bot.reply('No messages found!');

      let reply = `*Last ${messages.length} messages:*\n\n`;
      messages.forEach((msg, index) => {
        const messageContent = msg.message?.message?.conversation || 
                             msg.message?.message?.extendedTextMessage?.text || 
                             '(media or unsupported message type)';
        
        reply += `*${index + 1}:* ${messageContent}\n` +
                 `- Date: ${new Date(msg.message.messageTimestamp * 1000).toLocaleString()}\n` +
                 `- Views: ${msg.views}\n` +
                 `- Reactions: ${msg.reactions.length}\n\n`;
      });

      await bot.reply(reply);
    } catch (error) {
      console.error('Error fetching channel messages:', error);
      await bot.reply(`*Failed to fetch messages!*\n_Error: ${error.message || 'Unknown error'}_`);
    }
  }
);