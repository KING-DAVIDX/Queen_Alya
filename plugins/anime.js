const bot = require("../lib/plugin");
const axios = require("axios")

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