from sentence_transformers import SentenceTransformer
from sklearn.cluster import KMeans
import json
import os
import requests
from openai import OpenAI
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Get OpenAI API key from environment variable
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

def categorize_texts(inputs, n_clusters=None):
    embedder = SentenceTransformer("all-MiniLM-L6-v2")
    embeddings = embedder.encode(inputs)
    
    if n_clusters is None:
        n_clusters = max(2, int(len(inputs)/2))
    
    kmeans = KMeans(n_clusters=n_clusters, random_state=42)
    labels = kmeans.fit_predict(embeddings)
    
    client = OpenAI(api_key=OPENAI_API_KEY)
    
    results = {}
    
    for cluster_id in range(n_clusters):
        cluster_texts = [inputs[i] for i in range(len(inputs)) if labels[i] == cluster_id]
        
        if not cluster_texts:
            continue
        
        title = generate_title_with_gpt(cluster_texts, client)
        
        # Handle duplicate titles
        original_title, counter = title, 1
        while title in results:
            title = f"{original_title} ({counter})"
            counter += 1
        
        results[title] = cluster_texts
    
    return results


def generate_title_with_gpt(texts, client):
    # Prepare the text sample (limit to avoid token overflow)
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
                {"role": "user", "content": prompt}
            ],
        )
        
        title = response.choices[0].message.content.strip()
        
        # Clean up the title
        title = title.strip('"\'')
        
        # Ensure it's properly capitalized
        title = ' '.join(word.capitalize() for word in title.split())
        
        # Fallback if title is too long or empty
        if len(title.split()) > 4 or not title:
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
        'i', 'you', 'he', 'she', 'it', 'we', 'they', 'them', 'their', 'its'
    }
    
    word_freq = Counter()
    for word in words:
        clean = re.sub(r'[^\w]', '', word)
        if clean not in stop_words and len(clean) > 3 and not clean.isdigit():
            word_freq[clean] += 1
    
    if not word_freq:
        return "General Topics"
    
    # Get top 2 words for a better title
    top_words = [word for word, _ in word_freq.most_common(2)]
    return ' '.join(word.capitalize() for word in top_words)

def load_inputs_from_json(filename):
    """Load inputs from JSON file"""
    with open(filename) as f:
        data = json.load(f)
    return data.get('inputs', [])

def update_json_file(filename, data):
    """Update JSON file with categorization results"""
    try:
        with open(filename) as f:
            existing_data = json.load(f)
    except FileNotFoundError:
        existing_data = {}
    
    existing_data['formatted'] = data
    existing_data['checked'] = True  # Mark as checked AFTER successful processing
    
    with open(filename, "w") as f:
        json.dump(existing_data, f, indent=2, ensure_ascii=False)
    
    notify_server(existing_data.get('session_uid'), existing_data.get('topic_uid'))


def notify_server(session_uid, topic_uid):
    """Send notification to server that a topic has been updated"""
    if not session_uid or not topic_uid:
        return
    
    try:
        response = requests.post(
            "http://127.0.0.1:8000/notify-update",
            json={"session_uid": session_uid, "topic_uid": topic_uid},
            timeout=2
        )
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
    
    results = categorize_texts(inputs)
    
    print("\nCategorization Results:")
    print("=" * 60)
    for category, texts in results.items():
        print(f"\n{category} ({len(texts)} items)")
        for text in texts[:3]:  # Show first 3 items
            print(f"   • {text[:80]}{'...' if len(text) > 80 else ''}")
        if len(texts) > 3:
            print(f"   ... and {len(texts) - 3} more")
    
    update_json_file(filename, results)


def run_all():
    """Process all unchecked JSON files in sessions folder"""
    sessions_path = "sessions_folder"
    
    if not os.path.exists(sessions_path):
        print(f"Sessions folder not found: {sessions_path}")
        return
    
    processed_count = 0
    skipped_count = 0
    
    for folder in os.listdir(sessions_path):
        folder_path = os.path.join(sessions_path, folder)
        
        if not os.path.isdir(folder_path):
            continue
        
        for file in os.listdir(folder_path):
            if file.endswith(".json") and not file.endswith("_finished.json"):
                file_path = os.path.join(folder_path, file)
                
                try:
                    with open(file_path) as f:
                        data = json.load(f)
                    
                    # Only process if checked is False or missing (new files default to False = unchecked)
                    if data.get('checked', False) == True:
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
    
    print("Starting GPT-based categorization system")
    print("Check interval: 10 seconds")
    print("Press Ctrl+C to stop\n")
    
    try:
        while True:
            print(f"\n{'='*60}")
            print(f"Check at {time.strftime('%Y-%m-%d %H:%M:%S')}")
            print(f"{'='*60}")
            run_all()
            print(f"\nNext check in 10 seconds...")
            time.sleep(10)
    except KeyboardInterrupt:
        print("\n\nStopping categorization system. Goodbye!")



