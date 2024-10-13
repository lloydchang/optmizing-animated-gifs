import Path from 'node:path';
import Fs from 'fs-extra';
import pMap from 'p-map';
import Sharp from 'sharp';

const DESIRED_MAX_WIDTH = 100;
const DESIRED_MAX_HEIGHT = 100;
const CONCURRENT_IMAGES_TO_PROCESS = 5;

(async () => {
    const sourceDir = Path.resolve('./source');
    const destinationDir = Path.resolve('./destination');

    // Ensure both source and destination directories exist
    await Fs.ensureDir(sourceDir);
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
        const { paletteBitDepth, loop, delay } = imageMeta;
        const colors = paletteBitDepth > 0
            ? Math.pow(2, paletteBitDepth)
            : 256; // default

        const options = {
            webp: {
                loop,
                delay,
                quality: 60, // 0-100
                lossless: false,
                nearLossless: false,
                smartSubsample: false,
                effort: 4, // 0-6, effort 6 takes a very long time just to save a little bit of space
                force: true
            },
            gif: {
                loop,
                delay,
                colors,
                effort: 7, // 0-10
                force: true
            }
        };

        // Convert the image and get the result
        const result = await sharpImage
            .webp(options.webp) // Convert to WebP
            .toBuffer({ resolveWithObject: true });

        console.log(result); // Log the result for debugging

        // Destination path for the converted file
        const destinationPath = Path.join(destinationDir, fileName);
        await Fs.writeFile(destinationPath, result.data); // Save the converted file
    }, { concurrency: CONCURRENT_IMAGES_TO_PROCESS, stopOnError: false });

    console.log('Conversion complete:', converted);
})();
