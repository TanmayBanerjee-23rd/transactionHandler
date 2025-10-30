import {
  CreateTableCommand,
  DescribeTableCommand,
  waitUntilTableExists,
} from "@aws-sdk/client-dynamodb";
import { client, TABLE_NAME } from "./dbClient.js";

async function createTable() {
  console.log("\n\n================================\n");

  try {
    await client.send(new DescribeTableCommand({ TableName: TABLE_NAME }));
    console.log(`Table ${TABLE_NAME} already exists.`);
    return;
  } catch (e: any) {
    if (e.name !== "ResourceNotFoundException") throw e;
  }

  const cmd = new CreateTableCommand({
    TableName: TABLE_NAME,
    AttributeDefinitions: [
      { AttributeName: "PK", AttributeType: "S" },
      { AttributeName: "SK", AttributeType: "S" },
    ],
    KeySchema: [
      { AttributeName: "PK", KeyType: "HASH" },
      { AttributeName: "SK", KeyType: "RANGE" },
    ],
    BillingMode: "PAY_PER_REQUEST",
  });

  await client.send(cmd);

  console.log(`Creating table ${TABLE_NAME}...`);
  await waitUntilTableExists(
    { client, maxWaitTime: 30 },
    { TableName: TABLE_NAME }
  );
  console.log(`Table ${TABLE_NAME} is ACTIVE.`);
  console.log("\n================================\n\n");
}

createTable().catch(console.error);
