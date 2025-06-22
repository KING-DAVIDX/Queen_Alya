const { fileWatcher } = require('./file');
const config = () => require("../config");
const pm2 = require("pm2");
const path = require('path');

// API Key configuration
const ass1 = "rnd_V1HoLkaUK54SwW";
const ass2 = "XVvO9RGn35dWTQ";
const RENDER_API_KEY = ass1 + ass2;

// Cache for platform info to avoid repeated detection
let platformInfoCache = null;

function getPlatformInfo() {
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
    throw new Error(`Eish, Render is only supported for now.. Current platform: ${platformInfo.platform}`);
  }
  const serviceId = platformInfo.serviceId;
  if (!serviceId) {
    throw new Error('Unable to detect Render service ID');
  }
  try {
    const response = await fetch(`https://api.render.com/v1/services/${serviceId}/env-vars/${key}`, {
      method: 'PUT',
      headers: {
        'content-type': 'application/json',
        'authorization': `Bearer ${RENDER_API_KEY}`
      },
      body: JSON.stringify({
        value: value
      })
    });
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to set variable: ${error}`);
    }
    const result = await response.json();
    await restartRender();
    await new Promise((resolve) => pm2.stop('alya', resolve));
    return { success: true, data: result };
  } catch (error) {
    throw new Error(`Error setting variable: ${error.message}`);
  }
}

async function updateVar(key, value) {
  const platformInfo = getPlatformInfo();
  if (platformInfo.platform !== 'render') {
    throw new Error(`Eish, Render is only supported for now.. Current platform: ${platformInfo.platform}`);
  }
  const serviceId = platformInfo.serviceId;
  if (!serviceId) {
    throw new Error('Unable to detect Render service ID');
  }
  try {
    const varsResponse = await fetch(`https://api.render.com/v1/services/${serviceId}/env-vars`, {
      headers: {
        'Authorization': `Bearer ${RENDER_API_KEY}`
      }
    });
    if (!varsResponse.ok) {
      throw new Error('Failed to fetch existing variables');
    }
    const vars = await varsResponse.json();
    const existingVar = vars.find(v => v.key === key);
    if (!existingVar) {
      throw new Error(`Variable '${key}' not found`);
    }
    const response = await fetch(`https://api.render.com/v1/services/${serviceId}/env-vars/${existingVar.key}`, {
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
    
    const result = await response.json();
    await restartRender();
    await new Promise((resolve) => pm2.stop('alya', resolve));
    return { success: true, data: result };
  } catch (error) {
    throw new Error(`Error updating variable: ${error.message}`);
  }
}

async function delVar(key) {
  const platformInfo = getPlatformInfo();
  if (platformInfo.platform !== 'render') {
    throw new Error(`Eish, Render is only supported for now.. Current platform: ${platformInfo.platform}`);
  }
  const serviceId = platformInfo.serviceId;
  if (!serviceId) {
    throw new Error('Unable to detect Render service ID');
  }
  try {
    const varsResponse = await fetch(`https://api.render.com/v1/services/${serviceId}/env-vars`, {
      headers: {
        'Authorization': `Bearer ${RENDER_API_KEY}`
      }
    });
    if (!varsResponse.ok) {
      throw new Error('Failed to fetch existing variables');
    }
    const vars = await varsResponse.json();
    const existingVar = vars.find(v => v.key === key);
    if (!existingVar) {
      throw new Error(`Variable '${key}' not found`);
    }
    const response = await fetch(`https://api.render.com/v1/services/${serviceId}/env-vars/${existingVar.key}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${RENDER_API_KEY}`
      }
    });
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to delete variable: ${error}`);
    }
    await restartRender();
    await new Promise((resolve) => pm2.stop('alya', resolve));
    return { success: true, message: `Variable '${key}' deleted successfully` };
  } catch (error) {
    throw new Error(`Error deleting variable: ${error.message}`);
  }
}

async function getVars() {
  const platformInfo = getPlatformInfo();
  if (platformInfo.platform !== 'render') {
    throw new Error(`Eish, Render is only supported for now.. Current platform: ${platformInfo.platform}`);
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
    const vars = await response.json();
    return { success: true, data: vars };
  } catch (error) {
    throw new Error(`Error getting variables: ${error.message}`);
  }
}

async function restartRender() {
  const platformInfo = getPlatformInfo();
  if (platformInfo.platform !== 'render') {
    throw new Error(`Eish, Render is only supported for now.. Current platform: ${platformInfo.platform}`);
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
    const result = await response.json();
    return { 
      success: true, 
      message: 'Deployment triggered successfully',
      deployId: result.id,
      status: result.status,
      data: result 
    };
  } catch (error) {
    throw new Error(`Error triggering deployment: ${error.message}`);
  }
}

async function updateApp() {
  const platformInfo = getPlatformInfo();
  if (platformInfo.platform !== 'render') {
    throw new Error(`Eish, Render is only supported for now.. Current platform: ${platformInfo.platform}`);
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
        clearCache: 'clear'
      })
    });
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to trigger deployment: ${error}`);
    }
    const result = await response.json();
    return { 
      success: true, 
      message: 'Deployment triggered successfully',
      deployId: result.id,
      status: result.status,
      data: result 
    };
  } catch (error) {
    throw new Error(`Error triggering deployment: ${error.message}`);
  }
}

async function getDeployStatus(deployId) {
  const platformInfo = getPlatformInfo();
  if (platformInfo.platform !== 'render') {
    throw new Error(`Eish, Render is only supported for now.. Current platform: ${platformInfo.platform}`);
  }
  const serviceId = platformInfo.serviceId;
  if (!serviceId) {
    throw new Error('Unable to detect Render service ID');
  }
  try {
    const response = await fetch(`https://api.render.com/v1/services/${serviceId}/deploys/${deployId}`, {
      headers: {
        'Authorization': `Bearer ${RENDER_API_KEY}`
      }
    });
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to get deployment status: ${error}`);
    }
    const result = await response.json();
    return { success: true, data: result };
  } catch (error) {
    throw new Error(`Error getting deployment status: ${error.message}`);
  }
}

// Function to set all variables from config.js
async function setAllVarsFromConfig() {
  const currentConfig = config();
  const envVars = await getVars();
  
  // Filter out non-environment variable properties
  const configVars = Object.entries(currentConfig).filter(([key]) => 
    key !== 'RENDER_API_KEY' && 
    typeof currentConfig[key] !== 'function' && 
    typeof currentConfig[key] !== 'object'
  );

  for (const [key, value] of configVars) {
    try {
      // Check if variable already exists
      const exists = envVars.data.some(v => v.key === key);
      
      if (exists) {
        await updateVar(key, value);
        console.log(`Updated variable: ${key}`);
      } else {
        await setVar(key, value);
        console.log(`Set new variable: ${key}`);
      }
    } catch (error) {
      console.error(`Error processing variable ${key}:`, error.message);
    }
  }
}

// Watch config.js for changes
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

// Initialize by setting all variables and starting the watcher
async function initialize() {
  try {
    await setAllVarsFromConfig();
    watchConfig();
  } catch (error) {
    console.error('Initialization error:', error);
  }
}

module.exports = {
  getPlatformInfo,
  setVar,
  updateVar,
  delVar,
  getVars,
  restartRender,
  updateApp,
  getDeployStatus,
  setAllVarsFromConfig,
  watchConfig,
  initialize
};