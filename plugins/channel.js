const bot = require("../lib/plugin");
const axios = require("axios");
const newsletterJid = "120363418404777886@newsletter";

bot(
    {
        name: "technews",
        info: "Get the latest tech news and post to newsletter",
        category: "Tech"
    },
    async (message, bot) => {
        try {
            // Post 5 tech news items
            for (let i = 0; i < 5; i++) {
                try {
                    let res = await axios.get("https://ab-technews.abrahamdw882.workers.dev/");
                    let newsData = res.data;
                    
                    // Format the news post with default creator
                    const newsMessage = `📱 *Tech News Update* 📱\n\n` +
                                       `${newsData.news}\n\n` +
                                       `> # KingTechInc`;
                    
                    // If thumbnail exists, send image with caption
                    if (newsData.thumbnail) {
                        await bot.sock.sendMessage(newsletterJid, {
                            image: { url: newsData.thumbnail },
                            caption: newsMessage
                        });
                    } else {
                        // If no thumbnail, send just the text
                        await bot.sock.sendMessage(newsletterJid, {
                            text: newsMessage
                        });
                    }
                    
                    // Add delay between posts (2 seconds)
                    if (i < 4) {
                        await new Promise(resolve => setTimeout(resolve, 2000));
                    }
                    
                } catch (error) {
                    console.error(`Error fetching/sending news #${i+1}:`, error);
                    // Continue with next news if one fails
                }
            }
            
        } catch (error) {
            console.error("Error in technews command:", error);
            await bot.reply("An error occurred while processing the tech news request.");
        }
    }
);