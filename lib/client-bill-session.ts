type PendingBillPayload = {
  billText: string;
  billImageData: string;
  fileName: string;
};

let pendingBillPayload: PendingBillPayload | null = null;

export function setPendingBillPayload(payload: PendingBillPayload) {
  pendingBillPayload = payload;
}

export function getPendingBillPayload() {
  return pendingBillPayload;
}

export function clearPendingBillPayload() {
  pendingBillPayload = null;
}
