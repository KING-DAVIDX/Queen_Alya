const bot = require("../lib/plugin");
const axios = require("axios");
const fetch = require('node-fetch');

bot(
    {
        name: "joke",
        info: "Sends jokes",
        category: "Fun"
    },
    async (message, bot) => {
        const xex = await axios.get("https://api.nexoracle.com/misc/jokes2?apikey=free_key@maher_apis");
        const reply = xex.data.result.joke;
        await bot.reply(reply);
    }
);

bot(
    {
        name: "fact",
        info: "Sends random facts",
        category: "Fun"
    },
    async (message, bot) => {
        const xex = await axios.get("https://api.nexoracle.com/misc/facts?apikey=free_key@maher_apis");
        const reply = xex.data.result.fact;
        await bot.reply(reply);
    }
);

bot(
    {
        name: "insult",
        info: "Sends random insults",
        category: "Fun"
    },
    async (message, bot) => {
        const xex = await axios.get("https://api.nexoracle.com/misc/insult-lines?apikey=free_key@maher_apis");
        const reply = xex.data.result;
        await bot.reply(reply);
    }
);

bot(
    {
        name: "dare",
        info: "Sends random dares",
        category: "Fun"
    },
    async (message, bot) => {
        const xex = await axios.get("https://api.giftedtech.web.id/api/fun/dares?apikey=_0u5aff45%2C_0l1876s8qc");
        const reply = xex.data.result;
        await bot.reply(reply);
    }
);

bot(
    {
        name: "advice",
        info: "Sends random advice",
        category: "Fun"
    },
    async (message, bot) => {
        const xex = await axios.get("https://api.giftedtech.web.id/api/fun/advice?apikey=_0u5aff45%2C_0l1876s8qc");
        const reply = xex.data.result;
        await bot.reply(reply);
    }
);

bot(
    {
        name: "rizz",
        info: "Sends random rizz messages",
        category: "Fun"
    },
    async (message, bot) => {
        const xex = await axios.get("https://api.giftedtech.web.id/api/fun/flirt?apikey=_0u5aff45%2C_0l1876s8qc");
        const reply = xex.data.result;
        await bot.reply(reply);
    }
);

bot(
    {
        name: "valetine",
        info: "Sends random valentine's messages",
        category: "Fun"
    },
    async (message, bot) => {
        const xex = await axios.get("https://api.giftedtech.web.id/api/fun/valentines?apikey=_0u5aff45%2C_0l1876s8qc");
        const reply = xex.data.result;
        await bot.reply(reply);
    }
);

bot(
    {
        name: "goodnight",
        info: "Sends random goodnight messages",
        category: "Fun"
    },
    async (message, bot) => {
        const xex = await axios.get("https://api.giftedtech.web.id/api/fun/goodnight?apikey=_0u5aff45%2C_0l1876s8qc");
        const reply = xex.data.result;
        await bot.reply(reply);
    }
);

bot(
    {
        name: "quote",
        info: "Sends random quotes",
        category: "Fun"
    },
    async (message, bot) => {
        const xex = await axios.get("https://api.giftedtech.web.id/api/fun/quotes?apikey=_0u5aff45%2C_0l1876s8qc");
        const reply = xex.data.result;
        await bot.reply(reply);
    }
);

bot(
    {
        name: "truth",
        info: "Sends random truths",
        category: "Fun"
    },
    async (message, bot) => {
        const xex = await axios.get("https://api.giftedtech.web.id/api/fun/truth?apikey=_0u5aff45%2C_0l1876s8qc");
        const reply = xex.data.result;
        await bot.reply(reply);
    }
);
const characterTraits = [
    "Sigma", "Generous", "Grumpy", "Overconfident", "Obedient", 
    "Good", "Simple", "Kind", "Patient", "Pervert", "Cool", 
    "Helpful", "Brilliant", "Sexy", "Hot", "Gorgeous", 
    "Cute", "Fabulous", "Funny"
];

bot(
    {
        name: "character",
        info: "Assigns a random character trait to a user",
        category: "fun"
    },
    async (message, bot) => {
        let userJid;
        
        // Get the target user from mentions or replied message
        if (message.mentionedJid?.length > 0) {
            userJid = message.mentionedJid[0];
        } 
        else if (message.quoted?.participant) {
            userJid = message.quoted.participant;
        }
        else if (message.quoted?.sender) {
            userJid = message.quoted.sender;
        }

        if (!userJid) {
            return await bot.reply(
                `Please mention a user (@user) or reply to their message to assign a random character trait.\n` +
                `Example usage: *!character @user*`
            );
        }

        // Get a random trait
        const randomTrait = characterTraits[Math.floor(Math.random() * characterTraits.length)];
        
        // Send the response mentioning the user
        return await bot.sock.sendMessage(message.chat, {
            text: `*@${userJid.split('@')[0]}* is a *${randomTrait}* type of person!`,
            mentions: [userJid]
        });
    }
);

bot(
    {
        name: "myip",
        info: "Gets the bot's public IP address",
        category: "Fun"
    },
    async (message, bot) => {
        try {
            const response = await axios.get("https://api.ipify.org/");
            const ipAddress = response.data;
            await bot.reply(`*Bot's Public IP:* \`${ipAddress}\``);
        } catch (error) {
            console.error("IP fetch error:", error);
            await bot.reply("❌ Failed to fetch IP address. Please try again later.");
        }
    }
);

bot(
    {
        name: "ngl",
        info: "Sends anonymous messages via NGL",
        category: "Fun",
        usage: "ngl username | message"
    },
    async (message, bot) => {
        // Split the query by | to separate username and message
        const parts = message.query.trim().split('|').map(part => part.trim());
        
        if (parts.length < 2 || !parts[0] || !parts[1]) {
            return await bot.reply("Please provide both a username and a message separated by |\nExample: .ngl username | Hello there!");
        }

        const username = parts[0];
        const userMessage = parts[1];

        try {
            // Perform a GET request using axios to send the NGL message
            const apiUrl = `https://itzpire.com/tools/ngl?username=${encodeURIComponent(username)}&message=${encodeURIComponent(userMessage)}`;
            
            const response = await axios.get(apiUrl);

            if (response.data.status === "success") {
                // Construct a reply message using the returned data
                await bot.reply(`NGL message sent successfully!\nMessage ID: ${response.data.result.questionId}\nRegion: ${response.data.result.userRegion}`);
            } else {
                await bot.reply("Failed to send the NGL message. Please try again.");
            }
        } catch (error) {
            await bot.reply(`Error occurred while sending the message: ${error.message}`);
        }
    }
);
