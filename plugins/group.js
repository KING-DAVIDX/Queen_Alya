const bot = require("../lib/plugin");
const { downloadContentFromMessage } = require('baileys');
const { S_WHATSAPP_NET } = require('baileys');
const config = require("../config");
const fs = require('fs');
const path = require('path');

const jsonDir = path.join(__dirname, '../lib', 'json');
if (!fs.existsSync(jsonDir)) {
    fs.mkdirSync(jsonDir, { recursive: true });
}

const antiwordPath = path.join(jsonDir, 'antiword.json');
if (!fs.existsSync(antiwordPath)) {
    fs.writeFileSync(antiwordPath, JSON.stringify({ 
        bannedWords: [],
        groups: {}
    }, null, 2));
}

let antiwordState = {
    bannedWords: [],
    groups: {}
};

try {
    antiwordState = JSON.parse(fs.readFileSync(antiwordPath, 'utf-8'));
} catch (error) {
    console.error('Error loading antiword.json:', error);
}

bot(
    {
        name: "accept",
        info: "Accept group join requests",
        category: "group"
    },
    async (message, bot) => {
        await handleRequestAction(message, bot, 'approve');
    }
);

bot(
    {
        name: "active",
        info: "Shows most active users in the group",
        category: "group"
    },
    async (message, bot) => {
        if (!message.chat.endsWith('@g.us')) {
            return await bot.reply("This command only works in groups!");
        }

        try {
            const chatHistory = await store.getChatHistory(message.chat);
            if (!chatHistory?.length) {
                return await bot.reply("No message history available for this chat.");
            }

            const userActivity = {};
            for (const entry of chatHistory) {
                try {
                    const msg = JSON.parse(entry.message);
                    if (msg.key?.fromMe) continue;
                    const participant = msg.key?.participant || msg.key?.remoteJid;
                    if (!participant) continue;
                    const username = msg.pushName || participant.split('@')[0];
                    userActivity[participant] = userActivity[participant] || { username, count: 0 };
                    userActivity[participant].count++;
                } catch (e) {
                    console.error('Message parse error:', e);
                }
            }

            const users = Object.entries(userActivity).map(([id, data]) => ({
                id, 
                username: data.username,
                count: data.count
            }));

            if (!users.length) {
                return await bot.reply("No user activity data available.");
            }

            const topUsers = users.sort((a, b) => b.count - a.count).slice(0, 10);
            await bot.sock.sendMessage(message.chat, {
                text: `*TOP 10 ACTIVE USERS*\n\n` +
                      topUsers.map((u, i) => `${i+1}. @${u.username} - ${u.count} messages`).join('\n') +
                      `\n\nTotal users: ${users.length}`,
                mentions: topUsers.map(u => u.id)
            });
        } catch (error) {
            console.error('Active command error:', error);
            await bot.reply("Error processing active users data.");
        }
    }
);

bot(
    {
        name: "add",
        info: "Add participant",
        category: "group"
    },
    async (message, bot) => {
        if (!message.chat.endsWith('@g.us')) return await bot.reply('_This command is specifically for groups_');
        let num = message.query;
        if (!num) return await bot.reply(`hi ${message.pushName}, please type the number of a user to add`);
        let user = num.replace(/[^0-9]/g, '') + '@s.whatsapp.net';
        try {
            await bot.sock.groupParticipantsUpdate(message.chat, [user], 'add');
            return await bot.sock.sendMessage(message.chat, {
                text: `*_@${user.split('@')[0]}, has been added to The Group!_*`,
                mentions: [user],
            });
        } catch (error) {
            return await bot.reply(`Failed to add user. Error: ${error.message}`);
        }
    }
);

