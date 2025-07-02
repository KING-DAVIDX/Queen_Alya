// File: lib/fetch.js
const https = require('https');
const http = require('http');
const { Buffer } = require('buffer');
const { URL } = require('url');
const fs = require('fs');
const { promisify } = require('util');
const stream = require('stream');

const pipeline = promisify(stream.pipeline);

class Response {
  constructor(body, options = {}) {
    this.body = body;
    this.status = options.status || 200;
    this.statusText = options.statusText || 'OK';
    this.headers = options.headers || {};
    this.ok = this.status >= 200 && this.status < 300;
    this.url = options.url || '';
  }

  async text() {
    return this.body.toString();
  }

  async json() {
    return JSON.parse(this.body.toString());
  }

  async buffer() {
    return Buffer.from(this.body);
  }

  arrayBuffer() {
    return this.buffer();
  }
}

class FetchError extends Error {
  constructor(message, type, systemError) {
    super(message);
    this.type = type;
    this.code = systemError?.code;
  }
}

async function fetch(url, options = {}) {
  const parsedUrl = new URL(url);
  const isHttps = parsedUrl.protocol === 'https:';
  const transport = isHttps ? https : http;
  
  return new Promise((resolve, reject) => {
    const reqOptions = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || (isHttps ? 443 : 80),
      path: parsedUrl.pathname + parsedUrl.search,
      method: options.method || 'GET',
      headers: options.headers || {},
      rejectUnauthorized: false
    };

    if (options.body) {
      if (typeof options.body === 'string') {
        reqOptions.headers['Content-Length'] = Buffer.byteLength(options.body);
      } else if (Buffer.isBuffer(options.body)) {
        reqOptions.headers['Content-Length'] = options.body.length;
      }
    }

    const req = transport.request(reqOptions, (res) => {
      const chunks = [];
      let length = 0;

      res.on('data', (chunk) => {
        chunks.push(chunk);
        length += chunk.length;
      });

      res.on('end', () => {
        const body = Buffer.concat(chunks, length);
        const response = new Response(body, {
          status: res.statusCode,
          statusText: res.statusMessage,
          headers: res.headers,
          url
        });
        
        if (response.ok) {
          resolve(response);
        } else {
          reject(new FetchError(`HTTP error! status: ${res.statusCode}`, 'http-error'));
        }
      });
    });

    req.on('error', (err) => {
      reject(new FetchError(err.message, 'system', err));
    });

    if (options.timeout) {
      req.setTimeout(options.timeout, () => {
        req.destroy(new FetchError('Request timed out', 'timeout'));
      });
    }

    if (options.body) {
      if (typeof options.body === 'string' || Buffer.isBuffer(options.body)) {
        req.write(options.body);
      } else if (options.body instanceof stream.Readable) {
        options.body.pipe(req);
        return;
      }
    }

    req.end();
  });
}

async function downloadFile(url, filePath) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download file: ${response.status} ${response.statusText}`);
  }
  
  const fileStream = fs.createWriteStream(filePath);
  await pipeline(response.body, fileStream);
  return filePath;
}

module.exports = {
  fetch,
  Response,
  FetchError,
  downloadFile,
  Headers: Object, // Placeholder for compatibility
  FormData: require('form-data') // Still using form-data as it's complex to reimplement
};