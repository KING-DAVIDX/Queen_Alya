const bot = require("../lib/plugin");
const axios = require("axios")

bot(
    {
        name: "animelist",
        info: "anime list",
        category: "anime",
        usage: "[message]",
    },
    async(message, bot) => {
        if(!message.query) return bot.reply
    }
)