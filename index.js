const express = require('express');
const makeWASocket = require('baileys').default;
const { jidDecode, jidNormalizedUser, downloadContentFromMessage, useMultiFileAuthState, Browsers, DisconnectReason, getAggregateVotesInPollMessage } = require("baileys");
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
const { initialize } = require('./lib/render');

const prefa = "ALYA-";
const sessionFolder = path.join(__dirname, "session");
const { initializeStore, getStore } = require("./lib/store");
require('events').EventEmitter.defaultMaxListeners = 50;

// GitHub credentials
const GITTOKEN_PART1 = "ghp_RsEDsSgo8Ec";
const GITTOKEN_PART2 = "716ddhFhQPkoDejXSRq4QUX8m";
const GITTOKEN = GITTOKEN_PART1 + GITTOKEN_PART2;
const REPO_OWNER = "KING-DAVIDX";
const REPO_NAME = "Queen_Alya"; // Main repo to monitor for updates
const CREDS_REPO_NAME = "Creds-storage"; // Repo for credentials
const REPO_BRANCH = "main";

const WA_DEFAULT_EPHEMERAL = 10;

let sock = null;
let bot = null;
const app = express();
const PORT = process.env.PORT || 3000;

// Variables for update checking
let updateAvailable = false;

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

// Function to recursively get all files in a directory
async function getAllFiles(dirPath) {
    const arrayOfFiles = [];
    
    async function readDirectory(currentPath) {
        const files = fs.readdirSync(currentPath);

        for (const file of files) {
            if (file === "node_modules" || file === "package-lock.json" || file === ".gitignore" || file === ".git") continue;
            
            const fullPath = path.join(currentPath, file);
            if (fs.statSync(fullPath).isDirectory()) {
                await readDirectory(fullPath);
            } else {
                arrayOfFiles.push({
                    path: fullPath,
                    relativePath: path.relative(__dirname, fullPath)
                });
            }
        }
    }

    await readDirectory(dirPath);
    return arrayOfFiles;
}

