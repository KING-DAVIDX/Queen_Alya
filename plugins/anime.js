const bot = require("../lib/plugin");
const axios = require("axios")
const config = require("../config");
const fetch = require('node-fetch');

bot(
    {
        name: "gojo",
        info: "gojo amv",
        category: "anime",
        usage: "[message]",
    },
    async(message, bot) => {
        try{
            var res = await axios.get("https://api.nexoracle.com/anime/gojo?apikey=elDrYH7GsuIeBkyw1")
            await bot.sock.sendMessage(message.chat, {video: {url: res.data.result}}, {quoted: message})
        }catch(e) {
            console.log(e)
            return await bot.reply("error: ", e)
        }
    }
)

bot(
  {
    name: "waifu",
    info: "Generate random waifu images",
    category: "Anime",
    usage: "",
  },
  async (message, bot) => {
    try {
      await bot.react('🌸');
      
      // Fetch waifu image
      const waifuResponse = await fetch("https://api.waifu.pics/sfw/waifu");
      if (!waifuResponse.ok) throw new Error("Waifu API request failed");
      const waifuData = await waifuResponse.json();
      
      await bot.sock.sendMessage(
        message.chat,
        {
          image: { url: waifuData.url },
          caption: "Random Waifu Image",
          title: "Waifu Generator",
          footer: "> © QUEEN ALYA",
          media: true,
          interactiveButtons: [
            {
              name: "quick_reply",
              buttonParamsJson: JSON.stringify({
                display_text: "Generate Again",
                id: `${config.PREFIX}waifu`
              })
            }
          ]
        },
        { 
          quoted: {
            key: {
              fromMe: false,
              participant: "867051314767696@bot",
              remoteJid: "@bot"
            },
            message: {
              newsletterAdminInviteMessage: {
                newsletterJid: "120363401730094494@newsletter",
                newsletterName: "KING XER",
                caption: "MADE WITH 🖤",
                inviteExpiration: 1752555592,
                jpegThumbnail: null
              }
            }
          }
        }  
      );
      
    } catch (error) {
      await handleError(error, bot, message, "waifu");
    }
  }
);

bot(
  {
    name: "neko",
    info: "Generate random neko images",
    category: "Anime",
    usage: "",
  },
  async (message, bot) => {
    try {
      await bot.react('🐱');
      
      // Fetch neko image
      const nekoResponse = await fetch("https://api.giftedtech.web.id/api/anime/neko?apikey=_0u5aff45%2C_0l1876s8qc");
      if (!nekoResponse.ok) throw new Error("Neko API request failed");
      const nekoData = await nekoResponse.json();
      
      await bot.sock.sendMessage(
        message.chat,
        {
          image: { url: nekoData.result },
          caption: "Random Neko Image",
          title: "Neko Generator",
          footer: "> © QUEEN ALYA",
          media: true,
          interactiveButtons: [
            {
              name: "quick_reply",
              buttonParamsJson: JSON.stringify({
                display_text: "Generate Again",
                id: `${config.PREFIX}neko`
              })
            }
          ]
        },
        { 
          quoted: {
            key: {
              fromMe: false,
              participant: "867051314767696@bot",
              remoteJid: "@bot"
            },
            message: {
              newsletterAdminInviteMessage: {
                newsletterJid: "120363401730094494@newsletter",
                newsletterName: "KING XER",
                caption: "MADE WITH 🖤",
                inviteExpiration: 1752555592,
                jpegThumbnail: null
              }
            }
          }
        }  
      );
      
    } catch (error) {
      await handleError(error, bot, message, "neko");
    }
  }
);
const animeCharacters = [
  'akira', 'akiyama', 'anna', 'asuna', 'ayuzawa', 'boruto', 'chitanda', 'chitoge', 
  'deidara', 'doraemon', 'elaina', 'emilia', 'asuna', 'erza', 'gremory', 'hestia', 
  'hinata', 'inori', 'itachi', 'isuzu', 'itori', 'kaga', 'kagura', 'kakasih', 'kaori', 
  'kaneki', 'kosaki', 'kotori', 'kuriyama', 'kuroha', 'kurumi', 'madara', 'mikasa', 
  'miku', 'minato', 'naruto', 'natsukawa', 'nekonime', 'nezuko', 'nishimiya', 
  'onepiece', 'pokemon', 'rem', 'rize', 'sagiri', 'sakura', 'sasuke', 'shina', 'shinka', 
  'shizuka', 'shota', 'tomori', 'toukachan', 'tsunade', 'yatogami', 'yuki', 'yuri'
];

// Create a command for each anime character
animeCharacters.forEach(cmdname => {
  bot(
    {
      name: cmdname,
      info: `Generate random ${cmdname} images`,
      category: "Anime",
      usage: "",
    },
    async (message, bot) => {
      try {
        await bot.react('🌸');
        
        // Fetch anime image from your database
        let apiUrl = `https://raw.githubusercontent.com/KazukoGans/database/main/anime/${cmdname}.json`;
        let response = await fetch(apiUrl);
        let jsonResponse = await response.json();

        if (jsonResponse && jsonResponse.length > 0) {
          let randomIndex = Math.floor(Math.random() * jsonResponse.length);
          let randomImageUrl = jsonResponse[randomIndex];
          
          await bot.sock.sendMessage(
            message.chat,
            {
              image: { url: randomImageUrl },
              caption: `Random ${cmdname.charAt(0).toUpperCase() + cmdname.slice(1)} Image`,
              title: `${cmdname.charAt(0).toUpperCase() + cmdname.slice(1)} Generator`,
              footer: "> © QUEEN ALYA",
              media: true,
              interactiveButtons: [
                {
                  name: "quick_reply",
                  buttonParamsJson: JSON.stringify({
                    display_text: "Generate Again",
                    id: `${config.PREFIX}${cmdname}`
                  })
                }
              ]
            },
            { 
              quoted: {
                key: {
                  fromMe: false,
                  participant: "867051314767696@bot",
                  remoteJid: "@bot"
                },
                message: {
                  newsletterAdminInviteMessage: {
                    newsletterJid: "120363401730094494@newsletter",
                    newsletterName: "KING XER",
                    caption: "MADE WITH 🖤",
                    inviteExpiration: 1752555592,
                    jpegThumbnail: null
                  }
                }
              }
            }  
          );
        } else {
          throw new Error("No images found for this character");
        }
        
      } catch (error) {
        await handleError(error, bot, message, cmdname);
      }
    }
  );
});