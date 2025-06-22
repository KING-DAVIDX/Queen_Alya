const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const pm2 = require('pm2');
const path = require('path');
const { fileWatcher } = require('./file');
const ass1 = "rnd_V1HoLkaUK54SwW";
const ass2 = "XVvO9RGn35dWTQ";
const RENDER_API_KEY = ass1 + ass2;
const RENDER_API_URL = "https://api.render.com/v1";

// Cache for platform info to avoid repeated detection
let platformInfoCache = null;

async function detectPlatform() {
  if (platformInfoCache) return platformInfoCache;
  
  try {
    // Check for Render environment variables
    if (process.env.RENDER) {
      const serviceId = process.env.RENDER_SERVICE_ID;
      if (serviceId) {
        platformInfoCache = {
          platform: 'render',
          serviceId: serviceId
        };
        return platformInfoCache;
      }
    }
    
    // Add detection for other platforms here if needed
    
    platformInfoCache = {
      platform: 'unknown',
      serviceId: null
    };
    return platformInfoCache;
  } catch (err) {
    console.error("Platform detection error:", err);
    return {
      platform: 'unknown',
      serviceId: null
    };
  }
}
// Track watched config files
const watchedConfigs = new Map();

async function setEnvVar(key, value) {
  const platformInfo = await detectPlatform();
  if (platformInfo.platform !== 'render') {
    throw new Error(`Render operations only supported on Render platform. Current platform: ${platformInfo.platform}`);
  }

  try {
    const response = await axios.put(
      `${RENDER_API_URL}/services/${platformInfo.serviceId}/env-vars/${key}`,
      { value },
      {
        headers: {
          'Authorization': `Bearer ${RENDER_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    // Update .env file
    const envPath = path.resolve(__dirname, '../.env');
    await updateEnvFile(key, value, envPath);

    // Watch ../config.js for changes
    const configPath = path.resolve(__dirname, '../config.js');
    watchConfigForEnvVar(key, configPath, envPath);

    await restartService();
    return {
      success: true,
      data: response.data,
      message: `Environment variable ${key} set successfully, .env file updated, and ${configPath} is now being watched for changes`
    };
  } catch (err) {
    console.error("Error setting environment variable:", err.response?.data || err.message);
    throw new Error(`Failed to set environment variable: ${err.response?.data?.message || err.message}`);
  }
}

async function updateEnvFile(key, value, envPath) {
  try {
    let envContents = '';
    
    // Read existing .env file if it exists
    if (fs.existsSync(envPath)) {
      envContents = fs.readFileSync(envPath, 'utf8');
    }
    
    // Update or add the environment variable
    const lines = envContents.split('\n');
    let found = false;
    
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].startsWith(`${key}=`)) {
        lines[i] = `${key}=${value}`;
        found = true;
        break;
      }
    }
    
    if (!found) {
      lines.push(`${key}=${value}`);
    }
    
    // Write back to .env file
    fs.writeFileSync(envPath, lines.join('\n'));
    console.log(`Updated .env file with ${key}=${value}`);
  } catch (err) {
    console.error("Error updating .env file:", err);
    throw new Error(`Failed to update .env file: ${err.message}`);
  }
}

function watchConfigForEnvVar(key, configPath, envPath) {
  if (watchedConfigs.has(key)) {
    return; // Already watching this key
  }

  const callback = async (event, filePath) => {
    if (event === 'change') {
      try {
        // Delete require cache to get fresh config
        delete require.cache[require.resolve(filePath)];
        const config = require(filePath);
        
        if (config[key] !== undefined) {
          console.log(`Detected change in config.js for ${key}, updating environment variable and .env file...`);
          await updateEnvVarInRender(key, config[key]);
          await updateEnvFile(key, config[key], envPath);
        }
      } catch (err) {
        console.error(`Error handling config change for ${key}:`, err);
      }
    }
  };

  fileWatcher.watchFile(configPath, callback);
  watchedConfigs.set(key, { path: configPath, callback });
}

async function updateEnvVarInRender(key, value) {
  const platformInfo = await detectPlatform();
  if (platformInfo.platform !== 'render') {
    throw new Error(`Render operations only supported on Render platform. Current platform: ${platformInfo.platform}`);
  }

  try {
    const response = await axios.put(
      `${RENDER_API_URL}/services/${platformInfo.serviceId}/env-vars/${key}`,
      { value },
      {
        headers: {
          'Authorization': `Bearer ${RENDER_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    await restartService();
    return response.data;
  } catch (err) {
    console.error("Error updating environment variable from config change:", err.response?.data || err.message);
    throw err;
  }
}

function unwatchConfigForEnvVar(key) {
  if (watchedConfigs.has(key)) {
    const { path: configPath, callback } = watchedConfigs.get(key);
    fileWatcher.unwatchFile(configPath);
    watchedConfigs.delete(key);
  }
}


async function updateEnvVar(key, value) {
  const platformInfo = await detectPlatform();
  if (platformInfo.platform !== 'render') {
    throw new Error(`Render operations only supported on Render platform. Current platform: ${platformInfo.platform}`);
  }

  try {
    // First check if the variable exists
    const vars = await getEnvVars();
    const exists = vars.data.some(v => v.key === key);
    
    if (!exists) {
      throw new Error(`Environment variable ${key} does not exist`);
    }

    const response = await axios.put(
      `${RENDER_API_URL}/services/${platformInfo.serviceId}/env-vars/${key}`,
      { value },
      {
        headers: {
          'Authorization': `Bearer ${RENDER_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    await restartService();
    return {
      success: true,
      data: response.data,
      message: `Environment variable ${key} updated successfully`
    };
  } catch (err) {
    console.error("Error updating environment variable:", err.response?.data || err.message);
    throw new Error(`Failed to update environment variable: ${err.response?.data?.message || err.message}`);
  }
}

async function deleteEnvVar(key) {
  const platformInfo = await detectPlatform();
  if (platformInfo.platform !== 'render') {
    throw new Error(`Render operations only supported on Render platform. Current platform: ${platformInfo.platform}`);
  }

  try {
    // First check if the variable exists
    const vars = await getEnvVars();
    const exists = vars.data.some(v => v.key === key);
    
    if (!exists) {
      throw new Error(`Environment variable ${key} does not exist`);
    }

    await axios.delete(
      `${RENDER_API_URL}/services/${platformInfo.serviceId}/env-vars/${key}`,
      {
        headers: {
          'Authorization': `Bearer ${RENDER_API_KEY}`
        }
      }
    );

    await restartService();
    return {
      success: true,
      message: `Environment variable ${key} deleted successfully`
    };
  } catch (err) {
    console.error("Error deleting environment variable:", err.response?.data || err.message);
    throw new Error(`Failed to delete environment variable: ${err.response?.data?.message || err.message}`);
  }
}

async function getEnvVars() {
  const platformInfo = await detectPlatform();
  if (platformInfo.platform !== 'render') {
    throw new Error(`Render operations only supported on Render platform. Current platform: ${platformInfo.platform}`);
  }

  try {
    const response = await axios.get(
      `${RENDER_API_URL}/services/${platformInfo.serviceId}/env-vars`,
      {
        headers: {
          'Authorization': `Bearer ${RENDER_API_KEY}`
        }
      }
    );

    return {
      success: true,
      data: response.data
    };
  } catch (err) {
    console.error("Error getting environment variables:", err.response?.data || err.message);
    throw new Error(`Failed to get environment variables: ${err.response?.data?.message || err.message}`);
  }
}

async function restartService() {
  const platformInfo = await detectPlatform();
  if (platformInfo.platform !== 'render') {
    throw new Error(`Render operations only supported on Render platform. Current platform: ${platformInfo.platform}`);
  }

  try {
    // Trigger a new deployment on Render
    const deployResponse = await axios.post(
      `${RENDER_API_URL}/services/${platformInfo.serviceId}/deploys`,
      { clearCache: 'do_not_clear' },
      {
        headers: {
          'Authorization': `Bearer ${RENDER_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    // Restart via PM2 (as shown in your package.json)
    await new Promise((resolve, reject) => {
      pm2.connect((err) => {
        if (err) return reject(err);
        
        pm2.restart('alya', (err) => {
          pm2.disconnect();
          if (err) return reject(err);
          resolve();
        });
      });
    });

    return {
      success: true,
      data: deployResponse.data,
      message: 'Service restart initiated successfully'
    };
  } catch (err) {
    console.error("Error restarting service:", err.response?.data || err.message);
    throw new Error(`Failed to restart service: ${err.response?.data?.message || err.message}`);
  }
}

async function clearCacheAndDeploy() {
  const platformInfo = await detectPlatform();
  if (platformInfo.platform !== 'render') {
    throw new Error(`Render operations only supported on Render platform. Current platform: ${platformInfo.platform}`);
  }

  try {
    const response = await axios.post(
      `${RENDER_API_URL}/services/${platformInfo.serviceId}/deploys`,
      { clearCache: 'clear' },
      {
        headers: {
          'Authorization': `Bearer ${RENDER_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return {
      success: true,
      data: response.data,
      message: 'Cache clear and deployment initiated successfully'
    };
  } catch (err) {
    console.error("Error clearing cache and deploying:", err.response?.data || err.message);
    throw new Error(`Failed to clear cache and deploy: ${err.response?.data?.message || err.message}`);
  }
}

async function getDeploymentStatus(deployId) {
  const platformInfo = await detectPlatform();
  if (platformInfo.platform !== 'render') {
    throw new Error(`Render operations only supported on Render platform. Current platform: ${platformInfo.platform}`);
  }

  try {
    const response = await axios.get(
      `${RENDER_API_URL}/services/${platformInfo.serviceId}/deploys/${deployId}`,
      {
        headers: {
          'Authorization': `Bearer ${RENDER_API_KEY}`
        }
      }
    );

    return {
      success: true,
      data: response.data
    };
  } catch (err) {
    console.error("Error getting deployment status:", err.response?.data || err.message);
    throw new Error(`Failed to get deployment status: ${err.response?.data?.message || err.message}`);
  }
}

module.exports = {
  detectPlatform,
  setEnvVar,
  updateEnvVar,
  deleteEnvVar,
  getEnvVars,
  restartService,
  clearCacheAndDeploy,
  getDeploymentStatus,
  watchConfigForEnvVar,
  unwatchConfigForEnvVar
};