bot(
    {
        name: "antiword",
        info: "Manages antiword settings",
        category: "group"
    },
    async (message, bot) => {
        if (!message.chat.endsWith('@g.us')) return;
        const metadata = await bot.sock.groupMetadata(message.chat);
        const isAdmin = metadata.participants.find(p => p.id === message.sender)?.admin;
        if (!message.isOwner(message.sender) && !isAdmin) {
            return await message.send("You need to be an admin to use this command.");
        }

        const action = message.args[0]?.toLowerCase();
        const chatId = message.chat;

        if (!antiwordState.groups[chatId]) {
            antiwordState.groups[chatId] = {
                enabled: config.ANTIWORD_MODE === "true",
                mode: config.ANTIWORD_ACTION || "warn"
            };
        }

        const settings = antiwordState.groups[chatId];

        switch (action) {
            case 'add':
                const word = message.args.slice(1).join(' ').toLowerCase();
                if (!word) return await message.send("Usage: antiword add [word]");
                if (!antiwordState.bannedWords.includes(word)) {
                    antiwordState.bannedWords.push(word);
                    fs.writeFileSync(antiwordPath, JSON.stringify(antiwordState, null, 2));
                    return await message.send(`Added "${word}" to banned words list.`);
                } else {
                    return await message.send(`"${word}" is already in the banned words list.`);
                }
            case 'remove':
                const wordToRemove = message.args.slice(1).join(' ').toLowerCase();
                if (!wordToRemove) return await message.send("Usage: antiword remove [word]");
                const index = antiwordState.bannedWords.indexOf(wordToRemove);
                if (index !== -1) {
                    antiwordState.bannedWords.splice(index, 1);
                    fs.writeFileSync(antiwordPath, JSON.stringify(antiwordState, null, 2));
                    return await message.send(`Removed "${wordToRemove}" from banned words list.`);
                } else {
                    return await message.send(`"${wordToRemove}" is not in the banned words list.`);
                }
            case 'list':
                const wordList = antiwordState.bannedWords.length > 0 
                    ? antiwordState.bannedWords.map(word => `- ${word}`).join('\n')
                    : 'No words currently banned.';
                return await message.send(
                    `Antiword settings for this group:\n` +
                    `Status: ${settings.enabled ? 'ON' : 'OFF'}\n` +
                    `Default action: ${settings.mode}\n` +
                    `Banned words:\n${wordList}`
                );
            case 'on':
                settings.enabled = true;
                fs.writeFileSync(antiwordPath, JSON.stringify(antiwordState, null, 2));
                return await message.send("Antiword has been enabled for this group.");
            case 'off':
                settings.enabled = false;
                fs.writeFileSync(antiwordPath, JSON.stringify(antiwordState, null, 2));
                return await message.send("Antiword has been disabled for this group.");
            case 'mode':
                const newMode = message.args[1]?.toLowerCase();
                if (!newMode || !['warn', 'delete', 'kick'].includes(newMode)) {
                    return await message.send("Usage: antiword mode [warn|delete|kick]");
                }
                if (message.isOwner(message.sender)) {
                    const success = updateConfig({ ANTIWORD_ACTION: newMode });
                    if (success) {
                        return await message.send(`Global antiword action set to "${newMode}".`);
                    } else {
                        return await message.send("Failed to update global antiword action.");
                    }
                } else {
                    settings.mode = newMode;
                    fs.writeFileSync(antiwordPath, JSON.stringify(antiwordState, null, 2));
                    return await message.send(`Antiword action set to "${newMode}" for this group.`);
                }
            default:
                return await message.send(
                    `Antiword Usage:\n\n` +
                    `${config.PREFIX}antiword add [word] - Add banned word\n` +
                    `${config.PREFIX}antiword remove [word] - Remove banned word\n` +
                    `${config.PREFIX}antiword list - Show banned words\n` +
                    `${config.PREFIX}antiword on - Enable antiword\n` +
                    `${config.PREFIX}antiword off - Disable antiword\n` +
                    `${config.PREFIX}antiword mode [warn|delete|kick] - Set action`
                );
        }
    }
);

bot(
    {
        name: "demote",
        info: "Demote admin to participant",
        category: "group"
    },
    async (message, bot) => {
        if (!message.chat.endsWith('@g.us')) {
            return await bot.reply('_This command only works in groups!_');
        }
        let userJid;
        if (message.mentionedJid?.length > 0) {
            userJid = message.mentionedJid[0];
        } 
        else if (message.quoted?.participant) {
            userJid = message.quoted.participant;
        }
        else if (message.quoted?.sender) {
            userJid = message.quoted.sender;
        } else {
            return await bot.reply(`❌ Please mention a user or reply to their message to demote them.`);
        }
        try {
            await bot.sock.groupParticipantsUpdate(message.chat, [userJid], 'demote');
            return await bot.sock.sendMessage(message.chat, {
                text: `⬇️ @${userJid.split('@')[0]} has been demoted from admin.`,
                mentions: [userJid]
            });
        } catch (error) {
            console.error('Demote error:', error);
            return await bot.reply(`❌ Failed to demote user. ${error.message.includes('403') ? 'The bot needs admin rights.' : error.message}`);
        }
    }
);

bot(
    {
        name: "gdesc",
        info: "Change group description",
        category: "group"
    },
    async (message, bot) => {
        if (!message.chat.endsWith('@g.us')) return await bot.reply('_This command is specifically for groups_');
        const newDesc = message.query;
        if (!newDesc) return await bot.reply(`Please provide the new group description`);
        try {
            await bot.sock.groupUpdateDescription(message.chat, newDesc);
            return await bot.reply(`Group description has been updated to:\n${newDesc}`);
        } catch (error) {
            return await bot.reply(`Failed to change group description. Error: ${error.message}`);
        }
    }
);

bot(
    {
        name: "getgpp",
        info: "Get group profile picture",
        category: "group"
    },
    async (message, bot) => {
        if (!message.chat.endsWith('@g.us')) {
            return await bot.reply('_This command only works in groups!_');
        }
        try {
            const groupPicUrl = await bot.sock.profilePictureUrl(message.chat, "image").catch(() => null);
            if (!groupPicUrl) {
                return await bot.reply('*This group has no profile picture!*');
            }
            await bot.sock.sendMessage(message.chat, {
                image: { url: groupPicUrl },
                caption: "Here is the profile picture of this group chat.",
            });
        } catch (error) {
            console.error('Error getting group profile picture:', error);
            await bot.reply(`*Failed to get group profile picture!*`);
        }
    }
);

