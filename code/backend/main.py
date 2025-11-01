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
    """Mark file as being processed immediately to prevent duplicate processing"""
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