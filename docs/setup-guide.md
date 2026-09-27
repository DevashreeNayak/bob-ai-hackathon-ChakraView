# 🛠️ System Deployment & Local Setup Guide

Follow these step-by-step instructions to provision, configure, and execute the ChakraView interface on a clean machine.

## 📋 System Prerequisites
Before initializing the workspace setup, ensure your terminal contains the following dependencies:
* **Node.js**: Version 18.0 or higher.
* **Package Manager**: `npm` (comes bundled with Node.js).

## 📦 Installation Steps

1. **Clone and Enter the Workspace**
   ```bash
   git clone https://github.com
   cd bob-ai-hackathon-ChakraView
   ```

2. **Install Core Dependencies**
   Build out the frontend package registry by executing:
   ```bash
   npm install
   ```

3. **Configure Environment Variables**
   Create a local configuration profile at the root of the project:
   ```bash
   cp src/.env.example src/.env
   ```
   Open `src/.env` and paste your active database URL credentials.

4. **Launch the Local Development Workspace**
   ```bash
   npm run dev
   ```
   The engine will boot up a local web server (typically at `http://localhost:5173`). Open this port in your web browser to access the dynamic triage panel.
