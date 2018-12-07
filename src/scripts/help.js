const packageJson = require('../../package.json');

module.exports = function printHelp() {
    console.log(`
${packageJson.name} version ${packageJson.version}
    
Usage:
    ${packageJson.name} help         - Show this message
    ${packageJson.name} interact     - Open an interactive web page to explore rendered viz test cases
    ${packageJson.name} make-golden [--missing] [--suite SUITE-1 SUITE-2 SUITE-3] - Make golden screenshots from each of the test cases
    ${packageJson.name} test         - Make golden screenshots and test them against the golden screenshots
`);
};
