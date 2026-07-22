#!/bin/bash
mkdir -p src/assets/fonts

declare -A fonts
fonts["PlusJakartaSans[wght].ttf"]="https://raw.githubusercontent.com/google/fonts/main/ofl/plusjakartasans/PlusJakartaSans%5Bwght%5D.ttf"
fonts["PlusJakartaSans-Italic[wght].ttf"]="https://raw.githubusercontent.com/google/fonts/main/ofl/plusjakartasans/PlusJakartaSans-Italic%5Bwght%5D.ttf"
fonts["PlayfairDisplay[wght].ttf"]="https://raw.githubusercontent.com/google/fonts/main/ofl/playfairdisplay/PlayfairDisplay%5Bwght%5D.ttf"
fonts["PlayfairDisplay-Italic[wght].ttf"]="https://raw.githubusercontent.com/google/fonts/main/ofl/playfairdisplay/PlayfairDisplay-Italic%5Bwght%5D.ttf"
fonts["Montserrat[wght].ttf"]="https://raw.githubusercontent.com/google/fonts/main/ofl/montserrat/Montserrat%5Bwght%5D.ttf"
fonts["Montserrat-Italic[wght].ttf"]="https://raw.githubusercontent.com/google/fonts/main/ofl/montserrat/Montserrat-Italic%5Bwght%5D.ttf"
fonts["Syne[wght].ttf"]="https://raw.githubusercontent.com/google/fonts/main/ofl/syne/Syne%5Bwght%5D.ttf"
fonts["Cinzel[wght].ttf"]="https://raw.githubusercontent.com/google/fonts/main/ofl/cinzel/Cinzel%5Bwght%5D.ttf"
fonts["Outfit[wght].ttf"]="https://raw.githubusercontent.com/google/fonts/main/ofl/outfit/Outfit%5Bwght%5D.ttf"
fonts["SpaceGrotesk[wght].ttf"]="https://raw.githubusercontent.com/google/fonts/main/ofl/spacegrotesk/SpaceGrotesk%5Bwght%5D.ttf"

echo "Downloading professional typography variable fonts..."
for name in "${!fonts[@]}"; do
  url="${fonts[$name]}"
  echo "Downloading $name..."
  curl -s -L -o "src/assets/fonts/$name" "$url"
done
echo "Downloads completed!"
