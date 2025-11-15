#!/usr/bin/env python3
"""
Script to extract text from images using LLMs with vision capabilities,
focusing on accurate transcription of handwritten French text with proper formatting.
"""

import os
import argparse
import hashlib
from pathlib import Path
import json
import base64
from typing import List, Dict, Set, Tuple, Optional, Union, Any
import time
import logging

# Configure logging
logging.basicConfig(level=logging.INFO, 
                   format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Try to load environment variables from .env file
try:
    from dotenv import load_dotenv
    load_dotenv()  # Load environment variables from .env file if it exists
    DOTENV_AVAILABLE = True
except ImportError:
    DOTENV_AVAILABLE = False
    logger.debug("python-dotenv not installed, skipping .env file loading")
    pass

# Try to import Ollama
try:
    from ollama import Client as OllamaClient
    OLLAMA_AVAILABLE = True
except ImportError:
    OLLAMA_AVAILABLE = False

# Try to import Anthropic for Claude
try:
    import anthropic
    ANTHROPIC_AVAILABLE = True
except ImportError:
    ANTHROPIC_AVAILABLE = False

class CostTracker:
    """Track API usage and estimate costs for cloud providers."""
    
    # Cost per 1M tokens in USD (as of March 2024)
    ANTHROPIC_COSTS = {
        # Claude 3 models - Input/Output costs in USD per 1M tokens
        "claude-3-opus-20240229": {"input": 15.0, "output": 75.0, "vision": 0.5},  # $0.5 per image
        "claude-3-sonnet-20240229": {"input": 3.0, "output": 15.0, "vision": 0.5},
        "claude-3-haiku-20240307": {"input": 0.25, "output": 1.25, "vision": 0.25},
    }
    
    def __init__(self):
        self.reset()
    
    def reset(self):
        """Reset all counters."""
        self.input_tokens = 0
        self.output_tokens = 0
        self.image_count = 0
        self.api_calls = 0
        
    def add_usage(self, input_tokens, output_tokens, images=1):
        """Add usage from an API call."""
        self.input_tokens += input_tokens
        self.output_tokens += output_tokens
        self.image_count += images
        self.api_calls += 1
    
    def estimate_cost(self, model_name):
        """Estimate cost in USD based on usage and model."""
        # Default to Haiku costs if model not found
        cost_structure = self.ANTHROPIC_COSTS.get(
            model_name, 
            self.ANTHROPIC_COSTS["claude-3-haiku-20240307"]
        )
        
        input_cost = (self.input_tokens / 1_000_000) * cost_structure["input"]
        output_cost = (self.output_tokens / 1_000_000) * cost_structure["output"]
        image_cost = self.image_count * cost_structure["vision"]
        
        total_cost = input_cost + output_cost + image_cost
        return {
            "input_cost": input_cost,
            "output_cost": output_cost,
            "image_cost": image_cost,
            "total_cost": total_cost
        }
    
    def get_summary(self, model_name):
        """Get a summary of usage and estimated cost."""
        cost = self.estimate_cost(model_name)
        
        return {
            "api_calls": self.api_calls,
            "input_tokens": self.input_tokens,
            "output_tokens": self.output_tokens,
            "image_count": self.image_count,
            "estimated_cost_usd": cost["total_cost"],
            "cost_breakdown": cost
        }


class TextExtractor:
    def __init__(self, model_name="llava:latest", provider="ollama", api_key=None):
        """Initialize the text extractor with the specified model and provider.
        
        Args:
            model_name: Name of the model to use
            provider: 'ollama' or 'anthropic'
            api_key: API key for cloud providers
        """
        self.model_name = model_name
        self.provider = provider.lower()
        self.cost_tracker = CostTracker()
        
        if self.provider == "ollama":
            if not OLLAMA_AVAILABLE:
                raise ImportError("Please install ollama package: pip install ollama")
            self.client = OllamaClient()
        elif self.provider == "anthropic":
            if not ANTHROPIC_AVAILABLE:
                raise ImportError("Please install anthropic package: pip install anthropic")
            if not api_key:
                api_key = os.environ.get("ANTHROPIC_API_KEY")
                if not api_key:
                    raise ValueError("Anthropic API key is required. Set it via the --api-key parameter or ANTHROPIC_API_KEY environment variable.")
            self.client = anthropic.Anthropic(api_key=api_key)
        
    def extract_text_from_image(self, image_path: str) -> str:
        """Extract text from an image using the LLM."""
        prompt = """
        Cette image contient du texte manuscrit en français. Veuillez transcrire ce texte mot à mot, exactement comme il apparaît.
        
        Instructions spécifiques :
        1. Transcrivez UNIQUEMENT le texte visible, rien d'autre
        2. Conservez la structure originale des paragraphes et la mise en page
        3. Ne faites PAS de résumé ou d'interprétation
        4. Si certains mots sont illisibles, indiquez-les par [illisible]
        5. N'ajoutez AUCUN commentaire ou explication
        6. Préservez les abréviations telles quelles
        7. Respectez la ponctuation originale
        8. Ne traduisez pas le texte, laissez-le en français
        
        Retournez UNIQUEMENT la transcription brute, sans introduction ni conclusion.
        """
        
        with open(image_path, "rb") as f:
            image_data = f.read()
        
        # Add retries for potential API issues
        max_retries = 3
        retry_delay = 2
        
        for attempt in range(max_retries):
            try:
                if self.provider == "ollama":
                    return self._extract_with_ollama(image_data, prompt)
                elif self.provider == "anthropic":
                    return self._extract_with_claude(image_data, prompt)
                else:
                    raise ValueError(f"Unsupported provider: {self.provider}")
            except Exception as e:
                if attempt < max_retries - 1:
                    logger.warning(f"Extraction attempt {attempt + 1} failed: {e}. Retrying in {retry_delay} seconds...")
                    time.sleep(retry_delay)
                    retry_delay *= 2  # Exponential backoff
                else:
                    logger.error(f"All extraction attempts failed for image: {e}")
                    raise
    
    def _extract_with_ollama(self, image_data: bytes, prompt: str) -> str:
        """Extract text using Ollama."""
        response = self.client.generate(
            model=self.model_name,
            prompt=prompt,
            images=[image_data]
        )
        
        return response.get("response", "").strip()
    
    def _extract_with_claude(self, image_data: bytes, prompt: str) -> str:
        """Extract text using Claude."""
        # Encode image as base64
        base64_image = base64.b64encode(image_data).decode("utf-8")
        
        # Create message with image
        message = self.client.messages.create(
            model=self.model_name,
            max_tokens=1024,
            temperature=0.2,  # Lower temperature for more accurate transcription
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text", 
                            "text": prompt
                        },
                        {
                            "type": "image",
                            "source": {
                                "type": "base64",
                                "media_type": "image/jpeg",
                                "data": base64_image
                            }
                        }
                    ]
                }
            ]
        )
        
        # Track usage for cost estimation
        if hasattr(message, 'usage') and message.usage:
            # Get token counts from the response
            input_tokens = message.usage.input_tokens
            output_tokens = message.usage.output_tokens
            # Track the usage
            self.cost_tracker.add_usage(input_tokens, output_tokens, images=1)
            
            # Log token usage
            logger.debug(f"API call used {input_tokens} input tokens, {output_tokens} output tokens")
        
        return message.content[0].text.strip()

