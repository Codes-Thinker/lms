-- Support chat delivery / seen receipts (WhatsApp-style ticks).
ALTER TABLE "ChatMessage" ADD COLUMN IF NOT EXISTS "deliveredAt" TIMESTAMP(3);
ALTER TABLE "ChatMessage" ADD COLUMN IF NOT EXISTS "seenAt" TIMESTAMP(3);
