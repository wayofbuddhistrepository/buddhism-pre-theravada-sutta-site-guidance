---
title: SuttaGo Reasoning Lab
emoji: 🪷
colorFrom: green
colorTo: yellow
sdk: gradio
sdk_version: 6.15.1
app_file: app.py
short_description: Source-grounded Theravada research
---
# SuttaGo isolated model experiment
Qwen3.8-27B-FP8, Apache-2.0 model. This is an experimental inference service, not a doctrinal authority. Select ZeroGPU (zero-a10g) explicitly, not paid hardware. Set secret SUTTA_SPACE_KEY before use. The API is disabled without the secret. The model must pass the Sinhala/Pali/English evaluation before enabling it on Vercel. No automatic paid fallback.
