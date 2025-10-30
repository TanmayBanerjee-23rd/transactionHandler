import "dotenv/config";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";

const isLocal = process.env.DYNAMODB_LOCAL === "true";

export const TABLE_NAME = "Wallet";

export const client = new DynamoDBClient({
  region: process.env.AWS_REGION || "us-east-1",
  ...(isLocal ? { endpoint: "http://localhost:8000" } : {}),
});
