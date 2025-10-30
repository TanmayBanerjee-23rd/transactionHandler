import { getBalance, transact } from "./wallet.js";

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runRaceConditionTest() {
  console.log("\n\n================================\n");

  const userId = "user-999"; // Fresh user
  const initialCreditKey = "init-999";
  const debitKeyPrefix = "race-debit-";

  console.log("=== RACE CONDITION DEMO ===");
  console.log("User:", userId);
  console.log();

  // Step 1: Reset & initialize balance to 500 cents
  try {
    await transact({
      idempotentKey: initialCreditKey,
      userId,
      amount: "500",
      type: "credit",
    });
    console.log("Initialized balance: 500 cents");
  } catch (e: any) {
    if (e.message.includes("Idempotent key already used")) {
      console.log("Balance already initialized (idempotent).");
    } else {
      throw e;
    }
  }

  await sleep(100); // Let local DB settle

  const current = await getBalance({ userId });
  console.log(`\n Starting balance: ${current} cents`);
  console.log();

  // Step 2: Launch 10 concurrent DEBITS of 100 cents each
  const debitPromises: Promise<void>[] = [];
  const results: { key: string; success: boolean; error?: string }[] = [];

  for (let i = 0; i < 10; i++) {
    const key = `${debitKeyPrefix}${i}`;
    const promise = transact({
      idempotentKey: key,
      userId,
      amount: "100",
      type: "debit",
    })
      .then(() => {
        results.push({ key, success: true });
      })
      .catch((err: any) => {
        results.push({ key, success: false, error: err.message });
      });

    debitPromises.push(promise);
  }

  console.log("Firing 10 concurrent debits of 100 cents each...");
  await Promise.allSettled(debitPromises);
  await sleep(500); // Ensure all local writes settle

  // Step 3: Show results
  console.log("\n--- Transaction Results ---");
  results
    .sort((a, b) => a.key.localeCompare(b.key))
    .forEach((r) => {
      const status = r.success ? "SUCCESS" : "FAILED";
      const reason = r.error ? ` (${r.error})` : "";
      console.log(`${r.key} → ${status}${reason}`);
    });

  // Step 4: Final balance
  const finalBalance = await getBalance({ userId });
  console.log("\nFinal balance:", finalBalance, "cents");

  // Step 5: Assertion
  const expectedBalance = 0;
  const succeeded = results.filter((r) => r.success).length;
  const expectedSuccess = 5;

  if (finalBalance === expectedBalance) {
    console.log("RACE CONDITION TEST PASSED: No overdraft, correct atomicity.");
  } else {
    console.log("TEST FAILED!");
    console.log(
      `Expected: ${expectedSuccess} success, balance = ${expectedBalance}`
    );
    console.log(`Got: ${succeeded} success, balance = ${finalBalance}`);
  }

  console.log("\n================================\n\n");
}

runRaceConditionTest().catch(console.error);
