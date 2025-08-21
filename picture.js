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
        
        // Extract video information
        console.log('📝 Extracting video information...');
        const videoInfo = await page.evaluate(() => {
            // Your specific channel name selector
            const channelNameSelector = '#douyin-right-container > div:nth-child(2) > main > div.q3FEUHo1 > div.AaMoWpJs.KVBE0Bw6.hP0cLBah > div.GX8tdEJt > a > div > span > span > span > span > span > span';
            const channelNameElement = document.querySelector(channelNameSelector);
            const channelName = channelNameElement ? channelNameElement.textContent.trim() : 'Unknown_Channel';
            
            // Your specific datetime selector
            const dateTimeSelector = '#douyin-right-container > div:nth-child(2) > main > div.q3FEUHo1 > div:nth-child(2) > div > div.__VJux97 > span';
            const dateTimeElement = document.querySelector(dateTimeSelector);
            const dateTime = dateTimeElement ? dateTimeElement.textContent.trim() : '';
            
            // Extract video description and hashtags
            let description = '';
            let hashtags = [];
            
            // Common selectors for video description
            const descriptionSelectors = [
                '[data-e2e="video-desc"]',
                '.video-info-detail',
                '.video-description',
                '.content-text',
                '.desc-text'
            ];
            
            for (const selector of descriptionSelectors) {
                const element = document.querySelector(selector);
                if (element && element.textContent.trim()) {
                    description = element.textContent.trim();
                    break;
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
            
            // Try to get channel URL from the channel name link
            let channelUrl = '';
            const channelLink = document.querySelector('#douyin-right-container > div:nth-child(2) > main > div.q3FEUHo1 > div.AaMoWpJs.KVBE0Bw6.hP0cLBah > div.GX8tdEJt > a');
            if (channelLink && channelLink.getAttribute('href')) {
                const href = channelLink.getAttribute('href');
                channelUrl = href.startsWith('http') ? href : `https://www.douyin.com${href}`;
            }
            
            return {
                channelName: channelName,
                channelUrl: channelUrl,
                dateTime: dateTime,
                description: description,
                hashtags: hashtags,
                pageTitle: document.title || ''
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
        const safeChannelName = videoInfo.channelName.replace(/[^a-zA-Z0-9\-_]/g, '_');
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
        
        const results = {
            noteUrl: noteUrl,
            noteId: noteId,
            videoInfo: videoInfo,
            timestamp: new Date().toISOString(),
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
        return {
            noteUrl: noteUrl,
            error: error.message,
            timestamp: new Date().toISOString()
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
    const NOTE_URLS_FILE = 'video_links/Unknown_Channel_notes_2025-08-18T05-07-15-816Z.txt';
    
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
            timestamp: new Date().toISOString(),
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