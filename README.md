# Journal de Guerre - Interactive Journal System

A system for extracting handwritten French text from images and creating an interactive journal interface.

## Features

1. **Text Extraction**: Extract handwritten French text from images using LLMs with vision capabilities
2. **Multiple Provider Support**: Works with both Ollama (local) and Claude (cloud)
3. **Cost Tracking**: Estimates API usage and costs when using Claude
4. **Interactive Interface**: Chat with your journal content using Claude and view relevant images
5. **Semantic Search**: Find content based on meaning, not just keywords
6. **Customizable Prompts**: Tailor the system instructions for the LLM

## Requirements

- Python 3.8+
- For local extraction: Ollama (https://ollama.ai) with a vision-capable model installed
- For cloud extraction: Anthropic API key for Claude Vision access

## Installation

1. Clone this repository
2. Install all dependencies:
```
pip install -r requirements.txt
```
3. For local extraction, pull a vision-capable model in Ollama:
```
ollama pull llava:latest
```
4. For cloud extraction, set your Anthropic API key in one of these ways:
   
   a. Create a `.env` file from the example:
   ```
   cp .env.example .env
   # Edit .env and add your API key
   ```
   
   b. Set it as an environment variable:
   ```
   export ANTHROPIC_API_KEY=your_api_key_here
   ```
   
   c. Provide it directly in the command:
   ```
   python src/extract_text.py jpg/ --provider anthropic --api-key "your_api_key_here"
   ```

## Usage

### 1. Extract Text from Images

For local extraction using Ollama:
```bash
python src/extract_text.py jpg/ --output extracted_journal.txt --provider ollama
```

For cloud extraction using Claude Vision (recommended for handwritten text):
```bash
python src/extract_text.py jpg/ --output extracted_journal.txt --provider anthropic --model claude-3-haiku-20240307
```

Options:
- `--model` or `-m`: Specify the model to use (default: llava:latest for Ollama, claude-3-opus-20240229 for Anthropic)
- `--provider` or `-p`: Choose provider - "ollama" (local) or "anthropic" (cloud)  
- `--api-key`: Anthropic API key (if not set via environment variable)
- `--output` or `-o`: Specify the output file (default: extracted_text.txt)
- `--skip-existing` or `-s`: Skip processing images that already have corresponding text files
- `--verbose` or `-v`: Enable verbose logging for troubleshooting

For incremental processing (only process new images):
```bash
python src/extract_text.py jpg/ --skip-existing --provider anthropic
```

### Using the .env File for Default Settings

You can set default values in your `.env` file:

```
# .env file
ANTHROPIC_API_KEY=your_api_key_here
DEFAULT_PROVIDER=anthropic
DEFAULT_MODEL=claude-3-haiku-20240307
```

This allows you to run the script with minimal parameters:

```bash
python src/extract_text.py jpg/
```

The script will use the default provider and model from your `.env` file.

### 2. Launch Interactive Interface

```bash
streamlit run src/interface/app.py
```

## How It Works

### Text Extraction
1. The script finds all image files in the specified folder
2. It uses an LLM with vision capabilities to extract handwritten French text from each image
3. The extraction uses specialized French-language prompting for accurate transcription
4. Duplicate content is detected and removed
5. All unique text chunks are combined into a single document, organized by image name

### Interactive Interface
1. Content is embedded using sentence-transformers
2. User queries are matched against content using semantic similarity
3. Relevant content is sent to Claude along with the user query
4. The interface displays both text responses and journal images