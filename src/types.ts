export type TransactionType = "credit" | "debit";

export interface GetBalanceInput {
  userId: string;
}

export interface TransactInput {
  idempotentKey: string;
  userId: string;
  amount: string; // string because we will parse to integer cents
  type: TransactionType;
}