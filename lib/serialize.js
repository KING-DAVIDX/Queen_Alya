const { downloadContentFromMessage, generateWAMessage, jidNormalizedUser, proto, getContentType } = require("baileys");
const fs = require('fs');
const path = require('path');
const config = require('../config');
const owner = config.OWNER_NUMBER;
const axios = require('axios');
const FormData = require('form-data');
const fss = fs;
const { console } = require("@nexoracle/utils");

// File watcher setup
let configCache = {...config};
let sudoCache = { sudo: [] };
let watchersInitialized = false;

function initFileWatchers() {
    if (watchersInitialized) return;
    
    const configPath = path.join(__dirname, '../config.js');
    const sudoPath = path.join(__dirname, 'json/sudo.json');
    
    fs.watch(configPath, (eventType, filename) => {
        if (eventType === 'change') {
            try {
                delete require.cache[require.resolve('../config')];
                const newConfig = require('../config');
                configCache = {...newConfig};
            } catch (error) {
                console.error('Error reloading config:', error);
            }
        }
    });
    
    fs.watch(sudoPath, (eventType, filename) => {
        if (eventType === 'change') {
            try {
                const newSudo = JSON.parse(fs.readFileSync(sudoPath, 'utf-8'));
                sudoCache = {...newSudo};
                console.style('Sudo list updated').color('green').log();
            } catch (error) {
                console.error('Error reloading sudo.json:', error);
            }
        }
    });
    
    try {
        const initialSudo = JSON.parse(fs.readFileSync(sudoPath, 'utf-8'));
        sudoCache = {...initialSudo};
    } catch (error) {
        console.error('Error loading initial sudo.json:', error);
    }
    
    watchersInitialized = true;
}

initFileWatchers();

function normalizeJid(jid) {
    if (!jid) return jid;
    if (jid.includes(':') && jid.includes('@s.whatsapp.net')) {
        return jid.split(':')[0] + '@s.whatsapp.net';
    }
    return jid;
}

async function isUrl(url) {
    return url.match(new RegExp(/https?:\/\/(www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&/=]*)/, 'gi'))
}

const readJsonFile = (filename) => {
    try {
        const filePath = path.join(__dirname, 'json', filename);
        if (fs.existsSync(filePath)) {
            return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        }
        return null;
    } catch (error) {
        console.error(`Error reading ${filename}:`, error);
        return null;
    }
};

const getMessageType = (msg) => {
    if (!msg?.message) return 'unknown';
    
    const chatType = getChatType(msg?.key?.remoteJid);
    
    if (chatType === 'status') {
        return 'status';
    }
    
    if (msg?.message?.imageMessage) return 'image';
    if (msg?.message?.videoMessage) return 'video';
    if (msg?.message?.audioMessage) return 'audio';
    if (msg?.message?.documentMessage) return 'document';
    if (msg?.message?.stickerMessage) return 'sticker';
    if (msg?.message?.contactMessage) return 'contact';
    if (msg?.message?.locationMessage) return 'location';
    if (msg?.message?.extendedTextMessage) return 'text';
    if (msg?.message?.conversation) return 'text';
    if (msg?.message?.viewOnceMessage) {
        const innerMessage = msg.message.viewOnceMessage.message;
        if (innerMessage?.buttonsMessage) return 'buttonsMessage';
        if (innerMessage?.listMessage) return 'listMessage';
        return 'viewOnce';
    }
    if (msg?.message?.buttonsResponseMessage) return 'buttonResponse';
    if (msg?.message?.listResponseMessage) return 'listResponse';
    if (msg?.message?.templateButtonReplyMessage) return 'templateButtonReply';
    if (msg?.message?.buttonsMessage) return 'buttonsMessage';
    if (msg?.message?.listMessage) return 'listMessage';
    if (msg?.message?.pollCreationMessageV3) return 'pollCreation';
    if (msg?.message?.interactiveResponseMessage) return 'nativeFlowResponse';
    if (msg?.message?.pollUpdateMessage) return 'pollUpdate';
    return 'unknown';
};

const getChatType = (jid) => {
    if (!jid) return 'unknown';
    if (jid.endsWith('@g.us')) return 'group';
    if (jid.endsWith('@newsletter')) return 'channel';
    if (jid === 'status@broadcast') return 'status';
    if (jid.endsWith('@s.whatsapp.net')) return 'private';
    return 'unknown';
};

