const puppeteer = require('puppeteer');
const cheerio = require('cheerio');
const fs = require('fs-extra');
const path = require('path');
const chalk = require('chalk');
const ora = require('ora');

class ApiHunter {
    constructor() {
        this.config = {
            outputDir: './captured_data',
            examples: {
                // Example 1: ChatGPT-like
                chatgpt: 'https://chat.openai.com',
                
                // Example 2: Free Public APIs (for practice)
                free_api_1: 'https://jsonplaceholder.typicode.com',
                free_api_2: 'https://catfact.ninja/fact',
                free_api_3: 'https://api.agify.io?name=mehedi',
                
                // Example 3: Image Generators
                craiyon: 'https://www.craiyon.com',
                deepai: 'https://deepai.org/machine-learning-model/text2img',
                
                // Example 4: AI Tools
                huggingface: 'https://huggingface.co/spaces',
                replicate: 'https://replicate.com/explore'
            },
            keywords: ['api', 'v1', 'v2', 'v3', 'endpoint', 'json', 'data']
        };
        
        this.spinner = null;
    }

    async showExamples() {
        console.log(chalk.cyan.bold('\n🎯 EXAMPLE WEBSITES FOR API CAPTURE:\n'));
        
        console.log(chalk.yellow('1. CHATGPT / AI CHAT:'));
        console.log(chalk.white('   • https://chat.openai.com'));
        console.log(chalk.white('   • https://bard.google.com'));
        console.log(chalk.white('   • https://claude.ai'));
        
        console.log(chalk.yellow('\n2. IMAGE GENERATORS:'));
        console.log(chalk.white('   • https://www.midjourney.com'));
        console.log(chalk.white('   • https://stablediffusionweb.com'));
        console.log(chalk.white('   • https://www.craiyon.com'));
        console.log(chalk.white('   • https://deepai.org'));
        
        console.log(chalk.yellow('\n3. FREE PUBLIC APIs (PRACTICE):'));
        console.log(chalk.white('   • https://jsonplaceholder.typicode.com/posts'));
        console.log(chalk.white('   • https://catfact.ninja/fact'));
        console.log(chalk.white('   • https://api.agify.io?name=mehedi'));
        console.log(chalk.white('   • https://api.genderize.io?name=sarah'));
        
        console.log(chalk.yellow('\n4. OTHER AI TOOLS:'));
        console.log(chalk.white('   • https://huggingface.co/spaces'));
        console.log(chalk.white('   • https://replicate.com'));
        console.log(chalk.white('   • https://leonardo.ai'));
        
        console.log(chalk.green('\n💡 TIP: Start with FREE APIs to practice, then move to AI websites'));
    }

    async start() {
        console.log(chalk.magenta.bold('\n🤖 API HUNTER - UNIVERSAL API CAPTURE TOOL\n'));
        
        // Show examples
        await this.showExamples();
        
        // Get user input
        const readline = require('readline').createInterface({
            input: process.stdin,
            output: process.stdout
        });
        
        readline.question(chalk.cyan('\n🔗 Enter website URL (or type "example" for list): '), async (url) => {
            if (url.toLowerCase() === 'example') {
                await this.showDetailedExamples();
                readline.close();
                return;
            }
            
            if (!url.startsWith('http')) {
                url = 'https://' + url;
            }
            
            console.log(chalk.green(`\n🎯 Target: ${url}`));
            
            readline.question(chalk.cyan('⏱️ Capture duration in minutes (default: 5): '), async (duration) => {
                const minutes = duration ? parseInt(duration) : 5;
                
                readline.question(chalk.cyan('👁️ Headless mode? (y/n, default: n): '), async (headless) => {
                    const isHeadless = headless.toLowerCase() === 'y';
                    
                    readline.close();
                    
                    // Start capture
                    await this.captureWebsite(url, minutes, isHeadless);
                });
            });
        });
    }

