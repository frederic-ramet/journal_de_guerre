#!/usr/bin/env python3
"""
Fine-tuning module for TrOCR model.
Allows training on custom handwritten text datasets.
"""

import torch
from transformers import (
    TrOCRProcessor,
    VisionEncoderDecoderModel,
    Seq2SeqTrainer,
    Seq2SeqTrainingArguments,
    default_data_collator
)
from datasets import Dataset, DatasetDict
from PIL import Image
import pandas as pd
from pathlib import Path
from typing import Optional, Dict, Any, List
import logging
import json
from dataclasses import dataclass

logger = logging.getLogger(__name__)


@dataclass
class TrainingConfig:
    """Configuration for fine-tuning."""
    output_dir: str = "data/models/trocr-journal"
    num_epochs: int = 10
    batch_size: int = 8
    learning_rate: float = 5e-5
    warmup_steps: int = 100
    weight_decay: float = 0.01
    fp16: bool = True
    save_steps: int = 500
    eval_steps: int = 100
    logging_steps: int = 50


class TrOCRTrainer:
    """Fine-tune TrOCR model on custom dataset."""

    def __init__(
        self,
        base_model: str = "microsoft/trocr-base-handwritten",
        config: Optional[TrainingConfig] = None
    ):
        """Initialize trainer.

        Args:
            base_model: Base model to fine-tune
            config: Training configuration
        """
        self.base_model = base_model
        self.config = config or TrainingConfig()

        logger.info(f"Initializing trainer with base model: {base_model}")

        # Load processor and model
        self.processor = TrOCRProcessor.from_pretrained(base_model)
        self.model = VisionEncoderDecoderModel.from_pretrained(base_model)

        # Set special tokens
        self.model.config.decoder_start_token_id = self.processor.tokenizer.cls_token_id
        self.model.config.pad_token_id = self.processor.tokenizer.pad_token_id
        self.model.config.eos_token_id = self.processor.tokenizer.sep_token_id

        # Set generation parameters
        self.model.config.max_length = 256
        self.model.config.early_stopping = True
        self.model.config.no_repeat_ngram_size = 3
        self.model.config.length_penalty = 2.0
        self.model.config.num_beams = 4

    def prepare_dataset(
        self,
        images_dir: str,
        labels_file: str,
        val_split: float = 0.1
    ) -> DatasetDict:
        """Prepare dataset for training.

        Args:
            images_dir: Directory containing line images
            labels_file: CSV file with columns: image_path, transcription
            val_split: Fraction for validation set

        Returns:
            DatasetDict with train and validation splits
        """
        logger.info(f"Loading dataset from {labels_file}")

        # Load labels
        df = pd.read_csv(labels_file)
        if "image_path" not in df.columns or "transcription" not in df.columns:
            raise ValueError("Labels file must have 'image_path' and 'transcription' columns")

        images_path = Path(images_dir)

        # Validate images exist
        valid_samples = []
        for _, row in df.iterrows():
            img_path = images_path / row["image_path"]
            if img_path.exists():
                valid_samples.append({
                    "image_path": str(img_path),
                    "transcription": str(row["transcription"])
                })
            else:
                logger.warning(f"Image not found: {img_path}")

        logger.info(f"Found {len(valid_samples)} valid samples")

        # Create dataset
        dataset = Dataset.from_list(valid_samples)

        # Process dataset
        def process_sample(sample):
            image = Image.open(sample["image_path"]).convert("RGB")
            pixel_values = self.processor(image, return_tensors="pt").pixel_values.squeeze()

            # Tokenize labels
            labels = self.processor.tokenizer(
                sample["transcription"],
                padding="max_length",
                max_length=256,
                truncation=True
            ).input_ids

            # Replace padding token id with -100 for loss calculation
            labels = [l if l != self.processor.tokenizer.pad_token_id else -100 for l in labels]

            return {
                "pixel_values": pixel_values,
                "labels": torch.tensor(labels)
            }

        processed_dataset = dataset.map(
            process_sample,
            remove_columns=dataset.column_names,
            desc="Processing dataset"
        )

        # Split into train and validation
        split = processed_dataset.train_test_split(test_size=val_split, seed=42)
        dataset_dict = DatasetDict({
            "train": split["train"],
            "validation": split["test"]
        })

        logger.info(f"Train samples: {len(dataset_dict['train'])}")
        logger.info(f"Validation samples: {len(dataset_dict['validation'])}")

        return dataset_dict

    def train(self, dataset: DatasetDict) -> str:
        """Train the model.

        Args:
            dataset: DatasetDict with train and validation splits

        Returns:
            Path to saved model
        """
        logger.info("Starting training...")

        # Setup training arguments
        training_args = Seq2SeqTrainingArguments(
            output_dir=self.config.output_dir,
            num_train_epochs=self.config.num_epochs,
            per_device_train_batch_size=self.config.batch_size,
            per_device_eval_batch_size=self.config.batch_size,
            learning_rate=self.config.learning_rate,
            warmup_steps=self.config.warmup_steps,
            weight_decay=self.config.weight_decay,
            fp16=self.config.fp16 and torch.cuda.is_available(),
            save_steps=self.config.save_steps,
            eval_steps=self.config.eval_steps,
            logging_steps=self.config.logging_steps,
            evaluation_strategy="steps",
            save_strategy="steps",
            load_best_model_at_end=True,
            metric_for_best_model="eval_loss",
            greater_is_better=False,
            predict_with_generate=True,
            report_to="none",  # Disable wandb etc.
        )

        # Create trainer
        trainer = Seq2SeqTrainer(
            model=self.model,
            args=training_args,
            train_dataset=dataset["train"],
            eval_dataset=dataset["validation"],
            tokenizer=self.processor.feature_extractor,
            data_collator=default_data_collator,
        )

        # Train
        trainer.train()

        # Save final model
        output_path = Path(self.config.output_dir) / "final"
        self.model.save_pretrained(str(output_path))
        self.processor.save_pretrained(str(output_path))

        logger.info(f"Model saved to: {output_path}")
        return str(output_path)

    def evaluate(self, dataset: Dataset) -> Dict[str, float]:
        """Evaluate model on test dataset.

        Args:
            dataset: Test dataset

        Returns:
            Dictionary with metrics (CER, WER)
        """
        try:
            import jiwer
        except ImportError:
            logger.error("jiwer not installed. Run: pip install jiwer")
            return {}

        self.model.eval()
        device = next(self.model.parameters()).device

        predictions = []
        references = []

        for sample in dataset:
            pixel_values = sample["pixel_values"].unsqueeze(0).to(device)

            with torch.no_grad():
                generated_ids = self.model.generate(pixel_values)

            pred_text = self.processor.batch_decode(
                generated_ids, skip_special_tokens=True
            )[0]

            # Decode reference
            labels = [l for l in sample["labels"] if l != -100]
            ref_text = self.processor.tokenizer.decode(labels, skip_special_tokens=True)

            predictions.append(pred_text)
            references.append(ref_text)

        # Calculate metrics
        cer = jiwer.cer(references, predictions)
        wer = jiwer.wer(references, predictions)

        metrics = {
            "character_error_rate": cer,
            "word_error_rate": wer,
        }

        logger.info(f"Evaluation results: CER={cer:.4f}, WER={wer:.4f}")
        return metrics


