# Isolated tests and model integration
Live Vercel retrieval uses Tipitaka.lk read-only named queries and SuttaCentral Bilara. The canonical-text label is not AI-generated. Title matching and bounded paragraph checks are verified; no model activation until the owner supplies a dedicated HF Space.
- Main model candidate: Qwen/Qwen3.8-27B-FP8, pinned revision, 48 GB ZeroGPU experiment, actual startup/inference unverified.
- Further candidates: DeepSeek-V4.1-Flash-1017 on suitable dedicated hardware; BAAI/bge-m3 and bge-reranker-v2-m3 for corpus evaluation. No claim of installation yet.
- Local crawler smoke test uses Crawl4AI, a single allowed URL and a 30-second page timeout.
- HF deployment: run publish_hf.py with a project-specific HF_TOKEN and SUTTA_SPACE_KEY in the environment. No tokens in Git. Explicitly use free ZeroGPU. Free quotas apply.
- After the Space works, configure only the separate Vercel project: SUTTA_HF_SPACE_URL (https://...hf.space/), SUTTA_SPACE_KEY (same Space secret), optionally HF_TOKEN for quota authentication. Keep SUTTA_ENABLE_MODEL=0 until evidence and citation evaluation passes. Then enable only for the isolated lab.
- Existing production sutta project and worker branches remain untouched.
