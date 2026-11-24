import os, hmac, re
import gradio as gr
from huggingface_hub import hf_hub_download
from llama_cpp import Llama
KEY=os.environ.get("SUTTA_SPACE_KEY","")
MODEL="Qwen/Qwen3-8B-GGUF"
REV="7c41481f57cb95916b40956ab2f0b139b296d974"
llm=None
def answer(prompt,key):
    global llm
    if not KEY or not hmac.compare_digest(str(key),KEY):
        raise gr.Error("Access denied")
    if not isinstance(prompt,str) or len(prompt)>16000:
        raise gr.Error("Invalid input")
    if llm is None:
        path=hf_hub_download(MODEL,"Qwen3-8B-Q4_K_M.gguf",revision=REV)
        llm=Llama(model_path=path,n_ctx=8192,n_threads=2,n_gpu_layers=0,verbose=False)
    result=llm.create_chat_completion(messages=[{"role":"user","content":prompt+"\n/no_think"}],max_tokens=700,temperature=0.2)
    text=result["choices"][0]["message"]["content"] or ""
    return re.sub(r"<think>.*?</think>","",text,flags=re.S).strip()
with gr.Blocks() as app:
    prompt=gr.Textbox(label="Grounded question")
    key=gr.Textbox(type="password",label="Access key")
    output=gr.Textbox(label="Answer")
    gr.Button("Ask").click(answer,[prompt,key],output,api_name="answer",concurrency_limit=1)
app.queue(max_size=3).launch()