bot(
    {
        name: "ginfo",
        info: "Get detailed information about the current group",
        category: "group"
    },
    async (message, bot) => {
        try {
            if (!message.chat.endsWith('@g.us')) {
                return await bot.reply('This command can only be used in groups!');
            }
            const jid = message.chat;
            const groupMetadata = await bot.sock.groupMetadata(jid);
            if (!groupMetadata) {
                return await bot.reply('Failed to retrieve group metadata');
            }
            const groupPicUrl = await bot.sock.profilePictureUrl(jid, "image").catch(() => null);
            const adminCount = groupMetadata.participants.filter((member) => member.admin).length;
            const infoMessage = `*Group Information*\n\n` +
                `🔹 *Name:* ${groupMetadata.subject}\n` +
                `🔹 *Members:* ${groupMetadata.participants.length}\n` +
                `🔹 *Admins:* ${adminCount}\n` +
                `🔹 *Created:* ${new Date(groupMetadata.creation * 1000).toLocaleDateString()}\n` +
                `🔹 *ID:* ${jid}\n\n` +
                `${groupMetadata.desc ? `*Description:*\n${groupMetadata.desc}\n` : ''}`;
            if (groupPicUrl) {
                await bot.sock.sendMessage(
                    jid,
                    { 
                        image: { url: groupPicUrl },
                        caption: infoMessage
                    }
                );
            } else {
                await bot.reply(infoMessage);
            }
        } catch (error) {
            console.error('Error getting group info:', error);
            await bot.reply(`*Failed to get group information!*`);
        }
    }
);

bot(
    {
        name: "gjids",
        info: "List all group names and their JIDs",
        category: "group"
    },
    async (message, bot) => {
        try {
            const groups = await bot.sock.groupFetchAllParticipating();
            let response = "*List of Groups and their JIDs:*\n\n";
            for (const [jid, group] of Object.entries(groups)) {
                response += `*Group Name:* ${group.subject || 'No Name'}\n`;
                response += `*JID:* ${jid}\n`;
            }
            await bot.reply(response);
        } catch (error) {
            await bot.reply(`Failed to fetch groups. Error: ${error.message}`);
        }
    }
);

bot(
    {
        name: "glink",
        info: "Get group invite link",
        category: "group"
    },
    async (message, bot) => {
        if (!message.chat.endsWith('@g.us')) {
            return await bot.reply('_This command only works in groups!_');
        }
        try {
            const metadata = await bot.sock.groupMetadata(message.chat);
            const isAdmin = metadata.participants.find(p => p.id === message.sender)?.admin;
            if (!isAdmin) {
                return await bot.reply('*I need to be a group admin to generate an invite link!*');
            }
            const code = await bot.sock.groupInviteCode(message.chat);
            const inviteLink = 'https://chat.whatsapp.com/' + code;
            await bot.reply(`*Group Invite Link:*\n\n${inviteLink}\n\n`);
        } catch (error) {
            console.error('Error generating group link:', error);
            await bot.reply(`*Failed to generate group link!*`);
        }
    }
);

bot(
    {
        name: "glist",
        info: "List all groups the bot is participating in",
        category: "group"
    },
    async (message, bot) => {
        try {
            const response = await bot.sock.groupFetchAllParticipating();
            const groups = Object.values(response);
            if (groups.length === 0) {
                return await bot.reply('*The bot is not in any groups!*');
            }
            let reply = `*Groups List (${groups.length}):*\n\n`;
            groups.forEach((group, index) => {
                reply += `*${index + 1}. ${group.subject || 'No Name'}*\n` +
                         `ID: ${group.id}\n` +
                         `Members: ${group.size}\n` +
                         `Owner: ${group.owner || 'Unknown'}\n` +
                         `Created: ${new Date(group.creation * 1000).toLocaleDateString()}\n` +
                         `Desc: ${group.desc?.substring(0, 50) || 'None'}...\n\n`;
            });
            await bot.reply(reply);
        } catch (error) {
            console.error('Error fetching groups:', error);
            await bot.reply(`*Failed to fetch group list!*`);
        }
    }
);

bot(
    {
        name: "glock",
        info: "Lock group settings",
        category: "group"
    },
    async (message, bot) => {
        if (!message.chat.endsWith('@g.us')) return await bot.reply('_This command is specifically for groups_');
        const metadata = await bot.sock.groupMetadata(message.chat);
        const isAdmin = metadata.participants.find(p => p.id === message.sender)?.admin;
        if (!isAdmin) return await bot.reply('_Only admins can use this command_');
        try {
            await bot.sock.groupSettingUpdate(message.chat, 'locked');
            return await bot.reply('*Only Admins can change settings*');
        } catch (error) {
            return await bot.reply(`Failed to lock group. Error: ${error.message}`);
        }
    }
);

