---
title: SuttaGo Grounding Lab
emoji: 🪷
colorFrom: green
colorTo: yellow
sdk: gradio
sdk_version: 6.15.1
python_version: "3.12"
startup_duration_timeout: 1h
app_file: app.py
short_description: Multilingual canonical source ranking
---
Experimental CPU-only grounding worker. BGE-M3 and bge-reranker-v2-m3 operate on bounded supplied canonical candidate passages; they do not establish doctrinal truth. Trafilatura and Scrapy extract permitted public Sutta pages. No paid inference, arbitrary URL proxy or unrestricted crawler. Access key required.
