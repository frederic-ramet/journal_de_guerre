#!/usr/bin/env python3
"""
Main entry point for Journal de Guerre HTR extraction.
"""

import sys
from pathlib import Path

# Add src to path for imports
sys.path.insert(0, str(Path(__file__).parent / "src"))

from htr.pipeline import main

if __name__ == "__main__":
    main()
