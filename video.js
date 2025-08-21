const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

async function downloadVideo(url, filepath) {
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        
        const buffer = await response.arrayBuffer();
        fs.writeFileSync(filepath, Buffer.from(buffer));
        console.log(`✅ Downloaded: ${path.basename(filepath)}`);
        return true;
    } catch (error) {
        console.log(`❌ Failed to download ${url}: ${error.message}`);
        return false;
    }
}

async function processVideoWithRetries(browser, videoUrl, maxRetries = 3) {
    let lastError = null;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        console.log(`  🔄 Attempt ${attempt}/${maxRetries} for ${videoUrl}`);
        let videoPage = null;
        try {
            videoPage = await browser.newPage();
            
            const result = await processVideoPage(videoPage, videoUrl, attempt);
            if (!result.error) {
                console.log(`  ✅ Success on attempt ${attempt}`);
                return result;
            }
            lastError = result.error;
            console.log(`  ⚠️ Attempt ${attempt} failed: ${result.error}`);
        } catch (error) {
            lastError = error.message;
            console.log(`  ❌ Attempt ${attempt} crashed: ${error.message}`);
        } finally {
            if (videoPage) {
                try {
                    await videoPage.close();
                } catch (e) {
                    // Ignore close errors
                }
            }
        }
        
        if (attempt < maxRetries) {
            await new Promise(r => setTimeout(r, 2000 + Math.random() * 2000));
        }
    }
    
    return {
        originalUrl: videoUrl,
        error: `Failed after ${maxRetries} attempts. Last error: ${lastError}`,
        attempt: maxRetries,
        timestamp: new Date().toISOString()
    };
}

