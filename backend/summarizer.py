from transformers import pipeline

summarizer = pipeline(
    task="text-generation",
    model="distilgpt2"
)

def generate_summary(text):
    result = summarizer(
        f"Summarize this text in short:\n{text}",
        max_new_tokens=80,
        do_sample=False
    )

    return result[0]["generated_text"]