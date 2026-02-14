const puppeteer = require('puppeteer');

(async () => {
    try {
        console.log('--- Verifying Close Poll Feature ---');
        const browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        const page = await browser.newPage();
        await page.setViewport({ width: 1280, height: 800 });

        // 1. Create Poll
        console.log('Creating Poll...');
        await page.goto('http://localhost:5173', { waitUntil: 'networkidle0' });
        await page.type('#question', 'Test Close Poll');
        const inputs = await page.$$('.option-row input');
        await inputs[0].type('A');
        await inputs[1].type('B');
        await Promise.all([
            page.waitForNavigation({ waitUntil: 'networkidle0' }),
            page.click('.primary-button')
        ]);

        // 2. Vote to see results
        console.log('Voting...');
        await page.waitForSelector('.vote-option', { timeout: 5000 });
        const options = await page.$$('.vote-option');
        if (options.length === 0) throw new Error('No options found');

        await options[0].click();

        // Wait for state update and button enable
        await new Promise(r => setTimeout(r, 1000));

        // Ensure button is clickable and NOT disabled
        await page.waitForFunction(
            'document.querySelector(".primary-button") && !document.querySelector(".primary-button").disabled'
        );

        await page.click('.primary-button');

        await page.waitForSelector('.results-container', { timeout: 10000 });

        // 3. Close Poll
        console.log('Closing Poll...');
        // Handle confirm dialog
        page.on('dialog', async dialog => {
            console.log('Dialog content:', dialog.message());
            await dialog.accept();
        });

        await page.waitForSelector('.close-poll-btn', { timeout: 5000 });
        await page.click('.close-poll-btn');

        // 4. Verify Closed State
        console.log('Verifying Closed State...');
        await page.waitForSelector('.status-badge.closed', { timeout: 5000 });
        const statusText = await page.$eval('.status-badge.closed', el => el.textContent);

        if (statusText !== 'Poll Closed') throw new Error('Poll not marked as closed');

        // Verify Close button is gone
        const closeBtn = await page.$('.close-poll-btn');
        if (closeBtn) throw new Error('Close button still visible');

        console.log('--- Close Poll Feature Verified ---');
        await browser.close();
    } catch (error) {
        console.error('Verification Failed:', error);
        process.exit(1);
    }
})();
