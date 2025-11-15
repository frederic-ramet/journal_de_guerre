#!/usr/bin/env python3
"""
Image preprocessing module for HTR pipeline.
Handles image enhancement, binarization, deskewing, and noise removal.
"""

import cv2
import numpy as np
from pathlib import Path
from typing import Tuple, Optional
import logging

logger = logging.getLogger(__name__)


class ImageEnhancer:
    """Enhance and preprocess images for optimal HTR performance."""

    def __init__(self, config: Optional[dict] = None):
        """Initialize with optional configuration.

        Args:
            config: Dictionary with preprocessing parameters
        """
        self.config = config or self._default_config()

    @staticmethod
    def _default_config() -> dict:
        """Default preprocessing configuration."""
        return {
            "target_dpi": 300,
            "binarization_method": "sauvola",  # "otsu", "sauvola", "adaptive"
            "denoise_strength": 10,
            "contrast_clip_limit": 2.0,
            "deskew_enabled": True,
            "border_removal": True,
        }

    def process(self, image_path: str) -> np.ndarray:
        """Full preprocessing pipeline for a single image.

        Args:
            image_path: Path to input image

        Returns:
            Preprocessed image as numpy array
        """
        logger.info(f"Preprocessing: {image_path}")

        # Load image
        img = cv2.imread(str(image_path))
        if img is None:
            raise ValueError(f"Cannot load image: {image_path}")

        # Convert to grayscale
        gray = self._to_grayscale(img)

        # Enhance contrast
        enhanced = self._enhance_contrast(gray)

        # Denoise
        denoised = self._denoise(enhanced)

        # Deskew if enabled
        if self.config.get("deskew_enabled", True):
            denoised = self._deskew(denoised)

        # Binarize
        binary = self._binarize(denoised)

        # Remove borders/margins if enabled
        if self.config.get("border_removal", True):
            binary = self._remove_borders(binary)

        logger.debug(f"Preprocessing complete. Output shape: {binary.shape}")
        return binary

    def _to_grayscale(self, img: np.ndarray) -> np.ndarray:
        """Convert image to grayscale."""
        if len(img.shape) == 3:
            return cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        return img

    def _enhance_contrast(self, img: np.ndarray) -> np.ndarray:
        """Enhance contrast using CLAHE (Contrast Limited Adaptive Histogram Equalization)."""
        clip_limit = self.config.get("contrast_clip_limit", 2.0)
        clahe = cv2.createCLAHE(clipLimit=clip_limit, tileGridSize=(8, 8))
        return clahe.apply(img)

    def _denoise(self, img: np.ndarray) -> np.ndarray:
        """Remove noise while preserving edges."""
        strength = self.config.get("denoise_strength", 10)
        return cv2.fastNlMeansDenoising(img, None, strength, 7, 21)

    def _deskew(self, img: np.ndarray) -> np.ndarray:
        """Correct image rotation/skew."""
        # Detect lines using Hough transform
        edges = cv2.Canny(img, 50, 150, apertureSize=3)
        lines = cv2.HoughLinesP(edges, 1, np.pi/180, 100, minLineLength=100, maxLineGap=10)

        if lines is None:
            logger.debug("No lines detected for deskewing")
            return img

        # Calculate average angle
        angles = []
        for line in lines:
            x1, y1, x2, y2 = line[0]
            if x2 - x1 != 0:
                angle = np.degrees(np.arctan2(y2 - y1, x2 - x1))
                if -45 < angle < 45:  # Only consider near-horizontal lines
                    angles.append(angle)

        if not angles:
            return img

        median_angle = np.median(angles)

        if abs(median_angle) < 0.5:  # Skip if rotation is minimal
            return img

        logger.debug(f"Deskewing by {median_angle:.2f} degrees")

        # Rotate image
        (h, w) = img.shape[:2]
        center = (w // 2, h // 2)
        rotation_matrix = cv2.getRotationMatrix2D(center, median_angle, 1.0)
        rotated = cv2.warpAffine(img, rotation_matrix, (w, h),
                                  flags=cv2.INTER_CUBIC,
                                  borderMode=cv2.BORDER_REPLICATE)
        return rotated

    def _binarize(self, img: np.ndarray) -> np.ndarray:
        """Convert to binary image using specified method."""
        method = self.config.get("binarization_method", "sauvola")

        if method == "otsu":
            _, binary = cv2.threshold(img, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)

        elif method == "adaptive":
            binary = cv2.adaptiveThreshold(
                img, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
                cv2.THRESH_BINARY, 11, 2
            )

        elif method == "sauvola":
            binary = self._sauvola_binarization(img)

        else:
            raise ValueError(f"Unknown binarization method: {method}")

        return binary

    def _sauvola_binarization(self, img: np.ndarray, window_size: int = 25, k: float = 0.2) -> np.ndarray:
        """Sauvola binarization - good for degraded historical documents.

        Args:
            img: Grayscale image
            window_size: Size of local window (must be odd)
            k: Sauvola parameter (typically 0.2-0.5)

        Returns:
            Binary image
        """
        if window_size % 2 == 0:
            window_size += 1

        # Calculate local mean and standard deviation
        mean = cv2.blur(img.astype(np.float64), (window_size, window_size))
        mean_sq = cv2.blur(img.astype(np.float64)**2, (window_size, window_size))
        std = np.sqrt(mean_sq - mean**2)

        # Sauvola threshold: T = mean * (1 + k * (std/R - 1))
        R = 128  # Dynamic range of standard deviation (for 8-bit images)
        threshold = mean * (1 + k * (std / R - 1))

        # Apply threshold
        binary = np.zeros_like(img)
        binary[img > threshold] = 255

        return binary.astype(np.uint8)

    def _remove_borders(self, img: np.ndarray) -> np.ndarray:
        """Remove dark borders and margins."""
        # Find contours
        contours, _ = cv2.findContours(
            255 - img, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE
        )

        if not contours:
            return img

        # Find bounding box of all text
        x_min, y_min = img.shape[1], img.shape[0]
        x_max, y_max = 0, 0

        for contour in contours:
            x, y, w, h = cv2.boundingRect(contour)
            # Filter out noise (very small contours)
            if w * h > 100:
                x_min = min(x_min, x)
                y_min = min(y_min, y)
                x_max = max(x_max, x + w)
                y_max = max(y_max, y + h)

        if x_max > x_min and y_max > y_min:
            # Add padding
            padding = 20
            x_min = max(0, x_min - padding)
            y_min = max(0, y_min - padding)
            x_max = min(img.shape[1], x_max + padding)
            y_max = min(img.shape[0], y_max + padding)

            return img[y_min:y_max, x_min:x_max]

        return img

    def save_processed(self, img: np.ndarray, output_path: str) -> None:
        """Save preprocessed image to disk."""
        cv2.imwrite(str(output_path), img)
        logger.info(f"Saved preprocessed image to: {output_path}")


def preprocess_batch(
    input_dir: str,
    output_dir: str,
    config: Optional[dict] = None
) -> list:
    """Preprocess all images in a directory.

    Args:
        input_dir: Directory containing input images
        output_dir: Directory to save processed images
        config: Optional preprocessing configuration

    Returns:
        List of output file paths
    """
    input_path = Path(input_dir)
    output_path = Path(output_dir)
    output_path.mkdir(parents=True, exist_ok=True)

    enhancer = ImageEnhancer(config)

    image_extensions = {'.jpg', '.jpeg', '.png', '.tiff', '.bmp'}
    image_files = sorted([
        f for f in input_path.glob('**/*')
        if f.suffix.lower() in image_extensions
    ])

    output_files = []
    for img_file in image_files:
        try:
            processed = enhancer.process(str(img_file))
            output_file = output_path / f"{img_file.stem}_processed.png"
            enhancer.save_processed(processed, str(output_file))
            output_files.append(str(output_file))
        except Exception as e:
            logger.error(f"Error processing {img_file}: {e}")

    return output_files
