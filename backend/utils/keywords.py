def extract_keywords(text):
    words = text.split()
    words = [word.strip(".,!?").lower() for word in words]

    stop_words = [
        "the", "is", "and", "a", "an", "of", "to",
        "in", "for", "on", "with", "that", "this",
        "it", "as", "are", "was", "were"
    ]

    keywords = []

    for word in words:
        if word not in stop_words and len(word) > 4:
            if word not in keywords:
                keywords.append(word)

    return keywords[:10]