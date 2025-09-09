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
    
    // Regex to find URLs (http/https)
    const urlRegex = /https?:\/\/[^\s<>"{}|\\^`\[\]]+/gi;
    const urls = content.match(urlRegex) || [];
    
    // Remove duplicates
    const uniqueUrls = [...new Set(urls)];
    
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
    
} catch (error) {
    console.log(`❌ Error: ${error.message}`);
}
