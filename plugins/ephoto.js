const bot = require("../lib/plugin");

bot(
  {
    name: "aov",
    info: "Generate AOV images with text input",
    category: "ephoto",
  },
  async (message, bot) => {
    const query = message.query;
    if (!query) return await bot.reply("Please provide text for the image\nExample: aov KING XER");
    
    try {
      // Encode the text for URL
      const encodedText = encodeURIComponent(query);
      
      // Construct the API URL
      const apiUrl = `https://api.nexoracle.com/ephoto360/shimmering-aov-avaters?apikey=free_key@maher_apis&text=${encodedText}`;
      
      // Send the image
      await bot.sock.sendMessage(
        message.chat,
        {
          image: { url: apiUrl },
          caption: `> © QUEEN ALYA`
        }
      );
    } catch (error) {
      console.error("Error generating AOV:", error);
      await bot.reply("Failed to generate the image. Please try again later.");
    }
  }
);

bot(
  {
    name: "avengers",
    info: "Generate AVENGERS images with two text inputs",
    category: "ephoto",
  },
  async (message, bot) => {
    const query = message.query;
    if (!query) return await bot.reply("Please provide two texts separated by ;\nExample: avengers king;david");
    
    // Split the query into two parts
    const [text1, text2] = query.split(";").map(t => t.trim());
    if (!text1 || !text2) return await bot.reply("Please provide both texts separated by ;\nExample: avengers king;david");
    
    try {
      // Encode the texts for URL
      const encodedText1 = encodeURIComponent(text1);
      const encodedText2 = encodeURIComponent(text2);
      
      // Construct the API URL
      const apiUrl = `https://api.nexoracle.com/ephoto360/avengers?apikey=free_key@maher_apis&text1=${encodedText1}&text2=${encodedText2}`;
      
      // Send the image
      await bot.sock.sendMessage(
        message.chat,
        {
          image: { url: apiUrl },
          caption: `> © QUEEN ALYA`
        }
      );
    } catch (error) {
      console.error("Error generating AVENGERS:", error);
      await bot.reply("Failed to generate the image. Please try again later.");
    }
  }
);

bot(
  {
    name: "america",
    info: "Generate American images with text input",
    category: "ephoto",
  },
  async (message, bot) => {
    const query = message.query;
    if (!query) return await bot.reply("Please provide text for the image\nExample: america KING XER");
    
    try {
      // Encode the text for URL
      const encodedText = encodeURIComponent(query);
      
      // Construct the API URL
      const apiUrl = `https://api.nexoracle.com/ephoto360/american-flag-3d?apikey=free_key@maher_apis&text=${encodedText}`;
      
      // Send the image
      await bot.sock.sendMessage(
        message.chat,
        {
          image: { url: apiUrl },
          caption: `> © QUEEN ALYA`
        }
      );
    } catch (error) {
      console.error("Error generating FLAG:", error);
      await bot.reply("Failed to generate the image. Please try again later.");
    }
  }
);

bot(
  {
    name: "angel",
    info: "Generate ANGEL images with text input",
    category: "ephoto",
  },
  async (message, bot) => {
    const query = message.query;
    if (!query) return await bot.reply("Please provide text for the image\nExample: angel KING XER");
    
    try {
      // Encode the text for URL
      const encodedText = encodeURIComponent(query);
      
      // Construct the API URL
      const apiUrl = `https://api.nexoracle.com/ephoto360/angel-wings?apikey=free_key@maher_apis&text=${encodedText}`;
      
      // Send the image
      await bot.sock.sendMessage(
        message.chat,
        {
          image: { url: apiUrl },
          caption: `> © QUEEN ALYA`
        }
      );
    } catch (error) {
      console.error("Error generating angel:", error);
      await bot.reply("Failed to generate the image. Please try again later.");
    }
  }
);

bot(
  {
    name: "angel2",
    info: "Generate ANGEL images with text input",
    category: "ephoto",
  },
  async (message, bot) => {
    const query = message.query;
    if (!query) return await bot.reply("Please provide text for the image\nExample: angel2 KING XER");
    
    try {
      // Encode the text for URL
      const encodedText = encodeURIComponent(query);
      
      // Construct the API URL
      const apiUrl = `https://api.nexoracle.com/ephoto360/angel-wings2?apikey=free_key@maher_apis&text=${encodedText}`;
      
      // Send the image
      await bot.sock.sendMessage(
        message.chat,
        {
          image: { url: apiUrl },
          caption: `> © QUEEN ALYA`
        }
      );
    } catch (error) {
      console.error("Error generating angel:", error);
      await bot.reply("Failed to generate the image. Please try again later.");
    }
  }
);