bot(
    {
        name: "gmode",
        info: "Change group member add mode",
        category: "group"
    },
    async (message, bot) => {
        if (!message.chat.endsWith('@g.us')) {
            return await bot.reply('_This command only works in groups!_');
        }
        const mode = message.query?.toLowerCase();
        if (!mode || (mode !== 'admin' && mode !== 'member')) {
            return await bot.reply('*Usage:* gmode admin/member');
        }
        try {
            const metadata = await bot.sock.groupMetadata(message.chat);
            const isAdmin = metadata.participants.find(p => p.id === message.sender)?.admin;
            if (!isAdmin) {
                return await bot.reply('*You need to be a group admin to change member add mode!*');
            }
            await bot.sock.groupMemberAddMode(
                message.chat,
                mode === 'admin' ? 'admin_add' : 'all_member_add'
            );
            await bot.reply(`*Group member add mode changed to:* ${mode}`);
        } catch (error) {
            console.error('Error changing group mode:', error);
            await bot.reply(`*Failed to change group mode!*`);
        }
    }
);

bot(
    {
        name: "gname",
        info: "Change group name",
        category: "group"
    },
    async (message, bot) => {
        if (!message.chat.endsWith('@g.us')) return await bot.reply('_This command is specifically for groups_');
        const newName = message.query;
        if (!newName) return await bot.reply(`Please provide the new group name`);
        try {
            await bot.sock.groupUpdateSubject(message.chat, newName);
            return await bot.reply(`Group name has been changed to *${newName}*`);
        } catch (error) {
            return await bot.reply(`Failed to change group name. Error: ${error.message}`);
        }
    }
);

bot(
    {
        name: "gpp",
        info: "Set group profile picture from replied image",
        category: "group"
    },
    async (message, bot) => {
        if (!message.chat.endsWith('@g.us')) {
            return await bot.reply('_This command only works in groups!_');
        }
        const metadata = await bot.sock.groupMetadata(message.chat);
        const isAdmin = metadata.participants.find(p => p.id === message.sender)?.admin;
        if (!isAdmin) return await bot.reply('_Only admins can use this command_');
        if (!message.quoted?.image) {
            return await bot.reply('Please reply to an image to set as group profile picture!');
        }
        try {
            const downloadStream = await downloadContentFromMessage(message.quoted, 'image');
            let buffer = Buffer.from([]);
            for await (const chunk of downloadStream) {
                buffer = Buffer.concat([buffer, chunk]);
            }
            await bot.sock.updateProfilePicture(message.chat, buffer);
            await bot.reply('*Group profile picture updated successfully!*');
        } catch (error) {
            console.error('Error updating group profile picture:', error);
            await bot.reply(`*Failed to update group profile picture!*`);
        }
    }
);

bot(
    {
        name: "greeting",
        info: "Toggle greeting messages on/off",
        category: "group"
    },
    async (message, bot) => {
        const fs = require('fs');
        const path = require('path');
        const configPath = path.join(__dirname, '..', 'config.js');
        try {
            let configContent = fs.readFileSync(configPath, 'utf8');
            if (message.query === 'on') {
                configContent = configContent.replace(
                    /GREETING: "(true|false)"/, 
                    'GREETING: "true"'
                );
                fs.writeFileSync(configPath, configContent);
                await bot.reply('Greeting messages have been *enabled* ✅');
            } 
            else if (message.query === 'off') {
                configContent = configContent.replace(
                    /GREETING: "(true|false)"/, 
                    'GREETING: "false"'
                );
                fs.writeFileSync(configPath, configContent);
                await bot.reply('Greeting messages have been *disabled* ❌');
            }
            else {
                const greetingMatch = configContent.match(/GREETING: "(true|false)"/);
                const currentStatus = greetingMatch ? greetingMatch[1] : 'false';
                const status = currentStatus === "true" ? 'enabled ✅' : 'disabled ❌';
                await bot.reply(`Greeting messages are currently *${status}*\n\nUsage:\n.greeting on - Enable greetings\n.greeting off - Disable greetings`);
            }
        } catch (error) {
            console.error('Error modifying config:', error);
            await bot.reply('Failed to update greeting configuration.');
        }
    }
);

