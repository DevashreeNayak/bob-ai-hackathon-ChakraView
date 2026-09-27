# 🚀 ChakraView: Cyber Fraud Network Analyzer

An automated, graph-intelligence forensics workspace built to accelerate tracking timelines for law enforcement investigators investigating coordinated financial crimes.

---

## 👥 Team

| Field | Value |
|---|---|
| **Team Name** | "ChakraView" |
| **Track** | "AI" |
| **Team Lead** | "Devashree Nayak" — "devashreenayak015@gmail.com" |
| **Members** | Solo Participant |

---

## 🎯 Problem Statement

In FY2023, organized cybercrime syndicates like the Jamtara SIM-swap ring executed over 95,000+ UPI fraud cases, leaving behind a massive trail of unsolved investigations. State cyber cells spend weeks manually cross-referencing messy, flat spreadsheets of bank transaction records, telecom logs, and hardware device registries to map out networks. This manual triage delay gives criminal masterminds a critical window to dissolve mule accounts, swap burner hardware, and escape law enforcement tracking completely.

---

## 💡 Solution

ChakraView is an automated, web-based graph-intelligence forensics portal built using React and TypeScript. The application strips away manual lookup delays by ingests unformatted cyber fraud intelligence inputs (mock transaction logs, CDR files, and device footprints) and automatically resolving them into a unified directed multi-graph model. By calculating node-degree centrality inside the engine, the portal maps out the organizational hierarchy from kingpins to front-line mules and victims, instantly compiling court-ready digital evidence briefs.

---

## ✨ Key Features

- **Multi-Vector Entity Resolution:** Automates matching across unformatted bank ledgers, telecom Call Detail Records (CDRs), and device IMEI fingerprints.
- **Topological Link Analysis:** Uses graph node-degree centrality algorithms to separate transactional money mules from central infrastructure nodes.
- **Kingpin Nexus Isolation:** Automatically detects and highlights physical device clusters where multiple distinct mule tracks converge.
- **Automated Legal Brief Compiler:** Instantly generates standardized, time-stamped FIR evidence reports pre-mapped to local BNS and IT Act statutory provisions.

---

## 🛠️ Tech Stack

| Category | Technologies |
|---|---|
| **Languages** | TypeScript, SQL |
| **Frameworks** | React 19, Tailwind CSS, Vite |
| **IBM Technologies** | IBM Bob |
| **Databases** | Supabase, PostgreSQL |
| **Other** | GitHub Actions, Lucide React, NetworkX |

---

## 📁 Repository Structure

```text
├── src/                  # All source code
├── docs/                 # Written documentation
│   ├── problem-statement.md
│   ├── solution-overview.md
│   ├── architecture.md
│   └── setup-guide.md
├── demo/                 # Demo artifacts
│   ├── screenshots/      # App screenshots
│   └── demo-video-link.txt  # Link to demo video
├── presentation/         # Slide deck
└── submission.yaml       # Structured submission metadata
```

---

## ⚡ How to Run

```bash
# 1. Clone the repo
https://github.com/DevashreeNayak/bob-ai-hackathon-ChakraView.git
cd bob-ai-hackathon-ChakraView

# 2. Install dependencies
npm install

# 3. Configure environment
cp src/.env.example src/.env
# Edit src/.env with your Supabase credentials

# 4. Run the project
npm run dev
```

---

## 🖥️ Demo

| Artifact | Link |
|---|---|
| 📹 Demo Video | [See demo/demo-video-link.txt](demo/demo-video-link.txt) |
| 🌐 Live Demo | [See demo/live-demo-url.txt](demo/live-demo-url.txt) |
| 🖼️ Screenshots | [See demo/screenshots/](demo/screenshots/) |
| 📊 Presentation | [See presentation/slides.pdf](presentation/) |

---

## ⚠️ Known Limitations

- **Batch Execution Limits:** The platform processes data fields via static files uploaded offline by field investigators, lacking active hook integration layers to query live telecommunication carrier API streams in real-time.
- **Browser Calibration:** The dynamic interactive graph rendering views have been thoroughly verified and styled exclusively for Chromium-based application viewports.

---

## 🏅 What We're Most Proud Of

Successfully abstracting highly dense, unformatted forensic data structures into a rapid, single-second visual triage dashboard. The architecture moves the burden of multi-layered relationship analysis out of manually cross-referenced spreadsheets and executes it right within PostgreSQL relational constraints, allowing a solo cyber analyst to trace a syndicate instantly.
