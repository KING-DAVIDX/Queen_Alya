const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const bot = require("../lib/plugin");

// Plugin: Package Checker
bot(
  {
    name: "pkgchk",
    info: "Analyze package usage in the project (checks ../package.json)",
    category: "Utility",
  },
  async (message, bot) => {
    try {
      // Read package.json from parent directory
      const packageJsonPath = path.join(__dirname, '../package.json');
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
      const dependencies = packageJson.dependencies || {};
      
      let report = "📦 *Package Usage Report*\n\n";
      const searchPaths = [
        path.join(__dirname, '../lib'),  // ../lib directory
        path.join(__dirname, '..'),      // parent directory
        __dirname                        // current directory
      ];

      for (const [packageName, version] of Object.entries(dependencies)) {
        report += `*${packageName}* (v${version})\n`;
        
        // Get usage info from all search paths
        let allUsingFiles = [];
        for (const searchPath of searchPaths) {
          const usageInfo = getPackageUsage(packageName, searchPath);
          if (usageInfo.usingFiles && usageInfo.usingFiles.length > 0) {
            allUsingFiles = [...allUsingFiles, ...usageInfo.usingFiles];
          }
        }

        // Get package size info
        const sizeInfo = await getPackageSize(packageName);
        
        if (allUsingFiles.length > 0) {
          report += `📁 Used in these files:\n`;
          allUsingFiles.forEach(file => {
            // Make paths relative for cleaner output
            const relativePath = path.relative(path.join(__dirname, '..'), file);
            report += `➤ ${relativePath}\n`;
          });
        } else {
          report += `⚠️ Not found in any files\n`;
        }
        
        report += `📦 Size: ${sizeInfo.sizeMB}MB (unpacked)\n`;
        
        if (sizeInfo.error) {
          report += `⚠️ ${sizeInfo.error}\n`;
        }
        
        report += "\n";
      }
      
      await bot.reply(report);
      
    } catch (error) {
      console.error('Error analyzing packages:', error);
      await bot.reply("❌ Error analyzing packages. Check console for details.");
    }
  }
);

// Helper functions for package analysis
function getAllFiles(dirPath, arrayOfFiles = []) {
  try {
    // Ensure arrayOfFiles is always an array
    const resultArray = Array.isArray(arrayOfFiles) ? arrayOfFiles : [];
    
    const files = fs.readdirSync(dirPath);
    files.forEach(file => {
      // Skip node_modules directory
      if (file === 'node_modules') return;
      
      const fullPath = path.join(dirPath, file);
      if (fs.statSync(fullPath).isDirectory()) {
        getAllFiles(fullPath, resultArray);
      } else if (fullPath.endsWith('.js') || fullPath.endsWith('.ts')) {
        resultArray.push(fullPath);
      }
    });
    return resultArray;
  } catch (err) {
    // Skip if directory doesn't exist or can't be read
    return [];
  }
}

function getPackageUsage(packageName, projectPath) {
  const files = getAllFiles(projectPath);
  const usingFiles = [];

  for (const file of files) {
    try {
      const content = fs.readFileSync(file, 'utf-8');
      if (
        content.includes(`require('${packageName}')`) ||
        content.includes(`require("${packageName}")`) ||
        content.includes(`from '${packageName}'`) ||
        content.includes(`from "${packageName}"`) ||
        new RegExp(`import\\s+.*\\s+from\\s+['"]${packageName}['"]`).test(content) ||
        new RegExp(`import\\s+['"]${packageName}['"]`).test(content) ||
        new RegExp(`import\\s+\\*\\s+as\\s+\\w+\\s+from\\s+['"]${packageName}['"]`).test(content)
      ) {
        usingFiles.push(file);
      }
    } catch (err) {
      console.error(`Error reading file ${file}:`, err);
    }
  }

  return { usingFiles };
}

async function getPackageSize(packageName) {
  try {
    const sizeBytes = execSync(`npm view ${packageName} dist.unpackedSize`).toString().trim();
    return {
      sizeMB: (parseInt(sizeBytes) / 1024 / 1024).toFixed(2),
      error: null
    };
  } catch (err) {
    return { 
      sizeMB: 'N/A',
      error: 'Failed to get package size'
    };
  }
}