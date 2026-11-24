import spaces
import os, hmac, re
import torch
import gradio as gr
from transformers import AutoProcessor, AutoModelForImageTextToText

MODEL = "Qwen/Qwen3.8-27B-FP8"
REV = "c3a462cc3d38cf351f3b26cbd763469eeb74ef81"
KEY = os.environ.get("SUTTA_SPACE_KEY", "")
processor = model = None
if KEY:
    processor = AutoProcessor.from_pretrained(MODEL, revision=REV, trust_remote_code=False)
    model = AutoModelForImageTextToText.from_pretrained(MODEL, revision=REV,
        device_map={"": 0}, dtype="auto", trust_remote_code=False).eval()

@spaces.GPU(duration=45, size="large")
@torch.inference_mode()
def generate(prompt):
    messages = [{"role":"user","content":[{"type":"text","text":prompt}]}]
    inputs = processor.apply_chat_template(messages, tokenize=True,
        add_generation_prompt=True, return_dict=True, return_tensors="pt",
        enable_thinking=False).to("cuda")
    if inputs["input_ids"].shape[1] > 8192:
        raise gr.Error("Context too long")
    result = model.generate(**inputs, max_new_tokens=1200, do_sample=False)
    text = processor.batch_decode(result[:, inputs["input_ids"].shape[1]:],
        skip_special_tokens=True)[0]
    text = re.sub(r"<think>.*?</think>", "", text, flags=re.S).strip()
    if not text or "<think>" in text:
        raise gr.Error("No complete answer")
    return text

def answer(prompt, key):
    if not KEY or not hmac.compare_digest(str(key), KEY):
        raise gr.Error("Access denied")
    if not isinstance(prompt,str) or len(prompt)>16000:
        raise gr.Error("Invalid input")
    return generate(prompt)

with gr.Blocks(title="SuttaGo — grounded research") as demo:
    gr.Markdown("## SuttaGo research model · experimental")
    gr.Markdown(MODEL)
    prompt=gr.Textbox(label="Evidence-grounded prompt",lines=6)
    key=gr.Textbox(label="Access key",type="password")
    output=gr.Textbox(label="AI explanation",lines=8)
    gr.Button("Run").click(answer,[prompt,key],output,api_name="answer",concurrency_limit=1)
demo.queue(max_size=3).launch()
