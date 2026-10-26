# Swipe / Score

An iPad-friendly sheet music PDF reader, with page turning, zoom, Apple Pencil drawing, local annotation persistence and annotated PDF export.

## Install on GitHub Pages

1. Copy `index.html`, `style.css`, `manifest.webmanifest`, and the entire `js/` folder into the **root** of your existing `redhead20/Swipe` repository.
2. **Keep the existing `apple-touch-icon.png` in the repository root.** This package intentionally does not replace your original icon.
3. In GitHub Settings → Pages, deploy the `main` branch from `/ (root)`.
4. Visit `https://redhead20.github.io/Swipe/` over HTTPS.
5. On iPad, open in Safari → Share → Add to Home Screen. Chrome installation support on iPad varies.

## Using it

- Choose PDF to open local sheet music. The last-read page is remembered for each file.
- Tap left/right edges to turn pages. Bluetooth arrow/PageUp/PageDown/space keys work too.
- Zoom with +/−, or Fit to return to a full-page view. Scroll to pan while zoomed.
- Tap **Draw** to write in red with Apple Pencil or finger. Tap **Drawing** again to leave ink mode.
- Undo or Clear applies to the current page. Notes are stored locally in the current browser.
- **Save PDF** downloads a separate annotated PDF. Your original file is not modified.
- **Close** returns to the welcome screen.

## Important notes

- PDF.js and pdf-lib are loaded from public CDNs, so a network connection is needed when the app initially loads. This is **not an offline PWA** and has no service worker.
- Browser storage is device/browser-specific and can be cleared. Export annotated PDFs for a durable backup.
- Drawing uses browser Pointer Events (Apple Pencil is supported by iPadOS browsers). Pencil-only rejection of finger input is not enabled.
- Export flattens ink onto PDF pages. PDFs with unusual rotations or crop boxes should be tested before relying on the export.
- The manifest references the existing 180×180 icon. Some Chromium installers prefer additional 192×192 and 512×512 PNG icons; the iPad Home Screen uses the apple-touch-icon link.

## v4 Library
The Save PDF action is now on each PDF thumbnail card on the home screen. Imported PDFs and thumbnail previews are stored locally in IndexedDB, and handwriting is saved in localStorage. Close the PDF to return to the library and export an annotated copy. Removing a library item does not delete previously exported files. Existing PDFs from older versions must be reimported once to appear as thumbnails, because previous versions did not store the original PDF bytes.
