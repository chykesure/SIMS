// Payment account details — single source of truth
// These are the bank details schools should pay into

export interface PaymentAccount {
  bankName: string;
  accountNumber: string;
  accountName: string;
}

export const PAYMENT_ACCOUNTS: PaymentAccount[] = [
  {
    bankName: "OPay",
    accountNumber: "7037933533",
    accountName: "CHIKE POLYCARP",
  },
];

export const PAYMENT_NOTE =
  "After making payment, upload your payment screenshot or receipt (PDF/PNG/JPG) below for verification. Your subscription will be activated within 24 hours after confirmation.";

export const PAYMENT_INSTRUCTIONS = [
  "Copy the account number above",
  "Make a transfer using your registered school name as the payment narration/reference",
  "Take a screenshot of the successful payment or save the receipt as PDF",
  "Upload the evidence below using the upload button",
  "Wait for verification — you'll see the status update on this page",
];
