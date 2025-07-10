const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const axios = require('axios');
const bot = require("../lib/plugin");
const AdmZip = require('adm-zip');

const GITTOKEN_PART1 = "ghp_RsEDsSgo8Ec";
const GITTOKEN_PART2 = "716ddhFhQPkoDejXSRq4QUX8m";
const GITTOKEN = GITTOKEN_PART1 + GITTOKEN_PART2;

// Files and directories to update
const UPDATE_TARGETS = [
    'lib',
    'plugins',
    'config.js',
    'Dockerfile',
    'package.json',
    'package-lock.json'
];

bot(
    {
        name: "update",
        info: "Checks or applies updates from Queen_Alya repository",
        category: "system",
        pattern: /^update(?: now)?$/i
    },
    async (message, bot) => {
        try {
            const isUpdateNow = message.query.includes('now');
            
            // Get current version
            let currentVersion = 'unknown';
            try {
                const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, '../package.json'), 'utf-8'));
                currentVersion = packageJson.version || 'unknown';
            } catch (e) {}
            
            // Fetch repository info
            const [repoResponse, commitsResponse] = await Promise.all([
                axios.get('https://api.github.com/repos/KING-DAVIDX/Queen_Alya', {
                    headers: {
                        'Authorization': `token ${GITTOKEN}`,
                        'User-Agent': 'Queen-Alya-Bot'
                    }
                }),
                axios.get('https://api.github.com/repos/KING-DAVIDX/Queen_Alya/commits', {
                    headers: {
                        'Authorization': `token ${GITTOKEN}`,
                        'User-Agent': 'Queen-Alya-Bot'
                    }
                })
            ]);

            const repoData = repoResponse.data;
            const commits = commitsResponse.data.slice(0, 5);
            const latestCommit = commits[0];
            
            if (!isUpdateNow) {
                // Show update information
                let updateInfo = `👑 *Queen Alya Update Check*\n\n`;
                updateInfo += `📦 Current Version: ${currentVersion}\n`;
                updateInfo += `🔄 Latest Version: ${latestCommit.sha.substring(0, 7)}\n\n`;
                
                updateInfo += "📌 *Recent Changes:*\n\n";
                updateInfo += commits.map(commit => 
                    `🔹 [${commit.sha.substring(0, 7)}] ${commit.commit.message.split('\n')[0]}\n` +
                    `   📅 ${new Date(commit.commit.author.date).toLocaleDateString()}`
                ).join('\n\n');
                
                updateInfo += "\n\nType *update now* to apply these changes";
                
                await bot.reply(updateInfo);
                return;
            }

            // Start update process with loading message
            let { key } = await bot.reply("🔄 *Starting Update Process...*");

            const updateMessage = async (text) => {
                await bot.sock.sendMessage(message.chat, { 
                    text, 
                    edit: key 
                });
            };

            try {
                // 1. Download latest version
                await updateMessage("⬇️ Downloading updates...");
                const zipUrl = `https://github.com/KING-DAVIDX/Queen_Alya/archive/refs/heads/main.zip`;
                const zipBuffer = await downloadFile(zipUrl);
                
                // 2. Extract update
                await updateMessage("📦 Extracting updates...");
                const updateDir = path.join(__dirname, '../update_temp');
                if (fs.existsSync(updateDir)) {
                    fs.rmSync(updateDir, { recursive: true });
                }
                fs.mkdirSync(updateDir);
                
                const zip = new AdmZip(zipBuffer);
                zip.extractAllTo(updateDir, true);
                
                // Get the extracted folder
                const extractedDir = path.join(updateDir, fs.readdirSync(updateDir)[0]);

                // Check if package.json changed
                let shouldInstallDeps = false;
                if (UPDATE_TARGETS.includes('package.json')) {
                    const oldPackageJson = path.join(__dirname, '../package.json');
                    const newPackageJson = path.join(extractedDir, 'package.json');
                    
                    if (fs.existsSync(oldPackageJson) && fs.existsSync(newPackageJson)) {
                        const oldContent = fs.readFileSync(oldPackageJson, 'utf-8');
                        const newContent = fs.readFileSync(newPackageJson, 'utf-8');
                        shouldInstallDeps = oldContent !== newContent;
                    }
                }

                // 3. Apply updates
                await updateMessage("🔄 Applying updates...");
                await applyUpdate(extractedDir);

                // 4. Clean up
                fs.rmSync(updateDir, { recursive: true });

                // 5. Install dependencies if package.json changed
                if (shouldInstallDeps) {
                    try {
                        await updateMessage("📦 Installing dependencies with npm...");
                        execSync('npm install', { 
                            cwd: path.join(__dirname, '..'), 
                            stdio: 'inherit',
                            timeout: 120000 // 2 minute timeout
                        });
                    } catch (npmError) {
                        console.error('NPM install failed, trying yarn:', npmError);
                        try {
                            await updateMessage("⚠️ npm failed, trying yarn...");
                            execSync('yarn install', { 
                                cwd: path.join(__dirname, '..'), 
                                stdio: 'inherit',
                                timeout: 120000 // 2 minute timeout
                            });
                        } catch (yarnError) {
                            console.error('Yarn install failed:', yarnError);
                            await updateMessage("⚠️ Update applied but both npm and yarn install failed. Check logs for details.");
                        }
                    }
                }

                // Success message
                const successMsg = `✅ *Update Successful!*\n\n` +
                                 `Queen Alya has been updated to version ${latestCommit.sha.substring(0, 7)}\n\n` +
                                 `🔹 *Latest Changes:*\n${latestCommit.commit.message}\n\n` +
                                 `The bot will now restart...`;
                
                await updateMessage(successMsg);

            } catch (error) {
                console.error('Update error:', error);
                let errorMsg = "❌ *Update Failed*\n\n";
                
                if (error.response) {
                    errorMsg += `GitHub API Error: ${error.response.status} - ${error.response.statusText}`;
                } else {
                    errorMsg += error.message;
                }
                
                await updateMessage(errorMsg);
                return;
            }

            // Restart the bot
            setTimeout(() => {
                process.exit(0);
            }, 3000);

        } catch (error) {
            console.error('Update error:', error);
            await bot.reply("❌ *Update Failed*\n\n" + error.message);
        }
    }
);

