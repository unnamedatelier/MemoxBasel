import json
from transformers import pipeline

def generate_summary_for_formatted(filename="code/backend/1.json"):
    try:
        with open(filename) as f:
            data = json.load(f)
    except FileNotFoundError:
        print(f"File {filename} not found")
        return
    
    formatted = data.get('formatted', {})
    
    if not formatted:
        print("No 'formatted' data found")
        return
    
    print(f"Creating summaries for {len(formatted)} categories...")
    
    summarizer = pipeline("summarization", model="sshleifer/distilbart-cnn-12-6", device=-1)
    
    summaries = {}
    
    for category, texts in formatted.items():
        if not texts:
            continue
            
        print(f"  - {category} ({len(texts)} texts)")
        
        summary = create_summary(texts, summarizer)
        summaries[category] = summary
    
    data['summary'] = summaries
    
    with open(filename, "w") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    
    print("\n" + "="*60)
    print("SUMMARIES")
    print("="*60)
    for category, summary in summaries.items():
        print(f"\n{category}:")
        print(f"  {summary}")
    print("="*60)
    
    return summaries


def create_summary(texts, summarizer):
    combined = " ".join(texts)
    total_length = len(combined.split())
    
    try:
        max_len = min(100, max(20, int(total_length * 0.4)))
        min_len = min(10, max_len - 15)
        
        result = summarizer(
            combined,
            max_length=max_len,
            min_length=min_len,
            do_sample=False,
            truncation=True,
            no_repeat_ngram_size=3
        )
        
        summary = result[0]['summary_text']
        return summary
        
    except Exception as e:
        print(f"    Error: {e}")
        return combined


def run_with_summary(uid=1):
    filename = f"code/backend/{uid}.json"
    
    print("Step 1: Categorization...")
    
    print("\nStep 2: Creating summary...")
    generate_summary_for_formatted(filename)


if __name__ == "__main__":
    generate_summary_for_formatted()