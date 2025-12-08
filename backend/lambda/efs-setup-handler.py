"""
EFS Setup Lambda - Installs dependencies and downloads ML models to EFS
"""
import subprocess
import os
import json


def handler(event, context):
    """
    Install Python dependencies and download ML model to EFS
    """
    results = {
        'status': 'success',
        'steps': []
    }

    try:
        # Step 1: Install Python dependencies
        print("Installing lancedb to /mnt/efs/python...")
        result = subprocess.run(
            ["pip", "install", "-t", "/mnt/efs/python", "lancedb"],
            capture_output=True,
            text=True,
            timeout=300
        )

        if result.returncode == 0:
            results['steps'].append({'step': 'install_lancedb', 'status': 'success'})
            print("✓ lancedb installed")
        else:
            results['steps'].append({
                'step': 'install_lancedb',
                'status': 'failed',
                'error': result.stderr
            })
            print(f"✗ lancedb failed: {result.stderr}")

        # Step 2: Install sentence-transformers
        print("Installing sentence-transformers to /mnt/efs/python...")
        result = subprocess.run(
            ["pip", "install", "-t", "/mnt/efs/python", "sentence-transformers"],
            capture_output=True,
            text=True,
            timeout=600
        )

        if result.returncode == 0:
            results['steps'].append({'step': 'install_sentence_transformers', 'status': 'success'})
            print("✓ sentence-transformers installed")
        else:
            results['steps'].append({
                'step': 'install_sentence_transformers',
                'status': 'failed',
                'error': result.stderr
            })
            print(f"✗ sentence-transformers failed: {result.stderr}")

        # Step 3: Download ML model
        print("Downloading ML model to /mnt/efs/models...")

        # Add EFS python path to load sentence-transformers
        import sys
        sys.path.insert(0, '/mnt/efs/python')

        # Create models directory
        os.makedirs('/mnt/efs/models', exist_ok=True)

        from sentence_transformers import SentenceTransformer

        model = SentenceTransformer('all-MiniLM-L6-v2')
        model.save('/mnt/efs/models/all-MiniLM-L6-v2')

        results['steps'].append({'step': 'download_model', 'status': 'success'})
        print("✓ Model downloaded")

        # Step 4: Verify installations
        print("Verifying installations...")
        import lancedb
        print(f"✓ lancedb version: {lancedb.__version__}")

        model_path = '/mnt/efs/models/all-MiniLM-L6-v2'
        if os.path.exists(model_path):
            print(f"✓ Model exists at {model_path}")
            results['steps'].append({'step': 'verify', 'status': 'success'})
        else:
            results['steps'].append({'step': 'verify', 'status': 'failed', 'error': 'Model not found'})

    except Exception as e:
        results['status'] = 'error'
        results['error'] = str(e)
        print(f"Error: {str(e)}")
        import traceback
        traceback.print_exc()

    return {
        'statusCode': 200 if results['status'] == 'success' else 500,
        'body': json.dumps(results)
    }
