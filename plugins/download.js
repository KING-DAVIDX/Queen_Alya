const plugins = require("../lib/plugin");
const downloader = require('../lib/modules/download');
const config = require("../config");
const bot = require("../lib/plugin");
const fs = require('fs');
const path = require('path');

// Store play command contexts
const playContexts = new Map();
// Play command to search YouTube
bot(
  {
    name: "play",
    info: "Search and download YouTube content",
    category: "Download",
    usage: "play [query]"
  },
  async (message, bot) => {
    try {
      const query = message.args.join(' ').trim();
      if (!query) {
        return await message.send(
          `Usage: ${config.PREFIX}play [query]\nExample: ${config.PREFIX}play ozeba`,
          { fromMe: true }
        );
      }

      // Search YouTube for the query
      const searchResults = await downloader.searchYouTube(query);
      if (!searchResults || searchResults.length === 0) {
        return await message.send("No results found for your query.", { fromMe: true });
      }

      // Get the first result
      const firstResult = searchResults[0];
      const ytUrl = firstResult.url; // Use direct URL

      // Send options to user
      const optionsMessage = await message.send(
        `🎵 *${firstResult.title}*\n\n` +
        `Choose download option:\n` +
        `1. Audio\n` +
        `2. Video (720p)\n\n` +
        `Reply with the number of your choice.`,
        { fromMe: true }
      );

      // Store context for reply handling
      playContexts.set(message.sender, {
        ytUrl,
        optionsMessageId: optionsMessage.key.id,
        timestamp: Date.now()
      });
    } catch (error) {
      console.error('Error in play command:', error);
      await message.send("An error occurred while searching YouTube.", { fromMe: true });
    }
  }
);

// Play reply handler
bot(
  {
    on: 'text',
    name: "play-reply",
    ignoreRestrictions: true
  },
  async (message, bot) => {
    try {
      // Skip processing if:
      // - Message is from the bot itself
      // - Message should be ignored
      if (message.isBot || message.skipAlya) return;
      
      // Check if this is a reply to a play options message
      const isReplyToPlay = message.quoted?.fromMe;
      if (!isReplyToPlay) return;

      const context = playContexts.get(message.sender);
      if (!context || context.optionsMessageId !== message.quoted?.id) return;

      // Check if context is too old (5 minutes)
      if (Date.now() - context.timestamp > 300000) {
        playContexts.delete(message.sender);
        return;
      }

      const choice = (message.content || message.text || '').trim();
      const ytUrl = context.ytUrl;

      if (choice === '1') {
        // Audio download
        await message.send("⏳ Downloading audio...", { fromMe: true });
        
        const audioApiUrl = `https://kord-api.vercel.app/ytmp3?url=${encodeURIComponent(ytUrl)}`;
        const audioResponse = await fetch(audioApiUrl);
        const audioData = await audioResponse.json();
        
        if (audioData.success && audioData.data?.downloadUrl) {
          await bot.sock.sendMessage(
            message.chat,
            { 
              audio: { url: audioData.data.downloadUrl }
            },
            { quoted: message }
          );
        } else {
          await message.send("Failed to download audio. Please try again later.", { fromMe: true });
        }
      } else if (choice === '2') {
        // Video download - specifically look for 720p
        await message.send("⏳ Downloading video...", { fromMe: true });
        
        const videoApiUrl = `https://kord-api.vercel.app/ytdl?url=${encodeURIComponent(ytUrl)}`;
        const videoResponse = await fetch(videoApiUrl);
        const videoData = await videoResponse.json();
        
        if (videoData.downloads && videoData.downloads.length > 0) {
          // Find the 720p video specifically
          const videoDownload = videoData.downloads.find(d => !d.isAudio && d.quality === '720p');
          if (videoDownload) {
            await bot.sock.sendMessage(
              message.chat,
              {
                video: { url: videoDownload.url },
                caption: `🎥 ${videoData.title}`
              },
              { quoted: message }
            );
          } else {
            await message.send("Video not available. Try audio instead.", { fromMe: true });
          }
        } else {
          await message.send("Failed to download video. Please try again later.", { fromMe: true });
        }
      } else {
        await message.send("Invalid choice. Please reply with either 1 (audio) or 2 (video).", { fromMe: true });
      }

      // Clear the context after processing
      playContexts.delete(message.sender);
    } catch (error) {
      console.error('Error in play reply handler:', error);
      await message.send("An error occurred while processing your request.", { fromMe: true });
      playContexts.delete(message.sender);
    }
  }
);