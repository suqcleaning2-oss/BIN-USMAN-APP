import fs from 'fs';
import path from 'path';
import https from 'https';

const FONTS_DIR = path.join(process.cwd(), 'src', 'assets', 'fonts');
const DATA_DIR = path.join(process.cwd(), 'src', 'assets', 'data');

// Create directories if they do not exist
if (!fs.existsSync(FONTS_DIR)) {
  fs.mkdirSync(FONTS_DIR, { recursive: true });
}
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const resources = [
  // Plus Jakarta Sans
  {
    url: 'https://raw.githubusercontent.com/google/fonts/main/ofl/plusjakartasans/static/PlusJakartaSans-Regular.ttf',
    dest: path.join(FONTS_DIR, 'PlusJakartaSans-Regular.ttf')
  },
  {
    url: 'https://raw.githubusercontent.com/google/fonts/main/ofl/plusjakartasans/static/PlusJakartaSans-Medium.ttf',
    dest: path.join(FONTS_DIR, 'PlusJakartaSans-Medium.ttf')
  },
  {
    url: 'https://raw.githubusercontent.com/google/fonts/main/ofl/plusjakartasans/static/PlusJakartaSans-SemiBold.ttf',
    dest: path.join(FONTS_DIR, 'PlusJakartaSans-SemiBold.ttf')
  },
  {
    url: 'https://raw.githubusercontent.com/google/fonts/main/ofl/plusjakartasans/static/PlusJakartaSans-Bold.ttf',
    dest: path.join(FONTS_DIR, 'PlusJakartaSans-Bold.ttf')
  },
  {
    url: 'https://raw.githubusercontent.com/google/fonts/main/ofl/plusjakartasans/static/PlusJakartaSans-ExtraBold.ttf',
    dest: path.join(FONTS_DIR, 'PlusJakartaSans-ExtraBold.ttf')
  },
  {
    url: 'https://raw.githubusercontent.com/google/fonts/main/ofl/plusjakartasans/static/PlusJakartaSans-Italic.ttf',
    dest: path.join(FONTS_DIR, 'PlusJakartaSans-Italic.ttf')
  },

  // Playfair Display
  {
    url: 'https://raw.githubusercontent.com/google/fonts/main/ofl/playfairdisplay/static/PlayfairDisplay-Regular.ttf',
    dest: path.join(FONTS_DIR, 'PlayfairDisplay-Regular.ttf')
  },
  {
    url: 'https://raw.githubusercontent.com/google/fonts/main/ofl/playfairdisplay/static/PlayfairDisplay-Medium.ttf',
    dest: path.join(FONTS_DIR, 'PlayfairDisplay-Medium.ttf')
  },
  {
    url: 'https://raw.githubusercontent.com/google/fonts/main/ofl/playfairdisplay/static/PlayfairDisplay-SemiBold.ttf',
    dest: path.join(FONTS_DIR, 'PlayfairDisplay-SemiBold.ttf')
  },
  {
    url: 'https://raw.githubusercontent.com/google/fonts/main/ofl/playfairdisplay/static/PlayfairDisplay-Bold.ttf',
    dest: path.join(FONTS_DIR, 'PlayfairDisplay-Bold.ttf')
  },
  {
    url: 'https://raw.githubusercontent.com/google/fonts/main/ofl/playfairdisplay/static/PlayfairDisplay-ExtraBold.ttf',
    dest: path.join(FONTS_DIR, 'PlayfairDisplay-ExtraBold.ttf')
  },
  {
    url: 'https://raw.githubusercontent.com/google/fonts/main/ofl/playfairdisplay/static/PlayfairDisplay-Italic.ttf',
    dest: path.join(FONTS_DIR, 'PlayfairDisplay-Italic.ttf')
  },

  // Montserrat
  {
    url: 'https://raw.githubusercontent.com/google/fonts/main/ofl/montserrat/static/Montserrat-Regular.ttf',
    dest: path.join(FONTS_DIR, 'Montserrat-Regular.ttf')
  },
  {
    url: 'https://raw.githubusercontent.com/google/fonts/main/ofl/montserrat/static/Montserrat-Medium.ttf',
    dest: path.join(FONTS_DIR, 'Montserrat-Medium.ttf')
  },
  {
    url: 'https://raw.githubusercontent.com/google/fonts/main/ofl/montserrat/static/Montserrat-SemiBold.ttf',
    dest: path.join(FONTS_DIR, 'Montserrat-SemiBold.ttf')
  },
  {
    url: 'https://raw.githubusercontent.com/google/fonts/main/ofl/montserrat/static/Montserrat-Bold.ttf',
    dest: path.join(FONTS_DIR, 'Montserrat-Bold.ttf')
  },
  {
    url: 'https://raw.githubusercontent.com/google/fonts/main/ofl/montserrat/static/Montserrat-ExtraBold.ttf',
    dest: path.join(FONTS_DIR, 'Montserrat-ExtraBold.ttf')
  },
  {
    url: 'https://raw.githubusercontent.com/google/fonts/main/ofl/montserrat/static/Montserrat-Italic.ttf',
    dest: path.join(FONTS_DIR, 'Montserrat-Italic.ttf')
  },

  // Syne
  {
    url: 'https://raw.githubusercontent.com/google/fonts/main/ofl/syne/static/Syne-Regular.ttf',
    dest: path.join(FONTS_DIR, 'Syne-Regular.ttf')
  },
  {
    url: 'https://raw.githubusercontent.com/google/fonts/main/ofl/syne/static/Syne-Bold.ttf',
    dest: path.join(FONTS_DIR, 'Syne-Bold.ttf')
  },
  {
    url: 'https://raw.githubusercontent.com/google/fonts/main/ofl/syne/static/Syne-ExtraBold.ttf',
    dest: path.join(FONTS_DIR, 'Syne-ExtraBold.ttf')
  },

  // Cinzel
  {
    url: 'https://raw.githubusercontent.com/google/fonts/main/ofl/cinzel/static/Cinzel-Regular.ttf',
    dest: path.join(FONTS_DIR, 'Cinzel-Regular.ttf')
  },
  {
    url: 'https://raw.githubusercontent.com/google/fonts/main/ofl/cinzel/static/Cinzel-Medium.ttf',
    dest: path.join(FONTS_DIR, 'Cinzel-Medium.ttf')
  },
  {
    url: 'https://raw.githubusercontent.com/google/fonts/main/ofl/cinzel/static/Cinzel-SemiBold.ttf',
    dest: path.join(FONTS_DIR, 'Cinzel-SemiBold.ttf')
  },
  {
    url: 'https://raw.githubusercontent.com/google/fonts/main/ofl/cinzel/static/Cinzel-Bold.ttf',
    dest: path.join(FONTS_DIR, 'Cinzel-Bold.ttf')
  },

  // Outfit
  {
    url: 'https://raw.githubusercontent.com/google/fonts/main/ofl/outfit/static/Outfit-Light.ttf',
    dest: path.join(FONTS_DIR, 'Outfit-Light.ttf')
  },
  {
    url: 'https://raw.githubusercontent.com/google/fonts/main/ofl/outfit/static/Outfit-Regular.ttf',
    dest: path.join(FONTS_DIR, 'Outfit-Regular.ttf')
  },
  {
    url: 'https://raw.githubusercontent.com/google/fonts/main/ofl/outfit/static/Outfit-Medium.ttf',
    dest: path.join(FONTS_DIR, 'Outfit-Medium.ttf')
  },
  {
    url: 'https://raw.githubusercontent.com/google/fonts/main/ofl/outfit/static/Outfit-SemiBold.ttf',
    dest: path.join(FONTS_DIR, 'Outfit-SemiBold.ttf')
  },
  {
    url: 'https://raw.githubusercontent.com/google/fonts/main/ofl/outfit/static/Outfit-Bold.ttf',
    dest: path.join(FONTS_DIR, 'Outfit-Bold.ttf')
  },

  // Offline Geolocation Database
  {
    url: 'https://raw.githubusercontent.com/lutangar/cities.json/master/cities.json',
    dest: path.join(DATA_DIR, 'cities.json')
  }
];

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    
    https.get(url, (response) => {
      if (response.statusCode === 302 || response.statusCode === 301) {
        // Handle redirect
        downloadFile(response.headers.location, dest).then(resolve).catch(reject);
        return;
      }
      
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to get '${url}' (${response.statusCode})`));
        return;
      }

      response.pipe(file);

      file.on('finish', () => {
        file.close();
        console.log(`Successfully downloaded: ${path.basename(dest)}`);
        resolve();
      });
    }).on('error', (err) => {
      fs.unlink(dest, () => {}); // Delete the file on error
      reject(err);
    });
  });
}

async function run() {
  console.log('Starting download of professional offline resources & typography assets...');
  
  for (const resource of resources) {
    if (fs.existsSync(resource.dest)) {
      console.log(`File already exists, skipping: ${path.basename(resource.dest)}`);
      continue;
    }
    try {
      await downloadFile(resource.url, resource.dest);
    } catch (err) {
      console.error(`Error downloading ${resource.url}:`, err.message);
    }
  }
  
  console.log('All resources completed!');
}

run();
