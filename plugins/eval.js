const bot = require("../lib/plugin");
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

// JavaScript evaluation handler (> prefix)
bot(
    {
        on: 'text',
        match: /^>/,  // Match messages starting with >
        description: "Evaluates JavaScript code",
        usage: "> <js code>"
    },
    async (message, bot) => {
       await bot.react("🍁");
        const fullText = message.content || message.text;
        const code = fullText.slice(1).trim();  // Remove the > prefix
        
        if (!code) {
            return await bot.reply("Please provide JavaScript code to evaluate after >");
        }

        try {
            let result = await (async () => {
          const sock = bot
          const m = message
          return await eval(`(async () => { ${code} })()`);
        })();
        
            const output = typeof result !== 'string' 
                ? util.inspect(result, { depth: null })
                : result;

            await bot.reply(output);
        } catch (error) {
            await bot.reply(`⚠️ JavaScript Error: ${error.message}`);
        }
    }
);

// Shell command execution handler ($ prefix)
bot(
    {
        on: 'text',
        match: /^\$/,  // Match messages starting with $
        description: "Executes shell commands",
        usage: "$ <command>"
    },
    async (message, bot) => {
        await bot.react("🍁");
        const fullText = message.content || message.text;
        const command = fullText.slice(1).trim();  // Remove the $ prefix
        
        if (!command) {
            return await bot.reply("Please provide a shell command to execute after $");
        }

        try {
            const { stdout, stderr } = await execPromise(command);
            const output = stdout || stderr || "Command executed (no output)";
            await bot.reply(output);
        } catch (error) {
            await bot.reply(`⚠️ Shell Error: ${error.message}`);
        }
    }
);