def get_content_hash(text: str) -> str:
    """Generate a hash of the text content to identify duplicates."""
    return hashlib.md5(text.encode()).hexdigest()

def clean_extracted_text(text: str) -> str:
    """Remove any model commentary or formatting artifacts from extracted text."""
    # Remove markdown code blocks if present
    text = text.replace("```", "")
    
    # Remove common model-added explanations
    prefixes_to_remove = [
        "Voici la transcription du texte manuscrit :",
        "Transcription :",
        "Le texte manuscrit dit :",
        "Texte transcrit :",
        "Je vois le texte suivant :"
    ]
    
    for prefix in prefixes_to_remove:
        if text.startswith(prefix):
            text = text[len(prefix):].lstrip()
    
    # Remove any text that indicates model uncertainty
    text = text.replace("[handwritten text here]", "[illisible]")
    text = text.replace("[text unclear]", "[illisible]")
    text = text.replace("[illegible]", "[illisible]")
    
    return text.strip()

def process_folder(folder_path: str, output_file: str, model_name: str, provider: str = "ollama", 
                api_key: Optional[str] = None, skip_existing: bool = False) -> None:
    """Process all images in a folder, extract text, and save to individual files and a combined file."""
    folder = Path(folder_path)
    image_extensions = {'.jpg', '.jpeg', '.png', '.gif', '.bmp', '.tiff'}
    image_files = sorted([f for f in folder.glob('**/*') if f.suffix.lower() in image_extensions])
    
    if not image_files:
        logger.warning(f"No image files found in {folder_path}")
        return
    
    extractor = TextExtractor(model_name=model_name, provider=provider, api_key=api_key)
    
    # Dictionary to store unique text chunks with their image names
    unique_texts: Dict[str, Tuple[str, str]] = {}  # hash -> (text, image_name)
    processed_count = 0
    skipped_count = 0
    total_count = len(image_files)
    
    # Create output directory for individual text files
    output_dir = Path(output_file).parent / "extracted_texts"
    output_dir.mkdir(exist_ok=True)
    
    logger.info(f"Found {total_count} images to process")
    logger.info(f"Using {provider} with model {model_name}")
    logger.info(f"Individual text files will be saved to {output_dir}")
    if skip_existing:
        logger.info("Skipping images that already have text files")
    
    # Process each image
    for image_file in image_files:
        processed_count += 1
        
        # Check if output file already exists and we should skip
        text_file = output_dir / f"{image_file.stem}.txt"
        if skip_existing and text_file.exists():
            logger.info(f"Skipping {processed_count}/{total_count}: {image_file.name} (text file already exists)")
            
            # Load existing text file content into unique_texts
            with open(text_file, 'r', encoding='utf-8') as f:
                text_content = f.read()
                
            if text_content:
                content_hash = get_content_hash(text_content)
                unique_texts[content_hash] = (text_content, image_file.stem)
                
            skipped_count += 1
            continue
            
        logger.info(f"Processing {processed_count}/{total_count}: {image_file.name}")
        
        try:
            # Time the extraction for performance metrics
            start_time = time.time()
            raw_extracted_text = extractor.extract_text_from_image(str(image_file))
            extraction_time = time.time() - start_time
            
            # Clean and process the extracted text
            extracted_text = clean_extracted_text(raw_extracted_text)
            
            # Log detailed extraction info
            logger.debug(f"Raw extraction length: {len(raw_extracted_text)} chars")
            logger.debug(f"Cleaned extraction length: {len(extracted_text)} chars")
            logger.debug(f"Extraction took {extraction_time:.2f} seconds")
            
            if not extracted_text or extracted_text == "[illisible]":
                logger.warning(f"  No readable text extracted from {image_file.name}")
                continue
                
            # Store text with its hash to detect duplicates
            content_hash = get_content_hash(extracted_text)
            if content_hash not in unique_texts:
                unique_texts[content_hash] = (extracted_text, image_file.stem)
                
                # Save individual text file
                individual_file = output_dir / f"{image_file.stem}.txt"
                with open(individual_file, 'w', encoding='utf-8') as f:
                    f.write(extracted_text)
                    
                logger.info(f"  Extracted {len(extracted_text)} characters of text, saved to {individual_file}")
            else:
                logger.info(f"  Duplicate content detected, skipping (same as {unique_texts[content_hash][1]})")
                
        except Exception as e:
            logger.error(f"  Error processing {image_file.name}: {e}")
            logger.debug("Error details:", exc_info=True)
    
    # Combine all unique text chunks with proper separator and organization
    image_names = sorted([img_name for _, img_name in unique_texts.values()])
    text_blocks = []
    
    for image_name in image_names:
        for content_hash, (text, name) in unique_texts.items():
            if name == image_name:
                # Add image name as header and text content
                text_blocks.append(f"## {image_name}\n\n{text}")
                break
    
    # Join with clear section separators
    combined_text = "\n\n---\n\n".join(text_blocks)
    
    # Save to combined output file
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write(combined_text)
    
    # Log summary statistics
    processed_new = processed_count - skipped_count
    logger.info(f"\nProcessing summary:")
    logger.info(f"  Total images found: {total_count}")
    logger.info(f"  Images processed: {processed_new}")
    logger.info(f"  Images skipped (already had text files): {skipped_count}")
    logger.info(f"  Unique content blocks extracted: {len(unique_texts)}")
    logger.info(f"Combined text saved to {output_file}")
    logger.info(f"Individual text files saved to {output_dir}")
    
    # Report cost information for cloud providers
    if provider == "anthropic":
        cost_summary = extractor.cost_tracker.get_summary(model_name)
        logger.info("\nAPI Usage and Cost Estimate:")
        logger.info(f"  API calls: {cost_summary['api_calls']}")
        logger.info(f"  Images processed: {cost_summary['image_count']}")
        logger.info(f"  Input tokens: {cost_summary['input_tokens']}")
        logger.info(f"  Output tokens: {cost_summary['output_tokens']}")
        logger.info(f"  Estimated cost: ${cost_summary['estimated_cost_usd']:.4f} USD")
        
        # Detailed cost breakdown
        breakdown = cost_summary['cost_breakdown']
        logger.info("  Cost breakdown:")
        logger.info(f"    Input tokens: ${breakdown['input_cost']:.4f}")
        logger.info(f"    Output tokens: ${breakdown['output_cost']:.4f}")
        logger.info(f"    Image processing: ${breakdown['image_cost']:.4f}")

