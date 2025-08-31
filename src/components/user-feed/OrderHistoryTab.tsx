"use client";
import { useEffect, useRef, useState } from "react";
// Simplified for now

type Row = {
  time: number;
  coin?: string;
  status: string;
  side?: string;
  px?: string;
  sz?: string;
};

export function OrderHistoryTab() {
  return (
    <div className="text-center py-8 text-gray-400">No order history</div>
  );
}
