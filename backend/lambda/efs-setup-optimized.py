"""
Optimized EFS Setup - Downloads pre-built wheels for ARM64
"""
import subprocess
import os
import json


def handler(event, context):
    """
    Install Python dependencies using pre-built wheels
    """
    results = {
        'status': 'success',
        'steps': []
    }

    try:
        # Create directories
        os.makedirs('/mnt/efs/python', exist_ok=True)
        os.makedirs('/mnt/efs/models', exist_ok=True)

        print("Created directories")
        results['steps'].append({'step': 'create_dirs', 'status': 'success'})

        # Step 1: Install lancedb (lightweight)
        print("Installing lancedb...")
        result = subprocess.run(
            [
                "pip", "install",
                "--platform", "manylinux2014_aarch64",
                "--only-binary", ":all:",
                "--target", "/mnt/efs/python",
                "--upgrade",
                "lancedb"
            ],
            capture_output=True,
            text=True,
            timeout=180
        )

        if result.returncode == 0:
            results['steps'].append({'step': 'install_lancedb', 'status': 'success'})
            print("✓ lancedb installed")
        else:
            results['steps'].append({
                'step': 'install_lancedb',
                'status': 'failed',
                'stderr': result.stderr[:500]
            })
            print(f"✗ lancedb failed: {result.stderr[:500]}")

        # Step 2: Install numpy (needed for model)
        print("Installing numpy...")
        result = subprocess.run(
            [
                "pip", "install",
                "--platform", "manylinux2014_aarch64",
                "--only-binary", ":all:",
                "--target", "/mnt/efs/python",
                "--upgrade",
                "numpy"
            ],
            capture_output=True,
            text=True,
            timeout=60
        )

        if result.returncode == 0:
            results['steps'].append({'step': 'install_numpy', 'status': 'success'})
            print("✓ numpy installed")
        else:
            results['steps'].append({
                'step': 'install_numpy',
                'status': 'warning',
                'stderr': result.stderr[:500]
            })

        # Step 3: Install sentence-transformers dependencies (lightweight ones only)
        print("Installing sentence-transformers dependencies...")
        lightweight_deps = [
            "transformers",
            "huggingface-hub",
            "tokenizers",
            "tqdm",
            "requests"
        ]

        for dep in lightweight_deps:
            print(f"  → {dep}")
            result = subprocess.run(
                [
                    "pip", "install",
                    "--platform", "manylinux2014_aarch64",
                    "--only-binary", ":all:",
                    "--target", "/mnt/efs/python",
                    "--upgrade",
                    "--no-deps",  # Don't install dependencies of dependencies
                    dep
                ],
                capture_output=True,
                text=True,
                timeout=120
            )

            if result.returncode == 0:
                print(f"    ✓ {dep}")
            else:
                print(f"    ✗ {dep}: {result.stderr[:200]}")

        results['steps'].append({'step': 'install_transformers_deps', 'status': 'success'})

        # List what was installed
        print("\nInstalled packages:")
        result = subprocess.run(
            ["ls", "-lh", "/mnt/efs/python"],
            capture_output=True,
            text=True
        )
        print(result.stdout[:1000])

        results['summary'] = {
            'efs_python_size': result.stdout.split('\n')[0] if result.stdout else 'unknown',
            'note': 'PyTorch not installed - too large. Use smaller embedding library or Lambda container.'
        }

    except Exception as e:
        results['status'] = 'error'
        results['error'] = str(e)
        print(f"Error: {str(e)}")
        import traceback
        traceback.print_exc()

    return {
        'statusCode': 200 if results['status'] == 'success' else 500,
        'body': json.dumps(results, indent=2)
    }
