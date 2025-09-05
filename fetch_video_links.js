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
            // Wait a moment for the page to fully load
            await new Promise(r => setTimeout(r, 3000));
            
            // Check if verification iframe exists
            const verificationIframe = await page.$('#root > iframe');
            
            if (verificationIframe) {
                console.log('🚨 VERIFICATION DETECTED!');
                console.log('========================================');
                console.log('⏳ Please solve the verification manually.');
                console.log('📋 The script will automatically continue once you complete it.');
                console.log('🔍 Monitoring for completion...');
                
                // Wait for verification to be completed manually
                await page.waitForFunction(
                    () => {
                        // Check if iframe is gone AND channel elements are visible
                        const iframe = document.querySelector('#root > iframe');
                        const channelElement = document.querySelector('#user_detail_element');
                        return !iframe && channelElement;
                    },
                    { 
                        timeout: 300000, // 5 minutes timeout
                        polling: 2000    // Check every 2 seconds
                    }
                );
                
                console.log('✅ Verification completed! Continuing with data extraction...');
                
                // Wait for page to stabilize after verification
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
                console.log(`   Error: ${error.message}`);
            }
        }
        
        // Extract channel information first
        console.log('📝 Extracting channel information...');
        
        // Hover over description and wait for full expansion
        try {
            const descriptionHoverSelector = '#user_detail_element > div > div.a3i9GVfe.nZryJ1oM._6lTeZcQP.y5Tqsaqg > div.IGPVd8vQ > div.lFECd241 > div > div > span';
            const descriptionHoverElement = await page.$(descriptionHoverSelector);
            if (descriptionHoverElement) {
                console.log('🖱️ Hovering over description to reveal full text...');
                await descriptionHoverElement.hover();
                
                // Wait longer and monitor for DOM changes
                console.log('⏳ Waiting for description expansion...');
                await new Promise(r => setTimeout(r, 4000)); // Wait 4 seconds for expansion
                
                // Additional wait to ensure DOM has fully updated
                await page.waitForTimeout(2000);
                
                console.log('✅ Description expansion wait completed');
            } else {
                console.log('ℹ️ No hover element found - description may be short or use different layout');
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
            
            // Get IP location using the specific selector (may not exist for all channels)
            const ipLocationElement = document.querySelector(ipLocationSelector);
            if (ipLocationElement && ipLocationElement.textContent.trim()) {
                ipLocation = ipLocationElement.textContent.trim();
            }
            
            // COMPREHENSIVE ADDITIONAL DATA EXTRACTION
            // Try multiple approaches to capture all possible additional data
            let allAdditionalData = [];
            
            // Method 1: Try all known specific selectors
            const knownSelectors = [
                // Position-based selectors (nth-child)
                '#user_detail_element > div > div.a3i9GVfe.nZryJ1oM._6lTeZcQP.y5Tqsaqg > div.IGPVd8vQ > p > span:nth-child(2) > span',
                '#user_detail_element > div > div.a3i9GVfe.nZryJ1oM._6lTeZcQP.y5Tqsaqg > div.IGPVd8vQ > p > span:nth-child(3) > span',
                '#user_detail_element > div > div.a3i9GVfe.nZryJ1oM._6lTeZcQP.y5Tqsaqg > div.IGPVd8vQ > p > span:nth-child(4)',
                '#user_detail_element > div > div.a3i9GVfe.nZryJ1oM._6lTeZcQP.y5Tqsaqg > div.IGPVd8vQ > p > span:nth-child(5)',
                '#user_detail_element > div > div.a3i9GVfe.nZryJ1oM._6lTeZcQP.y5Tqsaqg > div.IGPVd8vQ > p > span:nth-child(6)',
                '#user_detail_element > div > div.a3i9GVfe.nZryJ1oM._6lTeZcQP.y5Tqsaqg > div.IGPVd8vQ > p > span:nth-child(7)',
                // Class-based selectors (your new missing one!)
                '#user_detail_element > div > div.a3i9GVfe.nZryJ1oM._6lTeZcQP.y5Tqsaqg > div.IGPVd8vQ > p > span.YcpSmZeQ > span',
                '#user_detail_element > div > div.a3i9GVfe.nZryJ1oM._6lTeZcQP.y5Tqsaqg > div.IGPVd8vQ > p > span.OcCvtZ2a > span', // Channel ID container class
                '#user_detail_element > div > div.a3i9GVfe.nZryJ1oM._6lTeZcQP.y5Tqsaqg > div.IGPVd8vQ > p > span.DtUnx4ER > span'  // IP location container class
            ];
            
            knownSelectors.forEach(selector => {
                const element = document.querySelector(selector);
                if (element && element.textContent.trim()) {
                    const text = element.textContent.trim();
                    // Debug log for the specific YcpSmZeQ selector
                    if (selector.includes('YcpSmZeQ')) {
                        console.log(`🔍 Found YcpSmZeQ selector data: "${text}"`);
                    }
                    if (!allAdditionalData.includes(text)) {
                        allAdditionalData.push(text);
                    }
                }
            });
            
            // Method 2: Systematic extraction from the info paragraph
            const infoContainer = document.querySelector('#user_detail_element > div > div.a3i9GVfe.nZryJ1oM._6lTeZcQP.y5Tqsaqg > div.IGPVd8vQ > p');
            if (infoContainer) {
                // Get all direct child spans
                const directSpans = infoContainer.querySelectorAll(':scope > span');
                
                directSpans.forEach((span, index) => {
                    // Try the span itself
                    const spanText = span.textContent.trim();
                    if (spanText && 
                        !spanText.includes('抖音号') && 
                        !spanText.includes('：') && 
                        spanText.length > 1 &&
                        !allAdditionalData.includes(spanText)) {
                        allAdditionalData.push(spanText);
                    }
                    
                    // Try child spans within this span
                    const childSpans = span.querySelectorAll('span');
                    childSpans.forEach(childSpan => {
                        const childText = childSpan.textContent.trim();
                        if (childText && 
                            !childText.includes('抖音号') && 
                            !childText.includes('：') && 
                            childText.length > 1 &&
                            childText !== spanText && // Don't duplicate parent text
                            !allAdditionalData.includes(childText)) {
                            allAdditionalData.push(childText);
                        }
                    });
                });
                
                // Method 2.5: Scan for any spans with specific class patterns that might contain data
                const classBasedSpans = infoContainer.querySelectorAll('span[class] > span, span[class]');
                classBasedSpans.forEach(classSpan => {
                    const classText = classSpan.textContent.trim();
                    if (classText && 
                        !classText.includes('抖音号') && 
                        !classText.includes('：') && 
                        classText.length > 1 &&
                        !allAdditionalData.includes(classText)) {
                        allAdditionalData.push(classText);
                    }
                });
                
                // Also try nested combinations like span > span, span > span > span
                const nestedSpans = infoContainer.querySelectorAll('span span');
                nestedSpans.forEach(nestedSpan => {
                    const nestedText = nestedSpan.textContent.trim();
                    if (nestedText && 
                        !nestedText.includes('抖音号') && 
                        !nestedText.includes('：') && 
                        nestedText.length > 1 &&
                        !allAdditionalData.includes(nestedText)) {
                        allAdditionalData.push(nestedText);
                    }
                });
            }
            
            // Method 3: Filter out unwanted data and clean up
            const filteredData = allAdditionalData.filter(text => {
                // Remove channel ID related text
                if (text.includes('抖音号') || text.includes('：')) return false;
                // Remove IP location if already captured
                if (ipLocation && text === ipLocation) return false;
                // Allow single meaningful characters like gender (男/女), but filter out single punctuation/symbols
                if (text.length === 1) {
                    // Keep meaningful single characters (Chinese characters, letters)
                    return /[\u4e00-\u9fff\w]/.test(text);
                }
                // Remove very short non-meaningful text
                if (text.length < 1) return false;
                // Remove pure numbers that might be IDs (but allow age numbers like "25岁")
                if (/^\d+$/.test(text) && text.length > 10) return false;
                return true;
            });
            
            // Assign to variables (keep up to 3 additional data points)
            additionalData1 = filteredData[0] || '';
            additionalData2 = filteredData[1] || '';
            additionalData3 = filteredData[2] || '';
            
            // Store all found data for debugging
            const allFoundData = filteredData;
            
            // COMPREHENSIVE PAGE DESCRIPTION EXTRACTION
            // Try multiple approaches to get the complete description
            let allDescriptionText = '';
            
            // Method 1: Try to get expanded description after hover/click
            const expandedDescriptionSelectors = [
                // After expansion, description might be in different containers
                '#user_detail_element > div > div.a3i9GVfe.nZryJ1oM._6lTeZcQP.y5Tqsaqg > div.IGPVd8vQ > div.lFECd241',
                '#user_detail_element > div > div.a3i9GVfe.nZryJ1oM._6lTeZcQP.y5Tqsaqg > div.IGPVd8vQ > div.lFECd241 > div',
                '#user_detail_element > div > div.a3i9GVfe.nZryJ1oM._6lTeZcQP.y5Tqsaqg > div.IGPVd8vQ > div.lFECd241 > div > p'
            ];
            
            // Try to get full text from expanded containers
            for (const selector of expandedDescriptionSelectors) {
                const container = document.querySelector(selector);
                if (container) {
                    const fullText = container.textContent.trim();
                    // Only use if it's longer and doesn't contain "...更多"
                    if (fullText && 
                        fullText.length > allDescriptionText.length && 
                        !fullText.includes('...更多') && 
                        !fullText.includes('...')) {
                        allDescriptionText = fullText;
                    break;
                    }
                }
            }
            
            // Method 2: Try specific nested selectors for different description layouts
            if (!allDescriptionText || allDescriptionText.includes('...')) {
                const descriptionSelectors = [
                    // For short descriptions
                    '#user_detail_element > div > div.a3i9GVfe.nZryJ1oM._6lTeZcQP.y5Tqsaqg > div.IGPVd8vQ > div.lFECd241 > span > span > span > span > span > span',
                    // For long descriptions with dynamic parts
                    '#user_detail_element > div > div.a3i9GVfe.nZryJ1oM._6lTeZcQP.y5Tqsaqg > div.IGPVd8vQ > div.lFECd241 > div > p > span > span > span',
                    // Alternative structures
                    '#user_detail_element > div > div.a3i9GVfe.nZryJ1oM._6lTeZcQP.y5Tqsaqg > div.IGPVd8vQ > div.lFECd241 > div > span',
                    '#user_detail_element > div > div.a3i9GVfe.nZryJ1oM._6lTeZcQP.y5Tqsaqg > div.IGPVd8vQ > div.lFECd241 > span'
                ];
                
                for (const selector of descriptionSelectors) {
                    const element = document.querySelector(selector);
                    if (element) {
                        const text = element.textContent.trim();
                        if (text && text.length > allDescriptionText.length) {
                            allDescriptionText = text;
                        }
                    }
                }
            }
            
            // Method 3: Try dynamic span collection for complex structures
            if (!allDescriptionText || allDescriptionText.includes('...')) {
                const descriptionContainer = document.querySelector('#user_detail_element > div > div.a3i9GVfe.nZryJ1oM._6lTeZcQP.y5Tqsaqg > div.IGPVd8vQ > div.lFECd241');
                if (descriptionContainer) {
                    // Collect all text from nested spans
                    const allSpans = descriptionContainer.querySelectorAll('span');
                    const textParts = [];
                    
                    allSpans.forEach(span => {
                        const spanText = span.textContent.trim();
                        if (spanText && 
                            !spanText.includes('...更多') && 
                            !spanText.includes('...') &&
                            spanText.length > 3 && // Avoid short meaningless text
                            !textParts.some(part => part.includes(spanText))) { // Avoid duplicates
                            textParts.push(spanText);
                        }
                    });
                    
                    if (textParts.length > 0) {
                        const combinedText = textParts.join(' ');
                        if (combinedText.length > allDescriptionText.length) {
                            allDescriptionText = combinedText;
                        }
                    }
                }
            }
            
            pageDescription = allDescriptionText;
            
            return {
                channelName: channelName,
                channelId: channelId,
                followersCount: followersCount,
                heartsCount: heartsCount,
                ipLocation: ipLocation,
                additionalData1: additionalData1,
                additionalData2: additionalData2,
                additionalData3: additionalData3,
                pageDescription: pageDescription,
                // Debug info: all found additional data
                allFoundAdditionalData: allFoundData
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
        
        // Create folder structure: video_links -> <channel ID>-<date in dd/mm/yy>-<time>
        const baseFolder = 'video_links';
        if (!fs.existsSync(baseFolder)) {
            fs.mkdirSync(baseFolder, { recursive: true });
        }
        
        // Keep original channel name and ID - no character replacement
        const safeChannelName = channelInfo.channelName;
        const safeChannelId = channelInfo.channelId;
        
        // Create the specific folder for this channel and date/time using hyphens (without channel name)
        const channelFolder = path.join(baseFolder, `${safeChannelId}-${dateTimeFormatted}`);
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

// 🚀 CLI Interface
(async () => {
    const args = process.argv.slice(2);
    
    if (args.length === 0) {
        console.log('Usage:');
        console.log('  node fetch_video_links.js <douyin_channel_url>');
        console.log('  node fetch_video_links.js <douyin_channel_url> --headless');
        console.log('  node fetch_video_links.js <douyin_channel_url> --max-scrolls 5');
        console.log('');
        console.log('Examples:');
        console.log('  node fetch_video_links.js "https://www.douyin.com/user/MS4wLjABAAAAURQfB8k2J9F79FjWSx1eYlarHl1HTldY8Oxp7OSeJfKAn9cXj6fYIqWheS7X13Bn"');
        console.log('  node fetch_video_links.js "https://www.douyin.com/user/YOUR_USER_ID" --headless');
        console.log('  node fetch_video_links.js "https://www.douyin.com/user/YOUR_USER_ID" --max-scrolls 10');
        return;
    }
    
    const channelUrl = args[0];
    
    // Parse command line options
    const options = {
        headless: args.includes('--headless'),
        maxSameCount: 3  // Default value
    };
    
    // Check for custom max scrolls
    const maxScrollsIndex = args.indexOf('--max-scrolls');
    if (maxScrollsIndex !== -1 && args[maxScrollsIndex + 1]) {
        const maxScrolls = parseInt(args[maxScrollsIndex + 1]);
        if (!isNaN(maxScrolls) && maxScrolls > 0) {
            options.maxSameCount = maxScrolls;
        }
    }
    
    console.log('🚀 Starting Douyin Video Link Extraction...');
    console.log('===========================================');
    console.log('Channel URL:', channelUrl);
    console.log('Headless mode:', options.headless ? 'Yes' : 'No');
    console.log('Max scroll attempts:', options.maxSameCount);
    console.log('');
    
    const results = await fetchVideoLinks(channelUrl, options);
    
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