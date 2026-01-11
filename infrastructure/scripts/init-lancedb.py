#!/usr/bin/env python3
"""
Initialize LanceDB with sample data on EFS
"""
import sys
import os
from datetime import datetime

# Add EFS Python libs to path
EFS_MOUNT = os.environ.get('EFS_MOUNT_POINT', '/mnt/efs')
sys.path.insert(0, os.path.join(EFS_MOUNT, 'python'))

import lancedb
from sentence_transformers import SentenceTransformer

def main():
    # Paths
    model_name = os.environ.get('MODEL_NAME', 'all-MiniLM-L6-v2')
    lancedb_path = os.path.join(EFS_MOUNT, 'suplementia-lancedb')
    model_path = os.path.join(EFS_MOUNT, 'models', model_name)
    
    print(f"LanceDB path: {lancedb_path}")
    print(f"Model path: {model_path}")
    
    # Load model
    print("Loading model...")
    model = SentenceTransformer(model_path)
    print("Model loaded successfully")
    
    # Sample supplements
    supplements = [
        {"name": "Vitamin D", "scientific_name": "Cholecalciferol", "category": "vitamin"},
        {"name": "Omega-3", "scientific_name": "Omega-3 Fatty Acids", "category": "fatty-acid"},
        {"name": "Magnesium", "scientific_name": "Magnesium", "category": "mineral"},
        {"name": "Vitamin C", "scientific_name": "Ascorbic Acid", "category": "vitamin"},
        {"name": "Zinc", "scientific_name": "Zinc", "category": "mineral"},
    ]
    
    # Initialize LanceDB
    print("Initializing LanceDB...")
    db = lancedb.connect(lancedb_path)
    
    # Create table with embeddings
    data = []
    for idx, supp in enumerate(supplements, 1):
        embedding = model.encode(supp['name']).tolist()
        data.append({
            'id': idx,
            'name': supp['name'],
            'scientific_name': supp.get('scientific_name', ''),
            'common_names': [],
            'vector': embedding,
            'metadata': {
                'category': supp.get('category', 'other'),
                'popularity': 'high',
                'evidence_grade': 'A',
                'study_count': 100,
                'pubmed_query': supp['name']
            },
            'search_count': 0,
            'last_searched_at': datetime.now().isoformat(),
            'created_at': datetime.now().isoformat(),
            'updated_at': datetime.now().isoformat()
        })
    
    table = db.create_table('supplements', data=data, mode='overwrite')
    print(f"✓ Created table with {len(data)} supplements")
    
    # Verify
    df = table.to_pandas()
    print(f"✓ Verification: {len(df)} records in database")
    print("\nSample records:")
    print(df[['id', 'name', 'scientific_name']])
    
    print("\n✓ LanceDB initialization complete!")

if __name__ == '__main__':
    main()
