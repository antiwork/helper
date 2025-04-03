"use client";

import { useState } from "react";

type RefundPolicyOption = "7 days" | "30 days" | "3 months" | "6 months";

export const SettingsForm = () => {
  const [refundPolicy, setRefundPolicy] = useState<RefundPolicyOption>("30 days");
  const [successMessage, setSuccessMessage] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMessage(`Settings saved! Refund policy set to: ${refundPolicy}`);
  };

  return (
    <div className="w-full max-w-2xl rounded-lg bg-white p-6 shadow-md">
      <h2 className="mb-6 text-2xl font-bold text-black">Settings</h2>

      {successMessage && (
        <div className="mb-4 rounded-md bg-green-50 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-green-800">{successMessage}</p>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="mb-6">
          <label htmlFor="refundPolicy" className="mb-2 block text-sm font-medium text-gray-700">
            Refund Policy
          </label>
          <select
            id="refundPolicy"
            value={refundPolicy}
            onChange={(e) => setRefundPolicy(e.target.value as RefundPolicyOption)}
            className="w-full rounded-md border border-gray-300 p-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 text-black"
          >
            <option value="7 days">7 days</option>
            <option value="30 days">30 days</option>
            <option value="3 months">3 months</option>
            <option value="6 months">6 months</option>
          </select>
          <p className="mt-1 text-sm text-gray-500">
            Customers can request refunds within this time period after purchase.
          </p>
        </div>

        <div className="mt-8 flex justify-end">
          <button
            type="submit"
            className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Save Changes
          </button>
        </div>
      </form>
    </div>
  );
};
