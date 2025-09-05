const fs = require('fs');
const path = require('path');
const os = require('os');

console.log('🎬 Douyin Automation Suite - Setup');
console.log('==================================');
console.log('');

// Check Node.js version
const nodeVersion = process.version;
const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);

if (majorVersion < 14) {
    console.log('❌ Node.js version 14 or higher is required.');
    console.log(`   Current version: ${nodeVersion}`);
    console.log('   Please download from: https://nodejs.org/');
    process.exit(1);
}

console.log(`✅ Node.js version: ${nodeVersion}`);

// Check if required directories exist
const requiredDirs = ['video_links', 'downloadable_links', 'downloads'];
requiredDirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        console.log(`✅ Created directory: ${dir}`);
    } else {
        console.log(`✅ Directory exists: ${dir}`);
    }
});

// Check for cookies.json
if (!fs.existsSync('cookies.json')) {
    console.log('');
    console.log('⚠️  cookies.json not found!');
    console.log('');
    console.log('🔧 To get your Douyin cookies:');
    console.log('1. Open Chrome and go to https://www.douyin.com');
    console.log('2. Log in to your Douyin account');
    console.log('3. Press F12 to open DevTools');
    console.log('4. Go to Application tab → Cookies → https://www.douyin.com');
    console.log('5. Copy all cookies and save as cookies.json');
    console.log('');
    console.log('Example cookies.json format:');
    console.log(`[
  {
    "domain": ".douyin.com",
    "name": "sessionid",
    "value": "your_session_value",
    "expirationDate": 1757660777,
    "httpOnly": true,
    "secure": true
  }
]`);
    console.log('');
} else {
    console.log('✅ cookies.json found');
}

// Create example files
const exampleFiles = {
    'example_channel_urls.txt': `# Example Douyin channel URLs
# Copy and paste your channel URLs here, one per line

https://www.douyin.com/user/MS4wLjABAAAAURQfB8k2J9F79FjWSx1eYlarHl1HTldY8Oxp7OSeJfKAn9cXj6fYIqWheS7X13Bn
https://www.douyin.com/user/YOUR_USER_ID_HERE
`,

    'example_video_urls.txt': `# Example Douyin video URLs
# Copy and paste your video URLs here, one per line

https://v.douyin.com/dG2VJsZMMz4/
https://v.douyin.com/TkjcgARO6s4/
https://www.douyin.com/video/7401068072771144995
`,

    'example_note_urls.txt': `# Example Douyin note URLs
# Copy and paste your note URLs here, one per line

https://www.douyin.com/note/7336813471981440296
https://www.douyin.com/note/7332399367321636123
`
};

Object.entries(exampleFiles).forEach(([filename, content]) => {
    if (!fs.existsSync(filename)) {
        fs.writeFileSync(filename, content);
        console.log(`✅ Created example file: ${filename}`);
    }
});

console.log('');
console.log('🎉 Setup Complete!');
console.log('==================');
console.log('');
console.log('📋 Next Steps:');
console.log('1. Add your Douyin cookies to cookies.json');
console.log('2. Add your channel URLs to example_channel_urls.txt');
console.log('3. Run the scripts:');
console.log('');
console.log('   # Extract channel data and URLs');
console.log('   npm run extract "https://www.douyin.com/user/YOUR_USER_ID"');
console.log('');
console.log('   # Download images from notes');
console.log('   npm run download-images --interactive');
console.log('');
console.log('   # Fetch downloadable video links');
console.log('   npm run fetch-links --interactive');
console.log('');
console.log('   # Download videos');
console.log('   npm run download-videos');
console.log('');
console.log('📖 For detailed usage, see README.md');
console.log('');
console.log('🆘 Need help? Check the README.md file for detailed instructions.');
