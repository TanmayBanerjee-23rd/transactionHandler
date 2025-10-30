# Wallet Transaction System

A **transaction-safe wallet system** built with **TypeScript** and **DynamoDB**, supporting **credits**, **debits**, **idempotent processing**, and **zero negative balance** — all with **atomic, race-condition-free** guarantees.

---

## Tech Stack

| Layer       | Technology                                             |
| ----------- | ------------------------------------------------------ |
| Language    | TypeScript                                             |
| Database    | AWS DynamoDB (Local or Cloud)                          |
| SDK         | AWS SDK for JavaScript v3 (`@aws-sdk/client-dynamodb`) |
| Runtime     | Node.js                                                |
| Environment | `.env` + `dotenv`                                      |

---

## DynamoDB Schema (Single-Table Design)

| Table Name             | `Wallet`          |
| ---------------------- | ----------------- |
| **Partition Key (PK)** | `PK` (String)     |
| **Sort Key (SK)**      | `SK` (String)     |
| **Billing Mode**       | `PAY_PER_REQUEST` |

### Item Types

| Type            | PK                      | SK        | Key Attributes                          |
| --------------- | ----------------------- | --------- | --------------------------------------- |
| **Balance**     | `USER#{userId}`         | `BALANCE` | `balance: number` (in **cents**)        |
| **Idempotency** | `IDEMP#{idempotentKey}` | `STATUS`  | `userId`, `amount`, `type`, `timestamp` |

### Why This Design?

- **Single-table** → optimal performance, low cost, no GSIs
- **Balance per user** → `GetItem` in **O(1)**
- **Global idempotency** → prevents duplicates even across users
- **Audit-ready** → idempotency records log every transaction

---

## Idempotency & Race Condition Safety

| Feature                  | Implementation                                                                       |
| ------------------------ | ------------------------------------------------------------------------------------ |
| **Duplicate Prevention** | `PutItem` on idempotency record with `ConditionExpression: attribute_not_exists(PK)` |
| **Atomic Updates**       | `TransactWriteItems` (2 operations: idempotency + balance update)                    |
| **No Negative Balance**  | Debit uses `ConditionExpression: balance >= :amount`                                 |
| **Race Conditions**      | Eliminated via **transaction isolation** — all-or-nothing                            |

> Even **10,000 concurrent debits** will never overdraft.

---

## File Structure
```bash
src/
├── dbClient.ts → DynamoDB client (local/AWS switch)
├── setup.ts → Create table
├── cleanup.ts → Delete table
├── types.ts → Input interfaces
├── wallet.ts → getBalance() + transact()
├── demoTransact.ts → Basic flow
└── demoRaceCondition.ts → Concurrency test
.gitignore
LICENSE
package-lock.json
package.json
README.md
tsconfig.json
```

## Setup & Run

### 1. Prerequisites

- Node.js ≥ 18
- npm
- AWS Account (optional)
- Docker (for local DB)

---

### 2. Environment Setup

#### Option A: Use **Real AWS DynamoDB**

1. [Create AWS Access Keys](https://docs.aws.amazon.com/IAM/latest/UserGuide/id_credentials_access-keys.html)
2. [Configure IAM Permissions](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/using-identity-based-policies.html)

#### Option B: Use **Local DynamoDB**

1. Run in Docker:

   ```bash
   docker run -p 8000:8000 amazon/dynamodb-local

   ```

2. Install in Locally using [AWS DOC](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/DynamoDBLocal.html)

#### Create .env File (Root Directory)

- DYNAMODB_LOCAL=true

**Only needed if DYNAMODB_LOCAL=false**

- AWS_REGION=[any AWS region] (default :- us-east-1)
- AWS_ACCESS_KEY_ID=**YOUR_AWS_ACCESS_KEY**
- AWS_SECRET_ACCESS_KEY=**YOUR_AWS_SECRET_ACCESS_KEY**

### 3. Install & Build

- npm install
- npm run build

### 4. Run Commands

| Command                           | Purpose                                         |
| --------------------------------- | ----------------------------------------------- |
| **npm run setup**                 | Creates `Wallet` table (local or AWS)           |
| **npm run demoTransact**          | Runs basic credit/debit + duplicate test        |
| **npm run demoRaceCondition**     | 10 concurrent debits → proves no race/overdraft |
| **npm run cleanup**               | Deletes the `Wallet` table (useful in AWS)      |
| **npm run demoTransact:e2e**      | build → setup → demo → cleanup                  |
| **npm run demoRaceCondition:e2e** | build → setup → race demo → cleanup             |
