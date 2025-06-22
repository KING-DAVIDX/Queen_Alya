const bot = require("../lib/plugin");

bot(
  {
    name: "carbon",
    info: "Generate carbon images with text input",
    category: "image",
  },
  async (message, bot) => {
    const query = message.query;
    if (!query) return await bot.reply("Please provide text for the image\nExample: carbon KING XER");
    
    try {
      // Encode the text for URL
      const encodedText = encodeURIComponent(query);
      
      // Construct the API URL
      const apiUrl = `https://api.nexoracle.com/image-creating/carbon-img?apikey=free_key@maher_apis&text=${encodedText}`;
      
      // Send the image
      await bot.sock.sendMessage(
        message.chat,
        {
          image: { url: apiUrl },
          caption: `> © QUEEN ALYA`
        }
      );
    } catch (error) {
      console.error("Error generating CARBON:", error);
      await bot.reply("Failed to generate the image. Please try again later.");
    }
  }
);

bot(
  {
    name: "note",
    info: "Generate note images with text input",
    category: "image",
  },
  async (message, bot) => {
    const query = message.query;
    if (!query) return await bot.reply("Please provide text for the image\nExample: note KING XER");
    
    try {
      // Encode the text for URL
      const encodedText = encodeURIComponent(query);
      
      // Construct the API URL
      const apiUrl = `https://api.nexoracle.com/image-creating/notes?apikey=free_key@maher_apis&text=${encodedText}`;
      
      // Send the image
      await bot.sock.sendMessage(
        message.chat,
        {
          image: { url: apiUrl },
          caption: `> © QUEEN ALYA`
        }
      );
    } catch (error) {
      console.error("Error generating NOTE:", error);
      await bot.reply("Failed to generate the image. Please try again later.");
    }
  }
);
bot(
  {
    name: "quotemaker",
    info: "Generate Quote images with two text inputs",
    category: "image",
  },
  async (message, bot) => {
    const query = message.query;
    if (!query) return await bot.reply("Please provide two texts separated by ;\nExample: quote king;david");
    
    // Split the query into two parts
    const [text1, text2] = query.split(";").map(t => t.trim());
    if (!text1 || !text2) return await bot.reply("Please provide both texts separated by ;\nExample: quote king;david");
    
    try {
      // Encode the texts for URL
      const encodedText1 = encodeURIComponent(text1);
      const encodedText2 = encodeURIComponent(text2);
      
      // Construct the API URL
      const apiUrl = `https://api.nexoracle.com/image-creating/quotes-maker?apikey=free_key@maher_apis&text1=${encodedText1}&text2=${encodedText2}`;
      
      // Send the image
      await bot.sock.sendMessage(
        message.chat,
        {
          image: { url: apiUrl },
          caption: `> © QUEEN ALYA`
        }
      );
    } catch (error) {
      console.error("Error generating quote:", error);
      await bot.reply("Failed to generate the image. Please try again later.");
    }
  }
);

bot(
  {
    name: "qr",
    info: "Generate qr images with text input",
    category: "image",
  },
  async (message, bot) => {
    const query = message.query;
    if (!query) return await bot.reply("Please provide text for the image\nExample: qr KING XER");
    
    try {
      // Encode the text for URL
      const encodedText = encodeURIComponent(query);
      
      // Construct the API URL
      const apiUrl = `https://api.nexoracle.com/image-creating/qr-code?apikey=free_key@maher_apis&text=${encodedText}`;
      
      // Send the image
      await bot.sock.sendMessage(
        message.chat,
        {
          image: { url: apiUrl },
          caption: `> © QUEEN ALYA`
        }
      );
    } catch (error) {
      console.error("Error generating QR:", error);
      await bot.reply("Failed to generate the image. Please try again later.");
    }
  }
);

bot(
  {
    name: "ytcomment",
    info: "Generate yt comment images with two text inputs",
    category: "image",
  },
  async (message, bot) => {
    const query = message.query;
    if (!query) return await bot.reply("Please provide two texts separated by ;\nExample: ytcomment king;david");
    
    // Split the query into two parts
    const [text1, text2] = query.split(";").map(t => t.trim());
    if (!text1 || !text2) return await bot.reply("Please provide both texts separated by ;\nExample: ytcomment king;david");
    
    try {
      // Encode the texts for URL
      const encodedText1 = encodeURIComponent(text1);
      const encodedText2 = encodeURIComponent(text2);
      
      // Construct the API URL
      const apiUrl = `https://api.nexoracle.com/image-creating/yt-comment?apikey=free_key@maher_apis&username=${encodedText1}&text=${encodedText2}&img=https://cdn-icons-png.flaticon.com/512/9187/9187604.png`;
      
      // Send the image
      await bot.sock.sendMessage(
        message.chat,
        {
          image: { url: apiUrl },
          caption: `> © QUEEN ALYA`
        }
      );
    } catch (error) {
      console.error("Error generating ytcomment:", error);
      await bot.reply("Failed to generate the image. Please try again later.");
    }
  }
);