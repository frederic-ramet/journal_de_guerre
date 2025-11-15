# CLAUDE.md - Journal de Guerre Project Guide

## Project Overview
Text extraction tool for images of handwritten or printed text, particularly focused on extracting content from the `jpg/` directory.

## File Structure
- `jpg/` - Contains JPEG images (IMG_*.jpeg) from IMG_0410.jpeg to IMG_0512.jpeg
- `src/` - Python source code
  - `extract_text.py` - Main script for OCR/LLM text extraction

## Project Setup
```bash
pip install ollama
ollama pull llava:latest
```

## Development Commands
- Run text extraction: `python src/extract_text.py jpg/ --output extracted_journal.txt`
- Run with specific model: `python src/extract_text.py jpg/ --model llava:latest`
- Run tests: Not implemented yet

## Coding Guidelines
- Use Python 3.8+ with type hints
- Follow PEP 8 style guidelines
- Use descriptive variable and function names
- Organize code with classes for main functionality
- Add docstrings for functions and modules
- Include error handling for file operations and API calls
- Document dependencies in README.md

## Version Control
- Organize commits by logical changes
- Write clear commit messages describing changes
- Include references to specific components modified