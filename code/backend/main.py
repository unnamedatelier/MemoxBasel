from sentence_transformers import SentenceTransformer
from sklearn.cluster import KMeans
from transformers import pipeline
import json
import re
from collections import Counter

def categorize_texts(inputs, n_clusters=None):
    embedder = SentenceTransformer("all-MiniLM-L6-v2")
    embeddings = embedder.encode(inputs)
    
    if n_clusters is None:
        n_clusters = max(2, len(inputs) // 3)
    
    kmeans = KMeans(n_clusters=n_clusters, random_state=42)
    labels = kmeans.fit_predict(embeddings)
    
    classifier = pipeline("zero-shot-classification", 
                         model="facebook/bart-large-mnli",
                         device=-1)
    
    results = {}
    
    for cluster_id in range(n_clusters):
        cluster_texts = [inputs[i] for i in range(len(inputs)) if labels[i] == cluster_id]
        
        if not cluster_texts:
            continue
        
        title = generate_title_from_cluster(cluster_texts, classifier)
        
        original_title = title
        counter = 1
        while title in results:
            title = f"{original_title} ({counter})"
            counter += 1
        
        results[title] = cluster_texts
    
    return results


def generate_title_from_cluster(texts, classifier):
    candidate_topics = [
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
        "manufacturing and industry"
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


def load_inputs_from_json(filename="code/backend/1.json"):
    with open(filename) as f:
        data = json.load(f)
    return data.get('inputs', [])


def update_json_file(data, filename="code/backend/1.json"):
    try:
        with open(filename) as f:
            existing_data = json.load(f)
    except FileNotFoundError:
        existing_data = {}
    
    existing_data['formatted'] = data
    
    with open(filename, "w") as f:
        json.dump(existing_data, f, indent=2, ensure_ascii=False)


if __name__ == "__main__":
    inputs = load_inputs_from_json()
    
    if not inputs:
        print("No inputs found in JSON file")
    else:
        results = categorize_texts(inputs)
        
        print("\nResults")
        for category, texts in results.items():
            print(f"\n{category}")
            for text in texts:
                print(f"   {text}")
        
        update_json_file(results)