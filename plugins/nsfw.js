const fetch = require("node-fetch");
const bot = require("../lib/plugin");
const axios = require('axios');
const apiUrl = "https://fantox-apis.vercel.app"; // Base API URL

// Define multiple commands as cmdname, which will be the endpoint
const cmdnames = ["genshin", "swimsuit", "schoolswimsuit", "white", "barefoot", "touhou", "gamecg", "hololive", "uncensored", "sunglasses", "glasses", "weapon", "shirtlift", "chain", "fingering", "flatchest", "torncloth", "bondage", "demon", "wet", "pantypull", "headdress", "headphone", "tie", "anusview", "shorts", "stokings", "topless", "beach", "bunnygirl", "bunnyear", "idol", "vampire", "gun", "maid", "bra", "nobra", "bikini", "whitehair", "blonde", "pinkhair", "bed", "ponytail", "nude", "dress", "underwear", "foxgirl", "uniform", "skirt", "sex", "sex2", "sex3", "breast", "twintail", "spreadpussy", "tears", "seethrough", "breasthold", "drunk", "fateseries", "spreadlegs", "openshirt", "headband", "nipples", "erectnipples", "horns", "greenhair", "wolfgirl", "catgirl"];

cmdnames.forEach(cmdname => {
  bot(
    {
      name: cmdname,
      info: `Generate ${cmdname} images`,
      category: "nsfw"
    },
    async (message, bot) => {
      try {
        let res = await fetch(`${apiUrl}/${cmdname}`);
        let json = await res.json();
        const imageUrl = json.url;
        if (imageUrl) {
          await bot.sendImage(
            message.chat,
            imageUrl,
            '> © QUEEN ALYA'
          );
        } else {
          await bot.reply(message, "Failed to generate nsfw image. Please try again later.");
        }
      } catch (error) {
        console.error(`Error in ${cmdname} command:`, error);
        await bot.reply(message, "An error occurred while processing your request.");
      }
    }
  );
});

bot(
  {
    name: "xnsearch",
    info: "Search xnxx",
    category: "nsfw",
  },
  async (message, bot) => {
    try {
      const query = message.query;
      if (!query) {
        await bot.reply("⚠️ Please provide a search query");
        return;
      }

      const search = await axios.get(`https://api.giftedtech.web.id/api/search/xnxxsearch?apikey=_0u5aff45,_0l1876s8qc&query=${query}`);
      
if (!search.data || !search.data.results) {
  throw new Error("❌ Invalid API response structure");
}

const results = search.data.results;
  
if (!results || results.length === 0) {
  await bot.reply("🔎 No results found for your query");
  return;
}

// Take only the first 12 results
const limitedResults = results.slice(0, 12);

// Format the results with emojis
const formattedResults = limitedResults.map(item => {
  return `🎬 *${item.title || 'No title'}*\n` +
         `🔗 URL: ${item.link || 'Not available'}\n` +
         `${item.quality ? `📊 Quality: ${item.quality}\n` : ''}`;
}).join("\n\n");

await bot.reply(`${formattedResults}`);

} catch (error) {
  console.error("🔴 Error in search command:", error);
  await bot.reply(`❌ An error occurred: ${error.message || 'Unknown error'}`);
}
  }
);

bot(
  {
    name: "xvsearch",
    info: "Search xvideos",
    category: "nsfw",
  },
  async (message, bot) => {
    try {
      const query = message.query;
      if (!query) {
        await bot.reply("⚠️ Please provide a search query");
        return;
      }

      const search = await axios.get(`https://api.giftedtech.web.id/api/search/xvideossearch?apikey=_0u5aff45,_0l1876s8qc&query=${query}`);
      
if (!search.data || !search.data.results) {
  throw new Error("❌ Invalid API response structure");
}

const results = search.data.results;
  
if (!results || results.length === 0) {
  await bot.reply("🔎 No results found for your query");
  return;
}

// Take only the first 12 results
const limitedResults = results.slice(0, 12);

// Format the results with emojis
const formattedResults = limitedResults.map(item => {
  return `🎬 *${item.title || 'No title'}*\n` +
         `⏱️ Duration: ${item.duration || 'Unknown'}\n` +
         `🖼️ Thumbnail: ${item.thumb || 'Not available'}\n` +
         `🔗 URL: ${item.url || 'Not available'}\n` +
         `${item.quality ? `📊 Quality: ${item.quality}\n` : ''}`;
}).join("\n\n");

await bot.reply(`${formattedResults}`);

} catch (error) {
  console.error("🔴 Error in search command:", error);
  await bot.reply(`❌ An error occurred: ${error.message || 'Unknown error'}`);
}
  }
);
bot(
    {
        name: "xvdl",
        info: "Downloads media from supported URLs",
        category: "nsfw"
    },
    async (message, bot) => {
        if (!message.query) {
            return await bot.reply("Please provide a URL to download!");
        }

        try {
            const apiUrl = `https://api.giftedtech.web.id/api/download/xvideosdl?apikey=_0u5aff45,_0l1876s8qc&url=${encodeURIComponent(message.query)}`;
            const response = await fetch(apiUrl);
            const data = await response.json();

            if (!data.success) {
                return await bot.reply("Failed to download from the provided URL.");
            }

            const result = data.result;
            const caption = `*Title:* ${result.title}\n` +
                          `*Views:* ${result.views}\n` +
                          `*Likes:* ${result.likes}\n` +
                          `*Dislikes:* ${result.dislikes}\n` +
                          `*Size:* ${result.size}`;

           await bot.sock.sendMessage(message.chat,
{ 
video: { url: result.download_url },
caption: caption
}
);
        } catch (error) {
            console.error("Download error:", error);
            await bot.reply("Failed to download. Please check the URL and try again.");
        }
    }
);

bot(
    {
        name: "xndl",
        info: "Downloads media from supported URLs",
        category: "nsfw"
    },
    async (message, bot) => {
        if (!message.query) {
            return await bot.reply("Please provide a URL to download!");
        }

        try {
            const apiUrl = `https://api.giftedtech.web.id/api/download/xnxxdl?apikey=_0u5aff45,_0l1876s8qc&url=${encodeURIComponent(message.query)}`;
            const response = await fetch(apiUrl);
            const data = await response.json();

            if (!data.success) {
                return await bot.reply("Failed to download from the provided URL.");
            }

            const result = data.result;
            const caption = `*Title:* ${result.title}\n` +
                          `*Duration:* ${result.duration}\n` +
                          `*Quality:* High Resolution\n` +
                          `*Info:* ${result.info}`;

            // Send the high resolution video
            await bot.sock.sendMessage(message.chat, { 
                video: { url: result.files.high },
                caption: caption
            });

        } catch (error) {
            console.error("Download error:", error);
            await bot.reply("Failed to download. Please check the URL and try again.");
        }
    }
);