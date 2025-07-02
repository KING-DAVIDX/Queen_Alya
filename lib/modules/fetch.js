const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const { Readable } = require('stream');

class AXL {
  constructor(defaultOptions = {}) {
    this.defaultOptions = {
      timeout: 30000,
      maxRedirects: 20,
      ...defaultOptions
    };
  }

  /**
   * Core request method
   * @private
   */
  async _request(method, url, body = null, options = {}) {
    const config = {
      method: method.toLowerCase(),
      url,
      ...this.defaultOptions,
      ...options,
      headers: {
        ...(this.defaultOptions.headers || {}),
        ...(options.headers || {})
      }
    };

    if (body) {
      if (method.toUpperCase() === 'GET' || method.toUpperCase() === 'HEAD') {
        console.warn(`Body not allowed for ${method} requests`);
      } else {
        config.data = body;
      }
    }

    try {
      const response = await axios(config);
      
      // Convert to fetch-like response
      const fetchResponse = {
        ok: response.status >= 200 && response.status < 300,
        status: response.status,
        statusText: response.statusText,
        url: response.config.url,
        headers: response.headers,
        data: response.data,
        arrayBuffer: async () => Buffer.from(response.data),
        text: async () => typeof response.data === 'string' ? response.data : JSON.stringify(response.data),
        json: async () => {
          if (typeof response.data === 'object') {
            return response.data;
          }
          try {
            return JSON.parse(response.data);
          } catch (e) {
            throw new Error('Invalid JSON response');
          }
        },
        blob: async () => {
          return new Blob([response.data], { type: response.headers['content-type'] });
        }
      };

      return fetchResponse;
    } catch (error) {
      if (error.response) {
        error.response.data = error.response.data;
        throw error.response;
      }
      throw error;
    }
  }

  /**
   * GET request
   */
  async get(url, options = {}) {
    return this._request('GET', url, null, options);
  }

  /**
   * POST request
   */
  async post(url, body = null, options = {}) {
    return this._request('POST', url, body, options);
  }

  /**
   * PUT request
   */
  async put(url, body = null, options = {}) {
    return this._request('PUT', url, body, options);
  }

  /**
   * DELETE request
   */
  async delete(url, options = {}) {
    return this._request('DELETE', url, null, options);
  }

  /**
   * PATCH request
   */
  async patch(url, body = null, options = {}) {
    return this._request('PATCH', url, body, options);
  }

  /**
   * HEAD request
   */
  async head(url, options = {}) {
    return this._request('HEAD', url, null, options);
  }

  /**
   * Generic fetch method (similar to window.fetch)
   */
  async fetch(url, options = {}) {
    const method = options.method || 'GET';
    return this._request(method, url, options.body, options);
  }

  /**
   * Stream response
   */
  async stream(url, options = {}) {
    const response = await this.get(url, {
      ...options,
      responseType: 'stream'
    });
    return response.data;
  }

  /**
   * Download file to disk
   */
  async download(url, filePath, options = {}) {
    const writer = fs.createWriteStream(filePath);
    const response = await this.get(url, {
      ...options,
      responseType: 'stream'
    });

    response.data.pipe(writer);

    return new Promise((resolve, reject) => {
      writer.on('finish', () => resolve({
        status: response.status,
        filePath,
        size: writer.bytesWritten
      }));
      writer.on('error', reject);
    });
  }

  /**
   * Upload with FormData
   */
  async upload(url, formData, options = {}) {
    const form = new FormData();
    
    for (const [key, value] of Object.entries(formData)) {
      if (value && value.value !== undefined && value.options !== undefined) {
        form.append(key, value.value, value.options);
      } else {
        form.append(key, value);
      }
    }

    const headers = {
      ...form.getHeaders(),
      ...(options.headers || {})
    };

    return this.post(url, form, {
      ...options,
      headers,
      maxContentLength: Infinity,
      maxBodyLength: Infinity
    });
  }

  /**
   * JSON helper (auto sets headers)
   */
  async json(url, body, options = {}) {
    return this.post(url, body, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {})
      }
    });
  }
}

// Create default instance
const axl = new AXL();

// Attach all methods directly to the exported object
module.exports = {
  // Core methods
  ...axl,
  
  // Aliases
  request: axl.fetch,
  send: axl.post,
  retrieve: axl.get,
  remove: axl.delete,
  update: axl.put,
  modify: axl.patch,
  
  // Static versions of methods
  get: axl.get.bind(axl),
  post: axl.post.bind(axl),
  put: axl.put.bind(axl),
  delete: axl.delete.bind(axl),
  patch: axl.patch.bind(axl),
  head: axl.head.bind(axl),
  fetch: axl.fetch.bind(axl),
  stream: axl.stream.bind(axl),
  download: axl.download.bind(axl),
  upload: axl.upload.bind(axl),
  json: axl.json.bind(axl),
  
  // Create new instance with custom options
  create: (options) => new AXL(options)
};