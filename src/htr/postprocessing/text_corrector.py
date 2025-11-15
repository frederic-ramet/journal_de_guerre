#!/usr/bin/env python3
"""
Post-processing module for HTR output.
Handles spell checking, text correction, and formatting.
"""

import re
from typing import List, Set, Optional, Dict
from pathlib import Path
import logging
import json

logger = logging.getLogger(__name__)

# Optional imports with fallbacks
try:
    from spellchecker import SpellChecker
    SPELLCHECKER_AVAILABLE = True
except ImportError:
    SPELLCHECKER_AVAILABLE = False
    logger.debug("pyspellchecker not available")

try:
    import language_tool_python
    LANGUAGETOOL_AVAILABLE = True
except ImportError:
    LANGUAGETOOL_AVAILABLE = False
    logger.debug("language-tool-python not available")


class TextCorrector:
    """Post-process and correct HTR output."""

    def __init__(self, config: Optional[dict] = None):
        """Initialize text corrector.

        Args:
            config: Configuration dictionary
        """
        self.config = config or self._default_config()
        self._setup_tools()

    @staticmethod
    def _default_config() -> dict:
        """Default configuration."""
        return {
            "language": "fr",
            "use_spell_checker": True,
            "use_grammar_checker": False,  # Slower but more accurate
            "custom_vocabulary_file": None,
            "date_normalization": True,
            "preserve_original_case": True,
            "min_word_length": 2,
            "max_corrections_per_word": 3,
        }

    def _setup_tools(self):
        """Initialize spell checking and grammar tools."""
        lang = self.config.get("language", "fr")

        # Setup spell checker
        if self.config.get("use_spell_checker") and SPELLCHECKER_AVAILABLE:
            self.spell = SpellChecker(language=lang)
            logger.info(f"Spell checker initialized for language: {lang}")
        else:
            self.spell = None

        # Setup grammar checker (optional, heavier)
        if self.config.get("use_grammar_checker") and LANGUAGETOOL_AVAILABLE:
            try:
                self.grammar = language_tool_python.LanguageTool(lang)
                logger.info("Grammar checker initialized")
            except Exception as e:
                logger.warning(f"Could not initialize grammar checker: {e}")
                self.grammar = None
        else:
            self.grammar = None

        # Load custom vocabulary
        self.custom_vocab = self._load_custom_vocabulary()

        # Historical French patterns
        self._setup_patterns()

    def _load_custom_vocabulary(self) -> Set[str]:
        """Load custom vocabulary specific to the journal."""
        vocab = set()

        # Default terms for historical French journal
        default_vocab = {
            # Spiritual/philosophical terms from the journal
            "spiritisme", "réincarnation", "incarnation", "désincarnation",
            "exhilaration", "macération", "potincaration", "déminéralisation",
            # Common old French
            "aspirations", "immortel", "communiquer",
            # Names (from the journal)
            "Ramet", "Ernest", "Romain", "Cini", "Edouard",
            # Places
            "Montpellier",
            # Old spellings
            "étude", "leçon", "voie",
        }
        vocab.update(default_vocab)

        # Load from file if specified
        vocab_file = self.config.get("custom_vocabulary_file")
        if vocab_file and Path(vocab_file).exists():
            try:
                with open(vocab_file, "r", encoding="utf-8") as f:
                    for line in f:
                        word = line.strip()
                        if word and not word.startswith("#"):
                            vocab.add(word)
                logger.info(f"Loaded {len(vocab)} words from custom vocabulary")
            except Exception as e:
                logger.warning(f"Error loading custom vocabulary: {e}")

        if self.spell:
            self.spell.word_frequency.load_words(vocab)

        return vocab

    def _setup_patterns(self):
        """Setup regex patterns for text correction."""
        # Date patterns (French historical)
        self.date_patterns = [
            # "le 15-6-16", "le 13 juin 1911"
            (r"le\s+(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})", r"le \1-\2-\3"),
            (r"(\d{1,2})\s+(janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre)\s+(\d{2,4})",
             r"\1 \2 \3"),
        ]

        # Common OCR mistakes in French
        self.ocr_corrections = {
            "1'": "l'",  # One mistaken for l
            "0": "o",    # Context-dependent
            "|": "l",    # Pipe mistaken for l
            "rn": "m",   # Often misread
            "vv": "w",   # Double v
            "ii": "u",   # Double i
        }

        # Word boundary patterns
        self.word_pattern = re.compile(r'\b\w+\b', re.UNICODE)

    def correct_text(self, text: str) -> str:
        """Apply all corrections to text.

        Args:
            text: Raw recognized text

        Returns:
            Corrected text
        """
        logger.debug(f"Correcting text: {len(text)} characters")

        # Clean basic artifacts
        text = self._clean_artifacts(text)

        # Fix common OCR errors
        text = self._fix_ocr_errors(text)

        # Spell check individual words
        if self.spell:
            text = self._spell_check(text)

        # Normalize dates
        if self.config.get("date_normalization"):
            text = self._normalize_dates(text)

        # Grammar check (if enabled and available)
        if self.grammar:
            text = self._grammar_check(text)

        # Final cleanup
        text = self._final_cleanup(text)

        return text

    def _clean_artifacts(self, text: str) -> str:
        """Remove common HTR artifacts."""
        # Remove repeated spaces
        text = re.sub(r' +', ' ', text)

        # Remove leading/trailing whitespace per line
        lines = [line.strip() for line in text.split('\n')]
        text = '\n'.join(lines)

        # Remove isolated punctuation
        text = re.sub(r'^\s*[.,;:!?]+\s*$', '', text, flags=re.MULTILINE)

        return text

    def _fix_ocr_errors(self, text: str) -> str:
        """Fix common OCR recognition errors."""
        # Apply character-level corrections
        for wrong, right in self.ocr_corrections.items():
            # Only fix in word context to avoid breaking things
            text = re.sub(rf'\b(\w*){re.escape(wrong)}(\w*)\b',
                         lambda m: m.group(1) + right + m.group(2) if len(m.group(0)) > 2 else m.group(0),
                         text)

        return text

    def _spell_check(self, text: str) -> str:
        """Correct spelling errors."""
        if not self.spell:
            return text

        words = self.word_pattern.findall(text)
        corrections = {}

        min_length = self.config.get("min_word_length", 2)
        max_corrections = self.config.get("max_corrections_per_word", 3)

        for word in words:
            if len(word) < min_length:
                continue

            # Skip if in custom vocabulary
            if word.lower() in self.custom_vocab or word in self.custom_vocab:
                continue

            # Skip numbers
            if word.isdigit():
                continue

            # Check spelling
            if word.lower() not in self.spell:
                candidates = self.spell.candidates(word.lower())
                if candidates:
                    # Get best candidate
                    correction = self.spell.correction(word.lower())
                    if correction and correction != word.lower():
                        # Preserve original case
                        if self.config.get("preserve_original_case", True):
                            if word.isupper():
                                correction = correction.upper()
                            elif word[0].isupper():
                                correction = correction.capitalize()

                        corrections[word] = correction
                        logger.debug(f"Spelling correction: {word} -> {correction}")

        # Apply corrections
        for wrong, right in corrections.items():
            # Use word boundaries to avoid partial replacements
            text = re.sub(rf'\b{re.escape(wrong)}\b', right, text)

        return text

    def _normalize_dates(self, text: str) -> str:
        """Normalize date formats."""
        for pattern, replacement in self.date_patterns:
            text = re.sub(pattern, replacement, text, flags=re.IGNORECASE)

        return text

    def _grammar_check(self, text: str) -> str:
        """Apply grammar corrections (slower but thorough)."""
        if not self.grammar:
            return text

        try:
            matches = self.grammar.check(text)
            # Apply corrections in reverse order to preserve positions
            for match in reversed(matches):
                if match.replacements:
                    # Use first suggestion
                    replacement = match.replacements[0]
                    text = text[:match.offset] + replacement + text[match.offset + match.errorLength:]
                    logger.debug(f"Grammar correction: {match.context} -> {replacement}")
        except Exception as e:
            logger.warning(f"Grammar check error: {e}")

        return text

    def _final_cleanup(self, text: str) -> str:
        """Final text cleanup and formatting."""
        # Fix spacing around punctuation
        text = re.sub(r'\s+([.,;:!?])', r'\1', text)
        text = re.sub(r'([.,;:!?])([^\s\d])', r'\1 \2', text)

        # Ensure single newlines between paragraphs (not multiple)
        text = re.sub(r'\n{3,}', '\n\n', text)

        # Remove trailing whitespace
        text = '\n'.join(line.rstrip() for line in text.split('\n'))

        return text.strip()

    def add_vocabulary(self, words: List[str]) -> None:
        """Add words to custom vocabulary.

        Args:
            words: List of words to add
        """
        self.custom_vocab.update(words)
        if self.spell:
            self.spell.word_frequency.load_words(words)
        logger.info(f"Added {len(words)} words to vocabulary")

    def save_vocabulary(self, filepath: str) -> None:
        """Save custom vocabulary to file.

        Args:
            filepath: Output file path
        """
        with open(filepath, "w", encoding="utf-8") as f:
            for word in sorted(self.custom_vocab):
                f.write(f"{word}\n")
        logger.info(f"Saved vocabulary to: {filepath}")

    def get_statistics(self, original: str, corrected: str) -> Dict:
        """Get statistics about corrections made.

        Args:
            original: Original text
            corrected: Corrected text

        Returns:
            Dictionary with correction statistics
        """
        original_words = set(self.word_pattern.findall(original.lower()))
        corrected_words = set(self.word_pattern.findall(corrected.lower()))

        added = corrected_words - original_words
        removed = original_words - corrected_words

        return {
            "original_length": len(original),
            "corrected_length": len(corrected),
            "length_change": len(corrected) - len(original),
            "words_added": list(added)[:10],  # Sample
            "words_removed": list(removed)[:10],  # Sample
            "total_changes": len(added) + len(removed),
        }


def correct_document(
    input_file: str,
    output_file: str,
    config: Optional[dict] = None
) -> Dict:
    """Correct an entire document file.

    Args:
        input_file: Path to input text file
        output_file: Path to output corrected file
        config: Optional configuration

    Returns:
        Statistics dictionary
    """
    corrector = TextCorrector(config)

    # Read input
    with open(input_file, "r", encoding="utf-8") as f:
        original_text = f.read()

    # Correct
    corrected_text = corrector.correct_text(original_text)

    # Save output
    with open(output_file, "w", encoding="utf-8") as f:
        f.write(corrected_text)

    # Return stats
    stats = corrector.get_statistics(original_text, corrected_text)
    logger.info(f"Corrected document saved to: {output_file}")
    logger.info(f"Total changes: {stats['total_changes']}")

    return stats
