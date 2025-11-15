#!/usr/bin/env python3
"""
TrOCR-based Handwritten Text Recognition engine.
Uses Microsoft's TrOCR model fine-tuned for handwritten text.
"""

import torch
from transformers import TrOCRProcessor, VisionEncoderDecoderModel
from PIL import Image
import numpy as np
from pathlib import Path
from typing import List, Optional, Union
import logging
import time

logger = logging.getLogger(__name__)


class TrOCREngine:
    """TrOCR-based text recognition for handwritten documents."""

    AVAILABLE_MODELS = {
        "base": "microsoft/trocr-base-handwritten",
        "large": "microsoft/trocr-large-handwritten",
        "small": "microsoft/trocr-small-handwritten",
    }

    def __init__(
        self,
        model_name: str = "base",
        device: Optional[str] = None,
        custom_model_path: Optional[str] = None
    ):
        """Initialize TrOCR engine.

        Args:
            model_name: "base", "large", or "small" for pretrained models
            device: "cuda", "cpu", or None for auto-detection
            custom_model_path: Path to fine-tuned model (overrides model_name)
        """
        # Determine device
        if device is None:
            self.device = "cuda" if torch.cuda.is_available() else "cpu"
        else:
            self.device = device

        logger.info(f"Using device: {self.device}")

        # Load model
        if custom_model_path and Path(custom_model_path).exists():
            logger.info(f"Loading custom model from: {custom_model_path}")
            self.processor = TrOCRProcessor.from_pretrained(custom_model_path)
            self.model = VisionEncoderDecoderModel.from_pretrained(custom_model_path)
        else:
            model_id = self.AVAILABLE_MODELS.get(model_name)
            if model_id is None:
                raise ValueError(f"Unknown model: {model_name}. Available: {list(self.AVAILABLE_MODELS.keys())}")

            logger.info(f"Loading pretrained model: {model_id}")
            self.processor = TrOCRProcessor.from_pretrained(model_id)
            self.model = VisionEncoderDecoderModel.from_pretrained(model_id)

        # Move model to device
        self.model.to(self.device)
        self.model.eval()

        # Generation config
        self.generation_config = {
            "max_length": 256,
            "num_beams": 5,
            "early_stopping": True,
            "no_repeat_ngram_size": 3,
        }

        logger.info("TrOCR engine initialized successfully")

    def recognize_line(self, image: Union[str, np.ndarray, Image.Image]) -> str:
        """Recognize text from a single line image.

        Args:
            image: Image path, numpy array, or PIL Image

        Returns:
            Recognized text string
        """
        # Convert to PIL Image
        if isinstance(image, str):
            pil_image = Image.open(image).convert("RGB")
        elif isinstance(image, np.ndarray):
            pil_image = Image.fromarray(image).convert("RGB")
        elif isinstance(image, Image.Image):
            pil_image = image.convert("RGB")
        else:
            raise ValueError(f"Unsupported image type: {type(image)}")

        # Preprocess for TrOCR
        pixel_values = self.processor(pil_image, return_tensors="pt").pixel_values
        pixel_values = pixel_values.to(self.device)

        # Generate text
        with torch.no_grad():
            generated_ids = self.model.generate(
                pixel_values,
                **self.generation_config
            )

        # Decode
        text = self.processor.batch_decode(generated_ids, skip_special_tokens=True)[0]
        return text.strip()

    def recognize_batch(self, images: List[Union[str, np.ndarray, Image.Image]]) -> List[str]:
        """Recognize text from multiple line images.

        Args:
            images: List of images (paths, arrays, or PIL Images)

        Returns:
            List of recognized text strings
        """
        if not images:
            return []

        logger.info(f"Recognizing {len(images)} lines...")
        start_time = time.time()

        results = []
        for i, img in enumerate(images):
            try:
                text = self.recognize_line(img)
                results.append(text)

                if (i + 1) % 10 == 0:
                    logger.debug(f"Processed {i + 1}/{len(images)} lines")

            except Exception as e:
                logger.warning(f"Error recognizing line {i}: {e}")
                results.append("")

        elapsed = time.time() - start_time
        avg_time = elapsed / len(images) if images else 0
        logger.info(f"Recognition complete. Total: {elapsed:.2f}s, Avg: {avg_time:.3f}s per line")

        return results

    def recognize_document(
        self,
        line_images_dir: str,
        preserve_structure: bool = True
    ) -> str:
        """Recognize all lines in a directory and combine into document.

        Args:
            line_images_dir: Directory containing line images
            preserve_structure: If True, respects line numbering from filenames

        Returns:
            Full recognized text
        """
        line_dir = Path(line_images_dir)
        if not line_dir.exists():
            raise ValueError(f"Directory not found: {line_images_dir}")

        # Get line images sorted by filename
        line_files = sorted(line_dir.glob("*.png"))
        if not line_files:
            line_files = sorted(line_dir.glob("*.jpg"))

        if not line_files:
            logger.warning(f"No line images found in {line_images_dir}")
            return ""

        # Recognize all lines
        texts = self.recognize_batch([str(f) for f in line_files])

        # Combine into document
        if preserve_structure:
            # Group by column if detected
            columns = {}
            for filepath, text in zip(line_files, texts):
                # Extract column from filename if present (e.g., line_0001_col0.png)
                name = filepath.stem
                if "_col" in name:
                    col_num = int(name.split("_col")[1])
                else:
                    col_num = 0

                if col_num not in columns:
                    columns[col_num] = []
                columns[col_num].append(text)

            # Combine columns (left to right, then concatenate)
            document_lines = []
            for col_num in sorted(columns.keys()):
                document_lines.extend(columns[col_num])
                if len(columns) > 1 and col_num < max(columns.keys()):
                    document_lines.append("")  # Separator between columns

            return "\n".join(document_lines)
        else:
            return "\n".join(texts)

    def save_model(self, output_dir: str) -> None:
        """Save the current model and processor.

        Args:
            output_dir: Directory to save model
        """
        output_path = Path(output_dir)
        output_path.mkdir(parents=True, exist_ok=True)

        self.model.save_pretrained(str(output_path))
        self.processor.save_pretrained(str(output_path))
        logger.info(f"Model saved to: {output_path}")


class RecognitionResult:
    """Container for recognition results with metadata."""

    def __init__(
        self,
        text: str,
        confidence: Optional[float] = None,
        line_number: Optional[int] = None,
        processing_time: Optional[float] = None
    ):
        self.text = text
        self.confidence = confidence
        self.line_number = line_number
        self.processing_time = processing_time

    def __repr__(self):
        return f"RecognitionResult(line={self.line_number}, text='{self.text[:50]}...')"


def quick_recognize(
    image_path: str,
    model_name: str = "base"
) -> str:
    """Quick recognition of a single image.

    Args:
        image_path: Path to line image
        model_name: Model to use ("base", "large", "small")

    Returns:
        Recognized text
    """
    engine = TrOCREngine(model_name=model_name)
    return engine.recognize_line(image_path)