bot(
    {
        name: "grequest",
        info: "List all pending group join requests",
        category: "group"
    },
    async (message, bot) => {
        try {
            if (!message.chat.endsWith('@g.us')) {
                return await bot.reply('This command can only be used in groups!');
            }
            const metadata = await bot.sock.groupMetadata(message.chat);
            const isAdmin = metadata.participants.find(p => p.id === message.sender)?.admin;
            if (!isAdmin) {
                return await bot.reply('Only admins can view join requests!');
            }
            const response = await bot.sock.groupRequestParticipantsList(message.chat);
            if (!response || response.length === 0) {
                return await bot.reply('No pending join requests found.');
            }
            let requestList = '*📝 Pending Join Requests*\n\n';
            response.forEach((request, index) => {
                const phone = request.phone_number?.replace('@s.whatsapp.net', '') || 'Unknown';
                requestList += `*${index + 1}.* ${phone}\n`;
                requestList += `   - Request Method: ${request.request_method}\n`;
                requestList += `   - Request Time: ${new Date(request.request_time * 1000).toLocaleString()}\n\n`;
            });
            requestList += `\nUse *!accept [number/all]* or *!reject [number/all]* to manage requests.`;
            await bot.reply(requestList);
        } catch (error) {
            console.error('Error listing join requests:', error);
            await bot.reply(`*Failed to list join requests!*`);
        }
    }
);

bot(
    {
        name: "gtime",
        info: "Change message disappearing timer in group",
        category: "group"
    },
    async (message, bot) => {
        if (!message.chat.endsWith('@g.us')) {
            return await bot.reply('_This command only works in groups!_');
        }
        const timeMap = {
            '0': 0,
            '24': 86400,
            '7': 604800,
            '90': 7776000
        };
        const timeOption = message.query;
        if (!timeOption || !timeMap[timeOption]) {
            return await bot.reply('*Usage:* gtime <0/24/7/90>\n' +
                '0 - Remove timer\n' +
                '24 - 24 hours\n' +
                '7 - 7 days\n' +
                '90 - 90 days');
        }
        try {
            const metadata = await bot.sock.groupMetadata(message.chat);
            const isAdmin = metadata.participants.find(p => p.id === message.sender)?.admin;
            if (!isAdmin) {
                return await bot.reply('*You need to be a group admin to change message timer!*');
            }
            await bot.sock.groupToggleEphemeral(message.chat, timeMap[timeOption]);
            let timeText = '';
            switch (timeOption) {
                case '0': timeText = 'disabled'; break;
                case '24': timeText = '24 hours'; break;
                case '7': timeText = '7 days'; break;
                case '90': timeText = '90 days'; break;
            }
            await bot.reply(`*Message disappearing timer set to:* ${timeText}`);
        } catch (error) {
            console.error('Error changing ephemeral duration:', error);
            await bot.reply(`*Failed to change message timer!*`);
        }
    }
);

bot(
    {
        name: "gunlock",
        info: "Unlock group settings",
        category: "group"
    },
    async (message, bot) => {
        if (!message.chat.endsWith('@g.us')) return await bot.reply('_This command is specifically for groups_');
        const metadata = await bot.sock.groupMetadata(message.chat);
        const isAdmin = metadata.participants.find(p => p.id === message.sender)?.admin;
        if (!isAdmin) return await bot.reply('_Only admins can use this command_');
        try {
            await bot.sock.groupSettingUpdate(message.chat, 'unlocked');
            return await bot.reply('*Members can edit settings*');
        } catch (error) {
            return await bot.reply(`Failed to unlock group. Error: ${error.message}`);
        }
    }
);

bot(
    {
        name: "inactive",
        info: "Shows least active users in the group",
        category: "group"
    },
    async (message, bot) => {
        if (!message.chat.endsWith('@g.us')) {
            return await bot.reply("This command only works in groups!");
        }
        try {
            const chatHistory = await store.getChatHistory(message.chat);
            if (!chatHistory?.length) {
                return await bot.reply("No message history available for this chat.");
            }
            const userActivity = {};
            for (const entry of chatHistory) {
                try {
                    const msg = JSON.parse(entry.message);
                    if (msg.key?.fromMe) continue;
                    const participant = msg.key?.participant || msg.key?.remoteJid;
                    if (!participant) continue;
                    const username = msg.pushName || participant.split('@')[0];
                    userActivity[participant] = userActivity[participant] || { username, count: 0 };
                    userActivity[participant].count++;
                } catch (e) {
                    console.error('Message parse error:', e);
                }
            }
            const users = Object.entries(userActivity).map(([id, data]) => ({
                id, 
                username: data.username,
                count: data.count
            }));
            if (!users.length) {
                return await bot.reply("No user activity data available.");
            }
            const threshold = 5;
            const inactive = users.filter(u => u.count <= threshold)
                                .sort((a, b) => a.count - b.count)
                                .slice(0, 10);
            if (!inactive.length) {
                return await bot.reply(`No inactive users (everyone has >${threshold} messages).`);
            }
            await bot.sock.sendMessage(message.chat, {
                text: `*INACTIVE USERS (≤${threshold} messages)*\n\n` +
                      inactive.map((u, i) => `${i+1}. @${u.username} - ${u.count} messages`).join('\n') +
                      `\n\nTotal users: ${users.length}`,
                mentions: inactive.map(u => u.id)
            });
        } catch (error) {
            console.error('Inactive command error:', error);
            await bot.reply("Error processing inactive users data.");
        }
    }
);

