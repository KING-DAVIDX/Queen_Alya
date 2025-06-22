const config = require("../config");
const { getStore } = require("./store");
const fs = require('fs');
const path = require('path');

class AntideleteModule {
    constructor() {
        this.ownerJid = null;
        this.enabled = config.DELETE === "true";
        this.sock = null;
        this.store = null;
        this.currentConfig = config;
        this.configPath = path.join(__dirname, '../config.js');
    }

    isGroup(jid) {
        return jid.endsWith('@g.us');
    }

    isStatus(jid) {
        return jid === 'status@broadcast';
    }

    shouldTrackMessage(message) {
        if (this.isStatus(message.key.remoteJid)) return false;
        if (!message.message) return false;

        const excludedTypes = [
            'protocolMessage',
            'senderKeyDistributionMessage',
            'messageContextInfo'
        ];

        const messageType = Object.keys(message.message)[0];
        return !excludedTypes.includes(messageType);
    }

    setOwnerJid() {
        const ownerNumber = this.currentConfig.OWNER_NUMBER;
        if (!ownerNumber) {
            this.logError('Owner number not set in config');
            return;
        }
        this.ownerJid = `${ownerNumber}@s.whatsapp.net`;
    }

    createFakeReply(id) {
        return {
            key: {
                fromMe: false,
                participant: "0@s.whatsapp.net",
                remoteJid: "status@broadcast",
                id: id
            },
            message: {
                conversation: "*ANTIDELETE DETECTED*"
            }
        };
    }

    async getGroupName(jid) {
        try {
            const groupMetadata = await this.sock.groupMetadata(jid);
            return groupMetadata.subject;
        } catch (error) {
            this.logError('Error fetching group name', error);
            return jid.split('@')[0];
        }
    }

    async handleMessageUpdate(update) {
        if (!this.enabled || !this.ownerJid || !this.sock || !this.store) return;

        const chat = update.key.remoteJid;
        const messageId = update.key.id;

        if (this.isStatus(chat)) return;

        const isDeleted = 
            update.update.message === null || 
            update.update.messageStubType === 2 ||
            (update.update.message?.protocolMessage?.type === 0);

        if (isDeleted) {
            console.log(`🔍 Antidelete: Detected deleted message ${messageId} in ${chat}`);

            try {
                let deletedMessage = await this.store.loadMessage(chat, messageId);
                
                if (!deletedMessage) {
                    deletedMessage = await this.store.findMessageById(messageId);
                }

                if (!deletedMessage) {
                    console.log('Deleted message not found in store');
                    return;
                }

                if (!this.shouldTrackMessage(deletedMessage)) return;

                await this.forwardDeletedMessage(chat, deletedMessage);
            } catch (error) {
                this.logError('Error handling deleted message', error);
            }
        }
    }

    async forwardDeletedMessage(chat, deletedMessage) {
        if (!this.sock || !this.store) return;
        
        const deletedBy = deletedMessage.key.fromMe ? this.sock.user.id : deletedMessage.key.participant || chat;
        const sender = deletedMessage.key.participant || deletedMessage.key.remoteJid;

        try {
            const forwardedMessage = await this.sock.sendMessage(
                this.ownerJid,
                { forward: deletedMessage },
                { quoted: this.createFakeReply(deletedMessage.key.id) }
            );
            
            if (forwardedMessage) {
                const chatName = this.isGroup(chat) ? 
                    await this.getGroupName(chat) : 
                    "Private Chat";
                
                const mentions = [sender, deletedBy].filter((jid, index, self) => 
                    self.indexOf(jid) === index
                );

                const notificationText = this.createNotificationText(chatName, sender, deletedBy, chat);

                await this.sock.sendMessage(
                    this.ownerJid,
                    {
                        text: notificationText,
                        mentions: mentions
                    },
                    { quoted: forwardedMessage }
                );
            }
        } catch (error) {
            this.logError('Error forwarding deleted message', error);
        }
    }

    createNotificationText(chatName, sender, deletedBy, chat) {
        return `*[DELETED MESSAGE INFORMATION]*\n\n` +
               `*TIME:* ${new Date().toLocaleString()}\n` +
               `*MESSAGE FROM:* @${sender.split('@')[0]}\n` +
               `*CHAT:* ${chatName}\n` +
               `*DELETED BY:* @${deletedBy.split('@')[0]}\n` +
               `*IS GROUP:* ${this.isGroup(chat) ? 'Yes' : 'No'}`;
    }

    logError(message, error) {
        console.error(`❌ ${message}: ${error?.message || error}`);
    }

    async setup(sock) {
        try {
            // Initialize the store if not already done
            if (!this.store) {
                this.store = await getStore();
                // Add small delay to ensure store is fully ready
                await new Promise(resolve => setTimeout(resolve, 500));
            }
            
            // Setup socket
            this.sock = sock;
            
            // Setup owner JID
            this.setOwnerJid();
            
            // Setup config watcher
            fs.watchFile(this.configPath, (curr, prev) => {
                try {
                    delete require.cache[require.resolve('../config')];
                    const newConfig = require('../config');
                    this.currentConfig = newConfig;
                    this.enabled = newConfig.DELETE === "true";
                    this.setOwnerJid();
                    
                } catch (error) {
                    this.logError('Error reloading config', error);
                }
            });
            
            console.log(`🚀 Antidelete module initialized. Enabled: ${this.enabled}`);
            return this;
        } catch (error) {
            this.logError('Error setting up Antidelete module', error);
            throw error;
        }
    }

    cleanup() {
        fs.unwatchFile(this.configPath);
    }
}

let antideleteModule = null;

async function setupAntidelete(sock) {
    if (!antideleteModule) {
        antideleteModule = new AntideleteModule();
    }
    return antideleteModule.setup(sock);
}

function cleanupAntidelete() {
    if (antideleteModule) {
        antideleteModule.cleanup();
        antideleteModule = null;
    }
}

module.exports = {
    setupAntidelete,
    cleanupAntidelete,
    antideleteModule
};