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