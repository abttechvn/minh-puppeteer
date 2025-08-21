const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

async function fetchVideoLinks(channelUrl, options = {}) {
    console.log('🔗 Douyin Video Link Fetcher');
    console.log('============================');
    console.log('Channel URL:', channelUrl);
    
    // List of realistic user agents
    const userAgents = [
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
    ];

    const randomUserAgent = userAgents[Math.floor(Math.random() * userAgents.length)];
    
    const width = 1280 + Math.floor(Math.random() * 100); // 1280-1379px
    const height = 720 + Math.floor(Math.random() * 100); // 720-819px
    
    const browser = await puppeteer.launch({ 
        headless: options.headless !== undefined ? options.headless : false,
        defaultViewport: { width, height },
        args: [
            `--window-size=${width},${height}`,
            '--start-maximized'
        ]
    });
    
    const page = await browser.newPage();
    await page.setUserAgent(randomUserAgent);
    
    try {
        // Load cookies if available
        if (fs.existsSync('cookies.json')) {
            const cookies = JSON.parse(fs.readFileSync('cookies.json'));
            
            // Normalize cookies for Puppeteer (convert expirationDate to expires)
            for (const cookie of cookies) {
                if (cookie.expirationDate) {
                    cookie.expires = Math.floor(cookie.expirationDate);
                    delete cookie.expirationDate;
                }
            }
            
            await page.setCookie(...cookies);
            console.log(`✅ Loaded ${cookies.length} cookies`);
        } else {
            console.log('⚠️ No cookies.json found. You may need to provide cookies manually.');
            console.log('   Create a cookies.json file with your Douyin session cookies.');
        }
        
        // Navigate to channel page
        console.log('🔍 Loading channel page...');
        await page.goto(channelUrl, { waitUntil: 'networkidle2', timeout: 90000 });
        
        // Check for verification page and wait for manual resolution
        console.log('🔐 Checking for verification...');
        try {
            const verificationIframe = await page.$('#root > iframe');
            if (verificationIframe) {
                console.log('🚨 VERIFICATION DETECTED!');
                console.log('========================================');
                console.log('⏳ Please solve the verification manually.');
                console.log('📋 The script will wait and automatically continue once verification is complete.');
                console.log('🔍 Waiting for verification to be resolved...');
                
                // Wait for the verification iframe to disappear
                await page.waitForFunction(
                    () => {
                        const iframe = document.querySelector('#root > iframe');
                        return !iframe; // Continue when iframe is gone
                    },
                    { timeout: 300000 } // 5 minutes timeout for manual verification
                );
                
                console.log('✅ Verification completed! Continuing with data extraction...');
                
                // Wait a bit more for the page to fully load after verification
                await new Promise(r => setTimeout(r, 3000));
            } else {
                console.log('✅ No verification required, proceeding...');
            }
        } catch (error) {
            if (error.name === 'TimeoutError') {
                console.log('⏰ Verification timeout (5 minutes). Please complete verification and restart the script.');
                throw new Error('Verification timeout - please complete verification and try again');
            } else {
                console.log('⚠️ Error checking for verification, continuing anyway...');
            }
        }
        
        // Extract channel information first
        console.log('📝 Extracting channel information...');
        
        // First, hover over the description element to reveal the full description BEFORE extracting data
        try {
            const descriptionHoverSelector = '#user_detail_element > div > div.a3i9GVfe.nZryJ1oM._6lTeZcQP.y5Tqsaqg > div.IGPVd8vQ > div.lFECd241 > div > div > span';
            const descriptionHoverElement = await page.$(descriptionHoverSelector);
            if (descriptionHoverElement) {
                await descriptionHoverElement.hover();
                console.log('🖱️ Hovered over description to reveal full text...');
                // Wait a moment for the description to fully load
                await new Promise(r => setTimeout(r, 1000));
            }
        } catch (error) {
            console.log('⚠️ Could not hover over description element, continuing...');
        }
        
        const channelInfo = await page.evaluate(() => {
            // Use the provided selectors for channel name and ID
            const channelNameSelector = '#user_detail_element > div > div.a3i9GVfe.nZryJ1oM._6lTeZcQP.y5Tqsaqg > div.IGPVd8vQ > div.HjcJQS1Z > h1 > span > span > span > span > span > span';
            const channelIdSelector = '#user_detail_element > div > div.a3i9GVfe.nZryJ1oM._6lTeZcQP.y5Tqsaqg > div.IGPVd8vQ > p > span.OcCvtZ2a';
            const followersSelector = '#user_detail_element > div > div.a3i9GVfe.nZryJ1oM._6lTeZcQP.y5Tqsaqg > div.IGPVd8vQ > div.cuA7Ana_ > div:nth-child(2) > div.C1cxu0Vq';
            const heartsSelector = '#user_detail_element > div > div.a3i9GVfe.nZryJ1oM._6lTeZcQP.y5Tqsaqg > div.IGPVd8vQ > div.cuA7Ana_ > div:nth-child(3) > div.C1cxu0Vq';
            
            // Additional channel data selectors
            const ipLocationSelector = '#user_detail_element > div > div.a3i9GVfe.nZryJ1oM._6lTeZcQP.y5Tqsaqg > div.IGPVd8vQ > p > span.DtUnx4ER';
            const additionalData1Selector = '#user_detail_element > div > div.a3i9GVfe.nZryJ1oM._6lTeZcQP.y5Tqsaqg > div.IGPVd8vQ > p > span:nth-child(3) > span';
            const additionalData2Selector = '#user_detail_element > div > div.a3i9GVfe.nZryJ1oM._6lTeZcQP.y5Tqsaqg > div.IGPVd8vQ > p > span:nth-child(4)';
            const additionalData3Selector = '#user_detail_element > div > div.a3i9GVfe.nZryJ1oM._6lTeZcQP.y5Tqsaqg > div.IGPVd8vQ > p > span:nth-child(5)';
            
            // Page description selectors - handle dynamic length
            const descriptionBaseSelector = '#user_detail_element > div > div.a3i9GVfe.nZryJ1oM._6lTeZcQP.y5Tqsaqg > div.IGPVd8vQ > div.lFECd241 > div > p > span > span > span';
            
            let channelName = 'Unknown_Channel';
            let channelId = 'Unknown_ID';
            let followersCount = '';
            let heartsCount = '';
            let ipLocation = '';
            let additionalData1 = '';
            let additionalData2 = '';
            let additionalData3 = '';
            let pageDescription = '';
            
            // Try to get channel name with the specific selector first, then fallback
            const nameElement = document.querySelector(channelNameSelector);
            if (nameElement && nameElement.textContent.trim()) {
                channelName = nameElement.textContent.trim();
            } else {
                // Fallback selectors if the specific one doesn't work
                const fallbackSelectors = [
                    '[data-e2e="user-title"]',
                    '.username',
                    '.user-name',
                    'h1',
                    '.profile-name',
                    '.user-detail .name'
                ];
                
                for (const selector of fallbackSelectors) {
                    const element = document.querySelector(selector);
                    if (element && element.textContent.trim()) {
                        channelName = element.textContent.trim();
                        break;
                    }
                }
            }
            
            // Extract the Douyin-assigned channel ID using the specific selector
            const idElement = document.querySelector(channelIdSelector);
            if (idElement && idElement.textContent.trim()) {
                const fullText = idElement.textContent.trim();
                // Extract only the ID part after "抖音号：" or similar prefix
                const match = fullText.match(/[：:]\s*(.+)$/);
                channelId = match ? match[1].trim() : fullText;
            }
            
            // Get followers count using the specific selector
            const followersElement = document.querySelector(followersSelector);
            if (followersElement && followersElement.textContent.trim()) {
                followersCount = followersElement.textContent.trim();
            }
            
            // Get hearts count using the specific selector
            const heartsElement = document.querySelector(heartsSelector);
            if (heartsElement && heartsElement.textContent.trim()) {
                heartsCount = heartsElement.textContent.trim();
            }
            
            // Get IP location using the specific selector
            const ipLocationElement = document.querySelector(ipLocationSelector);
            if (ipLocationElement && ipLocationElement.textContent.trim()) {
                ipLocation = ipLocationElement.textContent.trim();
            }
            
            // Get additional data (these may or may not be present)
            const additionalData1Element = document.querySelector(additionalData1Selector);
            if (additionalData1Element && additionalData1Element.textContent.trim()) {
                additionalData1 = additionalData1Element.textContent.trim();
            }
            
            const additionalData2Element = document.querySelector(additionalData2Selector);
            if (additionalData2Element && additionalData2Element.textContent.trim()) {
                additionalData2 = additionalData2Element.textContent.trim();
            }
            
            const additionalData3Element = document.querySelector(additionalData3Selector);
            if (additionalData3Element && additionalData3Element.textContent.trim()) {
                additionalData3 = additionalData3Element.textContent.trim();
            }
            
            // Get page description - handle dynamic length by checking multiple span children
            const descriptionContainer = document.querySelector(descriptionBaseSelector);
            if (descriptionContainer) {
                const descriptionParts = [];
                let childIndex = 1;
                
                // Check for span:nth-child(1), span:nth-child(2), etc. until no more found
                while (true) {
                    const spanElement = descriptionContainer.querySelector(`span:nth-child(${childIndex}) > span > span`);
                    if (spanElement && spanElement.textContent.trim()) {
                        descriptionParts.push(spanElement.textContent.trim());
                        childIndex++;
                    } else {
                        break;
                    }
                }
                
                // Join all description parts
                pageDescription = descriptionParts.join(' ');
            }
            
            return {
                channelName: channelName,
                channelId: channelId,
                followersCount: followersCount,
                heartsCount: heartsCount,
                ipLocation: ipLocation,
                additionalData1: additionalData1, // Now contains data from span:nth-child(3)
                additionalData2: additionalData2,
                additionalData3: additionalData3, // Now contains data from span:nth-child(5)
                pageDescription: pageDescription, // Changed from pageTitle, dynamically handles longer descriptions
            };
        });
        
        console.log('📊 Channel Info:', channelInfo);
        
        // Simulate some random mouse movement and wait (human-like behavior)
        await new Promise(r => setTimeout(r, 8000 + Math.random() * 3000));
        await page.mouse.move(
            100 + Math.random() * (width - 200),
            100 + Math.random() * (height - 200)
        );
        await new Promise(r => setTimeout(r, 600 + Math.random() * 1000));
        
        // Smart scrolling to load all videos
        console.log('📜 Scrolling to load all videos...');
        let prevCount = 0;
        let sameCountTimes = 0;
        let uniqueLinks = [];
        const maxSameCount = options.maxSameCount || 3; // Stop after 3 times with same count
        
        while (sameCountTimes < maxSameCount) {
            // Smart scrolling - try to find the scroll container first
            await page.evaluate(() => {
                const container = document.querySelector('.route-scroll-container');
                if (container) {
                    container.scrollBy(0, 800);
                } else {
                    window.scrollBy(0, window.innerHeight);
                }
            });
            
            // Human-like scroll delay
            await new Promise(r => setTimeout(r, 1800 + Math.random() * 3500));
            
            // Move mouse randomly again (human-like behavior)
            await page.mouse.move(
                100 + Math.random() * (width - 200),
                100 + Math.random() * (height - 200)
            );
            
            // Extract video links - focus only on URL and thumbnail, no titles
            const videoLinks = await page.evaluate(() => {
                const anchors = Array.from(document.querySelectorAll('a[href]'));
                return anchors
                    .map(a => ({
                        href: a.getAttribute('href'),
                        thumbnail: a.querySelector('img')?.src || ''
                    }))
                    .filter(item =>
                        item.href &&
                        (
                            item.href.startsWith('/video/') ||
                            item.href.startsWith('/note/') ||
                            item.href.startsWith('//www.douyin.com/note') ||
                            item.href.startsWith('//www.douyin.com/video')
                        )
                    )
                    .map(item => {
                        let fullUrl = item.href;
                        if (item.href.startsWith('//')) {
                            fullUrl = 'https:' + item.href;
                        } else if (item.href.startsWith('/')) {
                            fullUrl = 'https://www.douyin.com' + item.href;
                        }
                        
                        return {
                            url: fullUrl,
                            type: item.href.includes('/note/') ? 'note' : 'video',
                            thumbnail: item.thumbnail
                        };
                    });
            });
            
            // Use Set to maintain uniqueness based on URL
            const linksSet = new Set([...uniqueLinks.map(l => JSON.stringify(l)), ...videoLinks.map(l => JSON.stringify(l))]);
            const newCount = linksSet.size;
            
            if (newCount === prevCount) {
                sameCountTimes++;
                console.log(`📹 Found ${newCount} unique videos (no new videos found, attempt ${sameCountTimes}/${maxSameCount})`);
            } else {
                sameCountTimes = 0;
                prevCount = newCount;
                console.log(`📹 Found ${newCount} unique videos (+${newCount - uniqueLinks.length} new)`);
            }
            
            uniqueLinks = Array.from(linksSet).map(linkStr => JSON.parse(linkStr));
        }
        
        console.log('🔚 Scrolling complete - no new videos found after multiple attempts');
        
        // Separate notes and videos
        const noteLinks = uniqueLinks.filter(link => link.type === 'note');
        const videoLinksOnly = uniqueLinks.filter(link => link.type === 'video');
        
        console.log('\n📊 EXTRACTION RESULTS:');
        console.log('======================');
        console.log(`📝 Notes found: ${noteLinks.length}`);
        console.log(`🎬 Videos found: ${videoLinksOnly.length}`);
        console.log(`📹 Total links: ${uniqueLinks.length}`);
        
        // Format date and time in a filesystem-safe way for folder names
        const now = new Date();
        const day = String(now.getDate()).padStart(2, '0');
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const year = String(now.getFullYear()).slice(-2);
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const seconds = String(now.getSeconds()).padStart(2, '0');
        const dateTimeFormatted = `${day}-${month}-${year}_${hours}-${minutes}-${seconds}`;
        
        // Create formatted timestamp for JSON files (readable format)
        const formattedTimestamp = `${hours}:${minutes}:${seconds} ${day}/${month}/${year}`;
        
        // Create results object with formatted timestamp
        const results = {
            timestamp: formattedTimestamp,
            channelUrl: channelUrl,
            channelInfo: channelInfo,
            totalLinks: uniqueLinks.length,
            noteCount: noteLinks.length,
            videoCount: videoLinksOnly.length,
            scrollAttempts: prevCount > 0 ? 'completed' : 'stopped_early',
            links: {
                all: uniqueLinks,
                notes: noteLinks,
                videos: videoLinksOnly
            }
        };
        
        // Create folder structure: video_links -> <channel ID>-<channel name>-<date in dd/mm/yy>-<time>
        const baseFolder = 'video_links';
        if (!fs.existsSync(baseFolder)) {
            fs.mkdirSync(baseFolder, { recursive: true });
        }
        
        // Keep original channel name and ID - no character replacement
        const safeChannelName = channelInfo.channelName;
        const safeChannelId = channelInfo.channelId;
        
        // Create the specific folder for this channel and date/time using hyphens
        const channelFolder = path.join(baseFolder, `${safeChannelId}-${safeChannelName}-${dateTimeFormatted}`);
        if (!fs.existsSync(channelFolder)) {
            fs.mkdirSync(channelFolder, { recursive: true });
        }
        
        // Save results to file
        const resultsFile = path.join(channelFolder, `complete_results.json`);
        fs.writeFileSync(resultsFile, JSON.stringify(results, null, 2));
        console.log(`💾 Results saved to: ${resultsFile}`);
        
        // Save channel information JSON file
        const channelInfoFile = path.join(channelFolder, 'channel_info.json');
        const channelInfoData = {
            fetchDate: formattedTimestamp,
            channelUrl: channelUrl,
            channelInfo: channelInfo,
            totalLinks: uniqueLinks.length,
            noteCount: noteLinks.length,
            videoCount: videoLinksOnly.length,
            scrollAttempts: prevCount > 0 ? 'completed' : 'stopped_early'
        };
        fs.writeFileSync(channelInfoFile, JSON.stringify(channelInfoData, null, 2));
        console.log(`💾 Channel Info saved to: ${channelInfoFile}`);
        
        // Create simple URL lists for easy copy-paste
        const noteUrlsFile = path.join(channelFolder, `notes_links.txt`);
        const videoUrlsFile = path.join(channelFolder, `videos_links.txt`);
        
        if (noteLinks.length > 0) {
            fs.writeFileSync(noteUrlsFile, noteLinks.map(link => link.url).join('\n'));
            console.log(`📝 Note URLs saved to: ${noteUrlsFile}`);
        }
        
        if (videoLinksOnly.length > 0) {
            fs.writeFileSync(videoUrlsFile, videoLinksOnly.map(link => link.url).join('\n'));
            console.log(`🎬 Video URLs saved to: ${videoUrlsFile}`);
        }
        
        // Display sample links
        if (noteLinks.length > 0) {
            console.log('\n📝 SAMPLE NOTE LINKS:');
            console.log('====================');
            noteLinks.slice(0, 5).forEach((link, i) => {
                console.log(`${i + 1}. ${link.url}`);
                if (link.title) console.log(`   Title: ${link.title}`);
            });
            if (noteLinks.length > 5) {
                console.log(`   ... and ${noteLinks.length - 5} more notes`);
            }
        }
        
        if (videoLinksOnly.length > 0) {
            console.log('\n🎬 SAMPLE VIDEO LINKS:');
            console.log('=====================');
            videoLinksOnly.slice(0, 5).forEach((link, i) => {
                console.log(`${i + 1}. ${link.url}`);
                if (link.title) console.log(`   Title: ${link.title}`);
            });
            if (videoLinksOnly.length > 5) {
                console.log(`   ... and ${videoLinksOnly.length - 5} more videos`);
            }
        }
        
        return results;
        
    } catch (error) {
        console.log('❌ Error fetching video links:', error.message);
        return {
            error: error.message,
            timestamp: new Date().toISOString(),
            channelUrl: channelUrl
        };
    } finally {
        console.log('\n🔍 Keeping browser open for 5 seconds for inspection...');
        await new Promise(r => setTimeout(r, 5000));
        await browser.close();
    }
}

