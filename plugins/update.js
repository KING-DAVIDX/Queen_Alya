const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const axios = require('axios');
const bot = require("../lib/plugin");
const AdmZip = require('adm-zip');

const GITTOKEN_PART1 = "ghp_RsEDsSgo8Ec";
const GITTOKEN_PART2 = "716ddhFhQPkoDejXSRq4QUX8m";
const GITTOKEN = GITTOKEN_PART1 + GITTOKEN_PART2;

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
            
            // Get current version (from package.json or version file)
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

            // Start update process
            await bot.reply("🔄 *Starting Update Process...*\n\nDownloading latest version...");

            // 1. Create backup
            const backupDir = path.join(__dirname, '../backups');
            if (!fs.existsSync(backupDir)) {
                fs.mkdirSync(backupDir);
            }
            
            const backupFileName = `backup-${new Date().toISOString().replace(/[:.]/g, '-')}.zip`;
            const backupPath = path.join(backupDir, backupFileName);
            
            await bot.reply("🔁 Creating backup...");
            await createBackup(backupPath);

            // 2. Download latest version
            await bot.reply("⬇️ Downloading updates...");
            const zipUrl = `https://github.com/KING-DAVIDX/Queen_Alya/archive/refs/heads/main.zip`;
            const zipBuffer = await downloadFile(zipUrl);
            
            // 3. Extract update
            await bot.reply("📦 Extracting updates...");
            const updateDir = path.join(__dirname, '../update_temp');
            if (fs.existsSync(updateDir)) {
                fs.rmSync(updateDir, { recursive: true });
            }
            fs.mkdirSync(updateDir);
            
            const zip = new AdmZip(zipBuffer);
            zip.extractAllTo(updateDir, true);
            
            // Get the extracted folder (GitHub adds 'repo-main' suffix)
            const extractedDir = path.join(updateDir, fs.readdirSync(updateDir)[0]);

            // 4. Apply updates
            await bot.reply("🔄 Applying updates...");
            await applyUpdate(extractedDir);

            // 5. Clean up
            fs.rmSync(updateDir, { recursive: true });

            // 6. Install dependencies if needed
            if (fs.existsSync(path.join(__dirname, '../package.json'))) {
                await bot.reply("📦 Installing dependencies...");
                execSync('npm install', { cwd: path.join(__dirname, '..'), stdio: 'inherit' });
            }

            // Success message
            const successMsg = `✅ *Update Successful!*\n\n` +
                             `Queen Alya has been updated to version ${latestCommit.sha.substring(0, 7)}\n\n` +
                             `🔹 *Latest Changes:*\n${latestCommit.commit.message}\n\n` +
                             `The bot will now restart to apply changes...`;
            
            await bot.reply(successMsg);

            // Restart the bot
            setTimeout(() => {
                process.exit(0);
            }, 3000);

        } catch (error) {
            console.error('Update error:', error);
            let errorMsg = "❌ *Update Failed*\n\n";
            
            if (error.response) {
                errorMsg += `GitHub API Error: ${error.response.status} - ${error.response.statusText}`;
            } else {
                errorMsg += error.message;
            }
            
            await bot.reply(errorMsg);
        }
    }
);

// Helper functions
async function createBackup(backupPath) {
    const zip = new AdmZip();
    
    // Add all files except node_modules and backups
    const rootDir = path.join(__dirname, '..');
    const files = getAllFiles(rootDir);
    
    files.forEach(file => {
        const relativePath = path.relative(rootDir, file);
        if (!relativePath.startsWith('node_modules') && !relativePath.startsWith('backups')) {
            zip.addLocalFile(file, path.dirname(relativePath));
        }
    });
    
    zip.writeZip(backupPath);
}

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
    const files = getAllFiles(sourceDir);
    
    // First delete all existing files except certain directories
    const preserveDirs = ['node_modules', 'backups', 'sessions'];
    const existingFiles = getAllFiles(targetDir);
    
    existingFiles.forEach(file => {
        const relativePath = path.relative(targetDir, file);
        if (!preserveDirs.some(dir => relativePath.startsWith(dir))) {
            fs.unlinkSync(file);
        }
    });
    
    // Copy new files
    files.forEach(file => {
        const relativePath = path.relative(sourceDir, file);
        const targetPath = path.join(targetDir, relativePath);
        
        // Create directory if needed
        const targetDirPath = path.dirname(targetPath);
        if (!fs.existsSync(targetDirPath)) {
            fs.mkdirSync(targetDirPath, { recursive: true });
        }
        
        fs.copyFileSync(file, targetPath);
    });
}

function getAllFiles(dirPath, arrayOfFiles = []) {
    try {
        const files = fs.readdirSync(dirPath);
        files.forEach(file => {
            if (file === 'node_modules' || file === 'backups') return;
            
            const fullPath = path.join(dirPath, file);
            if (fs.statSync(fullPath).isDirectory()) {
                getAllFiles(fullPath, arrayOfFiles);
            } else {
                arrayOfFiles.push(fullPath);
            }
        });
    } catch (err) {
        console.error(`Error reading directory ${dirPath}:`, err);
    }
    return arrayOfFiles;
}