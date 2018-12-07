const times = require('lodash/times');
const getScreenshotPath = require('./screenshot-path');
const logger = require('./logger');
const runPromisesSequentially = require('./run-promises-sequentially');

module.exports = async function takeScreenshots({
    config,
    testsByViewport,
    isTest,
    pages,
}) {
    logger.info('Taking screenshots');

    const {
        concurrentLimit,
    } = config;

    await Promise.all(times(concurrentLimit, async (threadNumber) => {
        const page = pages[threadNumber];

        // logger.debug('All testsByViewport', testsByViewport);

        const testsByViewportForThisThread = testsByViewport.map(({tests, ...rest}) => ({
            ...rest,
            tests: tests.filter(({testNumber}) => testNumber % concurrentLimit === threadNumber),
        }), []);

        // logger.debug(`Page ${threadNumber} running testsByViewportForThisThread`, testsByViewportForThisThread);

        await runPromisesSequentially(testsByViewportForThisThread.map(({tests, viewportWidth, viewportHeight}) => async () => {
            if (!tests.length) {
                // This thread mustn't have any business running here
                return;
            }

            logger.info(`Thread ${threadNumber} running ${tests.length} tests at viewport ${viewportWidth}x${viewportHeight}`);

            // set viewport on page
            await page.setViewport({
                width: viewportWidth,
                height: viewportHeight,
            });

            const testsForWindow = tests.map(({testName, suiteName, ...rest}) => ({
                testName,
                suiteName,
                ...rest,
                screenshotOutputPath: getScreenshotPath({
                    config,
                    isTest,
                    suiteName,
                    testName,
                    viewportWidth,
                    viewportHeight,
                }),
            }));

            const runTestsOnWindow = (tests) => window._runTests({tests});

            await page.evaluate(runTestsOnWindow, testsForWindow);
        }));
    }));

    logger.info('Screenshots complete');
};