def main():
    # Get default values from environment (.env file if available)
    default_provider = os.environ.get("DEFAULT_PROVIDER", "ollama")
    
    # Ensure we're using appropriate models for each provider
    if default_provider == "ollama":
        default_model = os.environ.get("DEFAULT_MODEL", "llava:latest")
        # If user set a Claude model as default for Ollama, correct it
        if "claude" in default_model:
            default_model = "llava:latest"
    else:  # anthropic
        default_model = os.environ.get("DEFAULT_MODEL", "claude-3-haiku-20240307")
        # If user set a LLaVA model as default for Claude, correct it
        if "llava" in default_model:
            default_model = "claude-3-haiku-20240307"
    
    parser = argparse.ArgumentParser(description="Extract text from images and combine into a document")
    parser.add_argument("folder", help="Folder containing images")
    parser.add_argument("--output", "-o", default="extracted_text.txt", help="Output file name")
    parser.add_argument("--model", "-m", default=default_model, 
                        help=f"LLM model to use (default: {default_model})")
    parser.add_argument("--provider", "-p", default=default_provider, choices=["ollama", "anthropic"], 
                        help=f"Provider to use (default: {default_provider})")
    parser.add_argument("--api-key", help="API key for cloud providers (or set via environment variable)")
    parser.add_argument("--verbose", "-v", action="store_true", help="Enable verbose logging")
    parser.add_argument("--skip-existing", "-s", action="store_true", 
                        help="Skip processing images that already have corresponding text files")
    
    args = parser.parse_args()
    
    # Set logging level based on verbosity
    if args.verbose:
        logger.setLevel(logging.DEBUG)
    
    # Process the folder with the chosen provider
    try:
        # Make sure the model is appropriate for the provider
        model_name = args.model
        # If we're using anthropic but the model starts with llava, use a proper Claude model
        if args.provider == "anthropic" and ("llava" in model_name or model_name.startswith("llava")):
            model_name = "claude-3-haiku-20240307"
            logger.warning(f"Model {args.model} not compatible with Anthropic provider. Using {model_name} instead.")
        # If we're using ollama but the model starts with claude, use a proper Ollama model
        elif args.provider == "ollama" and "claude" in model_name:
            model_name = "llava:latest"
            logger.warning(f"Model {args.model} not compatible with Ollama provider. Using {model_name} instead.")
        
        extractor = TextExtractor(model_name=model_name, provider=args.provider, api_key=args.api_key)
        process_folder(
            args.folder, 
            args.output, 
            model_name,  # Use the corrected model name
            provider=args.provider, 
            api_key=args.api_key,
            skip_existing=args.skip_existing
        )
    except Exception as e:
        logger.error(f"Error during text extraction: {e}")
        if args.verbose:
            import traceback
            logger.error(traceback.format_exc())
        else:
            logger.error("Use --verbose for more detailed error information")
        exit(1)

if __name__ == "__main__":
    main()