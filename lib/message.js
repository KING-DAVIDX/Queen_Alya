const { delay, downloadContentFromMessage, jidDecode, proto } = require('baileys');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { serializeMessage, getChatType } = require('./serialize');
const fetch = require('node-fetch');
const { initializeStore, getStore } = require("./store");
const FileType = require("file-type");
const {
    imageToWebp,
    videoToWebp,
    writeExifImg,
    writeExifVid,
    writeExifWebp
} = require('./sticker');

class WhatsAppBot {
    constructor(sock = null) {
        this.sock = sock;
        this._isConnected = false;
        this._currentMessage = null;
    }

    setSocket(sock) {
        this.sock = sock;
        this._isConnected = !!sock;
    }

    isConnected() {
        return this._isConnected && this.sock !== null;
    }

    get socket() {
        return this.sock;
    }

    // Core message sending method
    async sendMessage(jid, content, options = {}) {
        if (!this.sock) throw new Error('WhatsApp connection not established');
        return this.sock.sendMessage(jid, content, options);
    }

    // Message processing
    async processMessage(msg) {
        const stor = getStore();
        this._currentMessage = await serializeMessage(msg, this.sock, stor);
        if (this._currentMessage) {
            this._proxyMessageContext();
        }
        return this._currentMessage;
    }

    get message() {
        return this._currentMessage;
    }

    set message(value) {
        this._currentMessage = value;
    }

    // Proxy message context to bot instance
    _proxyMessageContext() {
        if (!this._currentMessage) return;

        const msg = this._currentMessage;
        // Always use the original message's chat context
        this.chat = msg.chat || msg.key?.remoteJid;
        this.sender = msg.sender || msg.key?.participant || this.chat;
        this.isGroup = msg.isGroup || getChatType(this.chat) === 'group';
        this.text = msg.text || msg.content || '';
        this.query = msg.query || '';

        // Copy other relevant properties
        const propsToCopy = ['id', 'fromMe', 'isBot', 'isBaileys', 'type', 'mtype', 'body', 'command', 'args'];
        propsToCopy.forEach(key => {
            if (msg[key] !== undefined) {
                this[key] = msg[key];
            }
        });
    }

    // Message methods
    async reply(text, opt = { withTag: true }) {
    if (!this._currentMessage) throw new Error('No message context');
    
    // Ensure we're using the correct chat context
    const targetChat = this._currentMessage.chat || this._currentMessage.key?.remoteJid;
    if (!targetChat) {
        throw new Error('No target chat available for reply');
    }

    const fakeQuoted = { 
        key: {
            fromMe: false,
            participant: "867051314767696@bot",
            remoteJid: "@bot",
        },
        message: {
            extendedTextMessage: {
                text: this._currentMessage.message?.conversation || 
                      this._currentMessage.message?.extendedTextMessage?.text || "",
                contextInfo: {
                    participant: "867051314767696@bot",
                    quotedMessage: {
                        conversation: this._currentMessage.message?.conversation || 
                                     this._currentMessage.message?.extendedTextMessage?.text || ""
                    }
                }
            }
        }
    };
    
    return this.sendMessage(targetChat, {
        text: require("util").format(text),
        ...opt,
    }, { 
        ...opt,
        quoted: opt.withTag ? fakeQuoted : this._currentMessage 
    });
}

    async send(content, options = {}) {
        if (!this._currentMessage) throw new Error('No message context');
        return this.sendMessage(this.chat, content, options);
    }

    async sendText(jid, text, options = {}) {
        return this.sendMessage(jid, { text }, options);
    }

    async sendImage(jid, image, caption = '', options = {}) {
        let imageContent;
        if (Buffer.isBuffer(image)) {
            imageContent = image;
        } else if (image.startsWith('http')) {
            imageContent = { url: image };
        } else {
            imageContent = fs.readFileSync(image);
        }

        return this.sendMessage(jid, {
            image: imageContent,
            caption: caption,
            contextInfo: {
                forwardingScore: 1,
                isForwarded: true,
                forwardedNewsletterMessageInfo: {
                    newsletterJid: "120363418404777886@newsletter",
                    newsletterName: "Queen_Alya"
                }
            },
            ...options
        }, { 
    quoted: {
        key: {
            fromMe: false,
            participant: "867051314767696@bot",
            remoteJid: "@bot"
        },
        message: {
            newsletterAdminInviteMessage: {
                newsletterJid: "120363401730094494@newsletter",
                newsletterName: "KING XER",
                caption: "IMAGE MADE WITH 🖤",
                inviteExpiration: 1752555592,
                jpegThumbnail: null
            }
        }
    }
   });
    }

