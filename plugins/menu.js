const { setupMenuModule } = require("../lib/menu");
const bot = require("../lib/plugin");

// Get the plugin system instance at the top level
const pluginSystem = bot.system;

bot(
    {
        name: "menu",
        info: "Show all available commands",
        category: "general"
    },
    async (message, bot) => {
        const menuModule = await setupMenuModule(bot.sock, pluginSystem);
        await menuModule.handleMenuCommand(message);
    }
);

bot(
    {
        name: "menutype",
        info: "Change menu type between v1 and v10",
        category: "System",
        usage: "menutype v1 to menutype v10"
    },
    async (message, bot) => {
        const menuModule = await setupMenuModule(bot.sock, pluginSystem);
        await menuModule.handleMenuTypeCommand(message);
    }
);