import csv
import json
import logging
import sys
from datetime import datetime
from pprint import pprint
from typing import Any, Dict, List

import requests
from langchain_aws import BedrockEmbeddings, ChatBedrock
from ragas import SingleTurnSample
from ragas.embeddings.base import LangchainEmbeddingsWrapper
from ragas.llms import LangchainLLMWrapper
from ragas.metrics import (
    ContextPrecision,
    ContextRecall,
    Faithfulness,
    NoiseSensitivity,
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

# Session cookies and headers for API calls
cookies = {
    "ext_name": "ojplmecpdpgccookcobabopnaifgidhf",
    "next-auth.csrf-token": "51b3423640934398ab955c184c1b2a24dfd036729d8f27143e196c53733570d0%7C0b0e677c1f25561510618caa072193d1c699ebc171d60defc39794d2cf4ee267",
    "next-auth.callback-url": "http%3A%2F%2Flocalhost%3A3000%2Fdashboard",
    "__next_hmr_refresh_hash__": "af398fd679cff04a9f0bfddd46837d52633457081244afec",
    "next-auth.session-token": "eyJhbGciOiJkaXIiLCJlbmMiOiJBMjU2R0NNIn0..6o9NXR5iJCc5j5Xi.OukCyTi3dgHAoK6bYtHaZejSNyLeqewL-Hx-ejpqetU1eydK3TMn2DZxDvDmVAe2Rlq19BObCygHSrSncDB1RJq7HZeE0PbX1IBSw80TlxjcmyQ2ezF68AminIhN-RH8eIaua2lZZ_omKi6T3F_C37Cu8zq-S909rVYGyjFqH9CUis7mA1j0J0dkuNXOtnO8g_mq2Qjj5AyQ7tgQ632g1Zgycsjx0fsj9HkgK6LShXdvkNmlWpGGjo8Oy0Vad1a3bThvBapHYAh_Y79Vx4o8EF-OPawQd9qe-p7G0t11GmH1upVGnu8ni7MozbeXooet1tM__OTIsVcHLYz6Shq-boC7ONVGpL3sl1vmwfhkAvmiHjNzmbx-9R9GV7xdFmZSIYab7vgRdsPhz2dBpS-rElBFNw.9bACVpfDVQOoFTwB9D86og",
}

headers = {
    "Accept": "application/json, text/plain, */*",
    "Accept-Language": "en-US,en;q=0.8",
    "Cache-Control": "no-cache",
    "Connection": "keep-alive",
    "Content-Type": "application/json",
    "Origin": "http://localhost:3000",
    "Pragma": "no-cache",
    "Referer": "http://localhost:3000/product/69171e0bafd4b95081102b9d",
    "Sec-Fetch-Dest": "empty",
    "Sec-Fetch-Mode": "cors",
    "Sec-Fetch-Site": "same-origin",
    "Sec-GPC": "1",
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36",
    "sec-ch-ua": '"Brave";v="143", "Chromium";v="143", "Not A(Brand";v="24"',
    "sec-ch-ua-mobile": "?0",
    "sec-ch-ua-platform": '"Windows"',
}


class RAGEvaluator:
    def __init__(self):
        logger.info("Initializing RAG Evaluator...")

        try:
            # Initialize Bedrock configuration
            config = {
                "credentials_profile_name": "default",  # Use default AWS profile
                "region_name": "us-east-1",  # Nova Lite region
                "model_id": "us.amazon.nova-lite-v1:0",  # Nova Lite model ID
                "model_kwargs": {
                    "temperature": 0.1,
                    "max_tokens": 4096,
                },  # Low temperature for consistent evaluation and high max_tokens for complete JSON
            }

            # Initialize ChatBedrock
            logger.info("Initializing ChatBedrock with Nova Lite (high max_tokens)...")
            bedrock_llm = ChatBedrock(
                model=config["model_id"],
                region=config["region_name"],
                credentials_profile_name=config["credentials_profile_name"],
                model_kwargs=config["model_kwargs"],
            )

            # Initialize Bedrock embeddings
            bedrock_embeddings = BedrockEmbeddings(
                credentials_profile_name=config["credentials_profile_name"],
                region_name=config["region_name"],
                model_id="amazon.titan-embed-text-v1",  # Default embedding model
            )

            # Wrap with RAGAS wrappers for proper integration
            logger.info("Wrapping models with RAGAS wrappers...")
            self.llm = LangchainLLMWrapper(bedrock_llm)
            self.embeddings = LangchainEmbeddingsWrapper(bedrock_embeddings)

            # Initialize RAGAS metrics with wrapped LLM
            logger.info("Initializing RAGAS metrics...")
            self.context_precision = ContextPrecision(llm=self.llm)
            self.context_recall = ContextRecall(llm=self.llm)
            self.faithfulness = Faithfulness(llm=self.llm)
            self.noise_sensitivity = NoiseSensitivity(llm=self.llm)

            logger.info("RAG Evaluator initialized successfully with Bedrock")
        except Exception as e:
            logger.error(f"Failed to initialize RAG Evaluator: {str(e)}")
            logger.error("Make sure your AWS credentials are configured properly")
            logger.error("Run 'aws configure' to set up your credentials")
            raise

    def ask_question(self, product_id: str, question: str) -> Dict[str, Any]:
        """Call the API to get both pipeline and non-pipeline responses"""
        # For testing, use debug JSON file
        try:
            with open("debug_api_response.json", "r") as f:
                logger.info("Using debug API response file")
                return json.load(f)
        except FileNotFoundError:
            logger.info("Debug file not found, calling live API")

        try:
            json_data = {
                "query": question,
                "productId": product_id,
            }

            logger.info(f"Calling API with query: {question[:50]}...")
            response = requests.post(
                "http://localhost:3000/api/getProductQueryTest",
                cookies=cookies,
                headers=headers,
                json=json_data,
                timeout=60,
            )
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            logger.error(f"API call failed for product {product_id}: {str(e)}")
            raise

    def evaluate_metrics(
        self,
        user_query: str,
        ground_truth: str,
        with_pipeline_response: str,
        context_with_pipeline: List[str],
        without_pipeline_response: str,
        context_without_pipeline: List[str],
    ) -> Dict[str, Any]:
        """Calculate all metrics for both pipeline and non-pipeline responses with error handling"""

        metrics = {}

        # Create samples for with_pipeline
        with_pipeline_sample = SingleTurnSample(
            user_input=user_query,
            response=with_pipeline_response,
            retrieved_contexts=context_with_pipeline,
            reference=ground_truth,
        )

        # Create samples for without_pipeline
        without_pipeline_sample = SingleTurnSample(
            user_input=user_query,
            response=without_pipeline_response,
            retrieved_contexts=context_without_pipeline,
            reference=ground_truth,
        )

        # Calculate Context Precision (with pipeline) with error handling
        try:
            logger.info("Calculating Context Precision (with pipeline)...")
            metrics["context_precision_with_pipeline"] = (
                self.context_precision.single_turn_score(with_pipeline_sample)
            )
            logger.info(
                f"✓ Context Precision (with pipeline): {metrics['context_precision_with_pipeline']:.4f}"
            )
        except Exception as e:
            logger.error(
                f"✗ Context Precision (with pipeline) failed: {str(e)[:200]}..."
            )
            metrics["context_precision_with_pipeline"] = None

        # Calculate Context Precision (without pipeline) with error handling
        try:
            logger.info("Calculating Context Precision (without pipeline)...")
            metrics["context_precision_without_pipeline"] = (
                self.context_precision.single_turn_score(without_pipeline_sample)
            )
            logger.info(
                f"✓ Context Precision (without pipeline): {metrics['context_precision_without_pipeline']:.4f}"
            )
        except Exception as e:
            logger.error(
                f"✗ Context Precision (without pipeline) failed: {str(e)[:200]}..."
            )
            metrics["context_precision_without_pipeline"] = None

        # Calculate Context Recall (with pipeline) with error handling
        try:
            logger.info("Calculating Context Recall (with pipeline)...")
            metrics["context_recall_with_pipeline"] = (
                self.context_recall.single_turn_score(with_pipeline_sample)
            )
            logger.info(
                f"✓ Context Recall (with pipeline): {metrics['context_recall_with_pipeline']:.4f}"
            )
        except Exception as e:
            logger.error(f"✗ Context Recall (with pipeline) failed: {str(e)[:200]}...")
            metrics["context_recall_with_pipeline"] = None

        # Calculate Context Recall (without pipeline) with error handling
        try:
            logger.info("Calculating Context Recall (without pipeline)...")
            metrics["context_recall_without_pipeline"] = (
                self.context_recall.single_turn_score(without_pipeline_sample)
            )
            logger.info(
                f"✓ Context Recall (without pipeline): {metrics['context_recall_without_pipeline']:.4f}"
            )
        except Exception as e:
            logger.error(
                f"✗ Context Recall (without pipeline) failed: {str(e)[:200]}..."
            )
            metrics["context_recall_without_pipeline"] = None

        # Calculate Faithfulness (with pipeline) with error handling
        try:
            logger.info("Calculating Faithfulness (with pipeline)...")
            metrics["faithfulness_with_pipeline"] = self.faithfulness.single_turn_score(
                with_pipeline_sample
            )
            logger.info(
                f"✓ Faithfulness (with pipeline): {metrics['faithfulness_with_pipeline']:.4f}"
            )
        except Exception as e:
            logger.error(f"✗ Faithfulness (with pipeline) failed: {str(e)[:200]}...")
            metrics["faithfulness_with_pipeline"] = None

        # Calculate Faithfulness (without pipeline) with error handling
        try:
            logger.info("Calculating Faithfulness (without pipeline)...")
            metrics["faithfulness_without_pipeline"] = (
                self.faithfulness.single_turn_score(without_pipeline_sample)
            )
            logger.info(
                f"✓ Faithfulness (without pipeline): {metrics['faithfulness_without_pipeline']:.4f}"
            )
        except Exception as e:
            logger.error(f"✗ Faithfulness (without pipeline) failed: {str(e)[:200]}...")
            metrics["faithfulness_without_pipeline"] = None

        # Calculate Noise Sensitivity (with pipeline) with error handling
        try:
            logger.info("Calculating Noise Sensitivity (with pipeline)...")
            metrics["noise_sensitivity_with_pipeline"] = (
                self.noise_sensitivity.single_turn_score(with_pipeline_sample)
            )
            logger.info(
                f"✓ Noise Sensitivity (with pipeline): {metrics['noise_sensitivity_with_pipeline']:.4f}"
            )
        except Exception as e:
            logger.error(
                f"✗ Noise Sensitivity (with pipeline) failed: {str(e)[:200]}..."
            )
            metrics["noise_sensitivity_with_pipeline"] = None

        logger.info(
            f"Metrics calculation completed. Success rate: {sum(1 for v in metrics.values() if v is not None)}/{len(metrics)}"
        )
        return metrics

    def read_csv(self, file_path: str, limit: int = 100) -> List[Dict[str, str]]:
        """Read CSV file with test cases"""
        try:
            with open(file_path, mode="r", newline="", encoding="utf-8") as file:
                reader = csv.DictReader(file)
                data = [row for row in reader][:limit]
            logger.info(f"Read {len(data)} rows from {file_path}")
            return data
        except FileNotFoundError:
            logger.error(f"CSV file not found: {file_path}")
            raise
        except Exception as e:
            logger.error(f"Error reading CSV: {str(e)}")
            raise

    def write_results_csv(self, results: List[Dict[str, Any]], output_path: str):
        """Write evaluation results to CSV file"""
        if not results:
            logger.warning("No results to write")
            return

        try:
            # Define all columns
            fieldnames = [
                "test_case_index",
                "product_id",
                "question",
                "ground_truth",
                "context_precision_with_pipeline",
                "context_precision_without_pipeline",
                "context_recall_with_pipeline",
                "context_recall_without_pipeline",
                "faithfulness_with_pipeline",
                "faithfulness_without_pipeline",
                "noise_sensitivity_with_pipeline",
                "status",
                "error_message",
            ]

            with open(output_path, mode="w", newline="", encoding="utf-8") as file:
                writer = csv.DictWriter(file, fieldnames=fieldnames)
                writer.writeheader()
                writer.writerows(results)

            logger.info(f"Results written to {output_path}")
        except Exception as e:
            logger.error(f"Error writing results CSV: {str(e)}")
            raise

    def run_evaluation(
        self, input_csv_path: str, output_csv_path: str, limit: int = 100
    ):
        """Run the complete evaluation pipeline"""
        logger.info("=" * 80)
        logger.info("Starting RAG Pipeline Evaluation")
        logger.info("=" * 80)

        # Read input CSV
        test_cases = self.read_csv(input_csv_path, limit)
        results = []

        successful = 0
        failed = 0
        skipped = 0

        for index, test_case in enumerate(test_cases):
            logger.info(f"\n{'=' * 80}")
            logger.info(f"Processing test case {index + 1}/{len(test_cases)}")
            logger.info(f"{'=' * 80}")

            try:
                product_id = test_case.get("product_id") or test_case.get("product")
                question = test_case.get("question")
                ground_truth = test_case.get("ground_truth")

                if not all([product_id, question, ground_truth]):
                    logger.warning(
                        f"Skipping test case {index + 1}: Missing required fields"
                    )
                    results.append(
                        {
                            "test_case_index": index + 1,
                            "product_id": product_id,
                            "question": question,
                            "ground_truth": ground_truth,
                            "status": "SKIPPED",
                            "error_message": "Missing required fields",
                        }
                    )
                    skipped += 1
                    continue

                logger.info(f"Product ID: {product_id}")
                logger.info(f"Question: {question}")
                logger.info(f"Ground Truth: {ground_truth[:100]}...")

                # Call API
                logger.info("Calling API...")
                api_response = self.ask_question(product_id, question)

                with_pipeline = api_response.get("with_pipeline", {})
                without_pipeline = api_response.get("without_pipeline", {})

                with_pipeline_response = with_pipeline.get("ai_response", "")
                context_with_pipeline = with_pipeline.get("context_with_pipeline", [])

                without_pipeline_response = without_pipeline.get("ai_response", "")
                context_without_pipeline = without_pipeline.get(
                    "context_without_pipeline", []
                )

                if not all(
                    [
                        with_pipeline_response,
                        without_pipeline_response,
                        context_with_pipeline,
                        context_without_pipeline,
                    ]
                ):
                    logger.warning(f"Incomplete API response for test case {index + 1}")
                    results.append(
                        {
                            "test_case_index": index + 1,
                            "product_id": product_id,
                            "question": question,
                            "ground_truth": ground_truth,
                            "status": "FAILED",
                            "error_message": "Incomplete API response",
                        }
                    )
                    failed += 1
                    continue

                # Evaluate metrics
                logger.info("Evaluating metrics...")
                metrics = self.evaluate_metrics(
                    user_query=question,
                    ground_truth=ground_truth,
                    with_pipeline_response=with_pipeline_response,
                    context_with_pipeline=context_with_pipeline,
                    without_pipeline_response=without_pipeline_response,
                    context_without_pipeline=context_without_pipeline,
                )

                # Store results
                result_entry = {
                    "test_case_index": index + 1,
                    "product_id": product_id,
                    "question": question,
                    "ground_truth": ground_truth,
                    "context_precision_with_pipeline": metrics.get(
                        "context_precision_with_pipeline"
                    ),
                    "context_precision_without_pipeline": metrics.get(
                        "context_precision_without_pipeline"
                    ),
                    "context_recall_with_pipeline": metrics.get(
                        "context_recall_with_pipeline"
                    ),
                    "context_recall_without_pipeline": metrics.get(
                        "context_recall_without_pipeline"
                    ),
                    "faithfulness_with_pipeline": metrics.get(
                        "faithfulness_with_pipeline"
                    ),
                    "faithfulness_without_pipeline": metrics.get(
                        "faithfulness_without_pipeline"
                    ),
                    "noise_sensitivity_with_pipeline": metrics.get(
                        "noise_sensitivity_with_pipeline"
                    ),
                    "status": "SUCCESS",
                    "error_message": "",
                }

                results.append(result_entry)
                successful += 1

                logger.info(f"Test case {index + 1} completed successfully")
                logger.info(
                    f"  Context Precision (with): {metrics.get('context_precision_with_pipeline', 'N/A')}"
                )
                logger.info(
                    f"  Context Precision (without): {metrics.get('context_precision_without_pipeline', 'N/A')}"
                )
                logger.info(
                    f"  Context Recall (with): {metrics.get('context_recall_with_pipeline', 'N/A')}"
                )
                logger.info(
                    f"  Context Recall (without): {metrics.get('context_recall_without_pipeline', 'N/A')}"
                )
                logger.info(
                    f"  Faithfulness (with): {metrics.get('faithfulness_with_pipeline', 'N/A')}"
                )
                logger.info(
                    f"  Faithfulness (without): {metrics.get('faithfulness_without_pipeline', 'N/A')}"
                )
                logger.info(
                    f"  Noise Sensitivity (with): {metrics.get('noise_sensitivity_with_pipeline', 'N/A')}"
                )

                # Write intermediate results
                self.write_results_csv(results, output_csv_path)

            except Exception as e:
                logger.error(f"Test case {index + 1} failed: {str(e)}", exc_info=True)
                error_entry = {
                    "test_case_index": index + 1,
                    "product_id": test_case.get("product_id")
                    or test_case.get("product"),
                    "question": test_case.get("question"),
                    "ground_truth": test_case.get("ground_truth"),
                    "status": "FAILED",
                    "error_message": str(e),
                }
                results.append(error_entry)
                failed += 1
                self.write_results_csv(results, output_csv_path)
                continue

        # Final results write
        logger.info(f"\n{'=' * 80}")
        logger.info("Writing final results to CSV...")
        self.write_results_csv(results, output_csv_path)

        # Print summary
        logger.info(f"\n{'=' * 80}")
        logger.info("EVALUATION SUMMARY")
        logger.info(f"{'=' * 80}")
        logger.info(f"Total test cases: {len(results)}")
        logger.info(f"Successful: {successful}")
        logger.info(f"Failed: {failed}")
        logger.info(f"Skipped: {skipped}")
        logger.info(f"Output file: {output_csv_path}")
        logger.info(f"{'=' * 80}")


def main():
    input_csv = "Rag Pipeline Analysis Data - Sheet1_with_product_ids2.csv"
    output_csv = "rag_evaluation_results.csv"

    try:
        evaluator = RAGEvaluator()
        evaluator.run_evaluation(input_csv, output_csv, limit=100)
    except Exception as e:
        logger.error(f"Evaluation failed: {str(e)}", exc_info=True)
        sys.exit(1)


if __name__ == "__main__":
    main()