bot(
  {
    name: "hacker",
    info: "Generate HACKER images with text input",
    category: "ephoto",
  },
  async (message, bot) => {
    const query = message.query;
    if (!query) return await bot.reply("Please provide text for the image\nExample: hacker KING XER");
    
    try {
      // Encode the text for URL
      const encodedText = encodeURIComponent(query);
      
      // Construct the API URL
      const apiUrl = `https://api.nexoracle.com/ephoto360/annonymous-hacker?apikey=free_key@maher_apis&text=${encodedText}`;
      
      // Send the image
      await bot.sock.sendMessage(
        message.chat,
        {
          image: { url: apiUrl },
          caption: `> © QUEEN ALYA`
        }
      );
    } catch (error) {
      console.error("Error generating hacker:", error);
      await bot.reply("Failed to generate the image. Please try again later.");
    }
  }
);

bot(
  {
    name: "cake",
    info: "Generate CAKE images with text input",
    category: "ephoto",
  },
  async (message, bot) => {
    const query = message.query;
    if (!query) return await bot.reply("Please provide text for the image\nExample: cake KING XER");
    
    try {
      // Encode the text for URL
      const encodedText = encodeURIComponent(query);
      
      // Construct the API URL
      const apiUrl = `https://api.nexoracle.com/ephoto360/anniversary-cake?apikey=free_key@maher_apis&text=${encodedText}`;
      
      // Send the image
      await bot.sock.sendMessage(
        message.chat,
        {
          image: { url: apiUrl },
          caption: `> © QUEEN ALYA`
        }
      );
    } catch (error) {
      console.error("Error generating cake:", error);
      await bot.reply("Failed to generate the image. Please try again later.");
    }
  }
);

bot(
  {
    name: "blackpink",
    info: "Generate Black pink images with text input",
    category: "ephoto",
  },
  async (message, bot) => {
    const query = message.query;
    if (!query) return await bot.reply("Please provide text for the image\nExample: black pink KING XER");
    
    try {
      // Encode the text for URL
      const encodedText = encodeURIComponent(query);
      
      // Construct the API URL
      const apiUrl = `https://api.nexoracle.com/ephoto360/blackpink?apikey=free_key@maher_apis&text=${encodedText}`;
      
      // Send the image
      await bot.sock.sendMessage(
        message.chat,
        {
          image: { url: apiUrl },
          caption: `> © QUEEN ALYA`
        }
      );
    } catch (error) {
      console.error("Error generating black pink:", error);
      await bot.reply("Failed to generate the image. Please try again later.");
    }
  }
);

bot(
  {
    name: "blackpink2",
    info: "Generate Black pink images with text input",
    category: "ephoto",
  },
  async (message, bot) => {
    const query = message.query;
    if (!query) return await bot.reply("Please provide text for the image\nExample: black pink KING XER");
    
    try {
      // Encode the text for URL
      const encodedText = encodeURIComponent(query);
      
      // Construct the API URL
      const apiUrl = `https://api.nexoracle.com/ephoto360/blackpink2?apikey=free_key@maher_apis&text=${encodedText}`;
      
      // Send the image
      await bot.sock.sendMessage(
        message.chat,
        {
          image: { url: apiUrl },
          caption: `> © QUEEN ALYA`
        }
      );
    } catch (error) {
      console.error("Error generating black pink:", error);
      await bot.reply("Failed to generate the image. Please try again later.");
    }
  }
);

