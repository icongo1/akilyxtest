const path = require('path');
const fs = require('fs-extra');
const { generateVideo } = require('../generator/generateVideo');

(async () => {
  try {
    const script = `He finds a shiny coin on the sidewalk.\nShe dares him to flip it: heads, take the leap; tails, stay.\nHe closes his eyes, tosses the coin, and fate decides.\nThe coin spins, lands... and he chooses to leap.`;
    console.log('Generating demo video (Coin Toss)... This may take a few seconds.');

    const result = await generateVideo({ title: 'Coin_Toss_Demo', script });

    const absolutePath = path.resolve(result.output);
    console.log('Video generated at:', absolutePath);

    // If a server is serving public/videos on localhost:3000, provide the URL
    console.log('If your server is running, open the video at: http://localhost:3000' + result.url);
    console.log('Demo complete.');
  } catch (err) {
    console.error('Video generation failed:', err);
    process.exit(1);
  }
})();