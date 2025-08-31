"use client";
import { useEffect, useState } from "react";
// Simplified for now

type Row = { time: number; coin: string; rate?: number; paidUsd?: number };

export function FundingHistoryTab() {
  return (
    <div className="text-center py-8 text-gray-400">
      No funding history
    </div>
  );
}
