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
      // Download image using Axios
      const response = await axios.get(message.query, {
        responseType: 'arraybuffer',
        headers: {
          'User-Agent': 'Mozilla/5.0'
        }
      });

      const buffer = Buffer.from(response.data);

      // Update channel picture
      await bot.sock.newsletterUpdatePicture(message.chat, buffer);
      await bot.reply('✅ Channel profile picture updated successfully!');

    } catch (error) {
      console.error('CHPP Error:', error);
      await bot.reply(`❌ Failed to update picture!\nReason: ${error.message || 'Invalid image URL'}`);
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
// Change channel owner
bot(
  {
    name: 'chowner',
    info: 'Transfer channel ownership',
    category: "channel",
    usage: 'chowner 2349123721026'
  },
  async (message, bot) => {
    if (!message.chat.endsWith('@newsletter')) return await bot.reply('This command is for channels only!');
    
    try {
      let userQuery = message.query.trim();
      if (!userQuery) return await bot.reply('Please provide a number, e.g. chowner 2349123721026');
      
      // Format the number properly
      if (!userQuery.includes('@s.whatsapp.net')) {
        userQuery = `${userQuery.replace(/[^0-9]/g, '')}@s.whatsapp.net`;
      }
      
      // Check if the user is on WhatsApp and get their LID
      const [userCheck] = await bot.sock.onWhatsApp(userQuery);
      if (!userCheck?.exists) return await bot.reply('User not found on WhatsApp');
      
      const userLid = userCheck.lid;
      if (!userLid) return await bot.reply('Could not get user LID');
      
      await bot.sock.newsletterChangeOwner(message.chat, userLid);
      
      await bot.reply(
        `*Ownership transferred!*\n` +
        `New owner: ${userCheck.jid.split('@')[0]}`
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
    
    const count = parseInt(message.query);
    if (isNaN(count) || count < 1 || count > 20) return await bot.reply('Between 1-20 only!');

    try {
      const messages = await bot.sock.newsletterFetchMessages('jid', message.chat, count.toString());

      if (!messages?.length) return await bot.reply('No messages found!');

      let reply = `*Last ${messages.length} messages:*\n\n`;
      messages.forEach((msg, index) => {
        // Extract message content
        let messageContent = '';
        if (msg.message?.message) {
          if (msg.message.message.conversation) {
            messageContent = msg.message.message.conversation;
          } else if (msg.message.message.extendedTextMessage?.text) {
            messageContent = msg.message.message.extendedTextMessage.text;
          } else if (msg.message.message.imageMessage) {
            messageContent = '[Image]';
          } else if (msg.message.message.videoMessage) {
            messageContent = '[Video]';
          } else {
            messageContent = '[Media or unsupported message type]';
          }
        } else {
          messageContent = '[No message content]';
        }
        
        reply += `*${index + 1}:* ${messageContent}\n` +
                 `- Date: ${new Date(msg.message.messageTimestamp * 1000).toLocaleString()}\n` +
                 `- Views: ${msg.views || 0}\n` +
                 `- Reactions: ${msg.reactions?.length || 0}\n\n`;
      });

      await bot.reply(reply);
    } catch (error) {
      console.error('Error fetching channel messages:', error);
      await bot.reply(`*Failed to fetch messages!*\n_Error: ${error.message || 'Unknown error'}_`);
    }
  }
);