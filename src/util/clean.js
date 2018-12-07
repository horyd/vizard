const path = require('path');
const fsExtra = require('fs-extra');

module.exports = async function clean({
    config,
    clearGolden = false,
}) {
    const {
        tmpDir,
        outputPath,
    } = config;

    await fsExtra.emptyDir(tmpDir);

    await fsExtra.emptyDir(path.join(outputPath, 'tested'));
    await fsExtra.emptyDir(path.join(outputPath, 'diff'));

    if (clearGolden) {
        await fsExtra.emptyDir(path.join(outputPath, 'golden'));
    }
};
