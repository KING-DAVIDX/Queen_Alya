const fs = require('fs');
const path = require('path');

// Load environment variables from .env file in the same directory
require('dotenv').config({ path: path.join(__dirname, '.env') });

const config = {
  SESSION_ID: process.env.SESSION_ID || "ALYA-77bb4141bf6dab49dde89043ba40975a2e815ca1",
  PREFIX: process.env.PREFIX || ".",
  BOT_NAME: process.env.BOT_NAME || "QUEEN_ALYA",
  OWNER_NAME: process.env.OWNER_NAME || "KING",
  MODE: process.env.MODE || "private",
  OWNER_NUMBER: process.env.OWNER_NUMBER || "2349123721026",
  PM_BLOCKER: process.env.PM_BLOCKER || "true",
  DELETE: process.env.DELETE || "false",
  ANTILINK: process.env.ANTILINK || "false",
  ANTILINK_ACTION: process.env.ANTILINK_ACTION || "warn",
  ANTIBOT: process.env.ANTIBOT || "false",
  ANTIBOT_ACTION: process.env.ANTIBOT_ACTION || "kick",
  ANTIWORD_MODE: process.env.ANTIWORD_MODE || "false",
  ANTIWORD_ACTION: process.env.ANTIWORD_ACTION || "warn",
  ANTI_CALL: process.env.ANTI_CALL || "true",
  ANTI_CALL_MESSAGE: process.env.ANTI_CALL_MESSAGE || "My owner is busy rn",
  ANTIWORD: process.env.ANTIWORD || "fek",
  GREETING: process.env.GREETING || "false",
  MENUTYPE: process.env.MENUTYPE || "v2",
  LINK_DELETE: process.env.LINK_DELETE || "true",
  AFK: process.env.AFK || "true",
  AFK_REASON: process.env.AFK_REASON || "I'm off playing toram cya later",
  AUTO_STATUS: process.env.AUTO_STATUS || "true",
  AUTO_STATUS_EMOJI: process.env.AUTO_STATUS_EMOJI || "👑", 
  CHAT_BOT: process.env.CHAT_BOT || "false",
  AUTO_SAVE_STATUS: process.env.AUTO_SAVE_STATUS || "true",
  SAVE_STATUS_FROM: process.env.SAVE_STATUS_FROM || "2348100835767,2346277893334"
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
