# 🚀 Quick Start Guide

## Windows Users

1. **Download and install Node.js** from [nodejs.org](https://nodejs.org/)
2. **Double-click `setup.bat`** to run the setup
3. **Add your Douyin cookies** to `cookies.json`
4. **Run the scripts** using the commands below

## Mac/Linux Users

1. **Install Node.js** (if not already installed):
   ```bash
   # macOS
   brew install node
   
   # Ubuntu/Debian
   sudo apt install nodejs npm
   ```
2. **Run the setup**:
   ```bash
   chmod +x setup.sh
   ./setup.sh
   ```
3. **Add your Douyin cookies** to `cookies.json`
4. **Run the scripts** using the commands below

## 🎯 Basic Usage

### 1. Extract Channel Data
```bash
npm run extract "https://www.douyin.com/user/YOUR_USER_ID"
```

### 2. Download Images
```bash
npm run download-images --interactive
```

### 3. Fetch Video Links
```bash
npm run fetch-links --interactive
```

### 4. Download Videos
```bash
npm run download-videos
```

## 🔧 Getting Douyin Cookies

1. Open Chrome and go to [douyin.com](https://www.douyin.com)
2. Log in to your account
3. Press F12 → Application tab → Cookies → https://www.douyin.com
4. Copy all cookies and save as `cookies.json`

## 📁 Output Structure

```
douyin-automation-suite/
├── video_links/           # Channel data + URLs
├── downloadable_links/    # Video metadata + download links
├── downloads/             # Downloaded videos and images
└── cookies.json          # Your Douyin session cookies
```

## 🆘 Need Help?

Check `README.md` for detailed instructions and troubleshooting.
