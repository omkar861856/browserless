import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';

function formatToNetscapeCookie(cookies) {
    let out = `# Netscape HTTP Cookie File\n# http://curl.haxx.se/rfc/cookie_spec.html\n# This is a generated file!  Do not edit.\n\n`;
    for (const cookie of cookies) {
        const domain = cookie.domain;
        const includeSubDomains = domain.startsWith('.') ? 'TRUE' : 'FALSE';
        const cookiePath = cookie.path;
        const secure = cookie.secure ? 'TRUE' : 'FALSE';
        const expires = cookie.expires === -1 ? 0 : Math.floor(cookie.expires);
        const name = cookie.name;
        const value = cookie.value;
        out += `${domain}\t${includeSubDomains}\t${cookiePath}\t${secure}\t${expires}\t${name}\t${value}\n`;
    }
    return out;
}

async function extractCookies() {
    const volumePath = '/downloads/.metube';
    const cookieFilePath = path.join(volumePath, 'cookies.txt');
    
    console.log(`[${new Date().toISOString()}] Starting YouTube Cookie Extractor...`);
    
    if (!fs.existsSync(volumePath)) {
        try {
            fs.mkdirSync(volumePath, { recursive: true });
        } catch (e) {
            console.error(`Failed to create directory ${volumePath}:`, e);
        }
    }

    let browser;
    try {
        const browserWSEndpoint = process.env.BROWSERLESS_URL || 'ws://localhost:3000';
        const userDataDir = '/workspace/youtube-profile'; 
        
        // Connect via browserless websocket, asking for the persistent profile
        // so that the manual login is retained.
        const endpointWithArgs = `${browserWSEndpoint}?--user-data-dir=${userDataDir}&stealth=true`;
        
        console.log(`Connecting to browserless at ${endpointWithArgs}`);
        browser = await puppeteer.connect({ browserWSEndpoint: endpointWithArgs });
        
        const page = await browser.newPage();
        console.log("Navigating to YouTube...");
        await page.goto('https://www.youtube.com', { waitUntil: 'networkidle2' });
        
        const cookies = await page.cookies();
        
        if (cookies.length > 0) {
            const netscapeFormat = formatToNetscapeCookie(cookies);
            fs.writeFileSync(cookieFilePath, netscapeFormat, 'utf8');
            console.log(`[${new Date().toISOString()}] Successfully wrote ${cookies.length} cookies to ${cookieFilePath}`);
            
            // Check if user is actually logged in (by checking for specific cookies like SID or SAPISID)
            const isLoggedIn = cookies.some(c => c.name === 'SID' || c.name === 'SAPISID');
            if (!isLoggedIn) {
                console.warn(`[${new Date().toISOString()}] WARNING: Got cookies, but login cookies (SID) missing. You may need to manual login!`);
            } else {
                console.log(`[${new Date().toISOString()}] Confirmed logged-in session cookies extracted.`);
            }

        } else {
            console.warn(`[${new Date().toISOString()}] No cookies found! Please perform manual login.`);
        }
        
    } catch (err) {
        console.error(`[${new Date().toISOString()}] Error extracting cookies:`, err);
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}

// Run immediately, then every 1 hour
extractCookies();
setInterval(extractCookies, 60 * 60 * 1000);