async function processVideoPage(page, videoUrl, attempt) {
    const videoUrls = { merged: [], audio: [], video: [] };
    let found = false;
    
    // Set viewport to desktop size for higher quality videos
    await page.setViewport({ width: 1920, height: 1080 });
    
    // Set user agent to mimic a real desktop browser for better quality
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    
    // Set additional headers to look more like a real browser
    await page.setExtraHTTPHeaders({
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
        'Accept-Language': 'en-US,en;q=0.9,zh-CN;q=0.8,zh;q=0.7',
        'Accept-Encoding': 'gzip, deflate, br',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1',
        'Cache-Control': 'max-age=0'
    });
    
    // Set up network interception BEFORE navigation - capture ALL media requests
    await page.setRequestInterception(true);
    page.on('request', request => {
        request.continue();
    });
    
    // Listen to all responses to catch media files (like in Network > Media tab)
    page.on('response', async response => {
        const reqUrl = response.url();
        const contentType = response.headers()['content-type'] || '';
        
        try {
            // Check if this is a media file (video/audio)
            const isVideo = contentType.includes('video/') || 
                           reqUrl.includes('.mp4') || 
                           reqUrl.includes('.m4v') || 
                           reqUrl.includes('.webm') || 
                           reqUrl.includes('mime_type=video');
                           
            const isAudio = contentType.includes('audio/') || 
                           reqUrl.includes('.mp3') || 
                           reqUrl.includes('.m4a') || 
                           reqUrl.includes('mime_type=audio');
            
            if (isVideo || isAudio) {
                // Check if it's from Douyin's CDN
                if (reqUrl.includes('douyin') || 
                    reqUrl.includes('zjcdn.com') || 
                    reqUrl.includes('bytedance') ||
                    reqUrl.includes('tiktokcdn.com') ||
                    reqUrl.includes('v3-dy-o') ||
                    reqUrl.includes('video/tos/cn/')) {
                    
                    // Extract DETAILED quality indicators from URL parameters
                    const qualityMatch = reqUrl.match(/(?:1080p|720p|540p|480p|360p|240p)/);
                    const bitrateMatch = reqUrl.match(/br=(\d+)/);
                    const btMatch = reqUrl.match(/bt=(\d+)/);
                    
                    const bitrate = bitrateMatch ? parseInt(bitrateMatch[1]) : 0;
                    const bt = btMatch ? parseInt(btMatch[1]) : 0;
                    const maxBitrate = Math.max(bitrate, bt);
                    
                    // Determine quality based on bitrate (565kbps is good quality!)
                    let quality = qualityMatch ? qualityMatch[0] : 'unknown';
                    if (maxBitrate > 0) {
                        if (maxBitrate >= 1000) quality = 'High';
                        else if (maxBitrate >= 500) quality = 'Good';  // 565kbps falls here!
                        else if (maxBitrate >= 300) quality = 'Medium';
                        else quality = 'Low';
                        quality += ` (${maxBitrate}kbps)`;
                    }
                    
                    // Extract file size from Content-Length header for quality comparison
                    const contentLength = response.headers()['content-length'];
                    const fileSizeMB = contentLength ? (parseInt(contentLength) / (1024 * 1024)).toFixed(1) : 'unknown';
                    
                    // Only log if it's reasonable quality (filter out very low quality)
                    if (maxBitrate === 0 || maxBitrate >= 400) { // Only show 400kbps+ or unknown bitrate
                        console.log(`🎬 Media found: ${isVideo ? 'VIDEO' : 'AUDIO'} | Quality: ${quality} | Bitrate: ${maxBitrate}kbps | Size: ${fileSizeMB}MB`);
                        console.log(`   URL: ${reqUrl.substring(0, 120)}...`);
                    }
                    
                    // QUALITY FILTER: Accept videos (565kbps is actually good quality!)
                    const shouldAcceptQuality = maxBitrate === 0 || maxBitrate >= 400; // Minimum 400kbps or unknown
                    
                    if (shouldAcceptQuality && isVideo) {
                        // Categorize videos based on URL patterns
                        if (reqUrl.includes('media-audio-und-mp4a')) {
                            // Audio only
                            if (!videoUrls.audio.includes(reqUrl)) {
                                videoUrls.audio.push(reqUrl);
                                console.log(`🎵 Added to AUDIO list (${fileSizeMB}MB)`);
                                found = true;
                            }
                        } else if (reqUrl.includes('media-video-hvc1') || reqUrl.includes('media-video-avc1')) {
                            // Video only (no audio)
                            if (!videoUrls.video.includes(reqUrl)) {
                                videoUrls.video.push(reqUrl);
                                console.log(`🎬 Added to VIDEO-ONLY list (${quality}, ${maxBitrate}kbps, ${fileSizeMB}MB)`);
                                found = true;
                            }
                        } else {
                            // Assume it's merged video+audio or best quality
                            if (!videoUrls.merged.includes(reqUrl)) {
                                videoUrls.merged.push(reqUrl);
                                console.log(`📹 Added to MERGED list (${quality}, ${maxBitrate}kbps, ${fileSizeMB}MB)`);
                                found = true;
                            }
                        }
                    } else if (isAudio) {
                        if (!videoUrls.audio.includes(reqUrl)) {
                            videoUrls.audio.push(reqUrl);
                            console.log(`🎵 Added to AUDIO list (${fileSizeMB}MB)`);
                            found = true;
                        }
                    } else if (!shouldAcceptQuality) {
                        console.log(`🚫 Rejected low quality video: ${maxBitrate}kbps (too low)`);
                    }
                }
            }
        } catch (error) {
            // Ignore errors in response processing
        }
    });
    
    try {
        // Navigate to video and get the final URL after redirects
        console.log('🔍 Loading video page...');
        await page.goto(videoUrl, { waitUntil: 'networkidle2', timeout: 60000 });
        const finalUrl = page.url();
        console.log(`🔗 Final URL after redirects: ${finalUrl}`);
        
        // Wait for content to load
        await new Promise(r => setTimeout(r, 8000));
        
        // Extract video information
        console.log('📝 Extracting video information...');
        const videoInfo = await page.evaluate(() => {
            // Updated channel name selector (your new one)
            const channelNameSelector = '#douyin-right-container > div.parent-route-container.route-scroll-container.IhmVuo1S > div > div > div.detailPage.W_7gCbBd > div > div.cHwSTMd3 > div.OMAnlCHg > a > div > span > span > span > span > span > span';
            const channelNameElement = document.querySelector(channelNameSelector);
            const channelName = channelNameElement ? channelNameElement.textContent.trim() : 'Unknown_Channel';
            
            // Extract channel ID from the channel link
            let channelId = '';
            let channelUrl = '';
            const channelLink = document.querySelector('#douyin-right-container > div.parent-route-container.route-scroll-container.IhmVuo1S > div > div > div.detailPage.W_7gCbBd > div > div.cHwSTMd3 > div.OMAnlCHg > a');
            if (channelLink && channelLink.getAttribute('href')) {
                const href = channelLink.getAttribute('href');
                channelUrl = href.startsWith('http') ? href : `https://www.douyin.com${href}`;
                
                // Extract channel ID from URL like /user/MS4wLjABAAAA...
                const userMatch = href.match(/\/user\/([^/?]+)/);
                if (userMatch) {
                    channelId = userMatch[1];
                }
            }
            
            // Your specific datetime selector (keeping the old one as fallback)
            const dateTimeSelectors = [
                '#douyin-right-container > div:nth-child(2) > main > div.q3FEUHo1 > div:nth-child(2) > div > div.__VJux97 > span',
                '.publish-time',
                '[data-e2e="video-publish-time"]'
            ];
            let dateTime = '';
            for (const selector of dateTimeSelectors) {
                const element = document.querySelector(selector);
                if (element && element.textContent.trim()) {
                    dateTime = element.textContent.trim();
                    break;
                }
            }
            
            // Extract video title/description from nested elements
            let description = '';
            let hashtags = [];
            
            // Try multiple selectors for video title/description
            const titleSelectors = [
                // Your specific nested selectors for title
                '#douyin-right-container > div.parent-route-container.route-scroll-container.IhmVuo1S > div > div > div.leftContainer.MRADF45Z > div.sJhfX08v > div > div.b3uZicw5.cb5piKg6 > div > h1',
                '#douyin-right-container > div.parent-route-container.route-scroll-container.IhmVuo1S > div > div > div.leftContainer.MRADF45Z > div.sJhfX08v > div > div.b3uZicw5.cb5piKg6 > div > h1 > span',
                // Common description selectors
                '[data-e2e="video-desc"]',
                '.video-info-detail',
                '.video-description',
                '.content-text',
                '.desc-text',
                'h1',
                '.video-title'
            ];
            
            for (const selector of titleSelectors) {
                const element = document.querySelector(selector);
                if (element && element.textContent.trim()) {
                    description = element.textContent.trim();
                    break;
                }
            }
            
            // If we didn't find description in main selectors, try collecting from nested spans
            if (!description) {
                const nestedSpanSelectors = [
                    '#douyin-right-container > div.parent-route-container.route-scroll-container.IhmVuo1S > div > div > div.leftContainer.MRADF45Z > div.sJhfX08v > div > div.b3uZicw5.cb5piKg6 > div > h1 > span > span:nth-child(2) > span > span:nth-child(10) > a > span',
                    '#douyin-right-container > div.parent-route-container.route-scroll-container.IhmVuo1S > div > div > div.leftContainer.MRADF45Z > div.sJhfX08v > div > div.b3uZicw5.cb5piKg6 > div > h1 > span > span:nth-child(2) > span > span:nth-child(8) > a > span',
                    '#douyin-right-container > div.parent-route-container.route-scroll-container.IhmVuo1S > div > div > div.leftContainer.MRADF45Z > div.sJhfX08v > div > div.b3uZicw5.cb5piKg6 > div > h1 > span > span:nth-child(2) > span > span:nth-child(6) > a > span',
                    '#douyin-right-container > div.parent-route-container.route-scroll-container.IhmVuo1S > div > div > div.leftContainer.MRADF45Z > div.sJhfX08v > div > div.b3uZicw5.cb5piKg6 > div > h1 > span > span:nth-child(2) > span > span:nth-child(4) > a > span',
                    '#douyin-right-container > div.parent-route-container.route-scroll-container.IhmVuo1S > div > div > div.leftContainer.MRADF45Z > div.sJhfX08v > div > div.b3uZicw5.cb5piKg6 > div > h1 > span > span:nth-child(2) > span > span:nth-child(2) > a > span',
                    '#douyin-right-container > div.parent-route-container.route-scroll-container.IhmVuo1S > div > div > div.leftContainer.MRADF45Z > div.sJhfX08v > div > div.b3uZicw5.cb5piKg6 > div > h1 > span > span:nth-child(2) > span > span:nth-child(1) > span > span > span'
                ];
                
                let titleParts = [];
                for (const selector of nestedSpanSelectors) {
                    const element = document.querySelector(selector);
                    if (element && element.textContent.trim()) {
                        const text = element.textContent.trim();
                        if (!titleParts.includes(text)) {
                            titleParts.push(text);
                        }
                    }
                }
                
                if (titleParts.length > 0) {
                    description = titleParts.join(' ');
                }
            }
            
            // Extract hashtags from description or specific hashtag elements
            const hashtagElements = document.querySelectorAll('a[href*="/hashtag/"], .hashtag, [data-e2e="video-tag"]');
            hashtagElements.forEach(element => {
                const tagText = element.textContent.trim();
                if (tagText.startsWith('#') || element.getAttribute('href')?.includes('/hashtag/')) {
                    hashtags.push(tagText.startsWith('#') ? tagText : '#' + tagText);
                }
            });
            
            // Also extract hashtags from description text
            if (description) {
                const hashtagMatches = description.match(/#[\w\u4e00-\u9fff]+/g);
                if (hashtagMatches) {
                    hashtagMatches.forEach(tag => {
                        if (!hashtags.includes(tag)) {
                            hashtags.push(tag);
                        }
                    });
                }
            }
            
            return {
                channelName: channelName,
                channelId: channelId,
                channelUrl: channelUrl,
                dateTime: dateTime,
                description: description,
                hashtags: hashtags,
                pageTitle: document.title || ''
            };
        });
        
        console.log('📝 Video Info:', videoInfo);
        
        // Try to trigger video loading (565kbps quality is good!)
        await page.evaluate(() => {
            const video = document.querySelector('video');
            if (video) {
                if (video.paused) {
                    video.play().catch(() => {});
                }
                video.currentTime = 1; // Seek a bit to trigger more network requests
            }
        });
        
        // Wait for network requests to capture video URLs 
        const maxWait = attempt === 1 ? 15000 : 20000; // Normal wait time
        const interval = 500;
        let waited = 0;
        
        while (!found && waited < maxWait) {
            await new Promise(res => setTimeout(res, interval));
            waited += interval;
            
            if (waited % 5000 === 0) {
                console.log(`    ⏳ Waiting for video URLs... ${waited/1000}s`);
                
                // Simple video triggering
                await page.evaluate(() => {
                    const video = document.querySelector('video');
                    if (video) {
                        video.currentTime = Math.random() * (video.duration || 10);
                    }
                });
            }
        }
        
        // Sort videos by ACTUAL BITRATE (most accurate quality indicator)
        const sortByQuality = (urls) => {
            return urls.sort((a, b) => {
                // Extract actual bitrate from URL parameters
                const getBitrateScore = (url) => {
                    const bitrateMatch = url.match(/br=(\d+)/);
                    const btMatch = url.match(/bt=(\d+)/);
                    
                    const bitrate = bitrateMatch ? parseInt(bitrateMatch[1]) : 0;
                    const bt = btMatch ? parseInt(btMatch[1]) : 0;
                    const maxBitrate = Math.max(bitrate, bt);
                    
                    if (maxBitrate > 0) return maxBitrate; // Use actual bitrate
                    
                    // Fallback to resolution labels if no bitrate found
                    if (url.includes('1080p')) return 1080;
                    if (url.includes('720p')) return 720;
                    if (url.includes('540p')) return 540;
                    if (url.includes('480p')) return 480;
                    if (url.includes('360p')) return 360;
                    if (url.includes('240p')) return 240;
                    
                    // File size indicators
                    if (url.includes('large')) return 900;
                    if (url.includes('medium')) return 500;
                    if (url.includes('small')) return 300;
                    
                    return 0; // Unknown quality
                };
                
                return getBitrateScore(b) - getBitrateScore(a); // Descending order (highest first)
            });
        };
        
        // Sort all video arrays by quality
        videoUrls.merged = sortByQuality(videoUrls.merged);
        videoUrls.video = sortByQuality(videoUrls.video);
        videoUrls.audio = sortByQuality(videoUrls.audio);
        
        console.log('\n📊 MEDIA CAPTURE SUMMARY:');
        console.log('========================');
        console.log(`📹 Merged videos found: ${videoUrls.merged.length}`);
        console.log(`🎬 Video-only found: ${videoUrls.video.length}`);
        console.log(`🎵 Audio-only found: ${videoUrls.audio.length}`);
        
        // Show top quality for each type with BITRATE info
        if (videoUrls.merged.length > 0) {
            const topMerged = videoUrls.merged[0];
            const bitrateMatch = topMerged.match(/br=(\d+)/);
            const btMatch = topMerged.match(/bt=(\d+)/);
            const maxBitrate = Math.max(
                bitrateMatch ? parseInt(bitrateMatch[1]) : 0,
                btMatch ? parseInt(btMatch[1]) : 0
            );
            console.log(`   📹 Best merged quality: ${maxBitrate > 0 ? maxBitrate + 'kbps' : 'unknown bitrate'}`);
        }
        if (videoUrls.video.length > 0) {
            const topVideo = videoUrls.video[0];
            const bitrateMatch = topVideo.match(/br=(\d+)/);
            const btMatch = topVideo.match(/bt=(\d+)/);
            const maxBitrate = Math.max(
                bitrateMatch ? parseInt(bitrateMatch[1]) : 0,
                btMatch ? parseInt(btMatch[1]) : 0
            );
            console.log(`   🎬 Best video-only quality: ${maxBitrate > 0 ? maxBitrate + 'kbps' : 'unknown bitrate'}`);
        }
        
        // Check if we found any videos
        if (videoUrls.merged.length === 0 && videoUrls.video.length === 0 && videoUrls.audio.length === 0) {
            return { 
                originalUrl: videoUrl, 
                finalUrl: finalUrl,
                error: "No video URLs found", 
                attempt: attempt,
                timestamp: new Date().toISOString()
            };
        }
        
        // Create download folder structure
        const videoId = finalUrl.split('/').pop().split('?')[0];
        const safeChannelName = videoInfo.channelName.replace(/[^a-zA-Z0-9\-_]/g, '_');
        
        // Channel folder with name and ID
        const channelFolderName = videoInfo.channelId ? 
            `${safeChannelName}_${videoInfo.channelId}` : 
            safeChannelName;
        
        const channelFolder = path.join('downloads', channelFolderName);
        const downloadFolder = path.join(channelFolder, `video_${videoId}`);
        
        // Create channel folder if it doesn't exist and add download timestamp
        if (!fs.existsSync(channelFolder)) {
            fs.mkdirSync(channelFolder, { recursive: true });
            console.log(`📁 Created new channel folder: ${channelFolder}`);
            
            // Add download timestamp file to channel folder
            const downloadInfo = {
                channelName: videoInfo.channelName,
                channelId: videoInfo.channelId,
                channelUrl: videoInfo.channelUrl,
                firstDownload: new Date().toISOString(),
                lastDownload: new Date().toISOString(),
                totalVideosDownloaded: 1
            };
            
            const channelInfoFile = path.join(channelFolder, 'channel_info.json');
            fs.writeFileSync(channelInfoFile, JSON.stringify(downloadInfo, null, 2));
            console.log(`📝 Created channel info file: ${channelInfoFile}`);
        } else {
            console.log(`📁 Using existing channel folder: ${channelFolder}`);
            
            // Update download timestamp and count
            const channelInfoFile = path.join(channelFolder, 'channel_info.json');
            if (fs.existsSync(channelInfoFile)) {
                try {
                    const existingInfo = JSON.parse(fs.readFileSync(channelInfoFile, 'utf8'));
                    existingInfo.lastDownload = new Date().toISOString();
                    existingInfo.totalVideosDownloaded = (existingInfo.totalVideosDownloaded || 0) + 1;
                    fs.writeFileSync(channelInfoFile, JSON.stringify(existingInfo, null, 2));
                    console.log(`📝 Updated channel info: ${existingInfo.totalVideosDownloaded} total videos downloaded`);
                } catch (error) {
                    console.log('⚠️ Could not update channel info file');
                }
            }
        }
        
        // Create video-specific folder
        if (!fs.existsSync(downloadFolder)) {
            fs.mkdirSync(downloadFolder, { recursive: true });
            console.log(`📁 Created video folder: ${downloadFolder}`);
        }
        
        // Download video/audio files
        console.log('\n⬇️ DOWNLOADING VIDEOS/AUDIO:');
        console.log('============================');
        
        const downloadedFiles = [];
        
        // Download merged video (video + audio combined)
        if (videoUrls.merged.length > 0) {
            console.log('📥 Downloading merged video (video + audio)...');
            const filename = 'video_merged.mp4';
            const filepath = path.join(downloadFolder, filename);
            const success = await downloadVideo(videoUrls.merged[0], filepath);
            
            downloadedFiles.push({
                type: 'merged',
                url: videoUrls.merged[0],
                filename: filename,
                filepath: filepath,
                downloaded: success
            });
        }
        
        // Download video only
        if (videoUrls.video.length > 0) {
            console.log('📥 Downloading video only...');
            const filename = 'video_only.mp4';
            const filepath = path.join(downloadFolder, filename);
            const success = await downloadVideo(videoUrls.video[0], filepath);
            
            downloadedFiles.push({
                type: 'video',
                url: videoUrls.video[0],
                filename: filename,
                filepath: filepath,
                downloaded: success
            });
        }
        
        // Download audio only
        if (videoUrls.audio.length > 0) {
            console.log('📥 Downloading audio only...');
            const filename = 'audio_only.mp4'; // Douyin audio is usually in mp4 container
            const filepath = path.join(downloadFolder, filename);
            const success = await downloadVideo(videoUrls.audio[0], filepath);
            
            downloadedFiles.push({
                type: 'audio',
                url: videoUrls.audio[0],
                filename: filename,
                filepath: filepath,
                downloaded: success
            });
        }
        
        const results = {
            originalUrl: videoUrl,
            finalUrl: finalUrl,
            videoId: videoId,
            videoInfo: videoInfo,
            timestamp: new Date().toISOString(),
            method: 'NETWORK_INTERCEPTION',
            channelFolder: channelFolder,
            downloadFolder: downloadFolder,
            videoUrls: videoUrls,
            files: downloadedFiles,
            attempt: attempt,
            summary: {
                totalUrls: videoUrls.merged.length + videoUrls.video.length + videoUrls.audio.length,
                downloaded: downloadedFiles.filter(f => f.downloaded).length,
                failed: downloadedFiles.filter(f => !f.downloaded).length
            }
        };
        
        // Save results
        const resultsFile = path.join(downloadFolder, 'download_results.json');
        fs.writeFileSync(resultsFile, JSON.stringify(results, null, 2));
        console.log(`💾 Results saved to ${resultsFile}`);
        
        return results;
        
    } catch (err) {
        return { 
            originalUrl: videoUrl, 
            finalUrl: page ? page.url() : videoUrl,
            error: err.message, 
            attempt: attempt,
            timestamp: new Date().toISOString()
        };
    } finally {
        // Clean up event listeners
        page.removeAllListeners('request');
        page.removeAllListeners('response');
    }
}

async function processVideoContent(browser, videoUrl, urlIndex = 0, totalUrls = 1) {
    console.log(`\n🎬 Processing Video ${urlIndex + 1}/${totalUrls}`);
    console.log('='.repeat(50));
    console.log('Video URL:', videoUrl);
    
    const result = await processVideoWithRetries(browser, videoUrl, 3);
    
    if (!result.error) {
        // Results
        console.log('\n📊 FINAL RESULTS:');
        console.log('=================');
        console.log(`📝 Channel: ${result.videoInfo.channelName}`);
        console.log(`🆔 Channel ID: ${result.videoInfo.channelId || 'Not found'}`);
        console.log(`🔗 Channel URL: ${result.videoInfo.channelUrl || 'Not found'}`);
        console.log(`📅 Date: ${result.videoInfo.dateTime}`);
        console.log(`📝 Description: ${result.videoInfo.description}`);
        console.log(`🏷️ Hashtags: ${result.videoInfo.hashtags.join(', ')}`);
        console.log(`🎥 Video URLs found:`);
        console.log(`   📹 Merged: ${result.videoUrls.merged.length}`);
        console.log(`   🎬 Video only: ${result.videoUrls.video.length}`);
        console.log(`   🎵 Audio only: ${result.videoUrls.audio.length}`);
        console.log(`✅ Successfully downloaded: ${result.summary.downloaded}`);
        console.log(`❌ Failed downloads: ${result.summary.failed}`);
        console.log(`📁 Channel folder: ${result.channelFolder}`);
        console.log(`📁 Video folder: ${result.downloadFolder}`);
        
        // Show download summary
        if (result.files && result.files.length > 0) {
            console.log('\n📁 DOWNLOADED FILES:');
            console.log('===================');
            result.files.forEach((file, i) => {
                const status = file.downloaded ? '✅' : '❌';
                console.log(`${status} ${file.filename} (${file.type})`);
                console.log(`   Source: ${file.url.substring(0, 80)}...`);
                console.log(`   Path: ${file.filepath}`);
                console.log('');
            });
        }
    }
    
    return result;
}

(async () => {
    // 🎯 CONFIGURATION: Add your video URLs here
    const videoUrls = [
  "https://v.douyin.com/dG2VJsZMMz4/",
  "https://v.douyin.com/TkjcgARO6s4/",
  "https://v.douyin.com/FzCWxWLNMIo/",
  "https://v.douyin.com/VQWX65pEaVQ/",
  "https://v.douyin.com/VFrO9r20aJw/",
  "https://v.douyin.com/12aSsdg_za0/",
  "https://v.douyin.com/n4tg7W69FaM/",
  "https://v.douyin.com/lVXprQfFjWM/",
  "https://v.douyin.com/dRDwVzLPLMY/",
  "https://v.douyin.com/huzjIRESDt8/",
  "https://v.douyin.com/-ptM-4NKD0Y/",
  "https://v.douyin.com/tkdXLdydfO4/",
  "https://v.douyin.com/awYRKsBlsDE/",
  "https://v.douyin.com/RzgN5rsHR-A/",
  "https://v.douyin.com/KL_jrAkVU_g/",
  "https://v.douyin.com/ollVRGw_fdA/",
  "https://v.douyin.com/k8sT3EXcb4I/",
  "https://v.douyin.com/MYnKXXinvdk/",
  "https://v.douyin.com/_oMqGfS0fsg/",
  "https://v.douyin.com/4w6nXq8XOr4/",
  "https://v.douyin.com/snf8hjwO354/",
  "https://v.douyin.com/quOtxfB-5Zw/",
  "https://v.douyin.com/dD86Jnswefs/",
  "https://v.douyin.com/8u0rnsdjmKE/",
  "https://v.douyin.com/Rpk8vCjOUBw/",
  "https://v.douyin.com/9C7gHzIMNz8/",
  "https://v.douyin.com/bm6Eu-opSZs/",
  "https://v.douyin.com/aoQZ9EdKWb4/",
  "https://v.douyin.com/Rz4irDXCwN0/",
  "https://v.douyin.com/RQ-JLQzjrtI/",
  "https://v.douyin.com/f-T3HpTqz54/",
  "https://v.douyin.com/0g3vMFz1zZw/",
  "https://v.douyin.com/JHxa0TSO3yM/",
  "https://v.douyin.com/d7D_tWcaAUY/",
  "https://v.douyin.com/VEORNwm8Cr4/",
  "https://v.douyin.com/AcAsp49QNZ0/",
  "https://v.douyin.com/IORvQSNI4gU/",
  "https://v.douyin.com/NqDv9I3See0/",
  "https://v.douyin.com/GJO_hC55yzU/",
  "https://v.douyin.com/ehk-lQhJgP0/",
  "https://v.douyin.com/IRuQ_oNIsnY/"
]

;
    
    console.log('🚀 Multi-Video Downloader for Douyin (No Cookies, Enhanced Quality)');
    console.log('====================================================================');
    console.log(`📋 Total videos to process: ${videoUrls.length}`);
    
    const browser = await puppeteer.launch({ 
        headless: false,
        defaultViewport: { width: 1920, height: 1080 },
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-web-security',
            '--disable-features=VizDisplayCompositor',
            '--disable-blink-features=AutomationControlled',
            '--no-first-run',
            '--no-default-browser-check',
            '--disable-dev-shm-usage',
            '--enable-webgl',
            '--window-size=1920,1080'
        ]
    });
    
    const allResults = [];
    
    try {
        for (let i = 0; i < videoUrls.length; i++) {
            console.log(`\n📋 Progress: ${i + 1}/${videoUrls.length} videos`);
            const result = await processVideoContent(browser, videoUrls[i], i, videoUrls.length);
            allResults.push(result);
            
            // Show result summary
            if (result.error) {
                console.log(`❌ Failed: ${result.originalUrl} -> ${result.error}`);
            } else {
                console.log(`✅ Success: ${result.originalUrl} -> ${result.finalUrl}`);
                console.log(`   Downloaded: ${result.summary.downloaded} files`);
            }
            
            // Add delay between processing to be respectful
            if (i < videoUrls.length - 1) {
                console.log('⏳ Waiting 3 seconds before next video...');
                await new Promise(r => setTimeout(r, 3000));
            }
        }
        
        // Final summary
        console.log('\n🎉 ALL PROCESSING COMPLETE!');
        console.log('===========================');
        
        const successful = allResults.filter(r => !r.error).length;
        const failed = allResults.filter(r => r.error).length;
        const totalFiles = allResults.reduce((sum, r) => sum + (r.summary?.downloaded || 0), 0);
        
        console.log(`✅ Successfully processed: ${successful}/${videoUrls.length} videos`);
        console.log(`❌ Failed: ${failed}/${videoUrls.length} videos`);
        console.log(`📹 Total video/audio files downloaded: ${totalFiles}`);
        
        if (failed > 0) {
            console.log('\n❌ Failed videos:');
            allResults.filter(r => r.error).forEach(r => {
                console.log(`   • ${r.videoUrl}: ${r.error}`);
            });
        }
        
        // Save master results file
        const masterResults = {
            timestamp: new Date().toISOString(),
            totalVideos: videoUrls.length,
            successful: successful,
            failed: failed,
            totalFiles: totalFiles,
            results: allResults
        };
        
        // Ensure downloads folder exists
        if (!fs.existsSync('downloads')) {
            fs.mkdirSync('downloads', { recursive: true });
        }
        
        fs.writeFileSync('downloads/master_video_results.json', JSON.stringify(masterResults, null, 2));
        console.log('💾 Master results saved to downloads/master_video_results.json');
        
    } finally {
        console.log('🔍 Keeping browser open for 10 seconds for final inspection...');
        await new Promise(r => setTimeout(r, 10000));
        await browser.close();
    }
})();
