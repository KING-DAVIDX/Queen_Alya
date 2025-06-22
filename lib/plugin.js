const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const config = require('../config');
const { getMessageType, getChatType } = require('./serialize');

class PluginSystem {
    constructor() {
        this.plugins = new Map();
        this.eventPlugins = new Map();
        this.prefix = config.PREFIX;
        this.pluginDir = path.join(__dirname, '../plugins');
        this.dbPath = path.join(__dirname, './database/plugin.db');
        this.pluginsLoaded = false;
        
        this._initDatabase();
    }

    _initDatabase() {
        const dbDir = path.dirname(this.dbPath);
        if (!fs.existsSync(dbDir)) {
            fs.mkdirSync(dbDir, { recursive: true });
        }

        this.db = new sqlite3.Database(this.dbPath);
        this.db.serialize(() => {
            this.db.run(`
                CREATE TABLE IF NOT EXISTS plugins (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT,
                    type TEXT CHECK(type IN ('command', 'event')),
                    event_type TEXT,
                    file_name TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE(name, type, event_type)
                )
            `);
        });
    }

    _logPluginToDB(name, type, eventType = null, fileName) {
        this.db.run(
            `INSERT OR IGNORE INTO plugins (name, type, event_type, file_name) VALUES (?, ?, ?, ?)`,
            [name, type, eventType, fileName],
            (err) => {
                if (err) console.error('Error logging plugin to DB:', err);
            }
        );
    }

    bot(options, handler) {
        if (!options || !handler) {
            throw new Error('Plugin options and handler are required');
        }

        if (options.on) {
            const eventType = options.on.toLowerCase();
            
            if (!this.eventPlugins.has(eventType)) {
                this.eventPlugins.set(eventType, []);
            }
            
            const existingPlugin = this.eventPlugins.get(eventType).find(
                p => p.name === (options.name || handler.name)
            );
            
            if (!existingPlugin) {
                this.eventPlugins.get(eventType).push({
                    ...options,
                    handler
                });
                return true;
            }
            return false;
        }

        const { name } = options;
        
        if (!name) {
            throw new Error('Plugin name is required for command plugins');
        }

        if (this.plugins.has(name)) {
            console.warn(`Plugin "${name}" is already registered`);
            return false;
        }

        this.plugins.set(name, {
            ...options,
            handler
        });
        return true;
    }

    async loadPlugins() {
        if (this.pluginsLoaded) {
            const plugins = this.getPlugins();
            const commandCount = plugins.commands.length;
            const eventCount = plugins.events.length;
            const totalPlugins = commandCount + eventCount;
            console.log(`✅ ${totalPlugins} plugins already loaded (from memory)`);
            return;
        }

        if (!fs.existsSync(this.pluginDir)) {
            fs.mkdirSync(this.pluginDir, { recursive: true });
            console.log(`Created plugins directory at ${this.pluginDir}`);
            return;
        }

        this.plugins.clear();
        this.eventPlugins.clear();

        const pluginFiles = fs.readdirSync(this.pluginDir).filter(file => 
            file.endsWith('.js') && !file.startsWith('_')
        );

        let loadedCount = 0;
        let errorCount = 0;
        let duplicateCount = 0;

        for (const file of pluginFiles) {
            try {
                const pluginPath = path.join(this.pluginDir, file);
                delete require.cache[require.resolve(pluginPath)];
                const plugin = require(pluginPath);
                
                if (typeof plugin === 'function') {
                    continue;
                } else if (plugin.options && plugin.handler) {
                    const added = this.bot(plugin.options, plugin.handler);
                    
                    if (added) {
                        if (plugin.options.on) {
                            this._logPluginToDB(
                                plugin.options.name || file, 
                                'event', 
                                plugin.options.on.toLowerCase(),
                                file
                            );
                        } else {
                            this._logPluginToDB(
                                plugin.options.name, 
                                'command',
                                null,
                                file
                            );
                        }
                        loadedCount++;
                    } else {
                        duplicateCount++;
                    }
                }
            } catch (error) {
                errorCount++;
                console.error(`❌ Failed to load plugin ${file}:`, error.message);
            }
        }

        this.pluginsLoaded = true;
        
        const plugins = this.getPlugins();
        const commandCount = plugins.commands.length;
        const eventCount = plugins.events.length;
        const totalPlugins = commandCount + eventCount;
        console.log(`✅ Loaded ${totalPlugins} plugins`);
        if (errorCount > 0) {
            console.log(`❌ ${errorCount} plugins failed to load`);
        }
    }

