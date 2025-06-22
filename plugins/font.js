const bot = require("../lib/plugin");
const fancy = require("../lib/font/fancy");

bot(
    {
        name: "fancy",
        info: "Generates fancy text in different styles",
        category: "tools",
        usage: "fancy <text> | fancy list <text> | fancy <styleIndex> <text>"
    },
    async (message, bot) => {
        const query = message.query.trim();

        if (!query) {
            return await bot.reply("Please provide some text to convert! Usage: fancy <text>");
        }

        if (query.toLowerCase().startsWith("list")) {
            let text = query.substring(5).trim();
            if (!text) text = "QUEEN ALYA";

            const styles = fancy.listall(text);
            let response = "✨ *Queen Alya Fancy Text Generator* ✨\n\n";
            response += `Here are all available styles for "${text}":\n\n`;
            
            // Add numbering to each style
            response += styles.map((style, index) => `${index}. ${style}`).join("\n");
            response += `\n\nTotal styles available: ${styles.length}`;
            response += `\nUsage: fancy <number> <text> (e.g., fancy 5 hello)`;

            return await bot.reply(response);
        }

        // Check if it's like "35 hello"
        const parts = query.split(" ");
        const index = parseInt(parts[0], 10);

        if (!isNaN(index) && parts.length > 1) {
            const text = parts.slice(1).join(" ");
            const styledText = fancy.getStyle(index, text);

            if (!styledText) {
                return await bot.reply(`Sorry style #${index} doesn't exist. Try a number between 0 and ${fancy.listall("test").length - 1}.`);
            }

            return await bot.reply(`✨ *Queen Alya Fancy Style #${index}* ✨\n\n` + styledText);
        }

        // Default random style
        const fancyText = fancy.randomStyle(query);

        await bot.reply(`✨ *Queen Alya Fancy Text* ✨\n` + 
                       `Original: ${query}\n` +
                       `Fancy: ${fancyText}\n\n` +
                       `Tip: Use "fancy list" to see all styles or "fancy <number> <text>" for a specific style`);
    }
);