const fs = require('fs');
const path = require('path');

// Get input file from command line
const inputFile = process.argv[2];

if (!inputFile) {
    console.log('Usage: node extract_links.js <input_file>');
    console.log('Example: node extract_links.js extractfile.txt');
    process.exit(1);
}

if (!fs.existsSync(inputFile)) {
    console.log(`❌ File not found: ${inputFile}`);
    process.exit(1);
}

try {
    const content = fs.readFileSync(inputFile, 'utf8');
    
    // Enhanced regex to find various URL formats
    const urlRegex = /https?:\/\/[^\s<>"{}|\\^`\[\]]+/gi;
    const urls = content.match(urlRegex) || [];
    
    // Clean and filter URLs
    const cleanedUrls = urls
        .map(url => url.trim())
        .filter(url => {
            // Remove URLs that are clearly not valid
            if (url.length < 10) return false;
            if (url.includes(' ')) return false;
            if (url.endsWith('.') || url.endsWith(',')) {
                return url.slice(0, -1); // Remove trailing punctuation
            }
            return true;
        })
        .map(url => {
            // Clean up common issues
            if (url.endsWith('.') || url.endsWith(',')) {
                return url.slice(0, -1);
            }
            return url;
        });
    
    // Remove duplicates while preserving order
    const uniqueUrls = [...new Set(cleanedUrls)];
    
    console.log(`📄 Input file: ${inputFile}`);
    console.log(`🔗 Found ${uniqueUrls.length} unique URLs:`);
    console.log('='.repeat(50));
    
    uniqueUrls.forEach((url, index) => {
        console.log(`${index + 1}. ${url}`);
    });
    
    // Save to output file
    const outputFile = inputFile.replace('.txt', '_extracted_links.txt');
    fs.writeFileSync(outputFile, uniqueUrls.join('\n'));
    
    console.log(`\n💾 Saved to: ${outputFile}`);
    
    // Show some statistics
    const douyinUrls = uniqueUrls.filter(url => url.includes('douyin.com')).length;
    const shortUrls = uniqueUrls.filter(url => url.includes('v.douyin.com')).length;
    const otherUrls = uniqueUrls.length - douyinUrls;
    
    console.log(`\n📊 Statistics:`);
    console.log(`   • Douyin URLs: ${douyinUrls}`);
    console.log(`   • Short Douyin URLs: ${shortUrls}`);
    console.log(`   • Other URLs: ${otherUrls}`);
    
} catch (error) {
    console.log(`❌ Error: ${error.message}`);
}
