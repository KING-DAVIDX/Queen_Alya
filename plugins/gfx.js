const bot = require("../lib/plugin");

bot(
  {
    name: "gfx",
    info: "Generate GFX images with two text inputs",
    category: "gfx",
  },
  async (message, bot) => {
    const query = message.query;
    if (!query) return await bot.reply("Please provide two texts separated by ;\nExample: gfx king;david");
    
    // Split the query into two parts
    const [text1, text2] = query.split(";").map(t => t.trim());
    if (!text1 || !text2) return await bot.reply("Please provide both texts separated by ;\nExample: gfx king;david");
    
    try {
      // Encode the texts for URL
      const encodedText1 = encodeURIComponent(text1);
      const encodedText2 = encodeURIComponent(text2);
      
      // Construct the API URL
      const apiUrl = `https://api.nexoracle.com/image-creating/gfx?apikey=free_key@maher_apis&text1=${encodedText1}&text2=${encodedText2}`;
      
      // Send the image
      await bot.sock.sendMessage(
        message.chat,
        {
          image: { url: apiUrl },
          caption: `> © QUEEN ALYA`
        }
      );
    } catch (error) {
      console.error("Error generating GFX:", error);
      await bot.reply("Failed to generate the image. Please try again later.");
    }
  }
);
bot(
  {
    name: "gfx2",
    info: "Generate GFX images with two text inputs",
    category: "gfx",
  },
  async (message, bot) => {
    const query = message.query;
    if (!query) return await bot.reply("Please provide two texts separated by ;\nExample: gfx2 king;david");
    
    // Split the query into two parts
    const [text1, text2] = query.split(";").map(t => t.trim());
    if (!text1 || !text2) return await bot.reply("Please provide both texts separated by ;\nExample: gfx2 king;david");
    
    try {
      // Encode the texts for URL
      const encodedText1 = encodeURIComponent(text1);
      const encodedText2 = encodeURIComponent(text2);
      
      // Construct the API URL
      const apiUrl = `https://api.nexoracle.com/image-creating/gfx2?apikey=free_key@maher_apis&text1=${encodedText1}&text2=${encodedText2}`;
      
      // Send the image
      await bot.sock.sendMessage(
        message.chat,
        {
          image: { url: apiUrl },
          caption: `> © QUEEN ALYA`
        }
      );
    } catch (error) {
      console.error("Error generating GFX2:", error);
      await bot.reply("Failed to generate the image. Please try again later.");
    }
  }
);
bot(
  {
    name: "gfx3",
    info: "Generate GFX images with two text inputs",
    category: "gfx",
  },
  async (message, bot) => {
    const query = message.query;
    if (!query) return await bot.reply("Please provide two texts separated by ;\nExample: gfx king;david");
    
    // Split the query into two parts
    const [text1, text2] = query.split(";").map(t => t.trim());
    if (!text1 || !text2) return await bot.reply("Please provide both texts separated by ;\nExample: gfx3 king;david");
    
    try {
      // Encode the texts for URL
      const encodedText1 = encodeURIComponent(text1);
      const encodedText2 = encodeURIComponent(text2);
      
      // Construct the API URL
      const apiUrl = `https://api.nexoracle.com/image-creating/gfx3?apikey=free_key@maher_apis&text1=${encodedText1}&text2=${encodedText2}`;
      
      // Send the image
      await bot.sock.sendMessage(
        message.chat,
        {
          image: { url: apiUrl },
          caption: `> © QUEEN ALYA`
        }
      );
    } catch (error) {
      console.error("Error generating GFX3:", error);
      await bot.reply("Failed to generate the image. Please try again later.");
    }
  }
);
bot(
  {
    name: "gfx4",
    info: "Generate GFX images with two text inputs",
    category: "gfx",
  },
  async (message, bot) => {
    const query = message.query;
    if (!query) return await bot.reply("Please provide two texts separated by ;\nExample: gfx4 king;david");
    
    // Split the query into two parts
    const [text1, text2] = query.split(";").map(t => t.trim());
    if (!text1 || !text2) return await bot.reply("Please provide both texts separated by ;\nExample: gfx4 king;david");
    
    try {
      // Encode the texts for URL
      const encodedText1 = encodeURIComponent(text1);
      const encodedText2 = encodeURIComponent(text2);
      
      // Construct the API URL
      const apiUrl = `https://api.nexoracle.com/image-creating/gfx4?apikey=free_key@maher_apis&text1=${encodedText1}&text2=${encodedText2}`;
      
      // Send the image
      await bot.sock.sendMessage(
        message.chat,
        {
          image: { url: apiUrl },
          caption: `> © QUEEN ALYA`
        }
      );
    } catch (error) {
      console.error("Error generating GFX4:", error);
      await bot.reply("Failed to generate the image. Please try again later.");
    }
  }
);
bot(
  {
    name: "gfx5",
    info: "Generate GFX images with three text inputs",
    category: "gfx",
  },
  async (message, bot) => {
    const query = message.query;
    if (!query) return await bot.reply("Please provide three texts separated by ;\nExample: gfx5 king;its me;dev");
    
    // Split the query into three parts
    const [text1, text2, text3] = query.split(";").map(t => t.trim());
    if (!text1 || !text2 || !text3) return await bot.reply("Please provide all three texts separated by ;\nExample: gfx5 king;its me;dev");
    
    try {
      // Encode the texts for URL
      const encodedText1 = encodeURIComponent(text1);
      const encodedText2 = encodeURIComponent(text2);
      const encodedText3 = encodeURIComponent(text3);
      
      // Construct the API URL
      const apiUrl = `https://api.nexoracle.com/image-creating/gfx5?apikey=free_key@maher_apis&text1=${encodedText1}&text2=${encodedText2}&text3=${encodedText3}`;
      
      // Send the image
      await bot.sock.sendMessage(
        message.chat,
        {
          image: { url: apiUrl },
          caption: `> © QUEEN ALYA`
        }
      );
    } catch (error) {
      console.error("Error generating GFX5:", error);
      await bot.reply("Failed to generate the image. Please try again later.");
    }
  }
);
bot(
  {
    name: "gfx6",
    info: "Generate GFX images with three text inputs",
    category: "gfx",
  },
  async (message, bot) => {
    const query = message.query;
    if (!query) return await bot.reply("Please provide three texts separated by ;\nExample: gfx6 king;its me;dev");
    
    // Split the query into three parts
    const [text1, text2, text3] = query.split(";").map(t => t.trim());
    if (!text1 || !text2 || !text3) return await bot.reply("Please provide all three texts separated by ;\nExample: gfx6 king;its me;dev");
    
    try {
      // Encode the texts for URL
      const encodedText1 = encodeURIComponent(text1);
      const encodedText2 = encodeURIComponent(text2);
      const encodedText3 = encodeURIComponent(text3);
      
      // Construct the API URL
      const apiUrl = `https://api.nexoracle.com/image-creating/gfx6?apikey=free_key@maher_apis&text1=${encodedText1}&text2=${encodedText2}&text3=${encodedText3}`;
      
      // Send the image
      await bot.sock.sendMessage(
        message.chat,
        {
          image: { url: apiUrl },
          caption: `> © QUEEN ALYA`
        }
      );
    } catch (error) {
      console.error("Error generating GFX6:", error);
      await bot.reply("Failed to generate the image. Please try again later.");
    }
  }
);
bot(
  {
    name: "gfx7",
    info: "Generate GFX images with two text inputs",
    category: "gfx",
  },
  async (message, bot) => {
    const query = message.query;
    if (!query) return await bot.reply("Please provide two texts separated by ;\nExample: gfx7 king;david");
    
    // Split the query into two parts
    const [text1, text2] = query.split(";").map(t => t.trim());
    if (!text1 || !text2) return await bot.reply("Please provide both texts separated by ;\nExample: gfx7 king;david");
    
    try {
      // Encode the texts for URL
      const encodedText1 = encodeURIComponent(text1);
      const encodedText2 = encodeURIComponent(text2);
      
      // Construct the API URL
      const apiUrl = `https://api.nexoracle.com/image-creating/gfx7?apikey=free_key@maher_apis&text1=${encodedText1}&text2=${encodedText2}`;
      
      // Send the image
      await bot.sock.sendMessage(
        message.chat,
        {
          image: { url: apiUrl },
          caption: `> © QUEEN ALYA`
        }
      );
    } catch (error) {
      console.error("Error generating GFX7:", error);
      await bot.reply("Failed to generate the image. Please try again later.");
    }
  }
);
bot(
  {
    name: "gfx8",
    info: "Generate GFX images with two text inputs",
    category: "gfx",
  },
  async (message, bot) => {
    const query = message.query;
    if (!query) return await bot.reply("Please provide two texts separated by ;\nExample: gfx8 king;david");
    
    // Split the query into two parts
    const [text1, text2] = query.split(";").map(t => t.trim());
    if (!text1 || !text2) return await bot.reply("Please provide both texts separated by ;\nExample: gfx8 king;david");
    
    try {
      // Encode the texts for URL
      const encodedText1 = encodeURIComponent(text1);
      const encodedText2 = encodeURIComponent(text2);
      
      // Construct the API URL
      const apiUrl = `https://api.nexoracle.com/image-creating/gfx8?apikey=free_key@maher_apis&text1=${encodedText1}&text2=${encodedText2}`;
      
      // Send the image
      await bot.sock.sendMessage(
        message.chat,
        {
          image: { url: apiUrl },
          caption: `> © QUEEN ALYA`
        }
      );
    } catch (error) {
      console.error("Error generating GFX8:", error);
      await bot.reply("Failed to generate the image. Please try again later.");
    }
  }
);
bot(
  {
    name: "gfx9",
    info: "Generate GFX images with text input",
    category: "gfx",
  },
  async (message, bot) => {
    const query = message.query;
    if (!query) return await bot.reply("Please provide text for the image\nExample: gfx9 KING XER");
    
    try {
      // Encode the text for URL
      const encodedText = encodeURIComponent(query);
      
      // Construct the API URL
      const apiUrl = `https://api.nexoracle.com/image-creating/gfx9?apikey=free_key@maher_apis&text=${encodedText}`;
      
      // Send the image
      await bot.sock.sendMessage(
        message.chat,
        {
          image: { url: apiUrl },
          caption: `> © QUEEN ALYA`
        }
      );
    } catch (error) {
      console.error("Error generating GFX9:", error);
      await bot.reply("Failed to generate the image. Please try again later.");
    }
  }
);
bot(
  {
    name: "gfx10",
    info: "Generate GFX images with text input",
    category: "gfx",
  },
  async (message, bot) => {
    const query = message.query;
    if (!query) return await bot.reply("Please provide text for the image\nExample: gfx10 KING XER");
    
    try {
      // Encode the text for URL
      const encodedText = encodeURIComponent(query);
      
      // Construct the API URL
      const apiUrl = `https://api.nexoracle.com/image-creating/gfx10?apikey=free_key@maher_apis&text=${encodedText}`;
      
      // Send the image
      await bot.sock.sendMessage(
        message.chat,
        {
          image: { url: apiUrl },
          caption: `> © QUEEN ALYA`
        }
      );
    } catch (error) {
      console.error("Error generating GFX10:", error);
      await bot.reply("Failed to generate the image. Please try again later.");
    }
  }
);
bot(
  {
    name: "gfx11",
    info: "Generate GFX images with text input",
    category: "gfx",
  },
  async (message, bot) => {
    const query = message.query;
    if (!query) return await bot.reply("Please provide text for the image\nExample: gfx11 KING XER");
    
    try {
      // Encode the text for URL
      const encodedText = encodeURIComponent(query);
      
      // Construct the API URL
      const apiUrl = `https://api.nexoracle.com/image-creating/gfx11?apikey=free_key@maher_apis&text=${encodedText}`;
      
      // Send the image
      await bot.sock.sendMessage(
        message.chat,
        {
          image: { url: apiUrl },
          caption: `> © QUEEN ALYA`
        }
      );
    } catch (error) {
      console.error("Error generating GFX11:", error);
      await bot.reply("Failed to generate the image. Please try again later.");
    }
  }
);
bot(
  {
    name: "gfx12",
    info: "Generate GFX images with text input",
    category: "gfx",
  },
  async (message, bot) => {
    const query = message.query;
    if (!query) return await bot.reply("Please provide text for the image\nExample: gfx12 KING XER");
    
    try {
      // Encode the text for URL
      const encodedText = encodeURIComponent(query);
      
      // Construct the API URL
      const apiUrl = `https://api.nexoracle.com/image-creating/gfx12?apikey=free_key@maher_apis&text=${encodedText}`;
      
      // Send the image
      await bot.sock.sendMessage(
        message.chat,
        {
          image: { url: apiUrl },
          caption: `> © QUEEN ALYA`
        }
      );
    } catch (error) {
      console.error("Error generating GFX12:", error);
      await bot.reply("Failed to generate the image. Please try again later.");
    }
  }
);