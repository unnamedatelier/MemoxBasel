from sentence_transformers import SentenceTransformer
from sklearn.cluster import KMeans
import json
import os
import requests
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv() # Load environment variables from .env file

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY") # Get OpenAI API key from environment variable

def categorize_texts(inputs, n_clusters=None):
    embedder = SentenceTransformer("all-MiniLM-L6-v2")
    embeddings = embedder.encode(inputs)
    
    if n_clusters is None:
        n_clusters = max(2, int(len(inputs)/2))
    
    kmeans = KMeans(n_clusters=n_clusters, random_state=42)
    labels, client, results = kmeans.fit_predict(embeddings), OpenAI(api_key=OPENAI_API_KEY), {}

    for cluster_id in range(n_clusters):
        cluster_texts = [inputs[i] for i in range(len(inputs)) if labels[i] == cluster_id]
        
        if not cluster_texts: continue
        
        title = generate_title_with_gpt(cluster_texts, client)
        
        original_title, counter = title, 1 #Handle duplicate titles
        while title in results:
            title = f"{original_title} ({counter})"
            counter += 1
        
        results[title] = cluster_texts
    
    return results


def generate_title_with_gpt(texts, client): #Prepare the text sample (limit to avoid token overflow)
    sample_texts = texts[:5] if len(texts) > 5 else texts
    combined_text = "\n".join(f"- {text[:200]}" for text in sample_texts)
    
    prompt = f"""Analyze these text snippets and generate a short, descriptive category title (2-4 words maximum).

Text snippets:
{combined_text}

Requirements:
- Maximum 4 words
- Capitalize each word
- Be specific and descriptive
- No articles (a, an, the)
- Examples: "Machine Learning Research", "Climate Policy", "Space Exploration"

Category title:"""

    try:
        response = client.chat.completions.create(
            model="gpt-5-nano",
            messages=[
                {"role": "system", "content": "You are a text categorization expert. Generate concise, accurate category titles."},
                {"role": "user", "content": prompt}])
        
        title = response.choices[0].message.content.strip()
        title = title.strip('"\'') # Clean up the title
        title = ' '.join(word.capitalize() for word in title.split()) # Ensure it's properly capitalized
        
        if len(title.split()) > 4 or not title: # Fallback if title is too long or empty
            return extract_fallback_title(texts)
        
        return title
        
    except Exception as e:
        print(f"GPT API error: {e}")
        return extract_fallback_title(texts)

def extract_fallback_title(texts):
    """Fallback title generation if GPT fails"""
    import re
    from collections import Counter
    
    combined = " ".join(texts)
    words = combined.lower().split()
    
    stop_words = {
        'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
        'of', 'with', 'by', 'from', 'is', 'are', 'was', 'were', 'been', 'be',
        'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
        'should', 'may', 'might', 'must', 'can', 'this', 'that', 'these', 'those',
        'i', 'you', 'he', 'she', 'it', 'we', 'they', 'them', 'their', 'its'}
    
    word_freq = Counter()
    for word in words:
        clean = re.sub(r'[^\w]', '', word)
        if clean not in stop_words and len(clean) > 3 and not clean.isdigit():
            word_freq[clean] += 1
    
    if not word_freq:
        return "General Topics"
    
    top_words = [word for word, _ in word_freq.most_common(2)] # Get top 2 words for a better title
    return ' '.join(word.capitalize() for word in top_words)

def load_inputs_from_json(filename): #Load inputs from JSON file
    with open(filename) as f:
        data = json.load(f)
    return data.get('inputs', [])

def update_json_file(filename, data, processed_input_count): #Update JSON file with categorization results
    try:
        with open(filename) as f:
            existing_data = json.load(f)
    except FileNotFoundError:
        existing_data = {}
    
    existing_data['formatted'] = data
    
    # Only mark as checked if no new inputs were added during processing
    current_input_count = len(existing_data.get('inputs', []))
    if current_input_count == processed_input_count:
        existing_data['checked'] = True
    else:
        # New inputs were added during processing, keep it unchecked for reprocessing
        existing_data['checked'] = False
        print(f"  ⚠ Input count changed during processing ({processed_input_count} -> {current_input_count}), will reprocess")
    
    with open(filename, "w") as f:
        json.dump(existing_data, f, indent=2, ensure_ascii=False)
    
    notify_server(existing_data.get('session_uid'), existing_data.get('topic_uid'))


def notify_server(session_uid, topic_uid): #Send notification to server that a topic has been updated
    if not session_uid or not topic_uid:
        return
    
    try:
        response = requests.post(
            "http://127.0.0.1:8000/notify-update",
            json={"session_uid": session_uid, "topic_uid": topic_uid},
            timeout=2)
        if response.status_code == 200:
            print(f"  ✓ Notified server: {session_uid}/{topic_uid}")
        else:
            print(f"  ✗ Server notification failed: {response.status_code}")
    except requests.exceptions.RequestException as e:
        print(f"  ✗ Server connection error: {e}")


def run(filename):
    """Process a single JSON file"""
    inputs = load_inputs_from_json(filename)
    
    if not inputs:
        print("No inputs found in JSON file")
        return
    
    input_count, results = len(inputs), categorize_texts(inputs) #Remember how many inputs we're processing
    
    print(f"\nCategorization Results:\n{"=" * 60}")
    for category, texts in results.items():
        print(f"\n{category} ({len(texts)} items)")
        for text in texts[:3]:  # Show first 3 items
            print(f"   • {text[:80]}{'...' if len(text) > 80 else ''}")
        if len(texts) > 3:
            print(f"   ... and {len(texts) - 3} more")
    
    update_json_file(filename, results, input_count)

def run_all(): #Process all unchecked JSON files in sessions folder
    sessions_path = "sessions_folder"
    
    if not os.path.exists(sessions_path):
        print(f"Sessions folder not found: {sessions_path}")
        return
    
    processed_count, skipped_count = 0, 0
    
    for folder in os.listdir(sessions_path):
        folder_path = os.path.join(sessions_path, folder)
        
        if not os.path.isdir(folder_path): continue
        
        for file in os.listdir(folder_path):
            if file.endswith(".json") and not file.endswith("_finished.json"):
                file_path = os.path.join(folder_path, file)
                
                try:
                    with open(file_path) as f:
                        data = json.load(f)
                    
                    if data.get('checked', False) == True: #Only process if checked is False or missing (new files default to False = unchecked)
                        skipped_count += 1
                        continue
                    
                    print(f"\nProcessing: {file_path}")
                    run(filename=file_path)
                    processed_count += 1
                    
                except Exception as e:
                    print(f"Error processing {file_path}: {e}")
    
    print(f"\nSummary: {processed_count} processed, {skipped_count} skipped")


if __name__ == "__main__":
    import time
    
    print("Check interval: 10 seconds\nPress Ctrl+C to stop\n")
    
    try:
        while True:
            print(f"\n{'='*60}\nCheck at {time.strftime('%Y-%m-%d %H:%M:%S')}\n{'='*60}")
            run_all()
            print(f"\nNext check in 10 seconds...")
            time.sleep(10)
    except KeyboardInterrupt:
        print("\n\nStopping categorization system. Goodbye!")