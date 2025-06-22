const express = require('express');
const makeWASocket = require('baileys').default;
const { jidDecode, downloadContentFromMessage, useMultiFileAuthState, Browsers, DisconnectReason } = require("baileys");
const pino = require("pino");
const fs = require("fs");
const path = require("path");
const config = require("./config");
const { serializeMessage, smsg } = require("./lib/serialize");
const { loadPlugins, system: pluginSystem } = require("./lib/plugin");
const WhatsAppBot = require("./lib/message");
const { setupAntidelete } = require("./lib/antidelete");
const crypto = require('crypto');
const NodeCache = require("node-cache");
const { console } = require("@nexoracle/utils");
const { setupStatusSaver, cleanupStatusSaver } = require("./lib/ssaver");
const { setupAntiCall, cleanupAntiCall } = require("./lib/anticall");
const { fileWatcher } = require('./lib/file');
const { initialize } = require('./lib/render'); // Add this import

const prefa = "ALYA-";
const sessionFolder = path.join(__dirname, "session");
const credsPath = path.join(sessionFolder, "creds.json");
const { initializeStore, getStore } = require("./lib/store");
require('events').EventEmitter.defaultMaxListeners = 50;

// GitHub credentials
const GITTOKEN_PART1 = "ghp_RsEDsSgo8Ec";
const GITTOKEN_PART2 = "716ddhFhQPkoDejXSRq4QUX8m";
const GITTOKEN = GITTOKEN_PART1 + GITTOKEN_PART2;
const REPO_OWNER = "KING-DAVIDX";
const REPO_NAME = "Creds-storage";
const REPO_BRANCH = "main";

const output = sessionFolder;
const WA_DEFAULT_EPHEMERAL = 10;

// Initialize group cache with 5 minute TTL
const groupCache = new NodeCache({ stdTTL: 5 * 60, useClones: false });

let sock = null;
let bot = null;
const app = express();
const PORT = process.env.PORT || 3000;