    async sendVideo(jid, video, caption = '', options = {}) {
        let videoContent;
        if (Buffer.isBuffer(video)) {
            videoContent = video;
        } else if (video.startsWith('http')) {
            videoContent = { url: video };
        } else {
            videoContent = fs.readFileSync(video);
        }

        return this.sendMessage(jid, {
            video: videoContent,
            caption: caption,
            contextInfo: {
                forwardingScore: 1,
                isForwarded: true,
                forwardedNewsletterMessageInfo: {
                    newsletterJid: "120363418404777886@newsletter",
                    newsletterName: "Queen_Alya"
                }
            },
            ...options
        }, { 
    quoted: {
        key: {
            fromMe: false,
            participant: "867051314767696@bot",
            remoteJid: "@bot"
        },
        message: {
            newsletterAdminInviteMessage: {
                newsletterJid: "120363401730094494@newsletter",
                newsletterName: "KING XER",
                caption: "VIDEO MADE WITH 🖤", // Custom text
                inviteExpiration: 1752555592, // Plain number (Unix timestamp)
                jpegThumbnail: null // Optional thumbnail
            }
        }
    }
   });
    }

    async sendDocument(jid, document, filename = '', caption = '', options = {}) {
        let documentBuffer;
        if (Buffer.isBuffer(document)) {
            documentBuffer = document;
        } else {
            documentBuffer = fs.readFileSync(document);
            filename = filename || path.basename(document);
        }

        return this.sendMessage(jid, {
            document: documentBuffer,
            fileName: filename,
            caption,
            mimetype: 'application/octet-stream',
            ...options
        });
    }

    async sendAudio(jid, audio, ptt = false, options = {}) {
        let audioBuffer;
        if (Buffer.isBuffer(audio)) {
            audioBuffer = audio;
        } else {
            audioBuffer = fs.readFileSync(audio);
        }

        return this.sendMessage(jid, {
            audio: audioBuffer,
            ptt,
            mimetype: 'audio/mpeg',
            ...options
        });
    }

    async sendSticker(jid, sticker, options = {}) {
        let stickerBuffer;
        if (Buffer.isBuffer(sticker)) {
            stickerBuffer = sticker;
        } else {
            stickerBuffer = fs.readFileSync(sticker);
        }

        return this.sendMessage(jid, {
            sticker: stickerBuffer,
            mimetype: 'image/webp',
            ...options
        });
    }

    async sendLocation(jid, latitude, longitude, name = '', address = '', options = {}) {
        return this.sendMessage(jid, {
            location: {
                degreesLatitude: latitude,
                degreesLongitude: longitude,
                name,
                address
            },
            ...options
        });
    }

    async sendContact(jid, number, name, options = {}) {
        return this.sendMessage(jid, {
            contacts: {
                displayName: name,
                contacts: [{
                    vcard: `BEGIN:VCARD\nVERSION:3.0\nFN:${name}\nTEL;type=CELL;type=VOICE;waid=${number}:${number}\nEND:VCARD`
                }]
            },
            ...options
        });
    }

    async sendButtons(jid, text, buttons, footer = '', options = {}) {
        return this.sendMessage(jid, {
            text,
            footer,
            buttons,
            headerType: 1,
            ...options
        });
    }

    async sendList(jid, text, buttonText, sections, title = '', footer = '', options = {}) {
        return this.sendMessage(jid, {
            text,
            footer,
            title,
            buttonText,
            sections,
            ...options
        });
    }

    async deleteMessage(jid, message) {
        return this.sendMessage(jid, {
            delete: message.key
        });
    }

    async react(emoji) {
        if (!this._currentMessage) throw new Error('No message context');
        return this.sendMessage(this.chat, {
            react: {
                text: emoji,
                key: this._currentMessage.key
            }
        });
    }

    async decodeJid(jid) {
        if (!jid) return jid;
        if (/:\d+@/gi.test(jid)) {
            let decode = jidDecode(jid) || {};
            return decode.user && decode.server && decode.user + '@' + decode.server || jid;
        } else return jid;
    }
    
    async downloadAndSaveMediaMessage(message, filename, attachExtension = true) {
        let trueFileName;
        let quoted = message.msg ? message.msg : message;
        let mime = (message.msg || message).mimetype || '';
        let messageType = message.mtype ? message.mtype.replace(/Message/gi, '') : mime.split('/')[0];
        const stream = await downloadContentFromMessage(quoted, messageType);
        let buffer = Buffer.from([]);
        for await (const chunk of stream) {
            buffer = Buffer.concat([buffer, chunk]);
        }
        let type = await FileType.fromBuffer(buffer);
        trueFileName = attachExtension ? (filename + '.' + type.ext) : filename;
        // save to file
        await fs.writeFileSync(trueFileName, buffer);
        return trueFileName;
    }

    async downloadMediaMessage(message) {
        let mime = (message.msg || message).mimetype || '';
        let messageType = message.mtype ? message.mtype.replace(/Message/gi, '') : mime.split('/')[0];
        const stream = await downloadContentFromMessage(message, messageType);
        let buffer = Buffer.from([]);
        for await (const chunk of stream) {
            buffer = Buffer.concat([buffer, chunk]);
        }
        return buffer;
    }

