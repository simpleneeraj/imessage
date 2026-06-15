import { Jimp } from 'jimp';

async function main() {
  try {
    const image = await Jimp.read('public/logo/badge-72.png');
    
    // Resize to a standard 96x96 badge size
    image.resize({ w: 96, h: 96 });

    // Process pixels: make non-white pixels transparent, and white pixels fully opaque
    const width = image.bitmap.width;
    const height = image.bitmap.height;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const color = image.getPixelColor(x, y);
        // Jimp gets colors as RGBA hex number: 0xRRGGBBAA
        const r = (color >> 24) & 0xff;
        const g = (color >> 16) & 0xff;
        const b = (color >> 8) & 0xff;
        
        // If it's close to white (letter "f" is pure white)
        if (r > 240 && g > 240 && b > 240) {
          // Set to pure white and fully opaque
          image.setPixelColor(0xffffffff, x, y);
        } else {
          // Set to fully transparent black
          image.setPixelColor(0x00000000, x, y);
        }
      }
    }

    // Save as a true transparent PNG
    await image.write('public/logo/badge-72.png');
    console.log("Success! Transparent badge generated at public/logo/badge-72.png");
  } catch (error) {
    console.error("Error generating transparent badge:", error);
  }
}

main();