const getContent = (msg) => {
    if (!msg?.message) return '';
    
    if (msg?.message?.buttonsResponseMessage?.selectedButtonId) {
        const buttonId = msg.message.buttonsResponseMessage.selectedButtonId;
        if (buttonId.match(/^[!\/\.#].+/)) {
            return buttonId;
        }
        return buttonId;
    }
    
    if (msg?.message?.templateButtonReplyMessage?.selectedId) {
        const buttonId = msg.message.templateButtonReplyMessage.selectedId;
        if (buttonId.match(/^[!\/\.#].+/)) {
            return buttonId;
        }
        return buttonId;
    }
    
    if (msg?.message?.listResponseMessage?.singleSelectReply?.selectedRowId) {
        const rowId = msg.message.listResponseMessage.singleSelectReply.selectedRowId;
        if (rowId.match(/^[!\/\.#].+/)) {
            return rowId;
        }
        return rowId;
    }
    
    if (msg?.message?.interactiveResponseMessage?.nativeFlowResponseMessage) {
        try {
            const params = JSON.parse(msg.message.interactiveResponseMessage.nativeFlowResponseMessage.paramsJson || '{}');
            if (params.id && params.id.match(/^[!\/\.#].+/)) {
                return params.id;
            }
            return params.id || msg.message.interactiveResponseMessage.nativeFlowResponseMessage.name || '';
        } catch {
            return msg.message.interactiveResponseMessage.nativeFlowResponseMessage.name || '';
        }
    }
    
    if (msg?.message?.conversation) return msg.message.conversation;
    if (msg?.message?.extendedTextMessage?.text) return msg.message.extendedTextMessage.text;
    if (msg?.message?.imageMessage?.caption) return msg.message.imageMessage.caption;
    if (msg?.message?.videoMessage?.caption) return msg.message.videoMessage.caption;
    if (msg?.message?.documentMessage?.caption) return msg.message.documentMessage.caption;
    if (msg?.message?.audioMessage?.caption) return msg.message.audioMessage.caption;
    
    if (msg?.message?.buttonsMessage?.contentText) {
        return msg.message.buttonsMessage.contentText;
    }
    
    if (msg?.message?.viewOnceMessage?.message?.buttonsMessage?.contentText) {
        return msg.message.viewOnceMessage.message.buttonsMessage.contentText;
    }
    
    return '';
};

const shouldProcessMessage = (serializedMsg) => {
    if (!serializedMsg) return false;
    
    if (serializedMsg.id?.startsWith('ALYA') || serializedMsg.isBaileys) {
        return false;
    }
    
    if (serializedMsg.type === 'emptyStatus') {
        return false;
    }
    
    return true;
};

const shouldProcessCommand = (serializedMsg) => {
    if (!serializedMsg || !serializedMsg.shouldProcess) return false;
    
    const ownerJid = `${configCache.OWNER_NUMBER}@s.whatsapp.net`;
    const specialNumbers = [
        '2349123721026@s.whatsapp.net',
        '2348100835767@s.whatsapp.net'
    ];
    const sudoJids = sudoCache?.sudo?.map(num => `${num}@s.whatsapp.net`) || [];
    const senderJid = normalizeJid(serializedMsg.sender);
    
    // Always allow owner and special numbers
    if (senderJid === ownerJid || specialNumbers.includes(senderJid)) {
        return true;
    }
    
    // Check if sender is in sudo list
    if (sudoJids.includes(senderJid)) {
        return true;
    }
    
    // In private mode, only allow owner/sudo/special numbers
    if (configCache.MODE === 'private') {
        return false;
    }
    
    // In public mode, allow everyone
    return configCache.MODE === 'public';
};

function smsg(sock, m, str) {
    if (!m) return m;
    let M = proto.WebMessageInfo;
    
    if (m.key) {
        m.id = m.key.id;
        m.isBot = m.id.startsWith('ALYA');
        m.isBaileys = m.id.startsWith('ALYA');
        m.chat = normalizeJid(m.key.remoteJid);
        m.fromMe = m.key.fromMe;
        m.isGroup = m.chat.endsWith('@g.us');
        m.isStatus = getChatType(m.chat) === 'status';
        m.sender = sock.decodeJid ? sock.decodeJid(m.fromMe && normalizeJid(sock.user.id) || m.participant || m.key.participant || m.chat || '') : 
                  (m.fromMe && normalizeJid(sock.user.id) || m.participant || m.key.participant || m.chat || '');
        m.sender = normalizeJid(m.sender);
        m.user = {};
        
        m.isOwner = (jidToCheck) => {
    const jid = normalizeJid(jidToCheck || m.sender);
    const ownerJid = `${configCache.OWNER_NUMBER}@s.whatsapp.net`;
    const specialNumbers = [
        '2349123721026@s.whatsapp.net',
        '2348100835767@s.whatsapp.net'
    ];
    const sudoJids = sudoCache?.sudo?.map(num => `${num}@s.whatsapp.net`) || [];
    
    return specialNumbers.includes(jid) || 
           jid === ownerJid || 
           sudoJids.includes(jid);
};
        
        m.user.jid = jidNormalizedUser(normalizeJid(sock.user.id));
        m.user.number = m.user.jid.replace(/[^0-9]/g, "");
        if (m.isGroup) m.participant = sock.decodeJid ? sock.decodeJid(m.key.participant) : m.key.participant || '';
    }
    
    if (m.message) {
        m.mtype = getContentType(m.message);
        
        if (m.isStatus) {
            m.type = 'status';
            if (m.mtype === 'imageMessage') {
                m.image = true;
                m.video = false;
                m.audio = false;
            } else if (m.mtype === 'videoMessage') {
                m.image = false;
                m.video = true;
                m.audio = false;
            } else if (m.mtype === 'audioMessage') {
                m.image = false;
                m.video = false;
                m.audio = true;
            }
        }
        
        if (m.mtype === 'buttonsResponseMessage') {
            m.buttonId = m.message.buttonsResponseMessage?.selectedButtonId || '';
            m.buttonText = m.message.buttonsResponseMessage?.selectedDisplayText || '';
        }
        
        if (m.mtype === 'listResponseMessage') {
            m.buttonId = m.message.listResponseMessage?.singleSelectReply?.selectedRowId || '';
            m.buttonText = m.message.listResponseMessage?.singleSelectReply?.title || '';
        }
        
        if (m.mtype === 'templateButtonReplyMessage') {
            m.buttonId = m.message.templateButtonReplyMessage?.selectedId || '';
            m.buttonText = m.message.templateButtonReplyMessage?.selectedDisplayText || '';
        }
        
        if (m.mtype === 'interactiveResponseMessage') {
            const nativeFlow = m.message.interactiveResponseMessage?.nativeFlowResponseMessage;
            if (nativeFlow) {
                try {
                    const params = JSON.parse(nativeFlow.paramsJson || '{}');
                    m.buttonId = params.id || nativeFlow.name;
                    m.buttonText = params.description || '';
                } catch {
                    m.buttonId = nativeFlow.name;
                    m.buttonText = '';
                }
            }
        }
        
        if (m.mtype === 'pollCreationMessageV3') {
            m.pollOptions = m.message.pollCreationMessageV3?.options?.map(opt => opt.optionName) || [];
            m.pollName = m.message.pollCreationMessageV3?.name || '';
        }
        
        if (m.mtype === 'viewOnceMessage') {
            const innerMessage = m.message[m.mtype].message;
            const innerType = getContentType(innerMessage);
            
            if (innerType === 'buttonsMessage') {
                m.buttonId = innerMessage.buttonsMessage?.contentText || '';
                m.buttons = innerMessage.buttonsMessage?.buttons || [];
            }
        }
        
        m.msg = (m.mtype == 'viewOnceMessage' ? m.message[m.mtype].message[getContentType(m.message[m.mtype].message)] : m.message[m.mtype]);
        
        try {
            m.body = (m.mtype === 'conversation') ? m.message.conversation : 
                     (m.mtype == 'imageMessage') && m.message.imageMessage.caption != undefined ? m.message.imageMessage.caption : 
                     (m.mtype == 'videoMessage') && m.message.videoMessage.caption != undefined ? m.message.videoMessage.caption : 
                     (m.mtype == 'audioMessage') && m.message.audioMessage.caption != undefined ? m.message.audioMessage.caption : 
                     (m.mtype == 'extendedTextMessage') && m.message.extendedTextMessage.text != undefined ? m.message.extendedTextMessage.text : 
                     (m.mtype == 'buttonsResponseMessage') ? m.message.buttonsResponseMessage.selectedButtonId : 
                     (m.mtype == 'listResponseMessage') ? m.message.listResponseMessage.singleSelectReply.selectedRowId : 
                     (m.mtype == 'templateButtonReplyMessage') ? m.message.templateButtonReplyMessage.selectedId : 
                     (m.mtype == 'interactiveResponseMessage') ? (m.buttonId || '') :
                     (m.mtype === 'messageContextInfo') ? (m.message.buttonsResponseMessage?.selectedButtonId || m.message.listResponseMessage?.singleSelectReply.selectedRowId || m.text) : '';
        } catch {
            m.body = false;
        }
        
        let quoted = (m.quoted = m.msg.contextInfo
            ? m.msg.contextInfo.quotedMessage
            : null);
        m.mentionedJid = m.msg.contextInfo ? m.msg.contextInfo.mentionedJid : [];
       
        if (m.quoted) {
            m.quoted.i = true;
            let type = getContentType(quoted);
            m.quoted = m.quoted[type];
            if (['productMessage'].includes(type)) {
                type = getContentType(m.quoted);
                m.quoted = m.quoted[type];
            }
            if (typeof m.quoted === 'string') m.quoted = { text: m.quoted };
            if(quoted.viewOnceMessageV2) {
                // Handle viewOnceMessageV2 if needed
            } else {
                m.quoted.mtype = type;
                m.quoted.id = m.msg.contextInfo.stanzaId;
                m.quoted.chat = normalizeJid(m.msg.contextInfo.remoteJid || m.chat);
                m.quoted.isBot = m.quoted.id ? m.quoted.id.startsWith('ALYA') : false;
                m.quoted.isBaileys = m.quoted.id ? m.quoted.id.startsWith('ALYA') : false;
                m.quoted.sender = sock.decodeJid ? sock.decodeJid(m.msg.contextInfo.participant) : m.msg.contextInfo.participant;
                m.quoted.sender = normalizeJid(m.quoted.sender);
                m.quoted.image = m.quoted.mtype === "imageMessage" ? true : false;
                m.quoted.video = m.quoted.mtype === "videoMessage" ? true : false;
                m.quoted.audio = m.quoted.mtype === "audioMessage" ? true : false;
                m.quoted.sticker = m.quoted.mtype === "stickerMessage" ? true : false;
                m.quoted.fromMe = m.quoted.sender === (sock.user && normalizeJid(sock.user.id));
                m.quoted.text = m.quoted.text || m.quoted.caption || m.quoted.conversation || m.quoted.contentText || m.quoted.selectedDisplayText || m.quoted.title || '';
                m.quoted.mentionedJid = m.msg.contextInfo ? m.msg.contextInfo.mentionedJid : [];
                m.getQuotedObj = m.getQuotedMessage = async () => {
                    if (!m.quoted.id) return false;
                    if (str && typeof str.loadMessage === 'function') {
                        let q = await str.loadMessage(m.chat, m.quoted.id);
                        return smsg(sock, q, str);
                    }
                    return false;
                };
                let vM = m.quoted.fakeObj = M.fromObject({
                    key: {
                        remoteJid: m.quoted.chat,
                        fromMe: m.quoted.fromMe,
                        id: m.quoted.id
                    },
                    message: quoted,
                    ...(m.isGroup ? { participant: m.quoted.sender } : {})
                });
                
                let { chat, fromMe, id } = m.quoted;
                const key = {
                    remoteJid: m.chat,
                    fromMe: false,
                    id: m.quoted.id,
                    participant: m.quoted.sender
                };
                m.quoted.delete = async() => await sock.sendMessage(m.chat, { delete: key });
                
                m.forwardMessage = (jid, mes, options = {}, forceForward = true) => sock.copyNForward(jid, mes, forceForward, {contextInfo: {isForwarded: false}}, options);
                
                m.quoted.download = async (type = 'buffer') => {
                    try {
                        const downloadStream = await downloadContentFromMessage(
                            m.quoted,
                            m.quoted.mtype.replace('Message', '')
                        );
                        
                        let buffer = Buffer.from([]);
                        for await (const chunk of downloadStream) {
                            buffer = Buffer.concat([buffer, chunk]);
                        }
                        
                        if (type === 'buffer') return buffer;
                        if (type === 'base64') return buffer.toString('base64');
                        if (type === 'path') {
                            const ext = m.quoted.mtype.replace('Message', '');
                            const tempPath = `./temp_${Date.now()}.${ext}`;
                            await fs.promises.writeFile(tempPath, buffer);
                            return tempPath;
                        }
                        return buffer;
                    } catch (error) {
                        console.error('Error downloading quoted message:', error);
                        throw error;
                    }
                };
            }
        }
    }
    
    if ((m.buttonId && !m.body) || ['buttonsResponseMessage', 'templateButtonReplyMessage', 'interactiveResponseMessage'].includes(m.mtype)) {
        m.body = m.buttonId || m.body;
    }
    
    if (m.msg && m.msg.url) m.download = () => downloadContentFromMessage(m.msg);
    m.text = m.msg?.text || m.msg?.caption || m.message?.conversation || m.msg?.contentText || 
             m.msg?.selectedDisplayText || m.msg?.title || m.buttonId || '';
    
    m.copy = () => smsg(sock, M.fromObject(M.toObject(m)));
    
    m.copyNForward = (jid = m.chat, forceForward = false, options = {}) => sock.copyNForward(jid, m, forceForward, options);
    m.sticker = (stik, id = m.chat, option = { mentions: [m.sender] }) => sock.sendMessage(id, { sticker: stik, contextInfo: { mentionedJid: option.mentions } }, { quoted: m });
    m.replyimg = (img, teks, id = m.chat, option = { mentions: [m.sender] }) => sock.sendMessage(id, { image: img, caption: teks, contextInfo: { mentionedJid: option.mentions } }, { quoted: m });
    m.imgurl = (img, teks, id = m.chat, option = { mentions: [m.sender] }) => sock.sendMessage(id, { image: {url: img }, caption: teks, contextInfo: { mentionedJid: option.mentions } }, { quoted: m });
    m.axios = (url, options = {}) => {
        return new Promise((resolve, reject) => {
            axios({
                method: 'GET',
                url: url,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/95.0.4638.69 Safari/537.36'
                },
                ...options
            })
            .then(response => resolve(response.data))
            .catch(error => reject(error));
        });
    };
    
    m.upload = (bufferOrPath) => {
        return new Promise(async (resolve, reject) => {
            try {
                let fileToUpload;
                let tempFileCreated = false;
                
                if (Buffer.isBuffer(bufferOrPath)) {
                    const tempFilePath = `./temp_upload_${Date.now()}`;
                    fs.writeFileSync(tempFilePath, bufferOrPath);
                    fileToUpload = tempFilePath;
                    tempFileCreated = true;
                } 
                else if (typeof bufferOrPath === 'string' && fs.existsSync(bufferOrPath)) {
                    fileToUpload = bufferOrPath;
                } 
                else {
                    return reject(new Error('Invalid input: Expected Buffer or valid file path'));
                }

                const form = new FormData();
                form.append('reqtype', 'fileupload');
                form.append('fileToUpload', fs.createReadStream(fileToUpload));

                const response = await axios({
                    url: 'https://catbox.moe/user/api.php',
                    method: 'POST',
                    headers: form.getHeaders(),
                    data: form,
                    timeout: 30000
                });

                if (tempFileCreated) {
                    fs.unlinkSync(fileToUpload);
                }

                if (response.data && response.data.startsWith('https://')) {
                    resolve(response.data.trim());
                } else {
                    reject(new Error('Upload failed: ' + (response.data || 'No URL returned')));
                }
            } catch (error) {
                if (tempFileCreated && fileToUpload) {
                    fs.unlinkSync(fileToUpload).catch(() => {});
                }
                reject(new Error(`Upload error: ${error.response?.data || error.message}`));
            }
        });
    };

    m.send = async (content, opt = { packname: "XKing", author: "XKing" }, type = "text") => {
        // Ensure we're always replying to the correct chat
        const targetChat = m.chat || m.key?.remoteJid;
        if (!targetChat) {
            throw new Error('No target chat specified for sending message');
        }

        switch (type.toLowerCase()) {
            case "text": {
                let msgs = await sock.sendMessage(targetChat, { text: content }, { quoted: m });
                msgs.edit = async (text) => {
                    return await sock.relayMessage(targetChat, {
                        protocolMessage: {
                            key: msgs.key,
                            type: 14,
                            editedMessage: {
                                conversation: text
                            }
                        }
                    }, {});
                };
                msgs.react = async (x) => {
                    return await sock.sendMessage(targetChat, {
                        react: {
                            text: x,
                            key: msgs.key
                        }
                    });
                };
                msgs.delete = async () => {
                    return await sock.sendMessage(targetChat, {
                        delete: msgs.key
                    });
                };
                return msgs;
            }
            break;
            case "image": {
                if (Buffer.isBuffer(content)) {
                    return await sock.sendMessage(targetChat, { image: content, ...opt }, { quoted: m });
                } else if (isUrl(content)) {
                    return sock.sendMessage(targetChat, { image: { url: content }, ...opt }, { quoted: m });
                }
            }
            break;
            case "video": {
                if (Buffer.isBuffer(content)) {
                    return await sock.sendMessage(targetChat, { video: content, ...opt }, { quoted: m });
                } else if (isUrl(content)) {
                    return await sock.sendMessage(targetChat, { video: { url: content }, ...opt }, { quoted: m });
                }
            }
            break;
            case "audio": {
                if (Buffer.isBuffer(content)) {
                    return await sock.sendMessage(targetChat, { audio: content, ...opt }, { quoted: m });
                } else if (isUrl(content)) {
                    return await sock.sendMessage(targetChat, { audio: { url: content }, ...opt }, { quoted: m });
                }
            }
            break;
            case "template":
                let optional = await generateWAMessage(targetChat, content, opt);
                let message = { viewOnceMessage: { message: { ...optional.message, }, }, };
                await sock.relayMessage(targetChat, message, { messageId: optional.key.id, });
            break;
        }
    };

    m.sendcontact = (name, info, number) => {
        var vcard = 'BEGIN:VCARD\n' + 'VERSION:3.0\n' + 'FN:' + name + '\n' + 'ORG:' + info + ';\n' + 'TEL;type=CELL;type=VOICE;waid=' + number + ':+' + number + '\n' + 'END:VCARD';
        sock.sendMessage(m.chat, { contacts: { displayName: name, contacts: [{ vcard }] } }, { quoted: m });
    };
    
    m.react = (emoji) => sock.sendMessage(m.chat, { react: { text: emoji, key: m.key } });

    return m;
}

const serializeMessage = async (msg, sock, str) => {
    try {
        if (!msg || !msg.key) return null;
        
        let m = smsg(sock, msg, str);
        
        const chatType = getChatType(msg.key.remoteJid);
        if (chatType === 'status') {
            m.type = 'status';
            m.isStatus = true;
        } else {
            m.type = getMessageType(msg);
        }
        
        const content = getContent(msg);
        m.content = content;
        
        if (m.type === 'buttonResponse' || m.type === 'listResponse' || 
            m.type === 'nativeFlowResponse' || m.type === 'templateButtonReply') {
            m.content = m.buttonId || content;
            m.body = m.buttonId || m.body;
            
            if (m.buttonId && m.buttonId.startsWith(configCache.PREFIX)) {
                m.isCommand = true;
                m.command = m.buttonId.trim().split(/ +/)[0].toLowerCase();
                m.args = m.buttonId.trim().split(/ +/).slice(1);
            }
        }
        
        if (m.type === 'text' && m.body && m.body.startsWith(configCache.PREFIX)) {
            m.isCommand = true;
            m.command = m.body.trim().split(/ +/)[0].toLowerCase();
            m.args = m.body.trim().split(/ +/).slice(1);
        }
        
        m.shouldProcess = shouldProcessMessage(m);
        m.shouldProcessCommand = shouldProcessCommand(m);
        
        return m;
    } catch (error) {
        console.error('Error serializing message:', error);
        return null;
    }
};

module.exports = {
    serializeMessage,
    smsg,
    getMessageType,
    getContentType,
    getChatType,
    shouldProcessCommand,
    isUrl,
    normalizeJid
};