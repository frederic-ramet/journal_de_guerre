#!/usr/bin/env python3
"""
Line segmentation module for HTR pipeline.
Detects and extracts individual text lines from document images.
"""

import cv2
import numpy as np
from pathlib import Path
from typing import List, Tuple, Optional
import logging
from dataclasses import dataclass

logger = logging.getLogger(__name__)


@dataclass
class TextLine:
    """Represents a detected text line."""
    image: np.ndarray
    bbox: Tuple[int, int, int, int]  # x, y, width, height
    line_number: int
    column: int = 0  # For multi-column documents


class LineDetector:
    """Detect and segment individual text lines from document images."""

    def __init__(self, config: Optional[dict] = None):
        """Initialize line detector.

        Args:
            config: Configuration dictionary
        """
        self.config = config or self._default_config()

    @staticmethod
    def _default_config() -> dict:
        """Default configuration for line detection."""
        return {
            "min_line_height": 15,
            "max_line_height": 200,
            "min_line_width_ratio": 0.1,  # Min width as ratio of page width
            "horizontal_projection_threshold": 0.02,  # Lower for faded documents
            "vertical_gap_threshold": 10,
            "detect_columns": False,  # Set True for double-page scans
            "max_columns": 2,
            "line_padding": 8,
        }

    def detect_lines(self, image: np.ndarray) -> List[TextLine]:
        """Detect all text lines in the image.

        Args:
            image: Preprocessed binary image

        Returns:
            List of TextLine objects
        """
        logger.info("Detecting text lines...")

        # Ensure grayscale
        if len(image.shape) == 3:
            image = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)

        # Store original for line extraction (before heavy processing)
        original_image = image.copy()

        mean_val = np.mean(image)
        std_val = np.std(image)
        logger.debug(f"Image stats: mean={mean_val:.1f}, std={std_val:.1f}")

        # Try multiple enhancement strategies with fallback
        enhancement_strategies = self._get_enhancement_strategies()

        best_lines = []
        best_strategy = "none"

        for strategy_name, enhance_func in enhancement_strategies:
            logger.debug(f"Trying strategy: {strategy_name}")

            # Apply enhancement
            processed_image = enhance_func(image.copy())

            # Invert if necessary (we want white text on black for detection)
            if np.mean(processed_image) > 127:
                processed_image = 255 - processed_image

            # Detect lines with this strategy
            lines = self._detect_lines_single_pass(original_image, processed_image)

            logger.debug(f"Strategy '{strategy_name}': found {len(lines)} lines")

            if len(lines) > len(best_lines):
                best_lines = lines
                best_strategy = strategy_name

            # If we found a reasonable number of lines, stop trying
            if len(lines) >= 3:
                break

        logger.info(f"Best strategy: '{best_strategy}' with {len(best_lines)} text lines")
        return best_lines

    def _get_enhancement_strategies(self) -> List[Tuple[str, callable]]:
        """Get list of enhancement strategies to try.

        Returns:
            List of (name, function) tuples
        """
        strategies = [
            ("adaptive_strong", self._enhance_adaptive_strong),
            ("adaptive_medium", self._enhance_adaptive_medium),
            ("otsu_clahe", self._enhance_otsu_clahe),
            ("simple_threshold", self._enhance_simple_threshold),
            ("morphological", self._enhance_morphological),
        ]
        return strategies

    def _detect_lines_single_pass(
        self,
        original_image: np.ndarray,
        processed_image: np.ndarray
    ) -> List[TextLine]:
        """Single pass line detection with a specific processed image.

        Args:
            original_image: Original grayscale for line extraction
            processed_image: Processed/binary image for detection

        Returns:
            List of TextLine objects
        """
        # Detect columns
        if self.config.get("detect_columns", False):
            columns = self._detect_columns(processed_image)
        else:
            columns = [(0, processed_image.shape[1])]

        all_lines = []
        line_number = 0

        for col_idx, (col_start, col_end) in enumerate(columns):
            column_img = processed_image[:, col_start:col_end]
            original_col = original_image[:, col_start:col_end]

            line_regions = self._detect_line_regions(column_img)

            for y_start, y_end in line_regions:
                line_img = original_col[y_start:y_end, :]
                processed_line = column_img[y_start:y_end, :]
                line_img = self._crop_to_content_with_mask(line_img, processed_line)

                if line_img is not None and self._is_valid_line(line_img):
                    bbox = (col_start, y_start, col_end - col_start, y_end - y_start)
                    text_line = TextLine(
                        image=line_img,
                        bbox=bbox,
                        line_number=line_number,
                        column=col_idx
                    )
                    all_lines.append(text_line)
                    line_number += 1

        return all_lines

    def _enhance_adaptive_strong(self, image: np.ndarray) -> np.ndarray:
        """Strong adaptive enhancement for very faded documents."""
        clahe = cv2.createCLAHE(clipLimit=5.0, tileGridSize=(8, 8))
        enhanced = clahe.apply(image)

        binary = cv2.adaptiveThreshold(
            enhanced, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
            cv2.THRESH_BINARY, 21, 10
        )

        kernel = np.ones((3, 3), np.uint8)
        binary = cv2.morphologyEx(binary, cv2.MORPH_CLOSE, kernel)
        return binary

    def _enhance_adaptive_medium(self, image: np.ndarray) -> np.ndarray:
        """Medium adaptive enhancement."""
        clahe = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(8, 8))
        enhanced = clahe.apply(image)

        binary = cv2.adaptiveThreshold(
            enhanced, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
            cv2.THRESH_BINARY, 31, 15
        )

        kernel = np.ones((2, 2), np.uint8)
        binary = cv2.morphologyEx(binary, cv2.MORPH_CLOSE, kernel)
        return binary

    def _enhance_otsu_clahe(self, image: np.ndarray) -> np.ndarray:
        """Otsu thresholding with CLAHE preprocessing."""
        clahe = cv2.createCLAHE(clipLimit=4.0, tileGridSize=(8, 8))
        enhanced = clahe.apply(image)

        _, binary = cv2.threshold(enhanced, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
        return binary

    def _enhance_simple_threshold(self, image: np.ndarray) -> np.ndarray:
        """Simple fixed threshold (for high contrast documents)."""
        # Normalize first
        normalized = cv2.normalize(image, None, 0, 255, cv2.NORM_MINMAX)

        # Use percentile-based threshold
        threshold_val = np.percentile(normalized, 85)
        _, binary = cv2.threshold(normalized, threshold_val, 255, cv2.THRESH_BINARY)

        return binary

    def _enhance_morphological(self, image: np.ndarray) -> np.ndarray:
        """Heavy morphological processing for very faint text."""
        # Strong contrast enhancement
        clahe = cv2.createCLAHE(clipLimit=6.0, tileGridSize=(4, 4))
        enhanced = clahe.apply(image)

        # Bilateral filter to reduce noise while keeping edges
        filtered = cv2.bilateralFilter(enhanced, 9, 75, 75)

        # Adaptive threshold with small block size
        binary = cv2.adaptiveThreshold(
            filtered, 255, cv2.ADAPTIVE_THRESH_MEAN_C,
            cv2.THRESH_BINARY, 15, 8
        )

        # Dilate to connect broken text
        kernel_dilate = np.ones((2, 3), np.uint8)
        binary = cv2.dilate(binary, kernel_dilate, iterations=1)

        # Close gaps
        kernel_close = np.ones((3, 3), np.uint8)
        binary = cv2.morphologyEx(binary, cv2.MORPH_CLOSE, kernel_close)

        return binary

    def _enhance_faded_document(self, image: np.ndarray) -> np.ndarray:
        """Legacy method - now uses adaptive_medium strategy."""
        return self._enhance_adaptive_medium(image)

    def _crop_to_content_with_mask(self, line_img: np.ndarray, mask_img: np.ndarray) -> Optional[np.ndarray]:
        """Crop line image using a mask to find text bounds.

        Args:
            line_img: Original line image (for output)
            mask_img: Processed/binary image (for finding bounds)

        Returns:
            Cropped image or None if empty
        """
        # Vertical projection to find text bounds
        v_proj = np.sum(mask_img, axis=0)

        # Find non-zero regions
        non_zero = np.where(v_proj > 0)[0]
        if len(non_zero) == 0:
            return None

        left = non_zero[0]
        right = non_zero[-1]

        # Add small padding
        padding = 5
        left = max(0, left - padding)
        right = min(line_img.shape[1], right + padding)

        return line_img[:, left:right]

    def _detect_columns(self, image: np.ndarray) -> List[Tuple[int, int]]:
        """Detect vertical columns in the document.

        Args:
            image: Binary image (white text on black)

        Returns:
            List of (start_x, end_x) tuples for each column
        """
        # Vertical projection profile
        v_proj = np.sum(image, axis=0)

        # Smooth the projection
        kernel_size = image.shape[1] // 50
        if kernel_size % 2 == 0:
            kernel_size += 1
        v_proj_smooth = np.convolve(v_proj, np.ones(kernel_size)/kernel_size, mode='same')

        # Find valleys (potential column separators)
        threshold = np.mean(v_proj_smooth) * 0.1
        valleys = np.where(v_proj_smooth < threshold)[0]

        if len(valleys) == 0:
            return [(0, image.shape[1])]

        # Group continuous valleys
        column_gaps = []
        gap_start = valleys[0]
        for i in range(1, len(valleys)):
            if valleys[i] - valleys[i-1] > 1:
                gap_end = valleys[i-1]
                gap_width = gap_end - gap_start
                gap_center = (gap_start + gap_end) // 2
                # Only consider significant gaps near the center
                if gap_width > image.shape[1] * 0.02:
                    if image.shape[1] * 0.3 < gap_center < image.shape[1] * 0.7:
                        column_gaps.append(gap_center)
                gap_start = valleys[i]

        # Limit to max columns
        max_cols = self.config.get("max_columns", 2)
        if len(column_gaps) >= max_cols:
            column_gaps = column_gaps[:max_cols-1]

        # Create column boundaries
        columns = []
        prev_end = 0
        for gap in column_gaps:
            columns.append((prev_end, gap))
            prev_end = gap
        columns.append((prev_end, image.shape[1]))

        return columns

    def _detect_line_regions(self, image: np.ndarray) -> List[Tuple[int, int]]:
        """Detect horizontal line regions using projection profile.

        Args:
            image: Column image (white text on black)

        Returns:
            List of (y_start, y_end) tuples
        """
        # Horizontal projection profile
        h_proj = np.sum(image, axis=1)

        # Normalize
        max_proj = np.max(h_proj)
        if max_proj > 0:
            h_proj = h_proj / max_proj
        else:
            logger.warning("Empty projection profile - no text detected")
            return []

        logger.debug(f"Projection profile: max={max_proj}, mean={np.mean(h_proj):.3f}")

        # Threshold for line detection - use lower threshold for faded documents
        threshold = self.config.get("horizontal_projection_threshold", 0.02)

        # Find line regions (where projection > threshold)
        in_line = False
        line_start = 0
        lines = []
        padding = self.config.get("line_padding", 5)

        for i, val in enumerate(h_proj):
            if val > threshold and not in_line:
                # Start of a line
                line_start = max(0, i - padding)
                in_line = True
            elif val <= threshold and in_line:
                # End of a line
                line_end = min(len(h_proj), i + padding)
                lines.append((line_start, line_end))
                in_line = False

        # Handle case where last line extends to bottom
        if in_line:
            lines.append((line_start, len(h_proj)))

        # Merge lines that are too close
        merged_lines = self._merge_close_lines(lines)

        return merged_lines

    def _merge_close_lines(self, lines: List[Tuple[int, int]]) -> List[Tuple[int, int]]:
        """Merge line regions that are too close together.

        Args:
            lines: List of (y_start, y_end) tuples

        Returns:
            Merged line regions
        """
        if not lines:
            return lines

        gap_threshold = self.config.get("vertical_gap_threshold", 10)
        merged = [lines[0]]

        for line_start, line_end in lines[1:]:
            prev_start, prev_end = merged[-1]

            if line_start - prev_end < gap_threshold:
                # Merge with previous line
                merged[-1] = (prev_start, line_end)
            else:
                merged.append((line_start, line_end))

        return merged

    def _crop_to_content(self, line_img: np.ndarray) -> Optional[np.ndarray]:
        """Crop line image to actual text content horizontally.

        Args:
            line_img: Line image

        Returns:
            Cropped image or None if empty
        """
        # Vertical projection to find text bounds
        v_proj = np.sum(line_img, axis=0)

        # Find non-zero regions
        non_zero = np.where(v_proj > 0)[0]
        if len(non_zero) == 0:
            return None

        left = non_zero[0]
        right = non_zero[-1]

        # Add small padding
        padding = 5
        left = max(0, left - padding)
        right = min(line_img.shape[1], right + padding)

        return line_img[:, left:right]

    def _is_valid_line(self, line_img: np.ndarray) -> bool:
        """Check if detected line is valid (not noise).

        Args:
            line_img: Line image

        Returns:
            True if valid line
        """
        height, width = line_img.shape[:2]

        min_height = self.config.get("min_line_height", 20)
        max_height = self.config.get("max_line_height", 200)
        min_width_ratio = self.config.get("min_line_width_ratio", 0.1)

        # Check dimensions
        if height < min_height or height > max_height:
            return False

        if width < min_height * min_width_ratio:  # Too narrow
            return False

        # Check ink density (should have some content)
        ink_ratio = np.sum(line_img > 0) / (height * width)
        if ink_ratio < 0.01 or ink_ratio > 0.9:
            return False

        return True

    def save_lines(self, lines: List[TextLine], output_dir: str) -> List[str]:
        """Save extracted line images to disk.

        Args:
            lines: List of TextLine objects
            output_dir: Directory to save line images

        Returns:
            List of saved file paths
        """
        output_path = Path(output_dir)
        output_path.mkdir(parents=True, exist_ok=True)

        saved_files = []
        for line in lines:
            filename = f"line_{line.line_number:04d}_col{line.column}.png"
            filepath = output_path / filename
            cv2.imwrite(str(filepath), line.image)
            saved_files.append(str(filepath))

        logger.info(f"Saved {len(saved_files)} line images to {output_dir}")
        return saved_files


def segment_document(
    image_path: str,
    output_dir: str,
    config: Optional[dict] = None
) -> List[str]:
    """Segment a single document into lines.

    Args:
        image_path: Path to preprocessed document image
        output_dir: Directory to save line images
        config: Optional configuration

    Returns:
        List of saved line image paths
    """
    detector = LineDetector(config)

    # Load image
    img = cv2.imread(image_path, cv2.IMREAD_GRAYSCALE)
    if img is None:
        raise ValueError(f"Cannot load image: {image_path}")

    # Detect lines
    lines = detector.detect_lines(img)

    # Save lines
    return detector.save_lines(lines, output_dir)