    async showDetailedExamples() {
        console.log(chalk.cyan.bold('\n📚 DETAILED EXAMPLES WITH EXPECTED APIs:\n'));
        
        console.log(chalk.yellow('EXAMPLE 1: JSONPlaceholder (Free Fake API)'));
        console.log(chalk.white('URL: https://jsonplaceholder.typicode.com'));
        console.log(chalk.green('Expected APIs to capture:'));
        console.log(chalk.white('   • GET /posts'));
        console.log(chalk.white('   • GET /posts/1'));
        console.log(chalk.white('   • POST /posts'));
        console.log(chalk.white('   • PUT /posts/1'));
        console.log(chalk.white('   • DELETE /posts/1'));
        
        console.log(chalk.yellow('\nEXAMPLE 2: Cat Facts API'));
        console.log(chalk.white('URL: https://catfact.ninja'));
        console.log(chalk.green('Expected APIs to capture:'));
        console.log(chalk.white('   • GET /fact'));
        console.log(chalk.white('   • GET /facts'));
        console.log(chalk.white('   • GET /breeds'));
        
        console.log(chalk.yellow('\nEXAMPLE 3: Craiyon (DALL-E Mini)'));
        console.log(chalk.white('URL: https://www.craiyon.com'));
        console.log(chalk.green('Expected APIs to capture:'));
        console.log(chalk.white('   • POST /api/v3/imageGeneration'));
        console.log(chalk.white('   • Image generation endpoints'));
        console.log(chalk.white('   • Prompt processing APIs'));
        
        console.log(chalk.yellow('\nEXAMPLE 4: Agify API (Age Predictor)'));
        console.log(chalk.white('URL: https://api.agify.io'));
        console.log(chalk.green('Expected APIs to capture:'));
        console.log(chalk.white('   • GET /?name=mehedi'));
        console.log(chalk.white('   • Parameters: name, country_id'));
        
        console.log(chalk.magenta('\n🚀 Run: node api_hunter.js'));
        console.log(chalk.magenta('Then enter any of these URLs to capture APIs!'));
    }

    async captureWebsite(url, minutes, headless) {
        this.spinner = ora(`Starting capture for: ${url}`).start();
        
        // Create output directory
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const siteName = new URL(url).hostname.replace(/[^a-z0-9]/gi, '_');
        const outputPath = path.join(this.config.outputDir, `${siteName}_${timestamp}`);
        
        await fs.ensureDir(outputPath);
        await fs.ensureDir(path.join(outputPath, 'requests'));
        await fs.ensureDir(path.join(outputPath, 'responses'));
        await fs.ensureDir(path.join(outputPath, 'screenshots'));
        
        this.spinner.succeed(`Output directory: ${outputPath}`);
        
        // Launch browser
        this.spinner = ora('Launching browser...').start();
        
        const browser = await puppeteer.launch({
            headless: headless,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--window-size=1920,1080'
            ]
        });
        
        this.spinner.succeed('Browser launched');
        
        const page = await browser.newPage();
        
        // Set viewport
        await page.setViewport({ width: 1920, height: 1080 });
        
        // Setup request interception
        await page.setRequestInterception(true);
        
        // Arrays to store captured data
        const capturedApis = [];
        const apiEndpoints = new Set();
        
        // Request listener
        page.on('request', async (request) => {
            const requestUrl = request.url();
            
            if (this.isApiRequest(requestUrl)) {
                console.log(chalk.yellow('\n🎯 API REQUEST CAPTURED:'));
                console.log(chalk.white(`   URL: ${requestUrl}`));
                console.log(chalk.white(`   Method: ${request.method()}`));
                
                const requestData = {
                    id: Date.now(),
                    timestamp: new Date().toISOString(),
                    url: requestUrl,
                    method: request.method(),
                    headers: request.headers(),
                    postData: request.postData(),
                    resourceType: request.resourceType()
                };
                
                // Save request to file
                const requestFile = path.join(outputPath, 'requests', `${requestData.id}.json`);
                await fs.writeJson(requestFile, requestData, { spaces: 2 });
                
                capturedApis.push(requestData);
                apiEndpoints.add(requestUrl);
                
                // Log endpoint pattern
                this.analyzeEndpoint(requestUrl);
            }
            
            request.continue();
        });
        
        // Response listener
        page.on('response', async (response) => {
            const responseUrl = response.url();
            
            if (this.isApiRequest(responseUrl)) {
                try {
                    const responseBody = await response.text();
                    
                    console.log(chalk.cyan('\n📥 API RESPONSE:'));
                    console.log(chalk.white(`   URL: ${responseUrl}`));
                    console.log(chalk.white(`   Status: ${response.status()}`));
                    
                    const responseData = {
                        timestamp: new Date().toISOString(),
                        url: responseUrl,
                        status: response.status(),
                        headers: response.headers(),
                        body: responseBody.substring(0, 1000) + '...' // First 1000 chars
                    };
                    
                    // Save response to file
                    const responseId = Date.now();
                    const responseFile = path.join(outputPath, 'responses', `${responseId}.json`);
                    await fs.writeJson(responseFile, responseData, { spaces: 2 });
                    
                    // Analyze response
                    this.analyzeResponse(responseData);
                    
                } catch (error) {
                    console.log(chalk.red('Error capturing response:'), error.message);
                }
            }
        });
        
        // Take initial screenshot
        this.spinner = ora('Navigating to website...').start();
        
