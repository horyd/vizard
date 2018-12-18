const chunk = require('lodash/chunk');
const times = require('lodash/times');
const getScreenshotPath = require('./screenshot-path');
const logger = require('./logger');
const runPromisesSequentially = require('./run-promises-sequentially');

// Refresh the pages at most every 20 tests to avoid puppeteer hanging
const PAGE_REFRESH_FREQUENCY = 20;
const SLOW_TEST_WARNING_TIME_MS = 7 * 1000 * PAGE_REFRESH_FREQUENCY;
const NUM_TEST_RETRIES = 3;

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

            // We reload the page every few tests (defined by PAGE_REFRESH_FREQUENCY), because sometimes Puppeteer hangs, and reloading mitigates that
            const chunkedTests = chunk(testsForWindow, PAGE_REFRESH_FREQUENCY);

            const resetPage = () => page.reload().then(() => page.evaluate(() => window._registerTests()));

            const createTestSetRunner = (tests) => async () => {
                // Try running the tests 3 times (restarting if they timeout)
                const tryRunningTest = () => new Promise((resolve, reject) => {
                    // If the test takes too long, reject the promise and try again
                    const hungNodeProcessWarning = setTimeout(() => {
                        logger.warn(`Thread ${threadNumber} at viewport ${viewportWidth}x${viewportHeight} has been running for more than ${Math.floor(SLOW_TEST_WARNING_TIME_MS / 1000)}s. Retrying.`);
                        resetPage().finally(reject);
                    }, SLOW_TEST_WARNING_TIME_MS);

                    const runTestsOnWindow = (tests) => window._runTests({tests});

                    page.evaluate(runTestsOnWindow, tests)
                        .then(() => {
                            clearTimeout(hungNodeProcessWarning);
                            resolve();
                        })
                        .catch(reject);
                });

                let testRunningPromise = tryRunningTest();

                for (let retryCount = 0; retryCount < NUM_TEST_RETRIES; retryCount++) {
                    testRunningPromise = testRunningPromise.catch(tryRunningTest);
                }

                await testRunningPromise
                    .catch(() => {
                        logger.error(`Tried running screenshot test ${NUM_TEST_RETRIES} times with no success`, tests);
                        throw new Error(`Screenshot set failed ${NUM_TEST_RETRIES} times`);
                    });
            };

            await runPromisesSequentially(chunkedTests.map(createTestSetRunner));
        }));
    }));

    logger.info('Screenshots complete');
};
