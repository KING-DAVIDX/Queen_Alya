const fs = require('fs');
const path = require('path');
const chokidar = require('chokidar');
const { EventEmitter } = require('events');

class FileWatcher extends EventEmitter {
  constructor(options = {}) {
    super();
    this.watchers = new Map();
    this.cache = new Map();
    this.defaultOptions = {
      persistent: true,
      ignoreInitial: false,
      awaitWriteFinish: {
        stabilityThreshold: 2000,
        pollInterval: 100
      },
      ...options
    };
  }

  watchFile(filePath, callback, options = {}) {
    const absolutePath = path.resolve(filePath);
    const watcherOptions = { ...this.defaultOptions, ...options };

    if (this.watchers.has(absolutePath)) {
      this.unwatchFile(absolutePath);
    }

    const watcher = chokidar.watch(absolutePath, watcherOptions);

    watcher.on('change', (path) => {
      this.cache.delete(absolutePath);
      this.emit('change', absolutePath);
      if (callback) callback('change', absolutePath);
    });

    watcher.on('add', (path) => {
      this.emit('add', absolutePath);
      if (callback) callback('add', absolutePath);
    });

    watcher.on('unlink', (path) => {
      this.cache.delete(absolutePath);
      this.emit('unlink', absolutePath);
      if (callback) callback('unlink', absolutePath);
    });

    this.watchers.set(absolutePath, watcher);
    return watcher;
  }

  unwatchFile(filePath) {
    const absolutePath = path.resolve(filePath);
    const watcher = this.watchers.get(absolutePath);
    
    if (watcher) {
      watcher.close();
      this.watchers.delete(absolutePath);
      return true;
    }
    return false;
  }

  readFileWithCache(filePath, encoding = 'utf8') {
    const absolutePath = path.resolve(filePath);
    
    if (this.cache.has(absolutePath)) {
      return Promise.resolve(this.cache.get(absolutePath));
    }

    return new Promise((resolve, reject) => {
      fs.readFile(absolutePath, encoding, (err, data) => {
        if (err) {
          reject(err);
        } else {
          this.cache.set(absolutePath, data);
          resolve(data);
        }
      });
    });
  }

  resetCache(filePath = null) {
    if (filePath) {
      const absolutePath = path.resolve(filePath);
      this.cache.delete(absolutePath);
    } else {
      this.cache.clear();
    }
    this.emit('cacheReset', filePath);
    return true;
  }

  getCacheStats() {
    return {
      size: this.cache.size,
      watchers: this.watchers.size
    };
  }

  closeAll() {
    this.watchers.forEach(watcher => watcher.close());
    this.watchers.clear();
    this.cache.clear();
  }
}

// Singleton instance for convenience
const fileWatcher = new FileWatcher();

module.exports = {
  FileWatcher,
  fileWatcher
};