"""""""""""--- IGNORE ---

from sentence_transformers import SentenceTransformer
from sklearn.cluster import KMeans
from transformers import pipeline
import json
import re
from collections import Counter
import os
import requests


def categorize_texts(inputs, n_clusters=None):
    embedder = SentenceTransformer("all-MiniLM-L6-v2")
    embeddings = embedder.encode(inputs)
    
    if n_clusters is None: n_clusters = max(2, len(inputs) // 3)
    
    kmeans = KMeans(n_clusters=n_clusters, random_state=42)
    labels = kmeans.fit_predict(embeddings)
    
    classifier = pipeline("zero-shot-classification", model="facebook/bart-large-mnli",device=-1)
    
    results = {}
    
    for cluster_id in range(n_clusters):
        cluster_texts = [inputs[i] for i in range(len(inputs)) if labels[i] == cluster_id]
        
        if not cluster_texts:
            continue
        
        title = generate_title_from_cluster(cluster_texts, classifier)
        
        original_title, counter = title, 1
        while title in results:
            title = f"{original_title} ({counter})"
            counter += 1
        
        results[title] = cluster_texts
    
    return results


def generate_title_from_cluster(texts, classifier):
    candidate_topics = [ #just minor examples
        "technology and innovation",
        "artificial intelligence and machine learning",
        "climate change and environment",
        "healthcare and medical research",
        "business and technology companies",
        "energy and sustainability",
        "space exploration and astronomy",
        "transportation and vehicles",
        "science and research",
        "government and politics",
        "education and learning",
        "finance and economics",
        "entertainment and media",
        "social issues and society",
        "sports and fitness",
        "food and nutrition",
        "travel and tourism",
        "real estate and housing",
        "cybersecurity and privacy",
        "telecommunications and networks",
        "manufacturing and industry",
        "agriculture and farming",
        "fashion and lifestyle",
        "history and culture",
        "law and legal issues",
        "philosophy and ethics",
        "psychology and human behavior",
        "virtual reality and augmented reality",
        "blockchain and cryptocurrencies",
        "robotics and automation",
        "quantum computing and physics",
        "nanotechnology and materials science",
        "oceanography and marine biology",
        "wildlife and conservation",
        "urban development and smart cities",
        "mental health and well-being"
    ]
    
    combined = " ".join(texts)
    
    try:
        result = classifier(combined, candidate_topics, multi_label=False)
        
        if result['scores'][0] > 0.3:
            topic = result['labels'][0]
            title = shorten_topic(topic)
            return title
    except Exception as e:
        print(f"Classifier error: {e}")
    
    return extract_key_nouns(combined)


def shorten_topic(topic):
    if ' and ' in topic:
        parts = topic.split(' and ')
        if len(parts[0].split()) >= 2:
            topic = parts[0]
    
    words = topic.split()
    return ' '.join(word.capitalize() for word in words)


def extract_key_nouns(text):
    words = text.lower().split()
    
    stop_words = {
        'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 
        'of', 'with', 'by', 'from', 'is', 'are', 'was', 'were', 'been', 'be',
        'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
        'should', 'may', 'might', 'must', 'can', 'this', 'that', 'these', 'those',
        'i', 'you', 'he', 'she', 'it', 'we', 'they', 'them', 'their', 'its',
        'new', 'released', 'announced', 'introduced', 'discovered', 'continues'
    }
    
    word_freq = Counter()
    for word in words:
        clean = re.sub(r'[^\w]', '', word)
        if clean not in stop_words and len(clean) > 4 and not clean.isdigit():
            word_freq[clean] += 1
    
    if not word_freq:
        return "General Topics"
    
    top_word = word_freq.most_common(1)[0][0]
    return top_word.capitalize()


def load_inputs_from_json(filename):
    with open(filename) as f:
        data = json.load(f)
    return data.get('inputs', [])


def mark_as_processing(filename):
    try:
        with open(filename) as f:
            existing_data = json.load(f)
    except FileNotFoundError:
        existing_data = {}
    
    existing_data['checked'] = True  # Mark IMMEDIATELY when processing starts
    
    with open(filename, "w") as f:
        json.dump(existing_data, f, indent=2, ensure_ascii=False)
    
    return existing_data

def update_json_file(filename, data):
    try:
        with open(filename) as f:
            existing_data = json.load(f)
    except FileNotFoundError:
        existing_data = {}
    
    existing_data['formatted'] = data
    existing_data['checked'] = True  # Keep as checked
    
    with open(filename, "w") as f:
        json.dump(existing_data, f, indent=2, ensure_ascii=False)
    
    # Notify server about the update
    notify_server(existing_data.get('session_uid'), existing_data.get('topic_uid'))

def notify_server(session_uid, topic_uid):
    if not session_uid or not topic_uid:
        return
    
    try:
        response = requests.post(
            "http://127.0.0.1:8000/notify-update",
            json={"session_uid": session_uid, "topic_uid": topic_uid},
            timeout=2
        )
        if response.status_code == 200:
            print(f"  ✓ Notified server about update: {session_uid}/{topic_uid}")
        else:
            print(f"  ✗ Failed to notify server: {response.status_code}")
    except requests.exceptions.RequestException as e:
        print(f"  ✗ Could not connect to server: {e}")

def run(filename):
    inputs = load_inputs_from_json(filename)
    
    if not inputs:
        print("No inputs found in JSON file")
    else:
        results = categorize_texts(inputs)
        
        print("\nResults")
        for category, texts in results.items():
            print(f"\n{category}")
            for text in texts:
                print(f"   {text}")
        
        update_json_file(filename, results)

def run_all():
    sessions_path = "sessions_folder"
    
    if not os.path.exists(sessions_path):
        print(f"Sessions folder not found: {sessions_path}")
        return
    
    for folder in os.listdir(sessions_path):
        folder_path = os.path.join(sessions_path, folder)
        
        if not os.path.isdir(folder_path):
            continue
        
        for file in os.listdir(folder_path):
            if file.endswith(".json") and not file.endswith("_finished.json"):
                file_path = os.path.join(folder_path, file)
                
                # Check if file needs processing
                try:
                    with open(file_path) as f:
                        data = json.load(f)
                    
                    # Get current inputs
                    current_inputs = data.get('inputs', [])
                    
                    # Skip if no inputs at all
                    if not current_inputs:
                        print(f"Skipping (no inputs): {file_path}")
                        continue
                    
                    # Check if already processed and inputs haven't changed
                    if data.get('checked', False):
                        # Check if the formatted data exists and matches current inputs count
                        formatted = data.get('formatted', {})
                        if formatted:
                            # Count total items in formatted data
                            formatted_count = sum(len(items) for items in formatted.values())
                            if formatted_count == len(current_inputs):
                                print(f"Skipping (already processed, no new inputs): {file_path}")
                                continue
                    
                    print(f"Processing: {file_path} ({len(current_inputs)} inputs)")
                    
                    # WICHTIG: Markiere als "checked" SOFORT, bevor die Verarbeitung startet
                    # Dies verhindert, dass das gleiche File mehrmals parallel verarbeitet wird
                    mark_as_processing(file_path)
                    
                    run(filename=file_path)
                    
                except Exception as e:
                    print(f"Error processing {file_path}: {e}")


if __name__ == "__main__":
    import time
    
    print("Starting periodic processing (every 10 seconds)...")
    print("Press Ctrl+C to stop\n")
    
    try:
        while True:
            print(f"\n{'='*60}")
            print(f"Running check at {time.strftime('%Y-%m-%d %H:%M:%S')}")
            print(f"{'='*60}")
            run_all()
            print(f"\nNext check in 10 seconds...")
            time.sleep(10)
    except KeyboardInterrupt:
        print("\n\nStopping periodic processing. Goodbye!")

"""""""""