#!/bin/nash
#
#

cargo tauri icon ./src-tauri/icons/icon.png

# mkdir -p icon.iconset
# rm -rf icon.iconset/*.png
# magick ./src-tauri/icons/icon.png -define png:color-type=6 -resize 16x16 icon.iconset/icon_16x16.png
# magick ./src-tauri/icons/icon.png -define png:color-type=6 -resize 32x32 icon.iconset/icon_16x16@2x.png
# magick ./src-tauri/icons/icon.png -define png:color-type=6 -resize 32x32 icon.iconset/icon_32x32.png
# magick ./src-tauri/icons/icon.png -define png:color-type=6 -resize 64x64 icon.iconset/icon_32x32@2x.png
# magick ./src-tauri/icons/icon.png -define png:color-type=6 -resize 128x128 icon.iconset/icon_128x128.png
# magick ./src-tauri/icons/icon.png -define png:color-type=6 -resize 256x256 icon.iconset/icon_128x128@2x.png
# magick ./src-tauri/icons/icon.png -define png:color-type=6 -resize 256x256 icon.iconset/icon_256x256.png
# magick ./src-tauri/icons/icon.png -define png:color-type=6 -resize 512x512 icon.iconset/icon_256x256@2x.png
# magick ./src-tauri/icons/icon.png -define png:color-type=6 -resize 512x512 icon.iconset/icon_512x512.png
# magick ./src-tauri/icons/icon.png -define png:color-type=6 -resize 1024x1024 icon.iconset/icon_512x512@2x.png

# iconutil -c icns icon.iconset
# cp -r icon.iconset/*.png ./src-tauri/icons/
# mv icon.icns ./src-tauri/icons/