bot(
    {
        name: "join",
        info: "Join a group using invite link",
        category: "group"
    },
    async (message, bot) => {
        try {
            let code = message.query.trim();
            if (code.startsWith('https://chat.whatsapp.com/')) {
                code = code.replace('https://chat.whatsapp.com/', '');
            } else if (code.startsWith('chat.whatsapp.com/')) {
                code = code.replace('chat.whatsapp.com/', '');
            }
            if (!code || code.length < 10) {
                return await bot.reply(`*Invalid invite link!*`);
            }
            const response = await bot.sock.groupAcceptInvite(code);
            const metadata = await bot.sock.groupMetadata(response);
            const groupName = metadata.subject || "Unknown Group";
            await bot.reply(
                `*Successfully joined the group!*\n\n` +
                `*Group Name:* ${groupName}\n` +
                `*Group ID:* ${response}\n\n`);
        } catch (error) {
            console.error('Error joining group:', error);
            await bot.reply(`*Failed to join group!*`);
        }
    }
);

bot(
    {
        name: "kick",
        info: "Remove participant",
        category: "group"
    },
    async (message, bot) => {
        if (!message.chat.endsWith('@g.us')) {
            return await bot.reply('_This command only works in groups!_');
        }
        let userJid;
        if (message.mentionedJid?.length > 0) {
            userJid = message.mentionedJid[0];
        } 
        else if (message.quoted?.participant) {
            userJid = message.quoted.participant;
        }
        else if (message.quoted?.sender) {
            userJid = message.quoted.sender;
        } else {
            return await bot.reply(`❌ Please mention a user or reply to their message to remove them.`);
        }
        try {
            await bot.sock.groupParticipantsUpdate(message.chat, [userJid], 'remove');
            return await bot.sock.sendMessage(message.chat, {
                text: `🚫 @${userJid.split('@')[0]} has been removed from the group.`,
                mentions: [userJid]
            });
        } catch (error) {
            console.error('Remove error:', error);
            return await bot.reply(`❌ Failed to remove user. ${error.message.includes('403') ? 'The bot needs admin rights.' : error.message}`);
        }
    }
);

bot(
    {
        name: "leave",
        info: "Leave the group",
        category: "group"
    },
    async (message, bot) => {
        if (!message.chat.endsWith('@g.us')) return await bot.reply('_This command is specifically for groups_');
        try {
            await bot.sock.groupLeave(message.chat);
            return await bot.reply('*_The bot has left the group successfully!_*');
        } catch (error) {
            return await bot.reply(`Failed to leave the group. Error: ${error.message}`);
        }
    }
);

bot(
    {
        name: "mute",
        info: "Mute the group (only admins)",
        category: "group"
    },
    async (message, bot) => {
        if (!message.chat.endsWith('@g.us')) return await bot.reply('_This command is specifically for groups_');
        const metadata = await bot.sock.groupMetadata(message.chat);
        const isAdmin = metadata.participants.find(p => p.id === message.sender)?.admin;
        if (!isAdmin) return await bot.reply('_Only admins can use this command_');
        try {
            await bot.sock.groupSettingUpdate(message.chat, 'announcement');
            return await bot.reply('*Group has been muted*');
        } catch (error) {
            return await bot.reply(`Failed to mute group. Error: ${error.message}`);
        }
    }
);

bot(
    {
        name: "newgc",
        info: "Create a new group with specified name and participants",
        category: "group"
    },
    async (message, bot) => {
        const query = message.query;
        if (!query) {
            return await bot.reply('*Usage:* newgc <groupname> | <number1>,<number2>,...');
        }
        const parts = query.split('|').map(p => p.trim());
        if (parts.length !== 2) {
            return await bot.reply('*Invalid format!* Please use: newgc <groupname> | <numbers>');
        }
        const [groupName, numbersStr] = parts;
        const numbers = numbersStr.split(',').map(n => n.trim() + '@s.whatsapp.net');
        try {
            const group = await bot.sock.groupCreate(groupName, numbers);
            await bot.reply(`*Group created successfully!*\nID: ${group.id}\nName: ${group.subject}`);
        } catch (error) {
            console.error('Error creating group:', error);
            await bot.reply(`*Failed to create group!*`);
        }
    }
);

bot(
    {
        name: "promote",
        info: "Promote participant to admin",
        category: "group"
    },
    async (message, bot) => {
        if (!message.chat.endsWith('@g.us')) {
            return await bot.reply('_This command only works in groups!_');
        }
        let userJid;
        if (message.mentionedJid?.length > 0) {
            userJid = message.mentionedJid[0];
        } 
        else if (message.quoted?.participant) {
            userJid = message.quoted.participant;
        }
        else if (message.quoted?.sender) {
            userJid = message.quoted.sender;
        } else {
            return await bot.reply(`❌ Please mention a user or reply to their message to promote them.`);
        }
        try {
            await bot.sock.groupParticipantsUpdate(message.chat, [userJid], 'promote');
            return await bot.sock.sendMessage(message.chat, {
                text: `👑 @${userJid.split('@')[0]} has been promoted to admin.`,
                mentions: [userJid]
            });
        } catch (error) {
            console.error('Promote error:', error);
            return await bot.reply(`❌ Failed to promote user. ${error.message.includes('403') ? 'The bot needs admin rights.' : error.message}`);
        }
    }
);

