# 🧠 Solution Overview: ChakraView Forensics Portal

### Core Mechanism
ChakraView is an automated, graph-intelligence forensics workspace built using React and TypeScript. Instead of forcing investigators to look at flat tables, the platform ingests unstructured mock cyber fraud records (transactions, call logs, device fingerprints) and automatically maps them into a unified directed relational graph.

### Algorithmic Role Classification (Kingpin Isolation)
ChakraView removes the guesswork from network triage. The system charts three distinct layers of evidence: Financial UPI IDs, Communication SIM arrays, and Physical Device IMEIs. By calculating node-degree centrality inside the relational graph, the engine instantly flags "Convergence Hubs"—isolating the physical machine (Kingpin) orchestrating multiple transient money mules.

### Investigator Journey
1. **Drop-Zone Ingestion**: The investigator uploads unformatted text files or CSV logs directly into the web UI dashboard.
2. **Visual Triage Scan**: The interface dynamically charts the interlinked infrastructure map, changing node colors based on entity types (Victims, Mules, Suspect Devices).
3. **Legal Automation**: The system automatically compiles an FIR-ready legal case brief, complete with recommended actions and pre-mapped statutory sections.
