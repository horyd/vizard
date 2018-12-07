const path = require('path');
const {execSync} = require('child_process');
const puppeteer = require('puppeteer-core');
const serve = require('serve');
const portfinder = require('portfinder');
const times = require('lodash/times');
const takeScreenshot = require('./take-screenshot');
const logger = require('./logger');

const IGNORE_LOG_MESSAGES = [
    'Download the React DevTools for a better development experience',
];

const PAGE_ARTIFICIAL_WAIT_MS = 4500;

module.exports = async function setupPuppeteer(config) {
    const {
        chromeExecutablePath,
        concurrentLimit,
        testRunnerHtml,
    } = config;

    logger.info(`Attempting to set up Puppeteer with ${concurrentLimit} pages...`);

    const port = await portfinder.getPortPromise({port: 9009});

    logger.info(`Setting up server on port ${port}`);

    // If the user supplied a testRunnerHtml via config, run in their cwd
    const server = await serve(testRunnerHtml ? process.cwd() : path.join(__dirname, '..', '..'), {port, silent: true});

    const puppeteerOptions = {
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
        executablePath: chromeExecutablePath || execSync('which google-chrome-beta')
            .toString()
            .replace('\n', ''),
    };

    const browsers = await Promise.all(times(Math.max(1, concurrentLimit), () => puppeteer.launch(puppeteerOptions)));
    const pages = await Promise.all(browsers.map((browser) => browser.newPage()));

    pages.forEach((page) => {
        page.on('console', (msg) => {
            const messageText = msg.text();
            const messageContainsAnyIgnoreString = IGNORE_LOG_MESSAGES
                .some((ignoreMessageContaining) => messageText.includes(ignoreMessageContaining));

            if (!messageContainsAnyIgnoreString) {
                logger.debug(` > ${messageText}`);
            }
        });
    });

    // For each of our pages, expose relevant functions to the page and then send them to the runner.html
    await Promise.all(pages.map((page) => (
        // Expose all functions to the page in parallel
        Promise.all([
            page.exposeFunction('takeScreenshot', async ({
                targetRect,
                screenshotOutputPath,
            }) => {
                const {x, y, width, height} = targetRect;
                const clip = {
                    x: Math.max(0, x),
                    y: Math.max(0, y),
                    width: Math.min(page.viewport().width, width),
                    height: Math.min(page.viewport().height, height),
                };

                await takeScreenshot({
                    screenshotOutputPath,
                    clip,
                    page,
                });
            }),

            page.exposeFunction('resetMouse', async () => {
                await page.mouse.move(0, 0);
            }),
            page.exposeFunction('puppeteerHover', async (selector) => {
                await page.hover(selector);
            }),
            page.exposeFunction('puppeteerClick', async (selector) => {
                await page.click(selector);
            }),
        ])
            // Artificial wait for the page to be ready
            .then(() => new Promise((resolve) => setTimeout(resolve, PAGE_ARTIFICIAL_WAIT_MS)))
            .then(() => page.goto(`http://localhost:${port}/${testRunnerHtml || 'bin/runner.html'}`))
            .then(() => page.waitForFunction(() => !!window._registerTests))
    )));

    logger.info('Puppeteer setup complete');

    return {pages, browsers, server};
};