bot(
    {
        name: "reject",
        info: "Reject group join requests",
        category: "group"
    },
    async (message, bot) => {
        await handleRequestAction(message, bot, 'reject');
    }
);

bot(
    {
        name: "revoke",
        info: "Revoke group invite link and generate new one",
        category: "group"
    },
    async (message, bot) => {
        if (!message.chat.endsWith('@g.us')) {
            return await bot.reply('_This command only works in groups!_');
        }
        try {
            const metadata = await bot.sock.groupMetadata(message.chat);
            const isAdmin = metadata.participants.find(p => p.id === message.sender)?.admin;
            if (!isAdmin) {
                return await bot.reply('*I need to be a group admin to revoke the invite link!*');
            }
            await bot.sock.groupRevokeInvite(message.chat);
            const newCode = await bot.sock.groupInviteCode(message.chat);
            const newInviteLink = 'https://chat.whatsapp.com/' + newCode;
            await bot.reply(
                `*Old invite link revoked successfully!*\n\n` +
                `*New Group Invite Link:*\n${newInviteLink}\n\n`);
        } catch (error) {
            console.error('Error revoking group link:', error);
            await bot.reply(`*Failed to revoke group link!*`);
        }
    }
);

bot(
    {
        name: "rgpp",
        info: "Remove group profile picture",
        category: "group"
    },
    async (message, bot) => {
        if (!message.chat.endsWith('@g.us')) {
            return await bot.reply('_This command only works in groups!_');
        }
        const metadata = await bot.sock.groupMetadata(message.chat);
        const isAdmin = metadata.participants.find(p => p.id === message.sender)?.admin;
        if (!isAdmin) return await bot.reply('_Only admins can use this command_');
        try {
            await bot.sock.removeProfilePicture(message.chat);
            await bot.reply('*Group profile picture removed successfully!*');
        } catch (error) {
            console.error('Error removing group profile picture:', error);
            await bot.reply(`*Failed to remove group profile picture!*`);
        }
    }
);

bot(
    {
        name: "tag",
        info: "Mention everyone in the chat",
        category: "group"
    },
    async (message, bot) => {
        if (!message.chat.endsWith('@g.us')) {
            return await bot.reply('_This command only works in groups!_');
        }
        let text = message.quoted ? message.quoted.text : message.query;
        if (!text) {
            return await bot.reply('Please provide a message to send with mentions.');
        }
        try {
            const groupMetadata = await bot.sock.groupMetadata(message.chat);
            const participants = groupMetadata.participants.map(p => p.id);
            await bot.sock.sendMessage(
                message.chat,
                {
                    text: text,
                    mentions: participants,
                    contextInfo: {
                        mentionedJid: participants
                    }
                }
            );
        } catch (error) {
            console.error('Tag error:', error);
            return await bot.reply(`❌ Failed to tag everyone. ${error.message}`);
        }
    }
);

bot(
    {
        name: "tagall",
        info: "Mention everyone in the chat with special prefix",
        category: "group"
    },
    async (message, bot) => {
        if (!message.chat.endsWith('@g.us')) {
            return await bot.reply('_This command only works in groups!_');
        }
        let text = message.quoted ? message.quoted.text : message.query;
        try {
            const groupMetadata = await bot.sock.groupMetadata(message.chat);
            const participants = groupMetadata.participants.map(p => p.id);
            await bot.sock.sendMessage(
                message.chat,
                {
                    text: `🌸 @everyone ${text || ''}`,
                    mentions: participants,
                    contextInfo: {
                        mentionedJid: participants
                    }
                }
            );
        } catch (error) {
            console.error('Tagall error:', error);
            return await bot.reply(`❌ Failed to tag everyone. ${error.message}`);
        }
    }
);

bot(
    {
        name: "unmute",
        info: "Unmute the group (only admins)",
        category: "group"
    },
    async (message, bot) => {
        if (!message.chat.endsWith('@g.us')) return await bot.reply('_This command is specifically for groups_');
        const metadata = await bot.sock.groupMetadata(message.chat);
        const isAdmin = metadata.participants.find(p => p.id === message.sender)?.admin;
        if (!isAdmin) return await bot.reply('_Only admins can use this command_');
        try {
            await bot.sock.groupSettingUpdate(message.chat, 'not_announcement');
            return await bot.reply('*Group has been unmuted*');
        } catch (error) {
            return await bot.reply(`Failed to unmute group. Error: ${error.message}`);
        }
    }
);

