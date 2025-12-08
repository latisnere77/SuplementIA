#!/usr/bin/env python3
"""
Generate top 500 supplements list using Claude via Bedrock
"""

import json
import boto3
from botocore.config import Config

bedrock_config = Config(
    connect_timeout=60,
    read_timeout=120,
    retries={'max_attempts': 3}
)

bedrock_runtime = boto3.client(
    'bedrock-runtime',
    region_name='us-east-1',
    config=bedrock_config
)


def generate_supplements_batch(start_idx: int, batch_size: int = 50) -> list:
    """
    Generate a batch of supplements using Claude

    Args:
        start_idx: Starting index for this batch
        batch_size: Number of supplements to generate

    Returns:
        List of supplement dictionaries
    """

    prompt = f"""Generate a JSON array of {batch_size} important dietary supplements, starting from position {start_idx}.

For each supplement, provide:
- name: Common name
- scientific_name: Scientific/chemical name
- common_names: Array of alternative names (abbreviations, brand names, etc.)
- category: One of: vitamin, mineral, amino-acid, fatty-acid, herbal, probiotic, enzyme, other
- popularity: "high", "medium", or "low"
- study_count_estimate: Rough estimate of research papers (integer)

Focus on:
1. Evidence-based supplements with research backing
2. Commonly used supplements (multivitamins, fish oil, etc.)
3. Popular nootropics and performance supplements
4. Traditional herbal supplements with clinical evidence
5. Amino acids, minerals, and vitamins
6. Include both common (Vitamin D) and specialized (NAC, CoQ10) supplements

IMPORTANT:
- Use proper scientific names
- Include ALL common abbreviations in common_names
- Ensure diversity across categories
- Order by popularity (most popular first within each category)

Return ONLY a valid JSON array, no other text.

Example format:
[
  {{
    "name": "N-Acetyl Cysteine",
    "scientific_name": "N-Acetylcysteine",
    "common_names": ["NAC", "N-Acetyl-L-Cysteine", "Acetylcysteine"],
    "category": "amino-acid",
    "popularity": "high",
    "study_count_estimate": 5000
  }}
]"""

    print(f"\n{'='*60}")
    print(f"Generating supplements {start_idx}-{start_idx+batch_size-1}")
    print(f"{'='*60}\n")

    body = json.dumps({
        "anthropic_version": "bedrock-2023-05-31",
        "max_tokens": 4000,
        "temperature": 0.7,
        "messages": [
            {
                "role": "user",
                "content": prompt
            }
        ]
    })

    try:
        response = bedrock_runtime.invoke_model(
            modelId='anthropic.claude-3-haiku-20240307-v1:0',
            body=body
        )

        response_body = json.loads(response['body'].read())
        supplements_json = response_body['content'][0]['text'].strip()

        # Remove markdown code blocks if present
        if supplements_json.startswith('```'):
            supplements_json = supplements_json.split('```')[1]
            if supplements_json.startswith('json'):
                supplements_json = supplements_json[4:]

        supplements = json.loads(supplements_json)

        print(f"✓ Generated {len(supplements)} supplements")

        return supplements

    except Exception as e:
        print(f"✗ Error generating batch: {str(e)}")
        raise


def main():
    """Generate top 500 supplements"""

    print("\n" + "="*60)
    print("Generating Top 500 Supplements using Claude Sonnet")
    print("="*60 + "\n")

    all_supplements = []
    batch_size = 50  # Generate 50 at a time
    total_needed = 500

    for start_idx in range(1, total_needed + 1, batch_size):
        try:
            batch = generate_supplements_batch(start_idx, batch_size)
            all_supplements.extend(batch)

            print(f"Progress: {len(all_supplements)}/{total_needed} supplements")

            # Small delay to avoid rate limiting
            import time
            time.sleep(1)

        except Exception as e:
            print(f"Failed at batch starting at {start_idx}: {str(e)}")
            break

    # Save to file
    output_file = '/tmp/top-500-supplements.json'

    with open(output_file, 'w') as f:
        json.dump(all_supplements, f, indent=2)

    print(f"\n{'='*60}")
    print(f"✓ Generated {len(all_supplements)} supplements")
    print(f"✓ Saved to: {output_file}")
    print(f"{'='*60}\n")

    # Show sample
    print("Sample supplements:")
    for i, supp in enumerate(all_supplements[:10], 1):
        print(f"{i}. {supp['name']} ({supp['category']}) - {', '.join(supp['common_names'][:3])}")

    # Show statistics
    print(f"\nStatistics:")
    categories = {}
    for supp in all_supplements:
        cat = supp['category']
        categories[cat] = categories.get(cat, 0) + 1

    for cat, count in sorted(categories.items(), key=lambda x: x[1], reverse=True):
        print(f"  {cat}: {count}")


if __name__ == "__main__":
    main()
