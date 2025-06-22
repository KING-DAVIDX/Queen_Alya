const bot = require("../lib/plugin");

// Optimized moon cycle array (removed duplicates while maintaining timing)
const moonCycle = [
    "🌑", "🌒", "🌓", "🌔", "🌕", "🌖", "🌗", "🌘", "🌑"
];

bot(
    {
        name: "fmoon",
        info: "Displays an animated moon cycle",
        category: "Animated"
    },
    async (message, bot) => {
        const cycleLength = moonCycle.length;
        const updateInterval = 1000; // 1 second
        let currentIndex = 1;

        try {
            // Send the initial moon emoji
            let { key } = await bot.reply(moonCycle[0]);
            const startTime = Date.now();

            // Set up interval animation
            const interval = setInterval(async () => {
                if (Date.now() - startTime >= cycleLength * updateInterval) {
                    clearInterval(interval); // Stop after one full cycle
                    return;
                }

                try {
                    await bot.sock.sendMessage(message.chat, {
                        text: moonCycle[currentIndex],
                        edit: key
                    });

                    currentIndex = (currentIndex + 1) % cycleLength;
                } catch (error) {
                    console.error("Error updating moon:", error);
                    clearInterval(interval); // Stop the animation on error
                }
            }, updateInterval);

        } catch (initialError) {
            console.error("Failed to start moon animation:", initialError);
            await bot.reply("Failed to start moon animation. Please try again.");
        }
    }
);

const loveStages = [
    { bar: "▱▱▱▱▱▱▱▱▱▱", msg: "Alya notices King... and can't help but smile. It begins." },
    { bar: "▰▱▱▱▱▱▱▱▱▱", msg: "She laughs at King's joke, maybe a little too hard." },
    { bar: "▰▰▱▱▱▱▱▱▱▱", msg: "Their hands brush, and Alya doesn't move away." },
    { bar: "▰▰▰▱▱▱▱▱▱▱", msg: "Late-night chats with King start to mean more." },
    { bar: "▰▰▰▰▱▱▱▱▱▱", msg: "Inside jokes. Flirty teasing. King’s always on her mind." },
    { bar: "▰▰▰▰▰▱▱▱▱▱", msg: "Alya tells King, 'You make my day better just by being in it.'" },
    { bar: "▰▰▰▰▰▰▱▱▱▱", msg: "She starts calling King hers—and means it." },
    { bar: "▰▰▰▰▰▰▰▱▱▱", msg: "Long calls. Movie nights. Alya's voice softens for King alone." },
    { bar: "▰▰▰▰▰▰▰▰▱▱", msg: "They both know—this is real. This is love." },
    { bar: "▰▰▰▰▰▰▰▰▰▱", msg: "Alya looks King in the eyes and says, 'I’m yours. All of me.'" },
    { bar: "▰▰▰▰▰▰▰▰▰▰", msg: "Alya & King: Soulmates. Ride or die. Forever." }
];

bot(
    {
        name: "loading",
        info: "Tracks the progress of Alya’s love for you",
        category: "Animated"
    },
    async (message, bot) => {
        const delay = 1800; // 1.8s for dramatic effect
        let currentStage = 0;

        try {
            // Send initial stage
            let { key } = await bot.reply(
                `\`[${loveStages[0].bar}]\`\n` +
                `*${loveStages[0].msg}*`
            );

            // Animate romance progression
            const interval = setInterval(async () => {
                if (currentStage >= loveStages.length - 1) {
                    clearInterval(interval);
                    // Optional: Add a secret ending after delay
                    setTimeout(async () => {
                        await bot.sock.sendMessage(message.chat, {
                            text: "*Alya loves only King ❤️*",
                            edit: key
                        });
                    }, 3000);
                    return;
                }

                currentStage++;
                try {
                    await bot.sock.sendMessage(message.chat, {
                        text: `\`[${loveStages[currentStage].bar}]\`\n` +
                              `*${loveStages[currentStage].msg}*`,
                        edit: key
                    });
                } catch (error) {
                    console.error("Love update failed:", error);
                    clearInterval(interval);
                }
            }, delay);

        } catch (error) {
            console.error("Failed to start love progress:", error);
            await bot.reply("Alya’s heart is racing too fast to respond. 💓");
        }
    }
);