const sql_store = require('./sql_store');

let storeInstance = null;
let isInitializing = false;

const initializeStore = async () => {
    if (storeInstance) return storeInstance;
    if (isInitializing) {
        // Wait if already initializing
        return new Promise(resolve => {
            const checkInterval = setInterval(() => {
                if (storeInstance) {
                    clearInterval(checkInterval);
                    resolve(storeInstance);
                }
            }, 100);
        });
    }

    isInitializing = true;
    try {
        storeInstance = new sql_store();
        await storeInstance.initialize();
        
        // Add global access points for common methods
        global.store = {
            getChatHistory: storeInstance.getChatHistory.bind(storeInstance),
            findMessageById: storeInstance.findMessageById.bind(storeInstance),
            loadMessage: storeInstance.loadMessage.bind(storeInstance),
            writeMessage: storeInstance.writeMessage.bind(storeInstance),
            getname: storeInstance.getPushName.bind(storeInstance),
            checkmsg_stats: storeInstance.checkMessageStats.bind(storeInstance),
            checkdb_health: storeInstance.checkDatabaseHealth.bind(storeInstance),
            clearOldMessages: storeInstance.clearOldMessages.bind(storeInstance),
            bind: storeInstance.bind.bind(storeInstance),
            close: storeInstance.close.bind(storeInstance)
        };
        
        console.log('📦 Store initialized and global methods registered');
        return storeInstance;
    } finally {
        isInitializing = false;
    }
};

const getStore = () => {
    if (!storeInstance) {
        throw new Error('Store not initialized. Call initializeStore() first');
    }
    return storeInstance;
};

// Full store access
module.exports = {
    initializeStore,
    getStore
};