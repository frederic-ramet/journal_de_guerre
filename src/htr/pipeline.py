#!/usr/bin/env python3
"""
Main HTR Pipeline for Journal de Guerre.
Orchestrates preprocessing, segmentation, recognition, and post-processing.
"""

import argparse
import logging
import time
from pathlib import Path
from typing import Optional, Dict, Any
import yaml
import json
from tqdm import tqdm

from .preprocessing.image_enhancer import ImageEnhancer
from .segmentation.line_detector import LineDetector
from .recognition.trocr_engine import TrOCREngine
from .postprocessing.text_corrector import TextCorrector

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class HTRPipeline:
    """Complete HTR pipeline for document processing."""

    def __init__(self, config_path: Optional[str] = None):
        """Initialize pipeline with configuration.

        Args:
            config_path: Path to YAML configuration file
        """
        self.config = self._load_config(config_path)
        self._setup_components()
        self.stats = {
            "images_processed": 0,
            "lines_detected": 0,
            "total_characters": 0,
            "processing_time": 0,
        }

    def _load_config(self, config_path: Optional[str]) -> Dict[str, Any]:
        """Load configuration from YAML file."""
        if config_path and Path(config_path).exists():
            with open(config_path, "r", encoding="utf-8") as f:
                config = yaml.safe_load(f)
            logger.info(f"Loaded configuration from: {config_path}")
        else:
            logger.warning("No config file provided, using defaults")
            config = self._default_config()
        return config

    @staticmethod
    def _default_config() -> Dict[str, Any]:
        """Default pipeline configuration."""
        return {
            "general": {
                "language": "fr",
                "output_dir": "data/processed",
                "cache_enabled": True,
                "verbose": False,
            },
            "preprocessing": {},
            "segmentation": {},
            "recognition": {
                "model_name": "base",
                "custom_model_path": None,
                "device": None,
            },
            "postprocessing": {
                "use_spell_checker": True,
                "use_grammar_checker": False,
            },
        }

    def _setup_components(self):
        """Initialize pipeline components."""
        logger.info("Initializing HTR pipeline components...")

        # Image enhancer
        self.enhancer = ImageEnhancer(self.config.get("preprocessing", {}))
        logger.info("Image enhancer ready")

        # Line detector
        self.detector = LineDetector(self.config.get("segmentation", {}))
        logger.info("Line detector ready")

        # TrOCR engine
        recognition_config = self.config.get("recognition", {})
        self.recognizer = TrOCREngine(
            model_name=recognition_config.get("model_name", "base"),
            custom_model_path=recognition_config.get("custom_model_path"),
            device=recognition_config.get("device")
        )
        logger.info("TrOCR engine ready")

        # Text corrector
        postprocessing_config = self.config.get("postprocessing", {})
        postprocessing_config["language"] = self.config.get("general", {}).get("language", "fr")
        self.corrector = TextCorrector(postprocessing_config)
        logger.info("Text corrector ready")

        logger.info("All pipeline components initialized")

    def process_image(self, image_path: str, output_dir: Optional[str] = None) -> str:
        """Process a single document image through the full pipeline.

        Args:
            image_path: Path to input image
            output_dir: Optional output directory (defaults to config)

        Returns:
            Extracted and corrected text
        """
        start_time = time.time()
        image_path = Path(image_path)

        if output_dir is None:
            output_dir = self.config.get("general", {}).get("output_dir", "data/processed")
        output_path = Path(output_dir)
        output_path.mkdir(parents=True, exist_ok=True)

        logger.info(f"Processing: {image_path.name}")

        # Step 1: Load and lightly preprocess image
        logger.info("Step 1: Preprocessing image...")
        import cv2

        # Load original image
        original_img = cv2.imread(str(image_path))
        if original_img is None:
            raise ValueError(f"Cannot load image: {image_path}")

        # Convert to grayscale
        gray = cv2.cvtColor(original_img, cv2.COLOR_BGR2GRAY)

        # Apply light enhancement (CLAHE) but NO binarization
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
        enhanced = clahe.apply(gray)

        # Save the enhanced (but not binarized) image for reference
        preprocessed_file = output_path / f"{image_path.stem}_preprocessed.png"
        cv2.imwrite(str(preprocessed_file), enhanced)
        logger.info(f"Saved enhanced image to: {preprocessed_file}")

        # Step 2: Detect and segment lines (using enhanced grayscale, not binary)
        logger.info("Step 2: Segmenting lines...")
        lines = self.detector.detect_lines(enhanced)
        lines_dir = output_path / f"{image_path.stem}_lines"
        line_files = self.detector.save_lines(lines, str(lines_dir))

        self.stats["lines_detected"] += len(lines)

        # Step 3: Recognize text
        logger.info(f"Step 3: Recognizing text from {len(lines)} lines...")
        recognized_text = self.recognizer.recognize_document(str(lines_dir))

        # Step 4: Post-process and correct
        logger.info("Step 4: Post-processing text...")
        corrected_text = self.corrector.correct_text(recognized_text)

        # Save results
        raw_output = output_path / f"{image_path.stem}_raw.txt"
        corrected_output = output_path / f"{image_path.stem}_corrected.txt"

        with open(raw_output, "w", encoding="utf-8") as f:
            f.write(recognized_text)

        with open(corrected_output, "w", encoding="utf-8") as f:
            f.write(corrected_text)

        # Update stats
        self.stats["images_processed"] += 1
        self.stats["total_characters"] += len(corrected_text)
        processing_time = time.time() - start_time
        self.stats["processing_time"] += processing_time

        logger.info(f"Completed in {processing_time:.2f}s")
        logger.info(f"Output saved to: {corrected_output}")

        return corrected_text

    def process_folder(self, input_dir: str, output_dir: Optional[str] = None) -> str:
        """Process all images in a folder.

        Args:
            input_dir: Directory containing images
            output_dir: Output directory

        Returns:
            Combined extracted text from all images
        """
        input_path = Path(input_dir)
        if not input_path.exists():
            raise ValueError(f"Input directory not found: {input_dir}")

        if output_dir is None:
            output_dir = self.config.get("general", {}).get("output_dir", "data/processed")
        output_path = Path(output_dir)
        output_path.mkdir(parents=True, exist_ok=True)

        # Find all images
        image_extensions = {'.jpg', '.jpeg', '.png', '.tiff', '.bmp'}
        image_files = sorted([
            f for f in input_path.glob('**/*')
            if f.suffix.lower() in image_extensions
        ])

        if not image_files:
            logger.warning(f"No images found in {input_dir}")
            return ""

        logger.info(f"Found {len(image_files)} images to process")

        # Process each image
        all_texts = []
        for img_file in tqdm(image_files, desc="Processing images"):
            try:
                text = self.process_image(str(img_file), output_dir)
                all_texts.append(f"## {img_file.stem}\n\n{text}")
            except Exception as e:
                logger.error(f"Error processing {img_file}: {e}")
                all_texts.append(f"## {img_file.stem}\n\n[Error: {str(e)}]")

        # Combine all texts
        combined_text = "\n\n---\n\n".join(all_texts)

        # Save combined output
        combined_file = output_path / "combined_journal.txt"
        with open(combined_file, "w", encoding="utf-8") as f:
            f.write(combined_text)

        # Save statistics
        stats_file = output_path / "processing_stats.json"
        with open(stats_file, "w", encoding="utf-8") as f:
            json.dump(self.get_stats(), f, indent=2)

        logger.info(f"Combined output saved to: {combined_file}")
        logger.info(f"Statistics saved to: {stats_file}")

        return combined_text

    def get_stats(self) -> Dict[str, Any]:
        """Get processing statistics."""
        stats = self.stats.copy()
        if stats["images_processed"] > 0:
            stats["avg_time_per_image"] = stats["processing_time"] / stats["images_processed"]
            stats["avg_lines_per_image"] = stats["lines_detected"] / stats["images_processed"]
            stats["avg_chars_per_image"] = stats["total_characters"] / stats["images_processed"]
        return stats

    def reset_stats(self):
        """Reset processing statistics."""
        self.stats = {
            "images_processed": 0,
            "lines_detected": 0,
            "total_characters": 0,
            "processing_time": 0,
        }