    _parseCommand(text) {
        if (!text) return null;
        
        // Handle both string and object with buttonId/text/content property
        const content = typeof text === 'string' ? text : 
                      (text.buttonId || text.text || text.content || '');
        
        if (content.startsWith(this.prefix)) {
            const args = content.slice(this.prefix.length).trim().split(/ +/);
            const command = args.shift().toLowerCase();
            const query = args.join(' ').trim();
            
            return { command, query, prefix: this.prefix };
        }
        return null;
    }

    async handleMessage(serializedMsg, bot) {
        if (!serializedMsg || !serializedMsg.shouldProcess) return;

        const messageType = getMessageType(serializedMsg.raw || serializedMsg);
        const content = serializedMsg.text || serializedMsg.content || serializedMsg.buttonId || '';
        const caption = serializedMsg.raw?.message?.imageMessage?.caption || 
                       serializedMsg.raw?.message?.videoMessage?.caption || 
                       serializedMsg.raw?.message?.documentMessage?.caption || '';

        // Process event plugins
        if (this.eventPlugins.has(messageType)) {
            const plugins = this.eventPlugins.get(messageType);
            for (const plugin of plugins) {
                try {
                    if (!serializedMsg.shouldProcessCommand && !plugin.ignoreRestrictions) {
                        continue;
                    }

                    if (plugin.match) {
                        let matches = false;
                        const textToCheck = ['image', 'video', 'document'].includes(messageType) ? caption : content;

                        if (Array.isArray(plugin.match)) {
                            matches = plugin.match.some(m => {
                                if (typeof m === 'string') return textToCheck.includes(m);
                                if (m instanceof RegExp) return m.test(textToCheck);
                                return false;
                            });
                        } 
                        else if (typeof plugin.match === 'string') {
                            matches = textToCheck.includes(plugin.match);
                        } 
                        else if (plugin.match instanceof RegExp) {
                            matches = plugin.match.test(textToCheck);
                        }

                        if (!matches) continue;
                    }

                    // Store the original chat context
                    const originalChat = serializedMsg.chat;
                    // Set the current message context
                    bot._currentMessage = serializedMsg;
                    bot._proxyMessageContext();
                    
                    await plugin.handler(serializedMsg, bot);
                    
                    // Reset chat context if it was changed
                    if (bot._currentMessage && bot._currentMessage.chat !== originalChat) {
                        bot._currentMessage.chat = originalChat;
                    }
                } catch (error) {
                    console.error(`Error executing event plugin for "${messageType}":`, error);
                }
            }
        }

        // Unified command processing for text, button responses, list responses, template button replies and native flow responses
        const isCommandMessage = ['text', 'buttonResponse', 'listResponse', 'templateButtonReply', 'nativeFlowResponse'].includes(messageType);
        const hasContent = content && content.trim().length > 0;
        
        if (isCommandMessage && hasContent) {
            const parsed = this._parseCommand(serializedMsg);
            
            if (parsed) {
                if (!serializedMsg.shouldProcessCommand) {
                    return;
                }
                
                const messageWithContext = {
                    ...serializedMsg,
                    query: parsed.query,
                    command: parsed.command,
                    args: parsed.query.split(' ').filter(arg => arg.trim() !== ''),
                    prefix: parsed.prefix || this.prefix
                };

                const originalChat = messageWithContext.chat;
                bot._currentMessage = messageWithContext;
                bot._proxyMessageContext();
                
                const plugin = this.plugins.get(parsed.command);
                if (plugin) {
                    try {
                        await plugin.handler(messageWithContext, bot);
                        if (bot._currentMessage && bot._currentMessage.chat !== originalChat) {
                            bot._currentMessage.chat = originalChat;
                        }
                    } catch (error) {
                        console.error(`Error executing plugin "${parsed.command}":`, error);
                    }
                }
            }
        }

        await bot.processMessage(serializedMsg);
    }

    getPlugins() {
        return {
            commands: Array.from(this.plugins.values()),
            events: Array.from(this.eventPlugins.values()).flat()
        };
    }
}

const pluginSystem = new PluginSystem();

const exportedBot = (options, handler) => pluginSystem.bot(options, handler);

exportedBot.system = pluginSystem;
exportedBot.loadPlugins = () => pluginSystem.loadPlugins();
exportedBot.getPlugins = () => pluginSystem.getPlugins();

module.exports = exportedBot;