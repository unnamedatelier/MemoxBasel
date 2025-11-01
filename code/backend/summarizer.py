import json
import re
from collections import Counter
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
    
    paraphraser = pipeline("text2text-generation", model="google/flan-t5-base", device=-1)
    
    summaries = {}
    
    for category, texts in formatted.items():
        if not texts:
            continue
            
        print(f"  - {category} ({len(texts)} texts)")
        
        summary = create_condensed_summary(texts, paraphraser)
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


def create_condensed_summary(texts, paraphraser):
    combined = " ".join(texts)
    
    key_concepts = extract_key_concepts(combined)
    
    if len(key_concepts) < 2:
        prompt = f"Summarize in one sentence: {combined[:500]}"
    else:
        concepts_str = ", ".join(key_concepts[:4])
        prompt = f"Write a brief summary about {concepts_str} based on: {combined[:400]}"
    
    try:
        result = paraphraser(
            prompt,
            max_length=60,
            min_length=15,
            do_sample=False,
            truncation=True
        )
        
        summary = result[0]['generated_text'].strip()
        
        if summary and len(summary) > 15 and summary.lower() != combined[:len(summary)].lower():
            return summary
            
    except Exception as e:
        print(f"    Error: {e}")
    
    return create_manual_summary(texts, key_concepts)


def extract_key_concepts(text):
    words = text.lower().split()
    
    stop_words = {
        'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
        'of', 'with', 'by', 'from', 'as', 'is', 'are', 'was', 'were', 'be',
        'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will',
        'would', 'could', 'should', 'may', 'might', 'can', 'this', 'that',
        'these', 'those', 'their', 'more', 'over', 'help', 'reach'
    }
    
    concepts = []
    for word in words:
        clean = re.sub(r'[^\w]', '', word)
        if clean and clean not in stop_words and len(clean) > 4:
            if not clean.endswith('ing') and not clean.endswith('ed'):
                concepts.append(clean)
    
    concept_freq = Counter(concepts)
    return [c for c, _ in concept_freq.most_common(5)]


def create_manual_summary(texts, key_concepts):
    num = len(texts)
    
    if not key_concepts:
        return f"Collection of {num} related entries."
    
    if num == 1:
        return f"Focuses on {key_concepts[0]}."
    
    if len(key_concepts) >= 3:
        return f"Covers {key_concepts[0]}, {key_concepts[1]}, and {key_concepts[2]} across {num} entries."
    elif len(key_concepts) == 2:
        return f"Discusses {key_concepts[0]} and {key_concepts[1]} in {num} entries."
    else:
        return f"Explores {key_concepts[0]} through {num} different perspectives."


def run_with_summary(uid=1):
    filename = f"code/backend/{uid}.json"
    
    print("Step 1: Categorization...")
    
    print("\nStep 2: Creating summary...")
    generate_summary_for_formatted(filename)


if __name__ == "__main__":
    generate_summary_for_formatted()