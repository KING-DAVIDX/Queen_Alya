const bot = require("../lib/plugin");
const { downloadContentFromMessage } = require('baileys');
const config = require("../config");
const fs = require('fs');
const path = require('path');

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
      await handleRateLimit();
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

    try {
      await handleRateLimit();
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

    try {
      await handleRateLimit();
      await bot.sock.newsletterUpdateDescription(message.chat, newDesc);
      await bot.reply(`*Description updated:*\n${newDesc}`);
    } catch (error) {
      console.error('Error changing description:', error);
      await bot.reply(`*Failed to update description!*\n_Error: ${error.message || 'Unknown error'}_`);
    }
  }
);

// Set channel profile picture
bot(
  {
    name: 'chpp',
    info: 'Set channel profile picture',
    category: "channel",
    usage: 'Reply to an image with "chpp"'
  },
  async (message, bot) => {
    if (!message.chat.endsWith('@newsletter')) return await bot.reply('This command is for channels only!');
    
    try {


      if (!message.quoted?.image) return await bot.reply('Reply to an image!');

      const downloadStream = await downloadContentFromMessage(message.quoted, 'image');
      let buffer = Buffer.from([]);
      for await (const chunk of downloadStream) {
        buffer = Buffer.concat([buffer, chunk]);
      }
      await bot.sock.newsletterUpdatePicture(message.chat, buffer);
      await bot.reply('*Profile picture updated!*');
    } catch (error) {
      console.error('Error updating picture:', error);
      await bot.reply(`*Failed to update picture!*\n_Error: ${error.message || 'Unknown error'}_`);
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
      await handleRateLimit();
      const metadata = await bot.sock.newsletterMetadata('direct', message.chat.split('@')[0]);
      if (!metadata) return await bot.reply('Failed to get channel info');

      const adminCount = await bot.sock.newsletterAdminCount(message.chat);
      const inviteLink = `https://whatsapp.com/channel/${message.chat.split('@')[0]}`;

      const infoMessage = `*Channel Info*\n\n` +
        `🔹 *Name:* ${metadata.name}\n` +
        `🔹 *Desc:* ${metadata.description || 'None'}\n` +
        `🔹 *Admins:* ${adminCount}\n` +
        `🔹 *Created:* ${new Date(metadata.creation * 1000).toLocaleDateString()}\n` +
        `🔹 *Link:* ${inviteLink}\n`;

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

    try {
      await handleRateLimit();
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
    
    try {
      await handleRateLimit();
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
    
    try {
      await handleRateLimit();
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
    
    try {
      await handleRateLimit();
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
      

      const userJid = message.mentionedJid?.[0];
      if (!userJid) return await bot.reply('Mention a user!');
      await bot.sock.newsletterChangeOwner(message.chat, userJid);
      
      await bot.reply(
        `*Ownership transferred!*\n` +
        `@${userJid.split('@')[0]} is now owner.`,
        { mentions: [userJid] }
      );
    } catch (error) {
      console.error('Error transferring:', error);
      await bot.reply(`*Failed to transfer!*\n_Error: ${error.message || 'Unknown error'}_`);
    }
  }
);

// List followed channels
bot(
  {
    name: 'chlist',
    info: 'List your channels',
    category: "channel",
    usage: 'chlist'
  },
  async (message, bot) => {
    try {
      await handleRateLimit();
      const updates = await bot.sock.newsletterFetchUpdates(null, 100);
      
      if (!updates?.length) return await bot.reply('*No channels found!*');

      const channels = {};
      updates.forEach(update => {
        if (!channels[update.jid]) {
          channels[update.jid] = {
            name: update.name,
            lastUpdate: update.timestamp
          };
        }
      });

      let reply = `*Your Channels (${Object.keys(channels).length}):*\n\n`;
      Object.entries(channels).forEach(([jid, info], index) => {
        reply += `*${index + 1}. ${info.name || 'No Name'}*\n` +
                 `ID: ${jid}\n` +
                 `Last Update: ${new Date(info.lastUpdate * 1000).toLocaleString()}\n\n`;
      });

      await bot.reply(reply);
    } catch (error) {
      console.error('Error listing:', error);
      await bot.reply(`*Failed to list!*\n_Error: ${error.message || 'Unknown error'}_`);
    }
  }
);

// Toggle reactions
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
      await handleRateLimit();
      const messages = await bot.sock.newsletterFetchMessages('direct', message.chat.split('@')[0], count);

      if (!messages?.length) return await bot.reply('No messages found!');

      let reply = `*Last ${messages.length} messages:*\n\n`;
      messages.forEach((msg, index) => {
        reply += `*${index + 1}:* ${msg.content || '(media)'}\n` +
                 `- ${new Date(msg.timestamp * 1000).toLocaleString()}\n\n`;
      });

      await bot.reply(reply);
    } catch (error) {
      console.error('Error fetching:', error);
      await bot.reply(`*Failed to fetch!*\n_Error: ${error.message || 'Unknown error'}_`);
    }
  }
);