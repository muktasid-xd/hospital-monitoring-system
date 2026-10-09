# 🏥 Hospital Monitoring System
> An isolated, cross-platform telemetry stack engineered for real-time medical facility tracking and hardware layer automation.

This project delivers a completely decentralized **Node-RED orchestration environment** designed to monitor hospital infrastructure, log vital sensor data, and serve localized web telemetry panels. By coupling core backend control layers directly with front-facing user screens, this codebase enables teams to deploy responsive, hardware-linked medical monitoring panels instantly on any machine.

Unlike typical monolithic automation apps, this system isolates your **visual branch diagrams** and assets locally. This ensures your staging environments can be instantly cloned, updated, and spun up across different platforms without risking configuration mismatches or system dependency drift.

---

## 🏗️ Architectural Topology

When deployed, the runtime architecture splits into three main layers:

```text
                  ┌───────────────────────────────┐
                  │   Core Engine (Node-RED/Node) │
                  └───────────────┬───────────────┘
                                  │
         ┌────────────────────────┴────────────────────────┐
         ▼                                                 ▼
┌─────────────────────────────────┐               ┌─────────────────────────────────┐
│  The Blueprint Canvas           │               │  The Telemetry Interface        │
│  (Visual Flow Editor)           │               │  (Static Frontend Panel)        │
│  - Endpoint: localhost:1881     │               │  - Endpoint: localhost:1881/public
│  - Script: system/flows.json    │               │  - Source: system/public/       │
└─────────────────────────────────┘               └─────────────────────────────────┘
```

---

## 🛠️ Step-by-Step Implementation Guide

Follow these exact operational phases to safely hydrate the project environment, configure localized binaries, and deploy the engine.

### Phase 1: Establish the Runtime Baseline
The tracking engine operates strictly on top of the Node.js asynchronous V8 platform. Your local machine must have the core runtime compiled.

1. **Verify your local system configuration:**
   Open your console terminal (PowerShell, Command Prompt, or Terminal) and run:
   ```bash
   node --version
   ```
2. **Handle missing dependencies:**
   * **If a version number outputs (e.g., `v22.x.x` or later):** Your environment path is valid. Skip to Phase 2.
   * **If the system throws an unrecognized command error:** You must install the engine manually. Download the current **Long-Term Support (LTS)** package from [nodejs.org](https://nodejs.org).
   * *⚠️ Crucial: If you ran a fresh installation, completely restart your active VS Code window or terminal terminal to force your operating system to read the new system paths.*

---

### Phase 2: Project Initialization & Module Locking
To prevent system-wide packages from clashing with this specific workspace layout, the project structure enforces isolated directory dependencies.

1. Navigate directly into your root project directory:
   ```bash
   cd "C:/VScode/mini projects/hackforge"
   ```
2. Download, compile, and link Node-RED locally into your internal workspace tracking tree:
   ```bash
   npm install node-red --save-dev
   ```
   *(This ensures that a `node_modules` folder is built safely inside your project directory according to the manifest instructions, without installing messy global software on your computer).*

---

### Phase 3: Runtime Execution via NPX
To initiate the live system, pass the project through the local binary executor. This forces the engine to run using our relative multi-OS path mapping file instead of standard default templates.

1. **Fire up the localized deployment engine:**
   ```bash
   npx node-red --settings system/settings.js
   ```
2. Confirm that execution succeeded by watching the terminal logs until you see the confirmation pipeline:
   ```text
   [info] Server now running at http://127.0.0
   ```

---

## 📋 Accessing the Interfaces

Once the console logs verify the server is live, use your browser to interact with the runtime components:

*   **The Blueprint Canvas:** `http://localhost:1881`  
    *Modify, wire, and troubleshoot the backend structural logic and branch diagrams directly within the browser workspace.*
*   **The Telemetry Interface:** `http://localhost:1881/public`  
    *Serves your frontend monitoring assets, graphics, and dials. This is dynamically mapped to your raw `system/public` data directory.*

---

## 📂 Codebase Anatomy
```text
hackforge/
├── system/
│   ├── flows.json         # <-- THE BRANCH DIAGRAMS (Core logic layout)
│   ├── settings.js        # <-- Cross-platform path resolution matrix
│   ├── public/            # <-- Hardware monitoring panels & static assets
│   └── hardware/          # <-- Raw physical terminal driver interfaces
└── package.json           # <-- Project manifest and dependency declarations
```
