from transformers import pipeline
from sentence_transformers import SentenceTransformer
from sklearn.cluster import KMeans
from keybert import KeyBERT
import numpy as np
from transformers import pipeline
from collections import Counter

inputs = [
    "Apple released a new iPhone with advanced AI features.",
    "The government introduced new climate policies.",
    "Google is investing heavily in artificial intelligence.",
    "Researchers discovered a new treatment for diabetes.",
    "Microsoft announced updates to its cloud platform.",
    "Climate change continues to affect global weather patterns.",
    "New AI tools are transforming the tech industry.",
]

embedder = SentenceTransformer("all-MiniLM-L6-v2")
embeddings = embedder.encode(inputs)

n_clusters = int(len(inputs)/2) #custom formula for n_clusters; int(len(inputs)/2)
kmeans = KMeans(n_clusters=n_clusters, random_state=42) 
labels, kw_model = kmeans.fit_predict(embeddings), KeyBERT(model=embedder)

cluster_themes = {}
for cluster_id in range(n_clusters):
    cluster_sents = [inputs[i] for i in range(len(inputs)) if labels[i] == cluster_id]
    joined_text = " ".join(cluster_sents)
    keywords = kw_model.extract_keywords(joined_text, keyphrase_ngram_range=(1,1), stop_words="english", top_n=10)
    cluster_themes[cluster_id] = [kw for kw, _ in keywords]

themes = []
for i, sentence in enumerate(inputs):
    themes += cluster_themes[labels[i]]

themes = list(set(themes))


classifier = pipeline("zero-shot-classification", model="facebook/bart-large-mnli")


def generate_output(inputs, themes, top_results=5): #top_results higher -> less accurate but more general
    classifieroutput, newlabels = {}, []

    for input in inputs:
        classifieroutput.update({input : classifier(input, themes)})
        newlabels += [classifieroutput[input]["labels"][i] for i in range(len(classifieroutput[input]["labels"]))]
    
    counter = Counter(newlabels)
    newlabels = sorted(newlabels, key=counter.get, reverse=True)
    newlabels = list(set(newlabels))

    matches = {newlabel : [] for newlabel in newlabels}
    for input in inputs:
        for newlabel in newlabels:
            
            if newlabel in classifieroutput[input]["labels"][:top_results]:
                matches[newlabel] += [input]
                break
    
    matchesiterator = matches.copy()
    for match in matchesiterator:
        if matches[match] == []:
            matches.pop(match)

    print(matches)

    #classifierindex = classifieroutput["scores"].index(max(classifieroutput["scores"]))


generate_output(inputs, themes)