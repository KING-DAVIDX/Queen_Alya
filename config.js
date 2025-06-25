const fs = require('fs');
const path = require('path');

// Load environment variables from .env file in the same directory
require('dotenv').config({ path: path.join(__dirname, '.env') });

const config = {
  SESSION_ID: "ALYA-session_b1962924-9593-4df3-8a79-c7c3e86d0373" || process.env.SESSION_ID,
  PREFIX: "." || process.env.PREFIX,
  BOT_NAME: "QUEEN_ALYA" || process.env.BOT_NAME,
  OWNER_NAME: "KING" || process.env.OWNER_NAME,
  MODE: "private" || process.env.MODE,
  OWNER_NUMBER: "2349123721026" || process.env.OWNER_NUMBER,
  PM_BLOCKER: "true" || process.env.PM_BLOCKER,
  DELETE: "false" || process.env.DELETE,
  ANTILINK: "false" || process.env.ANTILINK,
  ANTILINK_ACTION: "warn" || process.env.ANTILINK_ACTION,
  ANTIBOT: "false" || process.env.ANTIBOT,
  ANTIBOT_ACTION: "kick" || process.env.ANTIBOT_ACTION,
  ANTIWORD_MODE: "false" || process.env.ANTIWORD_MODE,
  ANTIWORD_ACTION: "warn" || process.env.ANTIWORD_ACTION,
  ANTI_CALL: "true" || process.env.ANTI_CALL,
  ANTI_CALL_MESSAGE: "My owner is busy rn" || process.env.ANTI_CALL_MESSAGE,
  ANTIWORD: "fek" || process.env.ANTIWORD,
  GREETING: "false" || process.env.GREETING,
  MENUTYPE: "v2" || process.env.MENUTYPE,
  MENU_URLS: "https://files.catbox.moe/55f24l.jpg;https://files.catbox.moe/1p2yqo.png;https://files.catbox.moe/tgpgwn.png;https://files.catbox.moe/1y1lnl.jpg;https://files.catbox.moe/r85hmq.jpg;https://files.catbox.moe/vmid29.jpg;https://files.catbox.moe/pqijxi.mp4;https://files.catbox.moe/ycg4un.mp4;https://files.catbox.moe/c1a27a.mp4;https://files.catbox.moe/pq3345.mp4" || process.env.MENU_URLS,
  LINK_DELETE: "true" || process.env.LINK_DELETE,
  AFK: "false" || process.env.AFK,
  AFK_REASON: "I'm off playing toram cya later" || process.env.AFK_REASON,
  AUTO_STATUS: "true" || process.env.AUTO_STATUS,
  AUTO_STATUS_EMOJI: "👑" || process.env.AUTO_STATUS_EMOJI, 
  CHAT_BOT: "false" || process.env.CHAT_BOT,
  AUTO_SAVE_STATUS: "true" || process.env.AUTO_SAVE_STATUS,
  SAVE_STATUS_FROM: "2348100835767,2346277893334" || process.env.SAVE_STATUS_FROM
};

const jsonDir = path.join(__dirname, 'lib', 'json');
if (!fs.existsSync(jsonDir)) {
  fs.mkdirSync(jsonDir, { recursive: true });
}

const antiwordPath = path.join(jsonDir, 'antiword.json');
if (!fs.existsSync(antiwordPath)) {
  fs.writeFileSync(antiwordPath, JSON.stringify({ 
    bannedWords: config.ANTIWORD && config.ANTIWORD !== "false" && config.ANTIWORD !== "true" 
      ? [config.ANTIWORD.toLowerCase()] 
      : [],
    groups: {}
  }, null, 2));
}

module.exports = config;