const bot = require("../lib/plugin");
const ai = require("../lib/modules/ai");
const { downloadContentFromMessage } = require('baileys');
const fetch = require('node-fetch');
const config = require("../config");

// Helper function for error handling
async function handleError(error, bot, message, command) {
    console.error(`Error in ${command}:`, error);
    await bot.reply(`An error occurred while processing your ${command} request. Please try again later.`);
}

// Alya Plugin
bot(
  {
    name: "aigf",
    info: "Talk to your AI girlfriend",
    category: "Ai",
    usage: "[message]"
  },
  async (message, bot) => {
    try {
      const query = message.query;
      if (!query) {
        return await bot.reply(`Please provide a message for your AI girlfriend.\nUsage: *${config.PREFIX}aigf [message]*`);
      }
      const reply = await ai.aigf(query);
      await bot.reply(reply);
    } catch (error) {
      await handleError(error, bot, message, "aigf");
    }
  }
);

// GPT Plugin
bot(
  {
    name: "gpt",
    info: "Chat with OpenAI's GPT model",
    category: "Ai",
    usage: "[message]"
  },
  async (message, bot) => {
    try {
      const query = message.query;
      if (!query) {
        return await bot.reply(`Please provide a message for GPT.\nUsage: *${config.PREFIX}gpt [message]*`);
      }
      const reply = await ai.gpt(query);
      await bot.reply(reply);
    } catch (error) {
      await handleError(error, bot, message, "gpt");
    }
  }
);

// Groq Plugin
bot(
  {
    name: "groq",
    info: "Access the Groq AI model",
    category: "Ai",
    usage: "[message]"
  },
  async (message, bot) => {
    try {
      const query = message.query;
      if (!query) {
        return await bot.reply(`Please provide a message for Groq AI.\nUsage: *${config.PREFIX}groq [message]*`);
      }
      const reply = await ai.groq(query);
      await bot.reply(reply);
    } catch (error) {
      await handleError(error, bot, message, "groq");
    }
  }
);

// Powerbrain Plugin
bot(
  {
    name: "powerbrain",
    info: "Get answers from Powerbrain AI",
    category: "Ai",
    usage: "[message]"
  },
  async (message, bot) => {
    try {
      const query = message.query;
      if (!query) {
        return await bot.reply(`Please provide a message for Powerbrain AI.\nUsage: *${config.PREFIX}powerbrain [message]*`);
      }
      const reply = await ai.powerbrain(query);
      await bot.reply(reply);
    } catch (error) {
      await handleError(error, bot, message, "powerbrain");
    }
  }
);

// XAI Plugin (Extended AI)
bot(
  {
    name: "xai",
    info: "Access extended AI capabilities",
    category: "Ai",
    usage: "[message]"
  },
  async (message, bot) => {
    try {
      const query = message.query;
      if (!query) {
        return await bot.reply(`Please provide a message for XAI.\nUsage: *${config.PREFIX}xai [message]*`);
      }
      const reply = await ai.xai(query);
      await bot.reply(reply);
    } catch (error) {
      await handleError(error, bot, message, "xai");
    }
  }
);

// Gemini Plugin (now with vision capabilities)
bot(
  {
    name: "gemini",
    info: "Chat with Google's Gemini AI (text or image analysis)",
    category: "Ai",
    usage: "[message] (or reply to image with optional question)"
  },
  async (message, bot) => {
    try {
      if (message.quoted?.image) {
        // Image analysis mode
        const prompt = message.query || "describe this image";
        await bot.reply("Analyzing image with Gemini AI... ⏳");

        const downloadStream = await downloadContentFromMessage(
          message.quoted,
          'image'
        );
        
        let buffer = Buffer.from([]);
        for await (const chunk of downloadStream) {
          buffer = Buffer.concat([buffer, chunk]);
        }

        const analysis = await ai.geminiUpload(prompt, buffer, 'image/jpeg');
        await bot.reply(`🔍 Gemini Analysis:\n\n${analysis}`);
      } else {
        // Text mode
        const query = message.query;
        if (!query) {
          return await bot.reply(`Please provide a message for Gemini AI or reply to an image for analysis.\nUsage: *${config.PREFIX}gemini [message]*\nOr reply to image with *${config.PREFIX}gemini [question]*`);
        }
        const reply = await ai.gemini(query);
        await bot.reply(reply);
      }
    } catch (error) {
      await handleError(error, bot, message, "gemini");
    }
  }
);

// Blackbox Plugin
bot(
  {
    name: "blackbox",
    info: "Query the mysterious blackbox AI",
    category: "Ai",
    usage: "[message]"
  },
  async (message, bot) => {
    try {
      const query = message.query;
      if (!query) {
        return await bot.reply(`Please provide a message for Blackbox AI.\nUsage: *${config.PREFIX}blackbox [message]*`);
      }
      const reply = await ai.blackbox(query);
      await bot.reply(reply);
    } catch (error) {
      await handleError(error, bot, message, "blackbox");
    }
  }
);

// TTS Plugin (Text-to-Speech)
bot(
  {
    name: "tts",
    info: "Convert text to speech",
    category: "Ai",
    usage: "[text]",
  },
  async (message, bot) => {
    try {
      const query = message.query;
      if (!query) {
        return await bot.reply(`Please provide text to convert to speech.\nUsage: *${config.PREFIX}tts [text]*`);
      }
      const audioUrl = await ai.tts(query);
      if (audioUrl) {
        await bot.sock.sendMessage(
          message.chat,
          {
            audio: { url: audioUrl },
            mimetype: "audio/mpeg",
            fileName: "tts.mp3",
            ptt: true,
          }
        );
      } else {
        await bot.reply("Sorry, I couldn't generate speech for that text.");
      }
    } catch (error) {
      await handleError(error, bot, message, "tts");
    }
  }
);