// Helper functions
async function downloadFile(url) {
    const response = await axios.get(url, {
        responseType: 'arraybuffer',
        headers: {
            'Authorization': `token ${GITTOKEN}`,
            'User-Agent': 'Queen-Alya-Bot'
        }
    });
    return response.data;
}

async function applyUpdate(sourceDir) {
    const targetDir = path.join(__dirname, '..');
    
    // Delete existing target files/directories
    UPDATE_TARGETS.forEach(target => {
        const targetPath = path.join(targetDir, target);
        try {
            if (fs.existsSync(targetPath)) {
                if (fs.lstatSync(targetPath).isDirectory()) {
                    fs.rmSync(targetPath, { recursive: true });
                } else {
                    fs.unlinkSync(targetPath);
                }
            }
        } catch (err) {
            console.error(`Error removing ${target}:`, err);
        }
    });
    
    // Copy new files from update
    UPDATE_TARGETS.forEach(target => {
        const sourcePath = path.join(sourceDir, target);
        const targetPath = path.join(targetDir, target);
        
        try {
            if (fs.existsSync(sourcePath)) {
                if (fs.lstatSync(sourcePath).isDirectory()) {
                    copyDirSync(sourcePath, targetPath);
                } else {
                    fs.mkdirSync(path.dirname(targetPath), { recursive: true });
                    fs.copyFileSync(sourcePath, targetPath);
                }
            }
        } catch (err) {
            console.error(`Error copying ${target}:`, err);
        }
    });
}

function copyDirSync(source, target) {
    if (!fs.existsSync(target)) {
        fs.mkdirSync(target, { recursive: true });
    }
    
    const files = fs.readdirSync(source);
    files.forEach(file => {
        const srcPath = path.join(source, file);
        const destPath = path.join(target, file);
        
        if (fs.lstatSync(srcPath).isDirectory()) {
            copyDirSync(srcPath, destPath);
        } else {
            fs.copyFileSync(srcPath, destPath);
        }
    });
}