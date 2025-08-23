const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

async function downloadImage(url, filepath) {
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

async function processNoteVideo(browser, noteUrl, urlIndex = 0, totalUrls = 1) {
    console.log(`\n🎬 Processing Note ${urlIndex + 1}/${totalUrls}`);
    console.log('='.repeat(50));
    console.log('Note URL:', noteUrl);
    
    const page = await browser.newPage();
    
    try {
        // Load cookies if available
        if (fs.existsSync('cookies.json')) {
            const cookies = JSON.parse(fs.readFileSync('cookies.json'));
            
            // Normalize cookies
            for (const cookie of cookies) {
                if (cookie.expirationDate) {
                    cookie.expires = Math.floor(cookie.expirationDate);
                    delete cookie.expirationDate;
                }
            }
            
            await page.setCookie(...cookies);
            console.log(`✅ Loaded ${cookies.length} cookies`);
        }
        
        // Navigate to note
        console.log('🔍 Loading note page...');
        await page.goto(noteUrl, { waitUntil: 'networkidle2', timeout: 60000 });
        
        // Wait for content to load
        await new Promise(r => setTimeout(r, 5000));
        
        // Extract video information with improved selectors
        console.log('📝 Extracting video information...');
        const videoInfo = await page.evaluate(() => {
            // Updated channel name selector
            const channelNameSelector = '#douyin-right-container > div:nth-child(2) > main > div.q3FEUHo1 > div.AaMoWpJs.KVBE0Bw6.hP0cLBah > div.GX8tdEJt > a > div > span > span > span > span > span > span';
            const channelNameElement = document.querySelector(channelNameSelector);
            const channelName = channelNameElement ? channelNameElement.textContent.trim() : 'Unknown_Channel';
            
            // Enhanced datetime extraction with multiple selectors
            let dateTime = '';
            const dateTimeSelectors = [
                '#douyin-right-container > div:nth-child(2) > main > div.q3FEUHo1 > div:nth-child(2) > div > div.__VJux97 > span',
                '[data-e2e="video-publish-time"]',
                '.publish-time',
                // Add more potential datetime selectors
                '#douyin-right-container span[class*="time"]',
                '#douyin-right-container span[class*="date"]'
            ];
            
            for (const selector of dateTimeSelectors) {
                const element = document.querySelector(selector);
                if (element && element.textContent.trim()) {
                    dateTime = element.textContent.trim();
                    console.log(`Found datetime using selector: ${selector} -> ${dateTime}`);
                    break;
                }
            }
            
            if (!dateTime) {
                console.log('No datetime found with any selector');
            }
            
            // Format datetime to hh:mm:ss dd/mm/yy format
            function formatDateTime(dateString) {
                try {
                    let date;
                    
                    // Try to parse the dateString
                    if (dateString && dateString.trim()) {
                        // If it's already in ISO format or a recognizable format
                        date = new Date(dateString);
                        
                        // If parsing failed, try current time
                        if (isNaN(date.getTime())) {
                            console.log(`⚠️ Could not parse datetime "${dateString}", using current time`);
                            date = new Date();
                        }
                    } else {
                        // Use current time if no datetime found
                        date = new Date();
                    }
                    
                    // Format to hh:mm:ss dd/mm/yy
                    const hours = date.getHours().toString().padStart(2, '0');
                    const minutes = date.getMinutes().toString().padStart(2, '0');
                    const seconds = date.getSeconds().toString().padStart(2, '0');
                    const day = date.getDate().toString().padStart(2, '0');
                    const month = (date.getMonth() + 1).toString().padStart(2, '0');
                    const year = date.getFullYear().toString().slice(-2);
                    
                    return `${hours}:${minutes}:${seconds} ${day}/${month}/${year}`;
                } catch (error) {
                    console.log(`⚠️ Error formatting datetime: ${error.message}`);
                    // Return current time in correct format as fallback
                    const now = new Date();
                    const hours = now.getHours().toString().padStart(2, '0');
                    const minutes = now.getMinutes().toString().padStart(2, '0');
                    const seconds = now.getSeconds().toString().padStart(2, '0');
                    const day = now.getDate().toString().padStart(2, '0');
                    const month = (now.getMonth() + 1).toString().padStart(2, '0');
                    const year = now.getFullYear().toString().slice(-2);
                    
                    return `${hours}:${minutes}:${seconds} ${day}/${month}/${year}`;
                }
            }
            
            // Keep the extracted datetime as-is (don't format it)
            
            // FIXED DESCRIPTION EXTRACTION - Using your updated selectors
            let description = '';
            let hashtags = [];
            
            console.log('🔍 Starting description extraction...');
            
            // Try both possible container structures
            const possibleBaseSelectors = [
                // Your new structure
                '#douyin-right-container > div:nth-child(2) > main > div.q3FEUHo1 > div:nth-child(2) > div > div.JAgvLhJN > div.BhCHsHRG > div > span > span:nth-child(2) > span',
                // Previous structure
                '#douyin-right-container > div:nth-child(2) > main > div.q3FEUHo1 > div:nth-child(2) > div > div.Gdai3sp4 > div > div.YklhOzZK > span > span:nth-child(2) > span'
            ];
            
            let activeBaseSelector = null;
            let parentContainer = null;
            
            // Find which structure is being used
            for (const baseSelector of possibleBaseSelectors) {
                parentContainer = document.querySelector(baseSelector);
                if (parentContainer) {
                    activeBaseSelector = baseSelector;
                    console.log(`✅ Found description container using: ${baseSelector}`);
                    break;
                }
            }
            
            if (parentContainer && activeBaseSelector) {
                const allDescriptionParts = [];
                const allHashtags = [];
                
                // Get ALL child spans under the parent
                const allChildSpans = parentContainer.querySelectorAll(':scope > span');
                console.log(`📝 Found ${allChildSpans.length} description parts to process`);
                
                allChildSpans.forEach((span, index) => {
                    const childIndex = index + 1; // nth-child is 1-based
                    
                    // Check if this span contains a hashtag link
                    const hashtagLink = span.querySelector('a[href*="/hashtag/"]');
                    if (hashtagLink) {
                        const hashtag = hashtagLink.textContent.trim();
                        if (hashtag && !allHashtags.includes(hashtag)) {
                            allHashtags.push(hashtag.startsWith('#') ? hashtag : '#' + hashtag);
                            console.log(`🏷️ Found hashtag ${childIndex}: ${hashtag}`);
                        }
                    } else {
                        // Extract text content using the nested span structure
                        const textSpan = span.querySelector('span > span > span');
                        if (textSpan) {
                            const text = textSpan.textContent.trim();
                            if (text && text.length > 0) {
                                allDescriptionParts.push(text);
                                console.log(`📄 Part ${childIndex}: "${text}"`);
                            }
                        }
                    }
                });
                
                // Combine all parts
                description = allDescriptionParts.join('').trim();
                hashtags = allHashtags;
                
                console.log(`✅ Final description: "${description}" (${description.length} chars)`);
                console.log(`✅ Final hashtags: [${hashtags.join(', ')}]`);
            } else {
                console.log('❌ Could not find description container with either structure');
            }
            
            // Try to get channel URL from the channel name link
            let channelUrl = '';
            const channelLink = document.querySelector('#douyin-right-container > div:nth-child(2) > main > div.q3FEUHo1 > div.AaMoWpJs.KVBE0Bw6.hP0cLBah > div.GX8tdEJt > a');
            if (channelLink && channelLink.getAttribute('href')) {
                const href = channelLink.getAttribute('href');
                
                // Handle different href formats
                if (href.startsWith('http')) {
                    // Already a full URL
                    channelUrl = href;
                } else if (href.startsWith('//')) {
                    // Protocol-relative URL
                    channelUrl = `https:${href}`;
                } else if (href.startsWith('/')) {
                    // Relative path starting with /
                    channelUrl = `https://www.douyin.com${href}`;
                } else {
                    // Relative path without leading /
                    channelUrl = `https://www.douyin.com/${href}`;
                }
                
                console.log(`🔗 Channel URL: ${channelUrl}`);
            }
            
            return {
                channelName: channelName,
                channelUrl: channelUrl,
                dateTime: dateTime,
                description: description,
                hashtags: hashtags
            };
        });
        
        console.log('📝 Video Info:', videoInfo);
        
        console.log('🔍 Looking for images using your CSS selector...');
        
        // Use your CSS selector to find all images
        const imageUrls = await page.evaluate(() => {
            const images = [];
            
            // Your specific selector - but let's make it more flexible
            const baseSelector = '#douyin-right-container > div:nth-child(2) > main > div.ZJklW9hr > div.bHe40hB4.rbGftHt8.note-detail-container.newVideoPlayer.isDanmuPlayer.detailNotFullScreen > div > div.nM3w4mVK.ahXhOY50.focusPanel > div';
            
            // Try different child selectors since the nth-child(15) might change
            for (let i = 1; i <= 20; i++) {
                const selector = `${baseSelector} > div:nth-child(${i}) > div > img`;
                const img = document.querySelector(selector);
                if (img && img.src) {
                    images.push({
                        src: img.src,
                        alt: img.alt || '',
                        selector: selector,
                        index: i
                    });
                    console.log(`Found image ${i}:`, img.src);
                }
            }
            
            // Also try a more general approach in the same container
            const generalSelector = `${baseSelector} img`;
            const allImgs = document.querySelectorAll(generalSelector);
            allImgs.forEach((img, index) => {
                if (img.src && !images.some(existing => existing.src === img.src)) {
                    images.push({
                        src: img.src,
                        alt: img.alt || '',
                        selector: generalSelector,
                        index: index
                    });
                    console.log(`Found additional image:`, img.src);
                }
            });
            
            return images;
        });
        
        console.log(`📸 Found ${imageUrls.length} images using DOM selectors`);
        
        // Try to navigate through slides to get more images
        console.log('🎮 Trying to navigate slideshow...');
        await page.evaluate(() => {
            // Look for next/prev buttons
            const nextBtns = document.querySelectorAll('[data-e2e="slideshow-next"], .slideshow-next, .next-btn, button[aria-label*="next"], button[aria-label*="Next"]');
            const prevBtns = document.querySelectorAll('[data-e2e="slideshow-prev"], .slideshow-prev, .prev-btn, button[aria-label*="prev"], button[aria-label*="Previous"]');
            
            console.log('Found next buttons:', nextBtns.length);
            console.log('Found prev buttons:', prevBtns.length);
            
            // Click next button if it exists
            if (nextBtns.length > 0) {
                nextBtns[0].click();
                console.log('Clicked next button');
            }
        });
        
        // Wait and check for more images
        await new Promise(r => setTimeout(r, 3000));
        
        const moreImages = await page.evaluate(() => {
            const images = [];
            const baseSelector = '#douyin-right-container > div:nth-child(2) > main > div.ZJklW9hr > div.bHe40hB4.rbGftHt8.note-detail-container.newVideoPlayer.isDanmuPlayer.detailNotFullScreen > div > div.nM3w4mVK.ahXhOY50.focusPanel > div';
            
            for (let i = 1; i <= 20; i++) {
                const selector = `${baseSelector} > div:nth-child(${i}) > div > img`;
                const img = document.querySelector(selector);
                if (img && img.src) {
                    images.push({
                        src: img.src,
                        alt: img.alt || '',
                        selector: selector,
                        index: i
                    });
                }
            }
            
            return images;
        });
        
        // Combine and deduplicate images
        const allImages = [...imageUrls];
        moreImages.forEach(img => {
            if (!allImages.some(existing => existing.src === img.src)) {
                allImages.push(img);
                console.log('📸 Found new image after navigation:', img.src);
            }
        });
        
        // Also check the page structure to understand it better
        console.log('🔍 Analyzing page structure...');
        const pageInfo = await page.evaluate(() => {
            const container = document.querySelector('#douyin-right-container');
            const focusPanel = document.querySelector('.focusPanel');
            const noteContainer = document.querySelector('.note-detail-container');
            
            return {
                hasContainer: !!container,
                hasFocusPanel: !!focusPanel,
                hasNoteContainer: !!noteContainer,
                focusPanelChildren: focusPanel ? focusPanel.children.length : 0,
                allImagesInPage: document.querySelectorAll('img').length
            };
        });
        
        console.log('📊 Page structure:', pageInfo);
        
        // Create download folder
        const noteId = noteUrl.split('/').pop().split('?')[0];
        // Only replace characters that are actually unsafe for file paths, preserve Chinese characters
        const safeChannelName = videoInfo.channelName.replace(/[<>:"/\\|?*]/g, '_');
        const downloadFolder = path.join('downloads', safeChannelName, `note_${noteId}`);
        
        if (!fs.existsSync(downloadFolder)) {
            fs.mkdirSync(downloadFolder, { recursive: true });
            console.log(`📁 Created folder: ${downloadFolder}`);
        }
        
        // Download all images
        console.log('\n⬇️ DOWNLOADING IMAGES:');
        console.log('=====================');
        
        const downloadedImages = [];
        for (let i = 0; i < allImages.length; i++) {
            const img = allImages[i];
            // Always save as PNG format
            const imageExtension = '.png';
            const filename = `image_${i + 1}${imageExtension}`;
            const filepath = path.join(downloadFolder, filename);
            
            console.log(`📥 Downloading ${i + 1}/${allImages.length}: ${filename}`);
            const success = await downloadImage(img.src, filepath);
            
            if (success) {
                downloadedImages.push({
                    ...img,
                    filename: filename,
                    filepath: filepath,
                    downloaded: true
                });
            } else {
                downloadedImages.push({
                    ...img,
                    filename: filename,
                    filepath: filepath,
                    downloaded: false
                });
            }
        }
        
        // Results
        console.log('\n📊 FINAL RESULTS:');
        console.log('=================');
        console.log(`📝 Channel: ${videoInfo.channelName}`);
        console.log(`📅 Date: ${videoInfo.dateTime}`);
        console.log(`📝 Description: ${videoInfo.description}`);
        console.log(`🏷️ Hashtags: ${videoInfo.hashtags.join(', ')}`);
        console.log(`📸 Total images found: ${allImages.length}`);
        console.log(`✅ Successfully downloaded: ${downloadedImages.filter(img => img.downloaded).length}`);
        console.log(`❌ Failed downloads: ${downloadedImages.filter(img => !img.downloaded).length}`);
        console.log(`📁 Saved to folder: ${downloadFolder}`);
        
        // Format current timestamp
        const formatCurrentDateTime = () => {
            const now = new Date();
            const hours = now.getHours().toString().padStart(2, '0');
            const minutes = now.getMinutes().toString().padStart(2, '0');
            const seconds = now.getSeconds().toString().padStart(2, '0');
            const day = now.getDate().toString().padStart(2, '0');
            const month = (now.getMonth() + 1).toString().padStart(2, '0');
            const year = now.getFullYear().toString().slice(-2);
            
            return `${hours}:${minutes}:${seconds} ${day}/${month}/${year}`;
        };
        
        const results = {
            noteUrl: noteUrl,
            noteId: noteId,
            videoInfo: videoInfo,
            timestamp: formatCurrentDateTime(),
            method: 'DOM_SELECTOR',
            downloadFolder: downloadFolder,
            images: downloadedImages,
            pageInfo: pageInfo,
            summary: {
                totalFound: allImages.length,
                downloaded: downloadedImages.filter(img => img.downloaded).length,
                failed: downloadedImages.filter(img => !img.downloaded).length
            }
        };
        
        // Save results
        const resultsFile = path.join(downloadFolder, 'download_results.json');
        fs.writeFileSync(resultsFile, JSON.stringify(results, null, 2));
        console.log(`💾 Results saved to ${resultsFile}`);
        
        // Show download summary
        if (downloadedImages.length > 0) {
            console.log('\n📁 DOWNLOADED FILES:');
            console.log('===================');
            downloadedImages.forEach((img, i) => {
                const status = img.downloaded ? '✅' : '❌';
                console.log(`${status} ${img.filename}`);
                console.log(`   Source: ${img.src}`);
                console.log(`   Path: ${img.filepath}`);
                console.log('');
            });
        } else {
            console.log('\n❌ No images found with your CSS selector!');
            console.log('This might be because:');
            console.log('- The page structure changed');
            console.log('- The note hasn\'t loaded completely');
            console.log('- The CSS classes are different');
            console.log('- You need to scroll or interact first');
        }
        
        return results;
        
    } catch (error) {
        console.log(`❌ Error processing ${noteUrl}:`, error.message);
        // Format error timestamp
        const now = new Date();
        const hours = now.getHours().toString().padStart(2, '0');
        const minutes = now.getMinutes().toString().padStart(2, '0');
        const seconds = now.getSeconds().toString().padStart(2, '0');
        const day = now.getDate().toString().padStart(2, '0');
        const month = (now.getMonth() + 1).toString().padStart(2, '0');
        const year = now.getFullYear().toString().slice(-2);
        
        return {
            noteUrl: noteUrl,
            error: error.message,
            timestamp: `${hours}:${minutes}:${seconds} ${day}/${month}/${year}`
        };
    } finally {
        if (page) {
            try {
                await page.close();
            } catch (e) {
                console.log('Warning: Could not close page properly');
            }
        }
    }
}

(async () => {
    // 🎯 CONFIGURATION: Specify the file containing note URLs
    const NOTE_URLS_FILE = 'video_links/80103618197-于工-装修帮帮忙-22-08-25_15-30-21/notes_links.txt';
    
    // Read note URLs from file
    let noteUrls = [];
    try {
        if (fs.existsSync(NOTE_URLS_FILE)) {
            const fileContent = fs.readFileSync(NOTE_URLS_FILE, 'utf8');
            noteUrls = fileContent
                .split('\n')
                .map(url => url.trim())
                .filter(url => url && url.startsWith('http')); // Only keep valid URLs
            
            console.log(`✅ Loaded ${noteUrls.length} note URLs from ${NOTE_URLS_FILE}`);
        } else {
            console.log(`❌ File not found: ${NOTE_URLS_FILE}`);
            console.log('Please create the file or update the NOTE_URLS_FILE path.');
            console.log('Example file content (one URL per line):');
            console.log('https://www.douyin.com/note/7336813471981440296');
            console.log('https://www.douyin.com/note/7332399367321636123');
            return;
        }
    } catch (error) {
        console.log(`❌ Error reading file ${NOTE_URLS_FILE}:`, error.message);
        return;
    }
    
    if (noteUrls.length === 0) {
        console.log('❌ No valid note URLs found in the file.');
        return;
    }
    
    console.log('🚀 Multi-Note Picture Downloader');
    console.log('================================');
    console.log(`📋 Total notes to process: ${noteUrls.length}`);
    
    const browser = await puppeteer.launch({ 
        headless: false,
        defaultViewport: { width: 1280, height: 720 }
    });
    
    const allResults = [];
    
    try {
        for (let i = 0; i < noteUrls.length; i++) {
            const result = await processNoteVideo(browser, noteUrls[i], i, noteUrls.length);
            allResults.push(result);
            
            // Add delay between processing to be respectful
            if (i < noteUrls.length - 1) {
                console.log('⏳ Waiting 3 seconds before next note...');
                await new Promise(r => setTimeout(r, 3000));
            }
        }
        
        // Final summary
        console.log('\n🎉 ALL PROCESSING COMPLETE!');
        console.log('===========================');
        
        const successful = allResults.filter(r => !r.error).length;
        const failed = allResults.filter(r => r.error).length;
        const totalImages = allResults.reduce((sum, r) => sum + (r.summary?.downloaded || 0), 0);
        
        console.log(`✅ Successfully processed: ${successful}/${noteUrls.length} notes`);
        console.log(`❌ Failed: ${failed}/${noteUrls.length} notes`);
        console.log(`📸 Total images downloaded: ${totalImages}`);
        
        if (failed > 0) {
            console.log('\n❌ Failed notes:');
            allResults.filter(r => r.error).forEach(r => {
                console.log(`   • ${r.noteUrl}: ${r.error}`);
            });
        }
        
        // Save master results file
        const masterResults = {
            timestamp: (() => {
                const now = new Date();
                const hours = now.getHours().toString().padStart(2, '0');
                const minutes = now.getMinutes().toString().padStart(2, '0');
                const seconds = now.getSeconds().toString().padStart(2, '0');
                const day = now.getDate().toString().padStart(2, '0');
                const month = (now.getMonth() + 1).toString().padStart(2, '0');
                const year = now.getFullYear().toString().slice(-2);
                
                return `${hours}:${minutes}:${seconds} ${day}/${month}/${year}`;
            })(),
            totalNotes: noteUrls.length,
            successful: successful,
            failed: failed,
            totalImages: totalImages,
            results: allResults
        };
        
        fs.writeFileSync('downloads/master_results.json', JSON.stringify(masterResults, null, 2));
        console.log('💾 Master results saved to downloads/master_results.json');
        
    } finally {
        console.log('🔍 Keeping browser open for 10 seconds for final inspection...');
        await new Promise(r => setTimeout(r, 10000));
        await browser.close();
    }
})();