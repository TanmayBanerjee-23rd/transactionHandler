import {
  GetItemCommand,
  TransactWriteItemsCommand,
  TransactWriteItem,
} from "@aws-sdk/client-dynamodb";
import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";
import { client, TABLE_NAME } from "./dbClient.js";
import { GetBalanceInput, TransactInput } from "./types";

/* ---------- KEY HELPERS ---------- */
const userBalanceKey = (userId: string) => ({
  PK: `USER#${userId}`,
  SK: "BALANCE",
});

const idempKey = (idempotentKey: string) => ({
  PK: `IDEMP#${idempotentKey}`,
  SK: "STATUS",
});

/* ---------- GET BALANCE ---------- */
export async function getBalance(input: GetBalanceInput): Promise<number> {
  const { userId } = input;
  const cmd = new GetItemCommand({
    TableName: TABLE_NAME,
    Key: marshall(userBalanceKey(userId)),
  });

  const result = await client.send(cmd);
  const item = result.Item ? unmarshall(result.Item) : null;
  return item?.balance ?? 0; // new users start at 0
}

/* ---------- TRANSACTION ---------- */
export async function transact(input: TransactInput): Promise<void> {
  const { idempotentKey, userId, amount: amountStr, type } = input;

  const amountCents = parseInt(amountStr, 10);

  if (isNaN(amountCents) || amountCents <= 0) {
    throw new Error("Amount must be a positive integer (cents)");
  }

  const delta = type === "credit" ? amountCents : -amountCents;

  const idempPut: TransactWriteItem = {
    Put: {
      TableName: TABLE_NAME,
      Item: marshall({
        ...idempKey(idempotentKey),
        userId,
        amount: amountCents,
        type,
        timestamp: new Date().toISOString(),
      }),
      ConditionExpression: "attribute_not_exists(PK)", // fails if already processed
    },
  };

  const balanceUpdate: TransactWriteItem = {
    Update: {
      TableName: TABLE_NAME,
      Key: marshall(userBalanceKey(userId)),
      UpdateExpression: "ADD balance :delta",
      ExpressionAttributeValues: marshall({ ":delta": delta }),
      // For debit: ensure balance will not go negative
      ...(type === "debit"
        ? {
            ConditionExpression: "attribute_exists(PK) AND balance >= :amount",
            ExpressionAttributeValues: marshall({
              ":delta": delta,
              ":amount": amountCents,
            }),
          }
        : {}),
    },
  };

  const transactCmd = new TransactWriteItemsCommand({
    TransactItems: [idempPut, balanceUpdate],
  });

  try {
    await client.send(transactCmd);
  } catch (err: any) {
    if (err.name === "TransactionCanceledException") {
      const reasons = err.CancellationReasons;
      if (reasons?.[0]?.Code === "ConditionalCheckFailed") {
        throw new Error("Idempotent key already used");
      }
      if (reasons?.[1]?.Code === "ConditionalCheckFailed") {
        throw new Error("Insufficient balance");
      }
    }
    throw err;
  }
}
