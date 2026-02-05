#!/usr/bin/env python3
"""
Reformat all template YAML files to use compact matrix notation.

This script reads all template YAML files and rewrites them with:
- Compact matrix format: [1, 2, 3] instead of separate lines
- Preserves all other formatting
"""

import sys
from pathlib import Path

import yaml


class CompactMatrixDumper(yaml.SafeDumper):
    """Custom YAML dumper that formats matrices (lists of lists) in flow style."""
    pass


def represent_list(dumper, data):
    """Represent lists with flow style for matrices (lists of numbers)."""
    # Check if this is a list of numbers (matrix row) - use flow style [1, 2, 3]
    if data and all(isinstance(item, (int, float)) for item in data):
        return dumper.represent_sequence('tag:yaml.org,2002:seq', data, flow_style=True)
    # Otherwise use default block style
    return dumper.represent_sequence('tag:yaml.org,2002:seq', data, flow_style=False)


CompactMatrixDumper.add_representer(list, represent_list)


def reformat_yaml_file(file_path: Path) -> bool:
    """Reformat a single YAML file with compact matrices."""
    try:
        # Read original file
        with file_path.open('r', encoding='utf-8') as f:
            data = yaml.safe_load(f)

        if not data:
            print(f"⏭️  Skipping {file_path} (empty file)")
            return False

        # Check if file contains matrices
        has_matrix = False
        if isinstance(data, dict):
            # Check device templates
            if 'templates' in data:
                for template in data['templates']:
                    if isinstance(template, dict):
                        if template.get('layout', {}).get('matrix'):
                            has_matrix = True
                        if template.get('rear_layout', {}).get('matrix'):
                            has_matrix = True

            # Check rack templates
            if 'rack_templates' in data:
                for template in data['rack_templates']:
                    if isinstance(template, dict):
                        infra = template.get('infrastructure', {})
                        for comp_list in infra.values():
                            if isinstance(comp_list, list):
                                for comp in comp_list:
                                    if isinstance(comp, dict):
                                        if comp.get('layout', {}).get('matrix'):
                                            has_matrix = True
                                        if comp.get('rear_layout', {}).get('matrix'):
                                            has_matrix = True

        if not has_matrix:
            print(f"⏭️  Skipping {file_path} (no matrices)")
            return False

        # Reformat with compact matrices
        reformatted = yaml.dump(
            data,
            Dumper=CompactMatrixDumper,
            sort_keys=False,
            default_flow_style=False,
            allow_unicode=True,
        )

        # Write back
        with file_path.open('w', encoding='utf-8') as f:
            f.write(reformatted)

        print(f"✅ Reformatted {file_path}")
        return True

    except Exception as e:
        print(f"❌ Error processing {file_path}: {e}")
        return False


def main():
    """Reformat all template YAML files in config/templates/."""
    # Get templates directory
    script_dir = Path(__file__).parent
    repo_root = script_dir.parent
    templates_dir = repo_root / 'config' / 'templates'

    if not templates_dir.exists():
        print(f"❌ Templates directory not found: {templates_dir}")
        sys.exit(1)

    print(f"🔍 Searching for template files in {templates_dir}")

    # Find all YAML files
    yaml_files = list(templates_dir.rglob('*.yaml'))

    if not yaml_files:
        print("❌ No YAML files found")
        sys.exit(1)

    print(f"📝 Found {len(yaml_files)} YAML files")
    print()

    # Reformat each file
    reformatted_count = 0
    for yaml_file in sorted(yaml_files):
        if reformat_yaml_file(yaml_file):
            reformatted_count += 1

    print()
    print(f"✨ Done! Reformatted {reformatted_count} file(s) with compact matrix notation")


if __name__ == '__main__':
    main()