// Realistic Image Plugin
bot(
  {
    name: "flux",
    info: "Generate flux-style AI images",
    category: "Ai",
    usage: "[prompt]",
  },
  async (message, bot) => {
    try {
      const query = message.query;
      if (!query) {
        return await bot.reply(`Please provide a prompt for the image generation.\nUsage: *${config.PREFIX}flux [prompt]*`);
      }
      
      const response = await fetch(`https://bk9.fun/ai/fluximg?q=${encodeURIComponent(query)}`);
      const data = await response.json();
      
      if (data.status && data.BK9 && data.BK9[0]) {
        await bot.sock.sendMessage(message.chat, {
          image: { url: data.BK9[0] },
          caption: '> © QUEEN ALYA'
        });
      } else {
        await bot.reply("Failed to generate flux image. Please try again later.");
      }
    } catch (error) {
      await handleError(error, bot, message, "flux");
    }
  }
);

// DALL·E Plugin
bot(
  {
    name: "dalle",
    info: "Generate DALL·E AI images",
    category: "Ai",
    usage: "[prompt]",
  },
  async (message, bot) => {
    try {
      const prompt = message.query;
      if (!prompt) {
        return await bot.reply(`Please provide a prompt for the image generation.\nUsage: *${config.PREFIX}dalle [prompt]*`);
      }
      
      const response = await fetch(`https://bk9.fun/ai/magicstudio?prompt=${encodeURIComponent(prompt)}`);
      
      if (!response.ok) throw new Error("API request failed");
      
      const imageBuffer = await response.buffer();
      
      await bot.sock.sendMessage(message.chat, {
        image: imageBuffer,
        caption: '> © QUEEN ALYA\nGenerated with DALL·E'
      });
      
    } catch (error) {
      await handleError(error, bot, message, "dalle");
    }
  }
);

// Deep Image Plugin
bot(
  {
    name: "deepimg",
    info: "Generate AI images with different styles",
    category: "Ai",
    usage: "[prompt] | [style]"
  },
  async (message, bot) => {
    try {
      const availableStyles = ["Headshot", "Anime", "Tattoo", "ID Photo", "Cartoon", "Fantasy 3D"];
      
      const query = message.query;
      if (!query) {
        let reply = `Please provide a prompt for image generation.\n\n`;
        reply += "Available styles:\n";
        reply += availableStyles.map(style => `- ${style}`).join("\n");
        reply += `\n\nUsage: *${config.PREFIX}deepimg [prompt] | [style]*\nExample: *${config.PREFIX}deepimg A beautiful landscape | Fantasy 3D*`;
        return await bot.reply(reply);
      }

      const [prompt, style] = query.split("|").map(s => s.trim());
      
      if (style && !availableStyles.includes(style)) {
        let reply = `Invalid style "${style}".\n\nAvailable styles:\n`;
        reply += availableStyles.map(s => `- ${s}`).join("\n");
        reply += `\n\nExample: *${config.PREFIX}deepimg A warrior | Anime*`;
        return await bot.reply(reply);
      }

      const imageUrl = await ai.deepimg(prompt, style || "Fantasy 3D");
      
      if (imageUrl) {
        await bot.sendImage(
          message.chat,
          imageUrl,
          '> © QUEEN ALYA'
        );
      } else {
        await bot.reply("Failed to generate image. Please try again later.");
      }
    } catch (error) {
      await handleError(error, bot, message, "deepimg");
    }
  }
);

// Text Translation Plugin
bot(
  {
    name: "translate",
    info: "Translates text or image content to specified language (e.g., 'es' for Spanish, 'fr' for French)",
    category: "Ai",
    usage: "reply to a message with 'translate [lang-code]'"
  },
  async (message, bot) => {
    try {
      if (!message.quoted) {
        return await bot.reply(`Please reply to a message containing text or an image to translate!\nUsage: Reply to a message with *${config.PREFIX}translate [lang-code]*`);
      }

      const targetLang = message.query || 'en';
      
      if (message.quoted.image) {
        const downloadStream = await downloadContentFromMessage(message.quoted, 'image');
        let buffer = Buffer.from([]);
        for await (const chunk of downloadStream) {
          buffer = Buffer.concat([buffer, chunk]);
        }
        
        const translation = await ai.transimg(buffer, targetLang);
        await bot.reply(`🌄 Image Translation (${targetLang}):\n${translation}`);
      } else if (message.quoted.text) {
        const translation = await ai.translate(message.quoted.text, targetLang);
        await bot.reply(`📝 Text Translation (${targetLang}):\n${translation}`);
      } else {
        await bot.reply("The replied message doesn't contain text or an image I can translate.");
      }
    } catch (error) {
      await handleError(error, bot, message, "translate");
    }
  }
);

// OCR Plugin
bot(
  {
    name: "ocr",
    info: "Extracts text from images using optical character recognition",
    category: "Ai",
    usage: "reply to an image with 'ocr'"
  },
  async (message, bot) => {
    try {
      if (!message.quoted?.image) {
        return await bot.reply(`Please reply to an image to extract text!\nUsage: Reply to an image with *${config.PREFIX}ocr*`);
      }
      
      const downloadStream = await downloadContentFromMessage(message.quoted, 'image');
      let buffer = Buffer.from([]);
      for await (const chunk of downloadStream) {
        buffer = Buffer.concat([buffer, chunk]);
      }
      
      const extractedText = await ai.ocr(buffer);
      await bot.reply(extractedText || "No text could be extracted from the image.");
    } catch (error) {
      await handleError(error, bot, message, "ocr");
    }
  }
);