bot(
  {
    name: "blackpink3",
    info: "Generate Black pink images with text input",
    category: "ephoto",
  },
  async (message, bot) => {
    const query = message.query;
    if (!query) return await bot.reply("Please provide text for the image\nExample: black pink KING XER");
    
    try {
      // Encode the text for URL
      const encodedText = encodeURIComponent(query);
      
      // Construct the API URL
      const apiUrl = `https://api.nexoracle.com/ephoto360/blackpink-neon?apikey=free_key@maher_apis&text=${encodedText}`;
      
      // Send the image
      await bot.sock.sendMessage(
        message.chat,
        {
          image: { url: apiUrl },
          caption: `> © QUEEN ALYA`
        }
      );
    } catch (error) {
      console.error("Error generating black pink:", error);
      await bot.reply("Failed to generate the image. Please try again later.");
    }
  }
);
// Array of all ephoto360 commands
const ephotoCommands = [
  {
    name: "bloody1",
    info: "Create Bloody Text 1 effect",
    category: "ephoto",
    async func(message, bot) {
      return generateEphoto(message, bot, "bloody-text1", ["text"]);
    }
  },
  {
    name: "bloody2",
    info: "Create Bloody Text 2 effect",
    category: "ephoto",
    async func(message, bot) {
      return generateEphoto(message, bot, "bloody-text2", ["text"]);
    }
  },
  {
    name: "ballons",
    info: "Create Ballons Cards effect (needs 2 texts separated by |)",
    category: "ephoto",
    async func(message, bot) {
      return generateEphoto(message, bot, "ballons-cards", ["text1", "text2"]);
    }
  },
  {
    name: "beach3d",
    info: "Create Beach 3D text effect",
    category: "ephoto",
    async func(message, bot) {
      return generateEphoto(message, bot, "beach-text-3d", ["text"]);
    }
  },
  {
    name: "bokeh",
    info: "Create Bokeh text effect",
    category: "ephoto",
    async func(message, bot) {
      return generateEphoto(message, bot, "bokeh-text", ["text"]);
    }
  },
  {
    name: "graffiti",
    info: "Create Cartoon Graffiti effect",
    category: "ephoto",
    async func(message, bot) {
      return generateEphoto(message, bot, "cartoon-style-graffiti", ["text"]);
    }
  },
  {
    name: "cloud",
    info: "Create Cloud text effect",
    category: "ephoto",
    async func(message, bot) {
      return generateEphoto(message, bot, "cloud-effects", ["text"]);
    }
  },
  {
    name: "captamerica",
    info: "Create Captain America effect (needs 2 texts separated by |)",
    category: "ephoto",
    async func(message, bot) {
      return generateEphoto(message, bot, "captain-america", ["text1", "text2"]);
    }
  },
  {
    name: "christmas",
    info: "Create Christmas Glittering effect",
    category: "ephoto",
    async func(message, bot) {
      return generateEphoto(message, bot, "christmas-glittering-3d", ["text"]);
    }
  }
];

// Common function to handle all ephoto generation
async function generateEphoto(message, bot, endpoint, params) {
  const query = message.query;
  if (!query) {
    const example = params.length === 2 ? "text1|text2" : "your text here";
    return await bot.reply(`Please provide text for the image\nExample: .${message.command} ${example}`);
  }

  try {
    let urlParams = "";
    if (params.length === 1) {
      urlParams = `${params[0]}=${encodeURIComponent(query)}`;
    } else {
      const [text1, text2] = query.split("|");
      if (!text2) return await bot.reply(`This effect needs two texts separated by |\nExample: text1|text2`);
      urlParams = `${params[0]}=${encodeURIComponent(text1)}&${params[1]}=${encodeURIComponent(text2)}`;
    }

    const apiUrl = `https://api.nexoracle.com/ephoto360/${endpoint}?apikey=free_key@maher_apis&${urlParams}`;
    
    await bot.sock.sendMessage(
      message.chat,
      {
        image: { url: apiUrl },
        caption: `> © QUEEN ALYA`
      }
    );
  } catch (error) {
    console.error(`Error generating ${endpoint}:`, error);
    await bot.reply("Failed to generate the image. Please try again later.");
  }
}

// Register all commands
ephotoCommands.forEach(cmd => {
  bot(cmd, cmd.func);
});

bot(
  {
    name: "dragon",
    info: "Generate Dragon ball images with text input",
    category: "ephoto",
  },
  async (message, bot) => {
    const query = message.query;
    if (!query) return await bot.reply("Please provide text for the image\nExample: dragon KING XER");
    
    try {
      // Encode the text for URL
      const encodedText = encodeURIComponent(query);
      
      // Construct the API URL
      const apiUrl = `https://api.nexoracle.com/ephoto360/dragon-ball?apikey=free_key@maher_apis&text=${encodedText}`;
      
      // Send the image
      await bot.sock.sendMessage(
        message.chat,
        {
          image: { url: apiUrl },
          caption: `> © QUEEN ALYA`
        }
      );
    } catch (error) {
      console.error("Error generating DRAGON:", error);
      await bot.reply("Failed to generate the image. Please try again later.");
    }
  }
);
