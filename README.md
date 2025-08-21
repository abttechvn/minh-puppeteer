# 🎬 Douyin Automation Suite

A comprehensive collection of Node.js scripts for automating Douyin (TikTok China) content extraction and downloading using Puppeteer.

## 📋 Table of Contents

- [Features](#features)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Scripts Overview](#scripts-overview)
- [Getting Started](#getting-started)
- [Detailed Usage](#detailed-usage)
- [File Structure](#file-structure)
- [Troubleshooting](#troubleshooting)
- [Tips & Best Practices](#tips--best-practices)

## ✨ Features

- **🔗 Extract video/note URLs** from Douyin user profiles
- **📊 Comprehensive channel data extraction** (followers, hearts, location, description)
- **🔐 Automatic verification handling** with manual resolution support
- **📸 Download images** from note posts (converted to PNG)
- **🎥 Download videos** in multiple qualities (merged, video-only, audio-only)
- **🤖 Human-like behavior** to avoid detection
- **📁 Organized file structure** with timestamp-based folders
- **🔄 Retry mechanisms** for reliability
- **📊 Detailed progress tracking** and result reporting
- **🌍 Unicode support** for Chinese characters in folder names

## 🔧 Prerequisites

- **Node.js** (v14 or higher)
- **npm** (comes with Node.js)
- **Chrome browser** (for Puppeteer)
- **Douyin cookies** (for authenticated access)

## 📦 Installation

1. **Clone or download** this repository
2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Set up cookies** (see [Getting Started](#getting-started))

## 🗂️ Scripts Overview

| Script | Purpose | Input | Output |
|--------|---------|-------|--------|
| `fetch_video_links.js` | Extract URLs and channel data | Channel URL | Comprehensive channel data + URL lists |
| `picture.js` | Download images from notes | Note URLs | PNG images |
| `video.js` | Download videos | Video URLs | MP4 videos (multiple qualities) |
| `index.js` | Extract URLs (alternative method) | Channel URL | Array of URLs |

## 🚀 Getting Started

### Step 1: Get Douyin Cookies

1. **Open Chrome** and go to [douyin.com](https://www.douyin.com)
2. **Log in** to your Douyin account
3. **Open DevTools** (F12) → **Application** tab → **Cookies**
4. **Export cookies** using a browser extension like "Cookie Editor"
5. **Save as `cookies.json`** in the project root

**Example cookies.json structure:**
```json
[
  {
    "domain": ".douyin.com",
    "name": "sessionid",
    "value": "your_session_value",
    "expirationDate": 1757660777,
    "httpOnly": true,
    "secure": true
  }
]
```

### Step 2: Configure Channel URLs

Update the channel URLs in the scripts with your target Douyin user:
```javascript
const CHANNEL_URL = 'https://www.douyin.com/user/YOUR_USER_ID';
```

## 📖 Detailed Usage

### 1. 🔗 Extract Video/Note URLs & Channel Data

**Use `fetch_video_links.js` to get comprehensive channel information:**

```bash
node fetch_video_links.js
```

**What it does:**
- **🔐 Handles verification**: Automatically detects and waits for manual verification completion
- **📊 Extracts comprehensive channel data**: Name, ID, followers, hearts, location, description
- **🖱️ Smart hover interactions**: Reveals full channel descriptions
- **📜 Scrolls through profile**: Loads all videos and notes with human-like behavior
- **🎯 Precise extraction**: Uses specific selectors for accurate data collection
- **📁 Organized output**: Creates timestamped folders with all data

**New folder structure:**
```
video_links/
└── {ChannelID}-{ChannelName}-{dd-mm-yy}_{HH-MM-SS}/
    ├── channel_info.json          # Channel metadata
    ├── complete_results.json      # Full extraction results
    ├── notes_links.txt           # Note URLs only
    └── videos_links.txt          # Video URLs only
```

**Channel data extracted:**
- Channel name (original Chinese characters preserved)
- Channel ID (Douyin-assigned ID, cleaned from prefixes)
- Followers count
- Hearts/likes count
- IP location
- Additional profile data (age, gender, etc. if available)
- Full channel description (revealed via hover)
- Fetch timestamp in readable format

**Features:**
- **Verification handling**: Script pauses when verification is detected, waits for manual completion
- **Unicode support**: Preserves Chinese characters in data, creates filesystem-safe folder names
- **Error resilience**: Continues extraction even if some elements fail to load
- **Human-like behavior**: Random delays, mouse movements, realistic scrolling

### 2. 📸 Download Images from Notes

**Use `picture.js` to download images from note posts:**

1. **Update the file path** in `picture.js`:
   ```javascript
   const NOTE_URLS_FILE = 'video_links/YGG_313-耙耳朵羊锅锅-21-08-25_15-52-57/notes_links.txt';
   ```

2. **Run the script:**
   ```bash
   node picture.js
   ```

### 3. 🎥 Download Videos

**Use `video.js` to download videos:**

1. **Update the video URLs** in `video.js`:
   ```javascript
   const videoUrls = [
     "https://v.douyin.com/dG2VJsZMMz4/",
     "https://v.douyin.com/TkjcgARO6s4/",
     // ... add your video URLs here
   ];
   ```

2. **Run the script:**
   ```bash
   node video.js
   ```

## 🔧 How the Scripts Work

### 📸 picture.js - Image Downloader Detailed Workflow

#### **Core Functionality:**
The `picture.js` script downloads images from Douyin note posts using advanced DOM analysis and slideshow navigation.

#### **Step-by-Step Process:**

1. **Input Processing & Validation**
   - Reads note URLs from text file (generated by `fetch_video_links.js`)
   - Validates and filters URLs to ensure they're valid Douyin note links
   - Processes multiple notes sequentially with respectful delays

2. **Page Navigation & Authentication**
   - Loads existing cookies from `cookies.json` for authenticated access
   - Navigates to each note URL using Puppeteer browser automation
   - Waits for content to fully load before proceeding

3. **Metadata Extraction**
   ```javascript
   // Extracts comprehensive note information:
   - Channel name (using specific DOM selectors)
   - Upload date/time
   - Note description and hashtags
   - Channel URL and ID
   ```

4. **Advanced Image Discovery**
   - **Flexible DOM Selection**: Uses specific selectors with fallback patterns
   - **Dynamic Child Detection**: Searches `nth-child(1)` through `nth-child(20)` for images
   - **Slideshow Navigation**: Automatically clicks next/previous buttons to reveal more images
   - **Deduplication**: Removes duplicate image URLs from different discovery methods

5. **Intelligent Download Process**
   - **Organized Folder Structure**: `downloads/{ChannelName}/note_{noteId}/`
   - **Format Standardization**: Converts all images to PNG format for consistency
   - **Error Handling**: Tracks success/failure for each image download
   - **Metadata Preservation**: Saves complete extraction results in JSON format

#### **Output Structure:**
```
downloads/
└── {ChannelName}/
    └── note_{noteId}/
        ├── image_1.png          # First image
        ├── image_2.png          # Second image
        ├── image_N.png          # Additional images
        └── download_results.json # Complete metadata
```

#### **Key Features:**
- **Smart Image Detection**: Handles dynamic content and slideshow formats
- **Quality Preservation**: Maintains original image resolution
- **Batch Processing**: Handles multiple notes efficiently
- **Comprehensive Logging**: Detailed progress and error reporting

---

### 🎥 video.js - Video Downloader Detailed Workflow

#### **Core Functionality:**
The `video.js` script captures video streams using network interception technology, similar to Chrome DevTools Network tab monitoring.

#### **Advanced Network Interception:**

1. **Real-Time Traffic Monitoring**
   ```javascript
   // Sets up network interception before page loads
   page.on('response', async response => {
     // Monitors ALL network requests in real-time
     // Filters for video/audio content
     // Analyzes quality parameters
   });
   ```

2. **Quality Detection & Analysis**
   - **Bitrate Analysis**: Extracts actual bitrate from URL parameters (`br=565`, `bt=1080`)
   - **Content-Type Filtering**: Identifies video (`video/mp4`) and audio (`audio/mp4`) streams
   - **CDN Recognition**: Recognizes Douyin/Bytedance CDN patterns
   - **Quality Scoring**: Prioritizes higher bitrate content (565kbps+ considered good quality)

3. **Stream Categorization**
   - **Merged Videos**: Combined video + audio streams (best for most uses)
   - **Video-Only**: Video without audio track (for custom audio mixing)
   - **Audio-Only**: Audio without video (for music extraction)

#### **Step-by-Step Process:**

1. **Browser Setup & Optimization**
   - **Desktop Simulation**: Uses 1920x1080 viewport for higher quality streams
   - **Real Browser Headers**: Mimics authentic browser requests
   - **Network Monitoring**: Intercepts traffic before page navigation

2. **Video Page Processing**
   - **Metadata Extraction**: Channel name, ID, description, hashtags, upload date
   - **Video Triggering**: Programmatically plays and seeks video to generate network requests
   - **Quality Capture**: Monitors network traffic for 15-20 seconds to capture all quality variants

3. **Intelligent Quality Filtering**
   ```javascript
   // Quality filter logic:
   - Minimum 400kbps bitrate acceptance
   - Automatic sorting by actual bitrate (not just resolution labels)
   - Preference for merged streams over separate video/audio
   ```

4. **Download & Organization**
   - **Channel-Based Folders**: `downloads/{ChannelName}_{ChannelID}/`
   - **Video-Specific Subfolders**: Each video gets its own folder with ID
   - **Multiple Format Downloads**: Saves merged, video-only, and audio-only versions
   - **Metadata Tracking**: Complete download history and channel statistics

#### **Output Structure:**
```
downloads/
└── {ChannelName}_{ChannelID}/
    ├── channel_info.json          # Channel stats & download history
    └── video_{videoId}/
        ├── video_merged.mp4       # Video + audio (recommended)
        ├── video_only.mp4         # Video without audio
        ├── audio_only.mp4         # Audio without video
        └── download_results.json  # Download metadata & URLs
```

#### **Advanced Features:**
- **Retry Logic**: 3 attempts per video with progressive wait times
- **Quality Prioritization**: Automatically selects highest bitrate available
- **Batch Processing**: Handles multiple videos with respectful delays
- **Network Efficiency**: Captures all quality variants in single page load

---

### 🔄 **Script Comparison & Integration:**

| Feature | picture.js | video.js |
|---------|------------|----------|
| **Detection Method** | DOM selector extraction | Network traffic interception |
| **Content Type** | Static images in notes | Dynamic video streams |
| **Quality Handling** | Original resolution preserved | Bitrate-based quality filtering |
| **Output Format** | PNG standardization | Multiple MP4 variants |
| **Complexity Level** | Moderate (DOM manipulation) | Advanced (network monitoring) |
| **Best For** | Image collections, artwork | Video content, multiple qualities |

### 💡 **Integration Workflow:**

1. **Extract URLs**: Use `fetch_video_links.js` to get note and video URLs
2. **Download Images**: Use `picture.js` with the generated `notes_links.txt`
3. **Download Videos**: Use `video.js` with the generated `videos_links.txt` or direct URLs
4. **Organized Output**: All content organized by channel with comprehensive metadata

## 📁 File Structure

```
douyin-automation/
├── fetch_video_links.js       # Main extraction script
├── picture.js                 # Image downloader
├── video.js                   # Video downloader
├── index.js                   # Alternative URL extractor
├── cookies.json               # Your Douyin session cookies
├── package.json               # Dependencies
├── README.md                  # This file
└── video_links/               # Output directory
    └── {ChannelID}-{ChannelName}-{timestamp}/
        ├── channel_info.json
        ├── complete_results.json
        ├── notes_links.txt
        └── videos_links.txt
```

## 🔧 Troubleshooting

### Common Issues

1. **"No cookies.json found"**
   - Create cookies.json with your Douyin session cookies
   - Ensure you're logged in to Douyin in Chrome

2. **Verification Required**
   - The script will automatically detect verification
   - Solve the verification manually in the browser
   - Script will continue automatically once completed

3. **Empty Results**
   - Check if the channel URL is correct
   - Verify cookies are valid and not expired
   - Try refreshing cookies from a fresh Douyin session

4. **Folder Creation Errors**
   - Ensure write permissions in the project directory
   - Check for invalid characters in channel names

5. **Timeout Errors**
   - Increase timeout values in script configuration
   - Check internet connection stability

## 💡 Tips & Best Practices

### For Extraction (`fetch_video_links.js`)

- **Keep browser visible**: Set `headless: false` for verification handling
- **Don't interrupt verification**: Let the script wait while you solve manually
- **Monitor console output**: Watch for hover actions and verification detection
- **Check folder structure**: Verify the organized output format
- **Regular cookie updates**: Refresh cookies periodically for best results

### For Downloads

- **Use fresh URLs**: Extract URLs before downloading for best success rates
- **Monitor file sizes**: Large videos may take time to download
- **Check output quality**: Videos are available in multiple formats

### General

- **Respect rate limits**: Don't run multiple instances simultaneously
- **Regular breaks**: Let the account rest between large extractions
- **Update selectors**: Douyin may change their DOM structure occasionally
- **Backup data**: Save extracted data before running download scripts

## 🤝 Contributing

Feel free to submit issues, fork the repository, and create pull requests for any improvements.

## ⚠️ Disclaimer

This tool is for educational and research purposes only. Please respect Douyin's terms of service and use responsibly. The authors are not responsible for any misuse of this software.