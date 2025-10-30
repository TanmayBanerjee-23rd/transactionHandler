import { getBalance, transact } from "./wallet.js";

async function run() {
  console.log("\n\n================================\n");
  const userId = "1";

  console.log("Initial balance:", await getBalance({ userId }));

  // First credit
  await transact({
    idempotentKey: "tx-001",
    userId,
    amount: "500", // $5.00
    type: "credit",
  });
  console.log("After credit:", await getBalance({ userId }));

  // Debit (ok)
  await transact({
    idempotentKey: "tx-002",
    userId,
    amount: "200",
    type: "debit",
  });
  console.log("After debit:", await getBalance({ userId }));

  // Duplicate (idempotent)
  try {
    await transact({
      idempotentKey: "tx-001",
      userId,
      amount: "100",
      type: "credit",
    });
  } catch (e: any) {
    console.log("Duplicate caught:", e.message);
  }

  // Overdraw (fails)
  try {
    await transact({
      idempotentKey: "tx-003",
      userId,
      amount: "1000",
      type: "debit",
    });
  } catch (e: any) {
    console.log("Overdraw caught:", e.message);
  }

  console.log("Final balance:", await getBalance({ userId }));

  console.log("\n================================\n\n");
}

run().catch(console.error);
