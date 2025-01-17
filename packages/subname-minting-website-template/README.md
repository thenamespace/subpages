
# Subname Minting Website Template

White-label template for quickly and easily creating subname minting websites.

## Features

-  **Quick Setup**: Get started with a fully functional subname minting website in minutes.
-  **Customizable Design**: Easily change the basic design without technical knowledge.
-  **Wallet Integration**: Seamless wallet connection using RainbowKit.
-  **Responsive Design**: Fully responsive design that works on all devices.

## Customizable Design

The design of the website can be customized using the `theme.json` file. This file contains the basic design variables such as colors and background images. You can change these values to match your branding without any technical knowledge.

### Example `theme.json`

```json
{
"main": "#0a2943",
"accent": "#309ae0",
"light": "#ffffff",
"dark": "#000000",
"error": "#d80000",
"backgroundImage": "<image-url>"
}
```

## How to Customize

1. Open the theme.json file.
2. Change the values of the design variables to match your branding.
3. Save the file and the changes will be reflected in the website.

## Running the Project

### Prerequisites

- **Node.js**
- **npm**

### Installation

1. Clone the repository
2. Install the dependencies:
```bash
npm install
```

### Development

To run the project in development mode with hot module replacement:
```bash
npm run dev
```
This will start the development server and watch for changes in the theme.json file.

### Build

To build the project for production:
```bash
npm run build
```
This will create a dist directory with the production build of the project.

### Preview

To preview the production build:
```bash
npm run preview
```
This will start a local server to preview the production build.

### Lint

To lint the project:
```bash
npm run lint
```
This will run ESLint on the project to check for code quality issues.

## Contributing

Contributions are welcome! Please open an issue or submit a pull request if you have any improvements or bug fixes.