def main():
    """Main entry point for HTR pipeline."""
    parser = argparse.ArgumentParser(
        description="HTR Pipeline for Journal de Guerre text extraction"
    )
    parser.add_argument(
        "input",
        help="Input image file or directory"
    )
    parser.add_argument(
        "--output", "-o",
        default="data/processed",
        help="Output directory (default: data/processed)"
    )
    parser.add_argument(
        "--config", "-c",
        default="configs/default_config.yaml",
        help="Configuration file path"
    )
    parser.add_argument(
        "--verbose", "-v",
        action="store_true",
        help="Enable verbose logging"
    )

    args = parser.parse_args()

    if args.verbose:
        logging.getLogger().setLevel(logging.DEBUG)

    # Initialize pipeline
    pipeline = HTRPipeline(args.config)

    # Process input
    input_path = Path(args.input)
    if input_path.is_file():
        result = pipeline.process_image(str(input_path), args.output)
        print("\n--- Extracted Text ---")
        print(result)
    elif input_path.is_dir():
        pipeline.process_folder(str(input_path), args.output)
    else:
        print(f"Error: {args.input} is not a valid file or directory")
        exit(1)

    # Print statistics
    stats = pipeline.get_stats()
    print("\n--- Processing Statistics ---")
    for key, value in stats.items():
        if isinstance(value, float):
            print(f"  {key}: {value:.2f}")
        else:
            print(f"  {key}: {value}")


if __name__ == "__main__":
    main()