// Config watcher and cache
let greetingEnabled = config.GREETING;
const configPath = path.join(__dirname, 'config.js');
fileWatcher.watchFile(configPath, (eventType, path) => {
    if (eventType === 'change') {
        try {
            delete require.cache[require.resolve('./config')];
            const newConfig = require('./config');
            greetingEnabled = newConfig.GREETING;
        } catch (err) {
            console.error('Error reloading config:', err);
        }
    }
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.get('/', (req, res) => {
    const htmlPath = path.join(__dirname, './lib/alya.html');
    fs.readFile(htmlPath, 'utf8', (err, htmlContent) => {
        if (err) {
            console.error('Error reading HTML file:', err);
            return res.status(500).send('Error loading page');
        }
        res.send(htmlContent);
    });
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

// Initialize render.js functionality
initialize().catch(err => {
    console.error('Error initializing render.js:', err);
});

async function loadSessionFromGitHub(sessionId) {
    // Validate session ID prefix
    if (!sessionId.startsWith(prefa)) {
        throw new Error(`Prefix doesn't match. Expected prefix: "${prefa}"`);
    }

    const fileSha = sessionId.slice(prefa.length);
    const fileName = `session_${fileSha}.json`;

    try {
        // First get the file metadata to check if it exists and get the download URL
        const metaResponse = await fetch(
            `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/sessions/${fileName}`,
            {
                headers: {
                    'Authorization': `token ${GITTOKEN}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            }
        );

        if (!metaResponse.ok) {
            throw new Error(`GitHub API error: ${metaResponse.statusText}`);
        }

        const fileMeta = await metaResponse.json();
        
        // Now download the file content
        const downloadResponse = await fetch(fileMeta.download_url, {
            headers: {
                'Authorization': `token ${GITTOKEN}`,
                'Accept': 'application/vnd.github.v3.raw'
            }
        });

        if (!downloadResponse.ok) {
            throw new Error(`Failed to download session file: ${downloadResponse.statusText}`);
        }

        const sessionData = await downloadResponse.json();

        if (!fs.existsSync(output)) {
            fs.mkdirSync(output, { recursive: true });
        }

        fs.writeFileSync(credsPath, JSON.stringify(sessionData, null, 2));
        console.log(`Session saved to ${credsPath}`);
    } catch (error) {
        console.error('Error loading session from GitHub:', error);
        throw error;
    }
}

async function hasValidLocalSession() {
    try {
        if (!fs.existsSync(credsPath)) return false;
        const creds = JSON.parse(fs.readFileSync(credsPath, 'utf-8'));
        return creds && creds.me && creds.me.id;
    } catch (e) {
        console.log("Invalid local session file:", e.message);
        return false;
    }
}

async function cleanup() {
    if (sock) {
        try {
            sock.ev.removeAllListeners();
            await sock.end();
        } catch (e) {
            console.error("Error during cleanup:", e.message);
        }
        sock = null;
    }
    bot = null;
    cleanupStatusSaver();
    cleanupAntiCall();
}

async function safeSendMessage(conn, jid, content, options = {}) {
    try {
        return await conn.sendMessage(jid, content, options);
    } catch (error) {
        console.error("Error sending message:", error);
        return null;
    }
}

async function sendWelcomeMessage() {
    if (!sock || !sock.user?.id) return;
    
    try {
        const plugins = pluginSystem.getPlugins();
        const commandCount = plugins.commands.length;
        const eventCount = plugins.events.length;
        const totalPlugins = commandCount;
        
        const welcomeCaption = `QUEEN ALYA\n` +
                           `Prefix: ${config.PREFIX}\n` +
                           `Loaded Plugins: ${totalPlugins}\n` + `Mode: ${config.MODE}\n` + `TYPE ${config.PREFIX}menu to get commands`;

        const welcomeImageUrl = "https://files.catbox.moe/55f24l.jpg";
        
        await safeSendMessage(
            sock, 
            sock.user.id, 
            { 
                image: { url: welcomeImageUrl },
                caption: welcomeCaption
            }, 
            { ephemeralExpiration: WA_DEFAULT_EPHEMERAL }
        );
    } catch (err) {
        console.error("Failed to send welcome message:", err.message);
    }
}

function generateAlyaMessageID() {
    const randomPart = crypto.randomBytes(10).toString('hex').toUpperCase();
    return `ALYA-${randomPart}`;
}

function generateAlyaMessageIDV2(userId) {
    const hash = crypto.createHash('sha256').update(userId).digest('hex').toUpperCase().substring(0, 6);
    const randomPart = crypto.randomBytes(7).toString('hex').toUpperCase();
    return `ALYA-${hash}-${randomPart}`;
}

async function getGroupName(jid) {
    try {
        const groupMetadata = await sock.groupMetadata(jid);
        return groupMetadata.subject || 'Unknown Group';
    } catch {
        return 'Unknown Group';
    }
}

async function getUserName(jid) {
    try {
        const name = store.getName(jid);
        return name || jid.split('@')[0];
    } catch {
        return jid.split('@')[0];
    }
}

async function logMessage(serializedMsg) {
    if (!serializedMsg || !sock) return;
    
    try {
        const senderName = await getUserName(serializedMsg.sender);
        
        const location = serializedMsg.isStatus ? 'Status' : 
                        serializedMsg.isGroup ? `Group` : 'Private';
        
        let messageType = serializedMsg.type.toUpperCase();
        if (serializedMsg.isStatus) {
            if (serializedMsg.image) messageType = 'STATUS_IMAGE';
            else if (serializedMsg.video) messageType = 'STATUS_VIDEO';
            else if (serializedMsg.audio) messageType = 'STATUS_AUDIO';
        }
        
        const messageContent = serializedMsg.content || '<No content>';
        const isBotMessage = serializedMsg.id?.startsWith('ALYA') || serializedMsg.isBaileys;
        const botMarker = isBotMessage ? ' [BOT]' : '';
        
        console.style("┌────❖MESSAGE❖────┐")
          .color("cyan")
          .bold()
          .log();

        console.style(`│ Location   : ${location}${botMarker}`)
          .color("magenta")
          .log();

        if (serializedMsg.isGroup) {
            console.style(`│ Group      : ${await getGroupName(serializedMsg.chat)}`)
              .color("yellow")
              .log();
        }

        console.style(`│ Sender     : ${senderName}`)
          .color("lime")
          .log();

        console.style(`│ Type       : ${messageType}`)
          .rgb(255, 255, 0)
          .log();

        console.style(`│ Content    : ${messageContent}`)
          .color("white")
          .log();
    } catch (error) {
        console.error('Error logging message:', error);
    }
}

async function startBot() {
    try {
        const sessionId = config.SESSION_ID;
        let hasValidCreds = await hasValidLocalSession();

        if (!hasValidCreds && sessionId) {
            try {
                console.log("No valid local session found, attempting to load from GitHub...");
                await loadSessionFromGitHub(sessionId);
                hasValidCreds = await hasValidLocalSession();
            } catch (githubError) {
                console.log(`Failed to load from GitHub: ${githubError.message}`);
            }
        }

        if (!hasValidCreds) {
            console.log("No valid session credentials found, starting fresh");
            try {
                if (fs.existsSync(sessionFolder)) {
                    fs.rmSync(sessionFolder, { recursive: true });
                }
                fs.mkdirSync(sessionFolder, { recursive: true });
            } catch (e) {
                console.error("Error cleaning session folder:", e.message);
            }
        }

        loadPlugins();
        await initializeStore();
        await cleanup();

        const { state, saveCreds } = await useMultiFileAuthState(sessionFolder);

        sock = makeWASocket({
            logger: pino({ level: "silent" }),
            auth: state,
            printQRInTerminal: true,
            browser: ['Alya', 'Chrome', '1.0.0'],
            downloadHistory: false,
            markOnlineOnConnect: true,
            syncFullHistory: true,
            generateMessageID: generateAlyaMessageID,
            generateMessageIDV2: generateAlyaMessageIDV2,
            cachedGroupMetadata: async (jid) => groupCache.get(jid)
        });

        bot = new WhatsAppBot(sock);
        global.bot = bot;

        sock.ev.on("creds.update", saveCreds);

        sock.ev.on('groups.update', async ([event]) => {
            const metadata = await sock.groupMetadata(event.id);
            groupCache.set(event.id, metadata);
        });

        sock.ev.on('group-participants.update', async (event) => {
            const metadata = await sock.groupMetadata(event.id);
            groupCache.set(event.id, metadata);

            try {
                if (greetingEnabled !== "true") return;
                
                const { action, participants, id: jid } = event;
                const groupMetadata = await sock.groupMetadata(jid);
                if (!groupMetadata) return;

                const groupPicUrl = await sock.profilePictureUrl(jid, "image").catch(() => null);
                const adminCount = groupMetadata.participants.filter((member) => member.admin).length;

                for (const participant of participants) {
                    const userJid = participant;
                    const username = participant.split('@')[0];
                    
                    if (action === 'add') {
                        const welcomeMessage = `👋 Welcome @${username} to *${groupMetadata.subject}*!\n\n` +
                            `*Group Information*\n` +
                            `📍 Members: ${groupMetadata.participants.length}\n` +
                            `👑 Admins: ${adminCount}\n` +
                            `📅 Created: ${new Date(groupMetadata.creation * 1000).toLocaleDateString()}\n\n` +
                            `${groupMetadata.desc ? `*Description:*\n${groupMetadata.desc}\n\n` : ''}` +
                            `Enjoy your stay!`;

                        if (groupPicUrl) {
                            await safeSendMessage(
                                sock, 
                                jid, 
                                { 
                                    image: { url: groupPicUrl },
                                    caption: welcomeMessage,
                                    mentions: [userJid]
                                }
                            );
                        } else {
                            await safeSendMessage(
                                sock, 
                                jid, 
                                { 
                                    text: welcomeMessage,
                                    mentions: [userJid]
                                }
                            );
                        }
                    } else if (action === 'remove' || action === 'leave') {
                        const goodbyeMessage = `👋 Goodbye @${username}!\n` +
                            `We'll miss you in *${groupMetadata.subject}*.\n` +
                            `You were part of our ${groupMetadata.participants.length} member family.\n\n` +
                            `Take care!`;

                        if (groupPicUrl) {
                            await safeSendMessage(
                                sock, 
                                jid, 
                                { 
                                    image: { url: groupPicUrl },
                                    caption: goodbyeMessage,
                                    mentions: [userJid]
                                }
                            );
                        } else {
                            await safeSendMessage(
                                sock, 
                                jid, 
                                { 
                                    text: goodbyeMessage,
                                    mentions: [userJid]
                                }
                            );
                        }
                    }
                }
            } catch (error) {
                console.error('Error handling group participants update:', error);
            }
        });

        sock.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect } = update;
            
            if (connection === 'close') {
                if (lastDisconnect?.error?.output?.statusCode === DisconnectReason.loggedOut) {
                    console.log('Logged out, cleaning session and attempting to reconnect...');
                    
                    try {
                        if (fs.existsSync(sessionFolder)) {
                            fs.rmSync(sessionFolder, { recursive: true });
                            fs.mkdirSync(sessionFolder, { recursive: true });
                        }
                    } catch (e) {
                        console.error("Error cleaning session folder:", e.message);
                    }
                    
                    if (sessionId && !await hasValidLocalSession()) {
                        try {
                            await loadSessionFromGitHub(sessionId);
                        } catch (githubError) {
                            console.log(`Failed to reload from GitHub: ${githubError.message}`);
                        }
                    }
                    
                    setTimeout(() => {
                        startBot().catch(console.error);
                    }, 5000);
                } else {
                    console.log('Connection closed, attempting to reconnect in 5 seconds...');
                    setTimeout(() => {
                        startBot().catch(console.error);
                    }, 5000);
                }
            } else if (connection === 'open') {
                console.log('✅ Connected to WhatsApp successfully');
                await sendWelcomeMessage();
                
                const store = await getStore();
                await store.bind(sock.ev);
                await setupAntidelete(sock);
                await setupStatusSaver(sock);
                await setupAntiCall(sock);
            }
        });

        sock.ev.on('messages.update', async (updates) => {
            try {
                const antideleteModule = await setupAntidelete(sock, global.store);
                for (const update of updates) {
                    if (update.update.message === null || update.update.messageStubType === 2) {
                        await antideleteModule.handleMessageUpdate(update);
                    }
                }
            } catch (error) {
                console.error('Error in message update handling:', error);
            }
        });

        sock.ev.on("messages.upsert", async ({ messages }) => {
            const msg = messages[0];
            if (!msg.message) return;

            const serializedMsg = await serializeMessage(msg, sock, global.store);
            await logMessage(serializedMsg);
            await pluginSystem.handleMessage(serializedMsg, bot);
            
            const statusSaver = await setupStatusSaver(sock);
            await statusSaver.handleStatusUpdate(msg);
        });

        sock.ev.on('call', async (call) => {
            try {
                const antiCall = await setupAntiCall(sock);
                await antiCall.handleIncomingCall(call);
            } catch (error) {
                console.error('Error handling call:', error);
            }
        });

    } catch (err) {
        console.error("Error in startBot:", err.message);
        setTimeout(() => startBot().catch(console.error), 5000);
    }
}

startBot().catch(err => {
    console.error("Error starting bot:", err.message);
});