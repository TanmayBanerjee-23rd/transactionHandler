import { DeleteTableCommand } from "@aws-sdk/client-dynamodb";
import { client, TABLE_NAME } from "./dbClient.js";

async function deleteTable() {
  console.log("\n\n================================\n");

  console.log("Performing cleanup...");

  try {
    const cmd = new DeleteTableCommand({
      TableName: TABLE_NAME,
    });

    await client.send(cmd);
    console.log(`Table ${TABLE_NAME} deleted.`);
  } catch (error: any) {
    console.log("Error deleting table:", error.message);
  }

  console.log("\n================================\n\n");
}

deleteTable().catch(console.error);
