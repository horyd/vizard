# 🦎 Vizard 🦎
A visual regression testing framework

## About
Vizard generates and compares screenshots of your application using Puppeteer.
This is handy for automatically detecting visual regressions in your component libraries.

## Example
A common usage is as follows:

### Writing a test case
You have a file called `my-button.viz.js` :
```jsx harmony
describe('MyButton', function () {
    it('disabled', async function (target) {
        // Asynchronously render the component inside the target dom element
        await new Promise((resolve) => ReactDOM.render(<MyButton disabled={true}/>, target, resolve));

        // Return an element for Vizard to screenshot
        return target.firstChild;
    });
});
```

As a third parameter, both `describe` and `it` can also take a third parameter of options to specify viewport sizes at which the screenshots should be taken:
```jsx harmony
const options = {
    viewportWidths: [320, 768, 1024],
    viewportHeights: [500, 2000],
};

describe('MyButton', function () {
    // Stuff
}, options);
```

Entries in an `options` object provided to an `it` function will override any the option passed to the `describe` funciton, if any. 

### Making golden screenshots
Here we define a "source of truth" against which future tests will be compared.
Note that your test files are automatically discovered and compiled based on your configuration options (see Configuration below).

```bash
vizard make-goldens
```

### Running the tests
Here we test what the app is generating today against our known "source of truth"
Note that your test files are automatically discovered and compiled based on your configuration options (see Configuration below).

```bash
vizard test
```

## CLI usage
```
    vizard help         - Show this message
    vizard compile      - Compile the local test cases
    vizard make-golden  - Make golden screenshots from each of the test cases
             --missing                  - Only take golden screenshots that don't yet exist
             --suite SUITE-1 SUITE-2    - Run specific suites
             --skip-compile             - Don't compile the tests 
    vizard test         - Make golden screenshots and test them against the golden screenshots
```

## Configuration
You can configure vizard by writing a `.vizardrc` or a `vizard.json` file in your project's root.
Valid configuration options are as follows:

* `chromeExecutablePath`: Optional path to your Chrome executable, defaults to the output of `which google-chrome-beta`.
* `concurrentLimit`: Optional number of puppeteer browsers to run in parallel. Defaults to 1.
* `defaultViewportWidth`: Optional default viewport width in pixels, defaults to `1024`.
* `defaultViewportHeight`: Optional default viewport height in pixels, defaults to `1080`.
* `outputPath`: Output path for all screenshots made by Vizard, defaults to `tmp`.
* `testReportOutputDir`: Optional path for test reports generated by Vizard, defaults to `tmp/report`.
* `testFilePath`: Optional path to search for test files, defaults to current working directory.
* `testFilePattern`: Optional file extension for test files, defaults to `.viz.js`
* `testRunnerHtml`: Optional custom HTML page in which tests should be executed.
* `tmpDir`: Optional custom directory to store temporary files made by Vizard.
* `pixelMatchOptions`: Options for pixelMatch (the tool used to compare the images)
    * `threshold`: (default: `0`) Matching threshold, ranges from `0` to `1`. Smaller values make the comparison more sensitive. 
    * `includeAA`: (default: `false`)  If `true`, disables detecting and ignoring anti-aliased pixels. 
 

## Docker
The `Dockerfile` contained in this repository is published as `foxsportsauweb/vizard`.
Running your visual regression tests inside a consistent container is a good way to avoid false-negatives on screenshot comparisons.

## TODO
* Automated tests
* Improve documentation
* Example repository
* Implement extended framework features (`beforeEach`, `afterAll` et al)
