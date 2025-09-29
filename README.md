# HIMYT TryON - Chrome Extension

A modern, AI-powered virtual try-on Chrome extension that allows users to try on clothing items from any website.

## Features

- 🎯 **AI-Powered Virtual Try-On**: Transform your style with advanced AI technology
- 📸 **Easy Photo Upload**: Simple drag-and-drop photo upload interface
- 🛍️ **Website Integration**: Select clothing items directly from any webpage
- 🎨 **Modern UI/UX**: Beautiful, responsive design with smooth animations
- 📱 **Cross-Platform**: Works on all devices and screen sizes
- ♿ **Accessible**: WCAG compliant with keyboard navigation support

## Installation

1. Download or clone this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top right
4. Click "Load unpacked" and select the extension folder
5. The HIMYT TryON extension will appear in your browser toolbar

## Icon Generation

To generate the required PNG icons for the extension:

1. Open `generate-icons.html` in your browser
2. Click "Generate Icons" to create the icon previews
3. Click "Download All Icons" to download the PNG files
4. Replace the SVG references in `manifest.json` with the PNG files if needed

## Development

### File Structure
```
├── manifest.json          # Extension configuration
├── popup.html            # Main popup interface
├── popup.css             # Modern styling and animations
├── popup.js              # Core functionality and CORS handling
├── content.js            # Content script for image extraction
├── icon.svg              # Vector icon (scalable)
├── generate-icons.html   # Icon generator tool
└── README.md             # This file
```

### Key Features
- **CORS Handling**: Multiple fallback strategies for accessing images
- **Modern Design**: CSS custom properties and design tokens
- **Responsive Layout**: Works on all screen sizes
- **Error Handling**: User-friendly error messages and recovery
- **Loading States**: Smooth loading animations and feedback

## Branding

- **Primary Color**: #ef5746 (Coral Red)
- **Secondary Color**: #4c4c4c (Charcoal)
- **Typography**: System fonts with proper hierarchy
- **Icons**: Custom SVG-based design with AI sparkles

## Browser Support

- Chrome 88+
- Edge 88+
- Other Chromium-based browsers

## License

This project is licensed under the MIT License.

## Support

For support or questions, please contact the development team.