async function handleRequestAction(message, bot, action) {
    try {
        if (!message.chat.endsWith('@g.us')) {
            return await bot.reply('This command can only be used in groups!');
        }
        const metadata = await bot.sock.groupMetadata(message.chat);
        const isAdmin = metadata.participants.find(p => p.id === message.sender)?.admin;
        if (!isAdmin) {
            return await bot.reply('Only admins can manage join requests!');
        }
        const query = message.query;
        if (!query) {
            return await bot.reply(`Please specify a request number or "all". Usage: !${action} <number/all>`);
        }
        const requests = await bot.sock.groupRequestParticipantsList(message.chat);
        if (!requests || requests.length === 0) {
            return await bot.reply('No pending join requests found.');
        }
        if (query.toLowerCase() === 'all') {
            const jids = requests.map(req => req.jid);
            await bot.sock.groupRequestParticipantsUpdate(
                message.chat,
                jids,
                action
            );
            return await bot.reply(`Successfully ${action}d all ${requests.length} join requests.`);
        }
        const requestNumber = parseInt(query);
        if (isNaN(requestNumber) || requestNumber < 1 || requestNumber > requests.length) {
            return await bot.reply(`Invalid request number. Please use a number between 1 and ${requests.length} or "all".`);
        }
        const selectedRequest = requests[requestNumber - 1];
        await bot.sock.groupRequestParticipantsUpdate(
            message.chat,
            [selectedRequest.jid],
            action
        );
        await bot.reply(`Successfully ${action}d request from ${selectedRequest.jid.split('@')[0]}.`);
    } catch (error) {
        console.error(`Error ${action}ing join requests:`, error);
        await bot.reply(`*Failed to ${action} join request(s)!*`);
    }
}

async function handleModeration(mode, type, message, bot) {
    const chatId = message.chat;
    const sender = message.sender;
    if (config.LINK_DELETE === "true") {
        try {
            await bot.sock.sendMessage(chatId, { delete: message.key });
        } catch (error) {
            console.error('Error deleting message:', error);
        }
    }
    switch (mode) {
        case 'warn':
            if (!warnCounters.has(chatId)) {
                warnCounters.set(chatId, new Map());
            }
            const chatWarnCounters = warnCounters.get(chatId);
            const userWarnCount = (chatWarnCounters.get(sender) || 0) + 1;
            chatWarnCounters.set(sender, userWarnCount);
            await message.send(`@${sender.split('@')[0]}, warning ${userWarnCount}/3 for ${type} violation.`, {
                mentions: [sender]
            });
            if (userWarnCount >= 3) {
                await kickUser(chatId, sender, bot);
                chatWarnCounters.delete(sender);
            }
            break;
        case 'delete':
            if (!deleteCounters.has(chatId)) {
                deleteCounters.set(chatId, new Map());
            }
            const chatDeleteCounters = deleteCounters.get(chatId);
            const userDeleteCount = (chatDeleteCounters.get(sender) || 0) + 1;
            chatDeleteCounters.set(sender, userDeleteCount);
            if (userDeleteCount >= 3) {
                await kickUser(chatId, sender, bot);
                chatDeleteCounters.delete(sender);
            }
            break;
        case 'kick':
            await kickUser(chatId, sender, bot);
            break;
    }
}

async function kickUser(chatId, userId, bot) {
    try {
        await bot.sock.groupParticipantsUpdate(
            chatId,
            [userId],
            'remove'
        );
    } catch (error) {
        console.error('Error kicking user:', error);
    }
}

bot(
    {
        on: 'text',
        name: "moderation-listener",
        ignoreRestrictions: true
    },
    async (message, bot) => {
        try {
            if (!message.chat.endsWith('@g.us')) return;
            const chatId = message.chat;
            const sender = message.sender;
            const content = (message.content || message.text || '').toLowerCase();
            if (message.isOwner(sender)) return;
            const metadata = await bot.sock.groupMetadata(chatId);
            const isAdmin = metadata.participants.find(p => p.id === sender)?.admin;
            if (isAdmin) return;

            const antiwordSettings = antiwordState.groups[chatId] || {
                enabled: config.ANTIWORD_MODE === "true",
                mode: config.ANTIWORD_ACTION || "warn"
            };
            
            if (antiwordSettings.enabled && antiwordState.bannedWords.length > 0) {
                for (const word of antiwordState.bannedWords) {
                    if (content.includes(word)) {
                        await handleModeration(antiwordSettings.mode, 'word', message, bot);
                        return;
                    }
                }
            }

            if (config.ANTILINK === "true") {
                const linkRegex = /(https?:\/\/[^\s]+)/gi;
                if (linkRegex.test(content)) {
                    await handleModeration(config.ANTILINK_ACTION || "warn", 'link', message, bot);
                    return;
                }
            }

            if (config.ANTIBOT === "true") {
                if (message.key.id.startsWith('3EB0') || message.key.id.startsWith('FIXZY')) {
                    await handleModeration(config.ANTIBOT_ACTION || "warn", 'bot', message, bot);
                    return;
                }
            }
        } catch (error) {
            console.error('Error in moderation listener:', error);
        }
    }
);