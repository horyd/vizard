const VizardInstance = require('./vizard');

// Intentionally runs immediately rather than waiting for DOM because the tests do `describe()` straight away
(function () {
    const vizardInstance = new VizardInstance();

    // describe('BA01BtnPr', function () {...});
    window.describe = function (suiteName, testCreator, suiteOptions) {
        vizardInstance.registerSuite({suiteName, testCreator, suiteOptions});
    };

    window.it = function (testName, testRunner, testOptions) {
        vizardInstance.registerTestCase({testName, testRunner, testOptions});
    };

    window._registerTests = () => vizardInstance.registerAllTests();
    window._runTests = (props) => vizardInstance.runTests(props);
    window._getSuites = () => vizardInstance.registeredSuites;
    window._getTests = () => vizardInstance.registeredTests;
    window._reset = () => vizardInstance.reset;
})();