// Example usage
(async () => {
    // 🎯 CONFIGURATION: Add your channel URL here
    const CHANNEL_URL = 'https://www.douyin.com/user/MS4wLjABAAAAMU6OXqc-DmN8X3DRrI3sGlAI4VVtjRgQDVrK0j4_K1Jwk2xuGpC5whJ7dUv8S8Wh';
    
    const options = {
        headless: false,        // Set to true to run in background
        maxSameCount: 3         // Stop after 3 scroll attempts with same count
    };
    
    console.log('🚀 Starting Douyin Video Link Extraction...');
    console.log('===========================================');
    
    const results = await fetchVideoLinks(CHANNEL_URL, options);
    
    if (results.error) {
        console.log('❌ Extraction failed:', results.error);
    } else {
        console.log('\n🎉 EXTRACTION COMPLETE!');
        console.log('========================');
        console.log(`✅ Total links extracted: ${results.totalLinks}`);
        console.log(`📝 Notes: ${results.noteCount}`);
        console.log(`🎬 Videos: ${results.videoCount}`);
        console.log('\n💡 Next steps:');
        console.log('1. Check the generated .txt files for easy copy-paste of URLs');
        console.log('2. Use the note URLs with your picture.js script');
        console.log('3. Use the video URLs with your video download script');
    }
})();