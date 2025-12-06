import os
import boto3
from botocore.config import Config

class NovaLLM:
    def __init__(self, model_id="us.amazon.nova-lite-v1:0"):
        region = "us-east-1"

        config = Config(
            connect_timeout=3600,
            read_timeout=3600,
            retries={'max_attempts': 1}
        )

        self.client = boto3.client("bedrock-runtime", region_name=region, config=config)
        self.model_id = model_id

    def __call__(self, prompt: str, **kwargs) -> str:
        messages = [{"role": "user", "content": [{"text": prompt}]}]
        resp = self.client.converse(
            modelId=self.model_id,
            messages=messages,
            inferenceConfig=kwargs.get("inferenceConfig", {"maxTokens": 256})
        )
        return resp["output"]["message"]["content"][0]["text"]
