import os
import re
import json
import xml.etree.ElementTree as ET
import httpx

def clean_text(text):
    # Remove HTML tags
    text = re.sub(r'<[^>]*>', '', text)
    # Collapse whitespace
    text = re.sub(r'\s+', ' ', text)
    text = text.replace('  ', ' ')
    return text.strip()

def get_word_count(text):
    return len(text.split())

def main():
    questions = []
    
    # Try fetching Canada News RSS Feed
    rss_url = "https://www.canada.ca/en/news/web-feeds/news-releases.xml"
    print(f"Fetching RSS from {rss_url}...")
    
    try:
        resp = httpx.get(rss_url, timeout=15.0, follow_redirects=True)
        if resp.status_code == 200:
            # Parse XML using ElementTree
            root = ET.fromstring(resp.content)
            items = root.findall('.//item')
            for item in items:
                title_node = item.find('title')
                link_node = item.find('link')
                desc_node = item.find('description')
                
                title = title_node.text if title_node is not None else "Canada News"
                link = link_node.text if link_node is not None else ""
                
                if desc_node is not None and desc_node.text:
                    desc_text = clean_text(desc_node.text)
                    words = get_word_count(desc_text)
                    # PTE Read Aloud text is typically 30-55 words
                    if 25 <= words <= 60:
                        questions.append({
                            "title": title.strip(),
                            "text": desc_text,
                            "source": link.strip() if link else rss_url
                        })
    except Exception as e:
        print(f"Error fetching RSS: {e}")

    # Ultimate fallback static list of real IRCC / Canadian government paragraphs of correct word counts (30-55 words)
    fallback_questions = [
        {
            "title": "Post-Graduation Work Permit (PGWP) Update",
            "text": "Starting November 1, 2024, applicants for a Post-Graduation Work Permit must meet new language benchmarks. University graduates require English proficiency at CLB level seven, while college and polytechnic graduates must achieve CLB level five.",
            "source": "https://www.canada.ca/en/immigration-refugees-citizenship/news/notices.html"
        },
        {
            "title": "Immigration Levels Plan 2025-2027",
            "text": "Canada has introduced its first-ever immigration plan targets for both temporary and permanent residents. The plan prioritizes in-demand skills, focusing on sectors such as healthcare, technology, and residential construction to build more homes.",
            "source": "https://www.canada.ca/en/immigration-refugees-citizenship/news/notices.html"
        },
        {
            "title": "Express Entry Category-Based Selection",
            "text": "The government is using category-based selection within Express Entry to target candidates with specific work experience. These draws focus on key professions, including agriculture, transport, and science, technology, engineering, and mathematics fields.",
            "source": "https://www.canada.ca/en/immigration-refugees-citizenship/news/notices.html"
        },
        {
            "title": "Francophone Immigration Beyond Quebec",
            "text": "Canada is actively promoting French-speaking immigration to communities outside of Quebec. This initiative aims to support linguistic diversity, address labor shortages, and foster vibrant Francophone culture across all provinces and territories.",
            "source": "https://www.canada.ca/en/immigration-refugees-citizenship/news/notices.html"
        },
        {
            "title": "Temporary Resident Volume Management",
            "text": "To ensure sustainable growth, the federal government is implementing measures to manage the volume of temporary residents. This includes setting caps on international student study permits and strengthening work permit eligibility requirements.",
            "source": "https://www.canada.ca/en/immigration-refugees-citizenship/news/notices.html"
        },
        {
            "title": "New Pathway for Caregivers",
            "text": "Canada is launching new home care provider pilots to offer home support workers permanent residency upon arrival. Caregivers will require lower language scores and high school equivalent diplomas, making immigration pathways more accessible.",
            "source": "https://www.canada.ca/en/immigration-refugees-citizenship/news/notices.html"
        }
    ]

    # Combine and ensure we have at least 6 high-quality questions
    final_questions = []
    seen_texts = set()

    # Add dynamic questions first
    for q in questions:
        text_clean = q["text"].lower()
        if text_clean not in seen_texts:
            seen_texts.add(text_clean)
            final_questions.append(q)

    # Fill up with fallbacks if needed
    for q in fallback_questions:
        text_clean = q["text"].lower()
        if len(final_questions) < 10 and text_clean not in seen_texts:
            seen_texts.add(text_clean)
            final_questions.append(q)

    # Assign IDs
    for idx, q in enumerate(final_questions):
        q["id"] = idx + 1

    # Output file path
    output_dir = os.path.join(os.path.dirname(__file__), "..", "src", "modules", "pte", "_01_data")
    os.makedirs(output_dir, exist_ok=True)
    output_file = os.path.join(output_dir, "read_aloud_questions.json")
    
    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(final_questions, f, ensure_ascii=False, indent=2)
        
    print(f"Successfully generated {len(final_questions)} Read Aloud questions at {output_file}!")

if __name__ == "__main__":
    main()