    // Sticker-related methods
    async imageToWebp(media) {
        return await imageToWebp(media);
    }

    async videoToWebp(media) {
        return await videoToWebp(media);
    }

    async writeExifImg(media, metadata) {
        return await writeExifImg(media, metadata);
    }

    async writeExifVid(media, metadata) {
        return await writeExifVid(media, metadata);
    }

    async writeExifWebp(media, metadata) {
        return await writeExifWebp(media, metadata);
    }
    
    async getBuffer(url) {
        try {
            const response = await fetch(url);
            const arrayBuffer = await response.arrayBuffer();
            return Buffer.from(arrayBuffer);
        } catch (error) {
            console.error('Error in getBuffer:', error);
            throw error;
        }
    }

    async sendVideoAsSticker(jid, path, quoted, options = {}) {
        let buff = Buffer.isBuffer(path) ? path : /^data:.*?\/.*?;base64,/i.test(path) ? Buffer.from(path.split`,`[1], 'base64') : /^https?:\/\//.test(path) ? await (await this.getBuffer(path)) : fs.existsSync(path) ? fs.readFileSync(path) : Buffer.alloc(0);
        let buffer;
        if (options && (options.packname || options.author)) {
            buffer = await this.writeExifVid(buff, options);
        } else {
            buffer = await this.videoToWebp(buff);
        }
        await this.sendMessage(jid, { sticker: { url: buffer }, ...options }, { quoted });
        return buffer;
    }

    async sendImageAsSticker(jid, path, quoted, options = {}) {
        let buff = Buffer.isBuffer(path) ? path : /^data:.*?\/.*?;base64,/i.test(path) ? Buffer.from(path.split`,`[1], 'base64') : /^https?:\/\//.test(path) ? await (await this.getBuffer(path)) : fs.existsSync(path) ? fs.readFileSync(path) : Buffer.alloc(0);
        let buffer;
        if (options && (options.packname || options.author)) {
            buffer = await this.writeExifImg(buff, options);
        } else {
            buffer = await this.imageToWebp(buff);
        }
        await this.sendMessage(jid, { sticker: { url: buffer }, ...options }, { quoted })
        .then(response => {
            fs.unlinkSync(buffer);
            return response;
        });
    }

    async sendStickerFromImage(jid, image, metadata = {}, options = {}) {
        let imageBuffer;
        if (Buffer.isBuffer(image)) {
            imageBuffer = image;
        } else if (image.startsWith('http')) {
            const response = await axios.get(image, { responseType: 'arraybuffer' });
            imageBuffer = Buffer.from(response.data, 'binary');
        } else {
            imageBuffer = fs.readFileSync(image);
        }

        let webpBuffer;
        if (metadata.packname || metadata.author) {
            const exifPath = await this.writeExifImg(imageBuffer, metadata);
            webpBuffer = fs.readFileSync(exifPath);
            fs.unlinkSync(exifPath); // Clean up temporary file
        } else {
            webpBuffer = await this.imageToWebp(imageBuffer);
        }

        return this.sendMessage(jid, {
            sticker: webpBuffer,
            mimetype: 'image/webp',
            ...options
        });
    }

    async sendStickerFromVideo(jid, video, metadata = {}, options = {}) {
        let videoBuffer;
        if (Buffer.isBuffer(video)) {
            videoBuffer = video;
        } else if (video.startsWith('http')) {
            const response = await axios.get(video, { responseType: 'arraybuffer' });
            videoBuffer = Buffer.from(response.data, 'binary');
        } else {
            videoBuffer = fs.readFileSync(video);
        }

        let webpBuffer;
        if (metadata.packname || metadata.author) {
            const exifPath = await this.writeExifVid(videoBuffer, metadata);
            webpBuffer = fs.readFileSync(exifPath);
            fs.unlinkSync(exifPath); // Clean up temporary file
        } else {
            webpBuffer = await this.videoToWebp(videoBuffer);
        }

        return this.sendMessage(jid, {
            sticker: webpBuffer,
            mimetype: 'image/webp',
            ...options
        });
    }

    async sendStickerFromWebp(jid, webpMedia, metadata = {}, options = {}) {
        let webpBuffer;
        if (Buffer.isBuffer(webpMedia)) {
            webpBuffer = webpMedia;
        } else if (webpMedia.startsWith('http')) {
            const response = await axios.get(webpMedia, { responseType: 'arraybuffer' });
            webpBuffer = Buffer.from(response.data, 'binary');
        } else {
            webpBuffer = fs.readFileSync(webpMedia);
        }

        if (metadata.packname || metadata.author) {
            const exifPath = await this.writeExifWebp(webpBuffer, metadata);
            webpBuffer = fs.readFileSync(exifPath);
            fs.unlinkSync(exifPath); // Clean up temporary file
        }

        return this.sendMessage(jid, {
            sticker: webpBuffer,
            mimetype: 'image/webp',
            ...options
        });
    }
}

module.exports = WhatsAppBot;