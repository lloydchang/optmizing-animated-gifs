import Path from 'node:path';
import Fs from 'fs-extra';
import pMap from 'p-map';
import Sharp from 'sharp';

const DESIRED_MAX_WIDTH = 100;
const DESIRED_MAX_HEIGHT = 100;
const CONCURRENT_IMAGES_TO_PROCESS = 5;

(async () => {
    const sourceDir = Path.resolve('./source-gif2gif');
    const destinationDir = Path.resolve('./destination-gif2gif');

    // Ensure source directory exists
    await Fs.ensureDir(sourceDir);

    // Ensure destination directory exists
    await Fs.ensureDir(destinationDir);

    const files = (await Fs.readdir(sourceDir))
        .filter(
            file => !file.startsWith('.') &&
                ['gif', 'webp'].includes(file.split('.').pop().toLowerCase()) // only process files with .webp or .gif extension
        );

    const converted = await pMap(files, async fileName => {
        const filePath = Path.join(sourceDir, fileName);
        const sharpImage = Sharp(filePath, { animated: true, pages: -1 }); // supports animated gif and webp images

        const imageMeta = await sharpImage.metadata();
        const { width, height: heightAllPages, size, loop, pages, pageHeight, delay } = imageMeta;
        const height = pageHeight || (heightAllPages / pages); // pageHeight usually only exists for gif, not webp

        const resized = sharpImage.resize({
            width: DESIRED_MAX_WIDTH,
            height: DESIRED_MAX_HEIGHT * pages,
            fit: Sharp.fit.inside
        });
        const destinationPath = Path.join(destinationDir, fileName);
        return resized.toFile(destinationPath);
    }, { concurrency: CONCURRENT_IMAGES_TO_PROCESS, stopOnError: false });

    console.log(converted);
})();