        try {
            await page.goto(url, { 
                waitUntil: 'networkidle2',
                timeout: 60000 
            });
            
            this.spinner.succeed(`Navigated to: ${url}`);
            
            // Take screenshot
            await page.screenshot({ 
                path: path.join(outputPath, 'screenshots', 'initial.png'),
                fullPage: true 
            });
            
            console.log(chalk.green('📸 Initial screenshot saved'));
            
            // Interactive guide based on website type
            await this.guideInteraction(page, url);
            
            // Wait for specified duration
            const milliseconds = minutes * 60 * 1000;
            console.log(chalk.yellow(`\n⏳ Capturing APIs for ${minutes} minutes...`));
            console.log(chalk.cyan('   Interact with the website to generate API calls'));
            console.log(chalk.cyan('   Press Ctrl+C to stop early\n'));
            
            await this.waitAndInteract(page, milliseconds);
            
        } catch (error) {
            this.spinner.fail(`Error: ${error.message}`);
        }
        
        // Finalize
        await this.finalizeCapture(browser, outputPath, capturedApis, apiEndpoints);
    }

    isApiRequest(url) {
        const urlLower = url.toLowerCase();
        return this.config.keywords.some(keyword => urlLower.includes(keyword));
    }

    analyzeEndpoint(url) {
        try {
            const urlObj = new URL(url);
            console.log(chalk.magenta('   🔍 Endpoint Analysis:'));
            console.log(chalk.white(`      Path: ${urlObj.pathname}`));
            
            // Show parameters
            if (urlObj.search) {
                console.log(chalk.white('      Parameters:'));
                urlObj.searchParams.forEach((value, key) => {
                    console.log(chalk.white(`        ${key} = ${value}`));
                });
            }
            
            // Check for API patterns
            if (url.includes('/api/')) {
                console.log(chalk.green('      ✅ Standard API endpoint detected'));
            }
            
            if (url.includes('/graphql')) {
                console.log(chalk.blue('      🕸️ GraphQL endpoint detected'));
            }
            
        } catch (error) {
            // Invalid URL, skip analysis
        }
    }

    analyzeResponse(responseData) {
        const contentType = responseData.headers['content-type'] || '';
        
        if (contentType.includes('application/json')) {
            console.log(chalk.green('      📊 JSON Response'));
            
            try {
                const jsonData = JSON.parse(responseData.body);
                console.log(chalk.white(`      Keys: ${Object.keys(jsonData).join(', ')}`));
                
                // Check for common API response patterns
                if (jsonData.data) console.log(chalk.blue('      📦 Has "data" field'));
                if (jsonData.results) console.log(chalk.blue('      📈 Has "results" field'));
                if (jsonData.error) console.log(chalk.red('      ❌ Has "error" field'));
                
            } catch (e) {
                console.log(chalk.yellow('      ⚠️ Invalid JSON'));
            }
        } else if (contentType.includes('text/html')) {
            console.log(chalk.yellow('      🌐 HTML Response'));
        } else if (contentType.includes('image')) {
            console.log(chalk.cyan('      🖼️ Image Response'));
        }
    }

    async guideInteraction(page, url) {
        console.log(chalk.cyan.bold('\n🔄 INTERACTION GUIDE:\n'));
        
        const hostname = new URL(url).hostname;
        
        if (hostname.includes('chat.openai.com') || hostname.includes('bard.google.com')) {
            console.log(chalk.white('For ChatGPT/Bard:'));
            console.log(chalk.white('   1. Type a message in chat box'));
            console.log(chalk.white('   2. Press Enter to send'));
            console.log(chalk.white('   3. Wait for response'));
            console.log(chalk.white('   4. API calls will be captured automatically\n'));
            
            // Auto-interaction for demo
            console.log(chalk.yellow('💡 Auto-typing demo message...'));
            await page.waitForTimeout(2000);
            
            try {
                await page.type('textarea', 'Hello, tell me a short story');
                await page.keyboard.press('Enter');
                console.log(chalk.green('✅ Demo message sent'));
            } catch (error) {
                console.log(chalk.yellow('⚠️ Could not auto-type, please type manually'));
            }
            
        } else if (hostname.includes('craiyon.com') || hostname.includes('deepai.org')) {
            console.log(chalk.white('For Image Generators:'));
            console.log(chalk.white('   1. Find the prompt input box'));
            console.log(chalk.white('   2. Type: "a cat wearing sunglasses"'));
            console.log(chalk.white('   3. Click Generate button'));
            console.log(chalk.white('   4. Wait for image generation\n'));
            
        } else if (hostname.includes('jsonplaceholder.typicode.com')) {
            console.log(chalk.white('For JSONPlaceholder:'));
            console.log(chalk.white('   1. Try these URLs in browser:'));
            console.log(chalk.white('      • /posts'));
            console.log(chalk.white('      • /posts/1'));
            console.log(chalk.white('      • /comments?postId=1'));
            console.log(chalk.white('   2. Each will generate API calls\n'));
            
        } else {
            console.log(chalk.white('General Interaction:'));
            console.log(chalk.white('   1. Click buttons'));
            console.log(chalk.white('   2. Fill forms'));
            console.log(chalk.white('   3. Navigate pages'));
            console.log(chalk.white('   4. Search/filter data\n'));
        }
        
        console.log(chalk.green('🎮 Now interact with the website in the browser window!'));
    }

    async waitAndInteract(page, duration) {
        // Simple auto-interaction to generate API calls
        const autoInteract = async () => {
            try {
                // Try to find and click common buttons
                const buttons = await page.$$('button, input[type="submit"], a');
                if (buttons.length > 0) {
                    await buttons[0].click();
                    console.log(chalk.blue('🤖 Auto-clicked a button'));
                }
            } catch (error) {
                // Ignore errors
            }
        };
        
        // Auto-interact every 30 seconds
        const interval = setInterval(autoInteract, 30000);
        
        // Wait for specified duration
        await new Promise(resolve => {
            setTimeout(() => {
                clearInterval(interval);
                resolve();
            }, duration);
        });
    }

    async finalizeCapture(browser, outputPath, capturedApis, apiEndpoints) {
        console.log(chalk.magenta.bold('\n📊 CAPTURE SUMMARY:\n'));
        
        console.log(chalk.white(`Total API calls captured: ${chalk.yellow(capturedApis.length)}`));
        console.log(chalk.white(`Unique endpoints: ${chalk.yellow(apiEndpoints.size)}`));
        
        // Save summary
        const summary = {
            captureDate: new Date().toISOString(),
            targetWebsite: this.config.targetWebsite,
            totalRequests: capturedApis.length,
            uniqueEndpoints: Array.from(apiEndpoints),
            endpointsByMethod: this.groupByMethod(capturedApis),
            captureDuration: '5 minutes'
        };
        
        await fs.writeJson(
            path.join(outputPath, 'summary.json'),
            summary,
            { spaces: 2 }
        );
        
        // Generate API documentation
        await this.generateApiDocs(outputPath, capturedApis);
        
        console.log(chalk.green(`\n✅ All data saved to: ${outputPath}`));
        console.log(chalk.cyan('\n📁 Files created:'));
        console.log(chalk.white('   • summary.json - Capture summary'));
        console.log(chalk.white('   • api_documentation.md - API docs'));
        console.log(chalk.white('   • requests/ - Individual request files'));
        console.log(chalk.white('   • responses/ - Response files'));
        console.log(chalk.white('   • screenshots/ - Website screenshots'));
        
        console.log(chalk.magenta.bold('\n🚀 NEXT STEPS:'));
        console.log(chalk.white('1. Check api_documentation.md for captured APIs'));
        console.log(chalk.white('2. Use the endpoints to build your own API'));
        console.log(chalk.white('3. Test the APIs with tools like Postman'));
        
        await browser.close();
        process.exit(0);
    }

    groupByMethod(requests) {
        const groups = {};
        requests.forEach(req => {
            const method = req.method;
            groups[method] = (groups[method] || 0) + 1;
        });
        return groups;
    }

    async generateApiDocs(outputPath, apis) {
        let docs = `# API Documentation\n\n`;
        docs += `## Captured from: ${this.config.targetWebsite}\n`;
        docs += `## Date: ${new Date().toISOString()}\n\n`;
        
        // Group by endpoint
        const endpoints = {};
        apis.forEach(api => {
            const url = new URL(api.url);
            const path = url.pathname;
            
            if (!endpoints[path]) {
                endpoints[path] = {
                    methods: new Set(),
                    examples: [],
                    parameters: new Set()
                };
            }
            
            endpoints[path].methods.add(api.method);
            endpoints[path].examples.push(api);
            
            // Extract parameters
            url.searchParams.forEach((value, key) => {
                endpoints[path].parameters.add(`${key}=${value}`);
            });
        });
        
        // Write documentation for each endpoint
        for (const [path, data] of Object.entries(endpoints)) {
            docs += `## ${path}\n\n`;
            docs += `**Methods:** ${Array.from(data.methods).join(', ')}\n\n`;
            
            if (data.parameters.size > 0) {
                docs += `**Parameters:**\n`;
                Array.from(data.parameters).forEach(param => {
                    docs += `- ${param}\n`;
                });
                docs += `\n`;
            }
            
            docs += `**Example Request:**\n\`\`\`json\n`;
            if (data.examples.length > 0) {
                const example = data.examples[0];
                docs += JSON.stringify({
                    method: example.method,
                    url: example.url,
                    headers: example.headers,
                    body: example.postData ? JSON.parse(example.postData) : null
                }, null, 2);
            }
            docs += `\n\`\`\`\n\n`;
        }
        
        await fs.writeFile(path.join(outputPath, 'api_documentation.md'), docs);
    }
}

// Run the tool
const hunter = new ApiHunter();
hunter.start();
