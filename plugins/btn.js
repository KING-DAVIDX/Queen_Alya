const bot = require("../lib/plugin");
const config = require("../config");
bot(
    {
        name: "button",
        info: "Sends a message with interactive buttons",
        category: "Utility"
    },
    async (message, bot) => {
        await bot.sock.sendMessage(message.chat, {
            text: "Hello World!",
            footer: "Baileys - 2025",
            buttons: [
                {
                    buttonId: `${config.PREFIX}menu`,  // You can change this to any command you want
                    buttonText: {
                        displayText: 'Menu'
                    },
                    type: 1 
                },
                {
                    buttonId: `${config.PREFIX}alive`,
                    buttonText: {
                        displayText: 'Alive'
                    },
                    type: 1
                }
            ],
            headerType: 1,
            viewOnce: true
        }, { quoted: null });
    }
);