def create_training_labels(
    lines_dir: str,
    output_file: str,
    interactive: bool = True
) -> str:
    """Helper to create training labels CSV.

    Args:
        lines_dir: Directory with line images
        output_file: Output CSV file path
        interactive: If True, prompts user for transcriptions

    Returns:
        Path to created CSV file
    """
    lines_path = Path(lines_dir)
    line_files = sorted(lines_path.glob("*.png"))

    if not line_files:
        line_files = sorted(lines_path.glob("*.jpg"))

    if not line_files:
        raise ValueError(f"No line images found in {lines_dir}")

    samples = []

    if interactive:
        print(f"Found {len(line_files)} line images")
        print("Enter transcription for each line (or 'skip' to skip, 'quit' to save and exit):")

        for i, line_file in enumerate(line_files):
            print(f"\n[{i+1}/{len(line_files)}] {line_file.name}")
            # In a real implementation, would display the image
            transcription = input("Transcription: ").strip()

            if transcription.lower() == "quit":
                break
            elif transcription.lower() != "skip":
                samples.append({
                    "image_path": line_file.name,
                    "transcription": transcription
                })
    else:
        # Create template with empty transcriptions
        samples = [
            {"image_path": f.name, "transcription": ""}
            for f in line_files
        ]

    # Save to CSV
    df = pd.DataFrame(samples)
    df.to_csv(output_file, index=False)
    logger.info(f"Saved {len(samples)} samples to {output_file}")

    return output_file


def main():
    """Main entry point for training."""
    import argparse

    parser = argparse.ArgumentParser(description="Fine-tune TrOCR model")
    parser.add_argument("images_dir", help="Directory with line images")
    parser.add_argument("labels_file", help="CSV file with transcriptions")
    parser.add_argument(
        "--output", "-o",
        default="data/models/trocr-journal",
        help="Output directory for model"
    )
    parser.add_argument(
        "--epochs", "-e",
        type=int,
        default=10,
        help="Number of training epochs"
    )
    parser.add_argument(
        "--batch-size", "-b",
        type=int,
        default=8,
        help="Batch size"
    )
    parser.add_argument(
        "--learning-rate", "-lr",
        type=float,
        default=5e-5,
        help="Learning rate"
    )

    args = parser.parse_args()

    config = TrainingConfig(
        output_dir=args.output,
        num_epochs=args.epochs,
        batch_size=args.batch_size,
        learning_rate=args.learning_rate
    )

    trainer = TrOCRTrainer(config=config)
    dataset = trainer.prepare_dataset(args.images_dir, args.labels_file)
    model_path = trainer.train(dataset)

    print(f"\nTraining complete! Model saved to: {model_path}")


if __name__ == "__main__":
    main()
