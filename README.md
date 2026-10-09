# 🏥 Hospital Monitoring System

A portable, production-ready Node-RED environment designed to monitor hospital infrastructure hardware layouts and manage live public facing data dashboards.

---

## 🚀 Quick Start Deployment Guide

Follow these exact steps to set up and run the system locally on your machine.

### 📋 Prerequisites (Automatic Version Check)
This project requires **Node.js** (LTS version recommended). 

To check if you already have it installed, open your terminal (Command Prompt, PowerShell, or bash) and run:
```bash
node -v
```
*   **If a version number appears:** You are ready to go! Proceed to the installation steps below.
*   **If the command is not recognized:** You need to download Node.js first.
    *   👉 **Download link:** [Click here to download Node.js LTS](https://nodejs.org)
    *   *Note: Restart your terminal window after installing Node.js to apply the changes.*

---

## 🛠️ Setup & Installation Steps

### 1. Initialize the Environment & Install Dependencies
Navigate into the project's root folder (`hackforge`) where this `README.md` file is located, and run the following command to install Node-RED and all structural nodes listed inside the workspace tracking tree:

```bash
npm install
```

### 2. Add Node-RED to the Directory (If starting fresh)
If you are modifying this workspace or setting up an isolated directory configuration, ensure Node-RED is saved to your package tree with:
```bash
npm install node-red --save-dev
```

### 3. Launch the Monitor System via NPX
To run the Node-RED workspace using the custom dynamic layouts, ports, and relative web source servers configured in your project, execute Node-RED through `npx` while explicitly pointing to our localized `settings.js` blueprint:

```bash
npx node-red --settings system/settings.js
```

---

## 🖥️ Accessing the Dashboards

Once the terminal logs output `[info] Server now running`, open your web browser and navigate to the following local addresses:

*   **Node-RED Visual Flow Editor:** `http://localhost:1880`
*   **Static Web Frontends / Assets:** `http://localhost:1880/public` (Dynamically routed from `system/public`)

---

## 📁 Repository Structure Blueprint

*   `system/` - Houses the central automation configurations.
    *   `flows.json` - **Core Branch Diagrams:** The visual schematic layouts of the monitoring infrastructure.
    *   `settings.js` - Dynamic path engine for relative multi-OS deployment compatibility.
    *   `public/` - Localized static frontends, monitoring portals, and web assets.
    *   `hardware/` - System backend management routines and custom execution scripts.
