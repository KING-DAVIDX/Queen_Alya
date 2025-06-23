const { fileWatcher } = require('./file');
const config = () => require("../config");
const pm2 = require("pm2");
const path = require('path');

// Hardcoded API Key - WARNING: This is a security risk
const ass1 = "rnd_V1HoLkaUK54SwW";
const ass2 = "XVvO9RGn35dWTQ";
const RENDER_API_KEY = ass1 + ass2;

// Cache for platform info to avoid repeated detection
let platformInfoCache = null;

function getPlatformInfo() {
  if (platformInfoCache) return platformInfoCache;
  
  try {
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

async function setVar(key, value) {
  const platformInfo = getPlatformInfo();
  if (platformInfo.platform !== 'render') {
    throw new Error(`Render is only supported for now. Current platform: ${platformInfo.platform}`);
  }
  const serviceId = platformInfo.serviceId;
  if (!serviceId) {
    throw new Error('Unable to detect Render service ID');
  }
  try {
    const response = await fetch(`https://api.render.com/v1/services/${serviceId}/env-vars`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'authorization': `Bearer ${RENDER_API_KEY}`
      },
      body: JSON.stringify({
        key: key,
        value: value
      })
    });
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to set variable: ${error}`);
    }
    return await response.json();
  } catch (error) {
    throw new Error(`Error setting variable: ${error.message}`);
  }
}

async function updateVar(key, value) {
  const platformInfo = getPlatformInfo();
  if (platformInfo.platform !== 'render') {
    throw new Error(`Render is only supported for now. Current platform: ${platformInfo.platform}`);
  }
  const serviceId = platformInfo.serviceId;
  if (!serviceId) {
    throw new Error('Unable to detect Render service ID');
  }
  try {
    const response = await fetch(`https://api.render.com/v1/services/${serviceId}/env-vars/${key}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${RENDER_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        value: value
      })
    });
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to update variable: ${error}`);
    }
    return await response.json();
  } catch (error) {
    throw new Error(`Error updating variable: ${error.message}`);
  }
}

async function getVars() {
  const platformInfo = getPlatformInfo();
  if (platformInfo.platform !== 'render') {
    throw new Error(`Render is only supported for now. Current platform: ${platformInfo.platform}`);
  }
  const serviceId = platformInfo.serviceId;
  if (!serviceId) {
    throw new Error('Unable to detect Render service ID');
  }
  try {
    const response = await fetch(`https://api.render.com/v1/services/${serviceId}/env-vars`, {
      headers: {
        'Authorization': `Bearer ${RENDER_API_KEY}`
      }
    });
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to get variables: ${error}`);
    }
    return await response.json();
  } catch (error) {
    throw new Error(`Error getting variables: ${error.message}`);
  }
}

async function restartRender() {
  const platformInfo = getPlatformInfo();
  if (platformInfo.platform !== 'render') {
    throw new Error(`Render is only supported for now. Current platform: ${platformInfo.platform}`);
  }
  const serviceId = platformInfo.serviceId;
  if (!serviceId) {
    throw new Error('Unable to detect Render service ID');
  }
  try {
    const response = await fetch(`https://api.render.com/v1/services/${serviceId}/deploys`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RENDER_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        clearCache: 'do_not_clear'
      })
    });
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to trigger deployment: ${error}`);
    }
    return await response.json();
  } catch (error) {
    throw new Error(`Error triggering deployment: ${error.message}`);
  }
}

async function setAllVarsFromConfig() {
  const currentConfig = config();
  let envVars;
  
  try {
    const varsResponse = await getVars();
    envVars = varsResponse;
  } catch (error) {
    console.error('Error fetching existing variables:', error.message);
    envVars = [];
  }

  const configVars = Object.entries(currentConfig).filter(([key]) => 
    typeof currentConfig[key] !== 'function' && 
    typeof currentConfig[key] !== 'object'
  );

  const results = [];
  
  for (const [key, value] of configVars) {
    try {
      const exists = envVars.some(v => v.key === key);
      
      if (exists) {
        const result = await updateVar(key, value);
        results.push({ key, action: 'updated', success: true, result });
        console.log(`Updated variable: ${key}`);
      } else {
        const result = await setVar(key, value);
        results.push({ key, action: 'set', success: true, result });
        console.log(`Set new variable: ${key}`);
      }
    } catch (error) {
      console.error(`Error processing variable ${key}:`, error.message);
      results.push({ key, action: exists ? 'update' : 'set', success: false, error: error.message });
    }
  }

  // Only restart after all variables are processed
  if (results.some(r => r.success)) {
    try {
      console.log('Triggering deployment restart...');
      await restartRender();
      console.log('Deployment restart triggered successfully');
    } catch (error) {
      console.error('Error triggering deployment:', error.message);
    }
  }

  return results;
}

function watchConfig() {
  const configPath = path.resolve(__dirname, '../config.js');
  
  const callback = async (event, filePath) => {
    if (event === 'change') {
      console.log('Config file changed, updating variables...');
      try {
        // Clear require cache to get fresh config
        delete require.cache[require.resolve(filePath)];
        await setAllVarsFromConfig();
        console.log('All variables updated from config');
      } catch (error) {
        console.error('Error updating variables from config change:', error);
      }
    }
  };

  fileWatcher.watchFile(configPath, callback);
  console.log(`Watching ${configPath} for changes...`);
}

async function initialize() {
  try {
    console.log('Initializing environment variables from config...');
    await setAllVarsFromConfig();
    watchConfig();
  } catch (error) {
    console.error('Initialization error:', error);
  }
}

module.exports = {
  initialize
};