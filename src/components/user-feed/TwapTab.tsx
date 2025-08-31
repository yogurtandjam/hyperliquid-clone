"use client";
import { useEffect, useState } from "react";
// Simplified for now - remove complex dependencies

type Twap = {
  id?: string;
  coin: string;
  side: string;
  totalSz: string;
  filledSz?: string;
  status?: string;
};

export function TwapTab() {
  return (
    <div className="text-center py-8 text-gray-400">No TWAP orders</div>
  );
}
