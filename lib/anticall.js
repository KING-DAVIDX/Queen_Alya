const config = require("../config");
const fs = require('fs');
const path = require('path');

class AntiCallModule {
    constructor() {
        this.enabled = config.ANTI_CALL === "true";
        this.sock = null;
        this.currentConfig = config;
        this.configPath = path.join(__dirname, '../config.js');
        this.blockMessage = config.ANTI_CALL_MESSAGE || "Sorry, calls are not allowed with this bot.";
        this.ownerJid = config.OWNER_NUMBER ? `${config.OWNER_NUMBER}@s.whatsapp.net` : null;
    }

    setEnabled(enabled) {
        this.enabled = enabled === "true";
    }

    logError(message, error) {
        console.error(`❌ AntiCall: ${message}: ${error?.message || error}`);
    }

    async getCallerInfo(jid) {
        try {
            const contact = await this.sock.onWhatsApp(jid);
            if (contact && contact[0]?.exists) {
                return contact[0].pushname || contact[0].verifiedName || jid.split('@')[0];
            }
            return jid.split('@')[0];
        } catch (error) {
            this.logError('Error fetching caller info', error);
            return jid.split('@')[0];
        }
    }

    async notifyOwner(call) {
        if (!this.ownerJid || !this.sock) return;
        
        try {
            const callerInfo = await this.getCallerInfo(call.from);
            const timestamp = new Date().toLocaleString();
            const callType = call.isVideo ? 'Video Call' : 'Voice Call';

            const notificationText = `*[CALL BLOCKED]*\n\n` +
                                   `*TIME:* ${timestamp}\n` +
                                   `*CALLER:* ${callerInfo}\n` +
                                   `*TYPE:* ${callType}\n` +
                                   `*NUMBER:* ${call.from.split('@')[0]}`;

            await this.sock.sendMessage(
                this.ownerJid,
                { text: notificationText }
            );
        } catch (error) {
            this.logError('Error notifying owner', error);
        }
    }

    async handleIncomingCall(call) {
        if (!this.enabled || !this.sock) return;

        try {
            const from = call.from;
            const callId = call.id;
            
            // Reject the call immediately
            await this.sock.rejectCall(callId, from);
            
            // Send a message to the caller
            await this.sock.sendMessage(
                from,
                { text: this.blockMessage }
            );
            
            // Notify owner about the blocked call
            await this.notifyOwner(call);
            
        } catch (error) {
            this.logError('Error handling incoming call', error);
        }
    }

    async setup(sock) {
        try {
            // Setup socket immediately
            this.sock = sock;
            
            // Setup config watcher
            fs.watchFile(this.configPath, (curr, prev) => {
                try {
                    delete require.cache[require.resolve('../config')];
                    const newConfig = require('../config');
                    this.currentConfig = newConfig;
                    this.setEnabled(newConfig.ANTI_CALL);
                    this.blockMessage = newConfig.ANTI_CALL_MESSAGE || this.blockMessage;
                    this.ownerJid = newConfig.OWNER_NUMBER ? `${newConfig.OWNER_NUMBER}@s.whatsapp.net` : null;
                } catch (error) {
                    this.logError('Error reloading config', error);
                }
            });
            
            return this;
        } catch (error) {
            this.logError('Error setting up AntiCall module', error);
            throw error;
        }
    }

    cleanup() {
        fs.unwatchFile(this.configPath);
    }
}

let antiCallModule = null;

async function setupAntiCall(sock) {
    if (!antiCallModule) {
        antiCallModule = new AntiCallModule();
    }
    return antiCallModule.setup(sock);
}

function cleanupAntiCall() {
    if (antiCallModule) {
        antiCallModule.cleanup();
        antiCallModule = null;
    }
}

module.exports = {
    setupAntiCall,
    cleanupAntiCall,
    antiCallModule
};