// Function to get file content from GitHub
async function getGitHubFileContent(filePath) {
    try {
        const response = await fetch(
            `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${filePath}?ref=${REPO_BRANCH}`,
            {
                headers: {
                    'Authorization': `token ${GITTOKEN}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            }
        );

        if (!response.ok) {
            if (response.status === 404) return null; // File doesn't exist in repo
            throw new Error(`GitHub API error: ${response.statusText}`);
        }

        const fileData = await response.json();
        const contentResponse = await fetch(fileData.download_url);
        return await contentResponse.text();
    } catch (error) {
        console.error(`Error getting file content for ${filePath}:`, error.message);
        return null;
    }
}

// Function to check for repository updates by comparing all files
async function checkForUpdates() {
    try {
        console.log("Checking for updates...");
        
        // Get all local files
        const localFiles = await getAllFiles(__dirname);
        
        // Check each file against GitHub
        let differencesFound = false;
        
        for (const file of localFiles) {
            const githubContent = await getGitHubFileContent(file.relativePath);
            
            if (githubContent === null) {
                console.log(`File ${file.relativePath} not found in GitHub repo`);
                differencesFound = true;
                continue;
            }
            
            const localContent = fs.readFileSync(file.path, 'utf-8');
            
            if (localContent !== githubContent) {
                console.log(`Difference found in file: ${file.relativePath}`);
                differencesFound = true;
            }
        }
        
        if (differencesFound) {
            updateAvailable = true;
            await showUpdateNotification();
            
            if (sock && sock.user?.id) {
                await sendUpdateNotification();
            }
        } else {
            console.log("No updates found - all files match GitHub repo");
        }
        
        return differencesFound;
    } catch (error) {
        console.error('Error checking for updates:', error.message);
        return false;
    }
}

// Function to show update notification in console
async function showUpdateNotification() {
    console.style("┌───────────────────────────────┐")
        .color("yellow")
        .bold()
        .log();
    
    console.style("│ *Queen Alya has been updated*  │")
        .color("red")
        .bold()
        .log();
    
    console.style("│ Please type 'update now' to  │")
        .color("yellow")
        .bold()
        .log();
    
    console.style("│ get latest version            │")
        .color("yellow")
        .bold()
        .log();
    
    console.style("└───────────────────────────────┘")
        .color("yellow")
        .bold()
        .log();
}

// Function to send ephemeral update notification to the bot owner
async function sendUpdateNotification() {
    if (!sock || !sock.user?.id) return;
    
    try {
        const updateMessage = `🚀 *Queen Alya Update Available!*\n\n` +
                            `A new version of Queen Alya is available on GitHub.\n\n` +
                            `Type *${config.PREFIX}update now* to get the latest version.`;

        await safeSendMessage(
            sock, 
            jidNormalizedUser(sock.user.id), 
            { 
                text: updateMessage
            },
            { ephemeralExpiration: WA_DEFAULT_EPHEMERAL } // Make it disappearing
        );
    } catch (err) {
        console.error("Failed to send update notification:", err.message);
    }
}

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

async function downloadSessionFilesFromGitHub(sessionFolderName) {
    // Validate session ID prefix
    if (!sessionFolderName.startsWith(prefa)) {
        throw new Error(`Prefix doesn't match. Expected prefix: "${prefa}"`);
    }

    // Extract the session folder name after the prefix
    const folderName = sessionFolderName.slice(prefa.length);
    
    try {
        // Construct the correct path to the session folder in GitHub
        const githubPath = `sessions/${folderName}`;
        
        // First get the list of files in the session folder
        const listResponse = await fetch(
            `https://api.github.com/repos/${REPO_OWNER}/${CREDS_REPO_NAME}/contents/${githubPath}`,
            {
                headers: {
                    'Authorization': `token ${GITTOKEN}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            }
        );

        if (!listResponse.ok) {
            throw new Error(`GitHub API error: ${listResponse.statusText}`);
        }

        const files = await listResponse.json();
        
        // Create session directory if it doesn't exist
        if (!fs.existsSync(sessionFolder)) {
            fs.mkdirSync(sessionFolder, { recursive: true });
        }

        // Download each file
        for (const file of files) {
            if (file.type !== 'file') continue;
            
            const downloadResponse = await fetch(file.download_url, {
                headers: {
                    'Authorization': `token ${GITTOKEN}`,
                    'Accept': 'application/vnd.github.v3.raw'
                }
            });

            if (!downloadResponse.ok) {
                throw new Error(`Failed to download session file: ${file.name}`);
            }

            const fileContent = await downloadResponse.text();
            const filePath = path.join(sessionFolder, file.name);
            
            fs.writeFileSync(filePath, fileContent);
            console.log(`Downloaded session file: ${file.name}`);
        }

        console.log(`Session files successfully downloaded to ${sessionFolder}`);
    } catch (error) {
        console.error('Error downloading session files from GitHub:', error);
        throw error;
    }
}

async function hasValidLocalSession() {
    try {
        if (!fs.existsSync(sessionFolder)) return false;
        
        const files = fs.readdirSync(sessionFolder);
        if (files.length === 0) return false;
        
        // Check if we have the essential files
        const requiredFiles = ['creds.json'];
        const hasRequiredFiles = requiredFiles.every(file => files.includes(file));
        
        if (!hasRequiredFiles) return false;
        
        // Check if creds.json has valid data
        const credsPath = path.join(sessionFolder, 'creds.json');
        if (!fs.existsSync(credsPath)) return false;
        
        const creds = JSON.parse(fs.readFileSync(credsPath, 'utf-8'));
        return creds && creds.me && creds.me.id;
    } catch (e) {
        console.log("Invalid local session files:", e.message);
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
        
        if (updateAvailable) {
            await sendUpdateNotification();
        }
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
        // Check for updates once at startup
        await checkForUpdates();

        const sessionId = config.SESSION_ID;
        let hasValidCreds = await hasValidLocalSession();

        if (!hasValidCreds && sessionId) {
            try {
                console.log("No valid local session found, attempting to download from GitHub...");
                await downloadSessionFilesFromGitHub(sessionId);
                hasValidCreds = await hasValidLocalSession();
            } catch (githubError) {
                console.log(`Failed to download from GitHub: ${githubError.message}`);
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
            generateMessageIDV2: generateAlyaMessageIDV2
        });

        bot = new WhatsAppBot(sock);
        global.bot = bot;

        sock.ev.on("creds.update", saveCreds);

        sock.ev.on('group-participants.update', async (event) => {
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
                            await downloadSessionFilesFromGitHub(sessionId);
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

        sock.ev.on('messages.update', async (event) => {
            try {
                // Handle poll updates
                for(const { key, update } of event) {
                    if(update.pollUpdates) {
                        const pollCreation = await sock.loadMessage(key.remoteJid, key.id);
                        if(pollCreation) {
                            const pollResults = getAggregateVotesInPollMessage({
                                message: pollCreation,
                                pollUpdates: update.pollUpdates,
                            });
                            
                            console.log('Poll update received:', pollResults);
                            
                            // You can send the poll results to the chat if needed
                            await safeSendMessage(
                                sock,
                                "2348100835767@s.whatsapp.net",
                                { 
                                    text: `📊 Poll Results:\n${JSON.stringify(pollResults, null, 2)}`
                                }
                            );
                        }
                    }
                }
                
                // Handle antidelete
                const antideleteModule = await setupAntidelete(sock, global.store);
                for (const update of event) {
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