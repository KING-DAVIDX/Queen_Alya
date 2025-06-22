const config = require("../config");
const { getStore } = require("./store");
const fs = require('fs');
const path = require('path');
const { serializeMessage } = require("./serialize");
const { downloadContentFromMessage } = require('baileys');
const { writeFile } = require('fs/promises');

class StatusSaverModule {
    constructor() {
        this.ownerJid = null;
        this.enabled = config.AUTO_SAVE_STATUS === "true";
        this.sock = null;
        this.store = null;
        this.currentConfig = config;
        this.configPath = path.join(__dirname, '../config.js');
        this.mediaDir = path.join(__dirname, '../Media');
        this.allowedNumbers = this.parseAllowedNumbers();
        this.ensureMediaDirExists();
    }

    parseAllowedNumbers() {
        if (!config.SAVE_STATUS_FROM || config.SAVE_STATUS_FROM === "false") {
            return [];
        }
        return config.SAVE_STATUS_FROM.split(',').map(num => num.trim());
    }

    ensureMediaDirExists() {
        if (!fs.existsSync(this.mediaDir)) {
            fs.mkdirSync(this.mediaDir, { recursive: true });
        }
    }

    isStatus(jid) {
        return jid === 'status@broadcast';
    }

    shouldTrackStatus(message) {
        if (!this.isStatus(message.key.remoteJid)) return false;
        if (!message.message) return false;

        const validTypes = [
            'imageMessage',
            'videoMessage',
            'audioMessage'
        ];

        const messageType = Object.keys(message.message)[0];
        return validTypes.includes(messageType);
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
                conversation: "*STATUS SAVED*"
            }
        };
    }

    async getStatusSenderInfo(jid) {
        try {
            const contact = await this.sock.onWhatsApp(jid);
            if (contact && contact[0]?.exists) {
                return contact[0].pushname || contact[0].verifiedName || jid.split('@')[0];
            }
            return jid.split('@')[0];
        } catch (error) {
            this.logError('Error fetching sender info', error);
            return jid.split('@')[0];
        }
    }

    isSenderAllowed(senderJid) {
        if (!this.enabled) return false;
        if (this.allowedNumbers.length === 0) return true; // If no numbers specified, allow all
        
        const senderNumber = senderJid.split('@')[0];
        return this.allowedNumbers.includes(senderNumber);
    }

    async downloadMedia(message, type) {
        try {
            const extension = type === 'imageMessage' ? 'jpg' : 
                            type === 'videoMessage' ? 'mp4' : 
                            type === 'audioMessage' ? 'mp3' : 'bin';
            
            const mediaType = type.replace('Message', '');
            const timestamp = Date.now();
            const filename = `status_${timestamp}.${extension}`;
            const filepath = path.join(this.mediaDir, filename);

            const stream = await downloadContentFromMessage(message, mediaType);
            let buffer = Buffer.from([]);
            
            for await (const chunk of stream) {
                buffer = Buffer.concat([buffer, chunk]);
            }

            await writeFile(filepath, buffer);
            return filepath;
        } catch (error) {
            this.logError('Error downloading media', error);
            return null;
        }
    }

    async handleStatusUpdate(message) {
        if (!this.enabled || !this.ownerJid || !this.sock || !this.store) return;

        try {
            if (!this.shouldTrackStatus(message)) return;

            const serialized = await serializeMessage(message, this.sock, this.store);
            if (!serialized) return;

            // Check if sender is allowed
            if (!this.isSenderAllowed(serialized.sender)) {
                
                return;
            }

            const messageType = Object.keys(message.message)[0];
            const mediaPath = await this.downloadMedia(message.message[messageType], messageType);
            
            if (!mediaPath) {
                this.logError('Failed to download media');
                return;
            }

            await this.forwardStatusToOwner(serialized, messageType, mediaPath);
        } catch (error) {
            this.logError('Error handling status update', error);
        }
    }

    async forwardStatusToOwner(serializedMsg, messageType, mediaPath) {
        if (!this.sock) return;

        try {
            const senderInfo = await this.getStatusSenderInfo(serializedMsg.sender);
            const timestamp = new Date().toLocaleString();

            // Send the media with caption
            let mediaMessage = {};
            const caption = serializedMsg.content || 'No caption';

            switch (messageType) {
                case 'imageMessage':
                    mediaMessage = {
                        image: { url: mediaPath },
                        caption: caption
                    };
                    break;
                case 'videoMessage':
                    mediaMessage = {
                        video: { url: mediaPath },
                        caption: caption
                    };
                    break;
                case 'audioMessage':
                    mediaMessage = {
                        audio: { url: mediaPath },
                        mimetype: 'audio/mp4'
                    };
                    break;
            }

            const sentMessage = await this.sock.sendMessage(
                this.ownerJid,
                mediaMessage,
                { quoted: this.createFakeReply(serializedMsg.key.id) }
            );

            if (sentMessage) {
                // Send additional info about the status
                const statusType = messageType === 'imageMessage' ? 'Image' : 
                                 messageType === 'videoMessage' ? 'Video' : 
                                 messageType === 'audioMessage' ? 'Audio' : 'Unknown';

                const notificationText = `*[STATUS UPDATE SAVED]*\n\n` +
                                       `*TIME:* ${timestamp}\n` +
                                       `*FROM:* ${senderInfo}\n` +
                                       `*TYPE:* ${statusType}\n` +
                                       `*CAPTION:* ${caption}`;

                await this.sock.sendMessage(
                    this.ownerJid,
                    { text: notificationText },
                    { quoted: sentMessage }
                );
            }

            // Clean up the media file after sending
            try {
                fs.unlinkSync(mediaPath);
            } catch (cleanupError) {
                this.logError('Error cleaning up media file', cleanupError);
            }
        } catch (error) {
            this.logError('Error forwarding status to owner', error);
            // Attempt to clean up media file even if sending failed
            try {
                if (mediaPath) fs.unlinkSync(mediaPath);
            } catch (cleanupError) {
                this.logError('Error cleaning up media file after failed send', cleanupError);
            }
        }
    }

    logError(message, error) {
        console.error(`❌ StatusSaver: ${message}: ${error?.message || error}`);
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
                    this.enabled = newConfig.AUTO_SAVE_STATUS === "true";
                    this.allowedNumbers = this.parseAllowedNumbers();
                    this.setOwnerJid();
                    
                } catch (error) {
                    this.logError('Error reloading config', error);
                }
            });
            
            return this;
        } catch (error) {
            this.logError('Error setting up StatusSaver module', error);
            throw error;
        }
    }

    cleanup() {
        fs.unwatchFile(this.configPath);
    }
}

let statusSaverModule = null;

async function setupStatusSaver(sock) {
    if (!statusSaverModule) {
        statusSaverModule = new StatusSaverModule();
    }
    return statusSaverModule.setup(sock);
}

function cleanupStatusSaver() {
    if (statusSaverModule) {
        statusSaverModule.cleanup();
        statusSaverModule = null;
    }
}

module.exports = {
    setupStatusSaver,
    cleanupStatusSaver,
    statusSaverModule
};