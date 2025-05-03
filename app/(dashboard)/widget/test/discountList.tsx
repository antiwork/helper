import { useState } from "react";
import { DiscountForm } from "./discountForm";

// Fake discount data
const fakeDiscounts = [
  {
    id: "disc_1",
    name: "Black Friday",
    code: "BF2024",
    type: "percentage",
    value: 25,
    usageCount: 145,
    products: "All products",
  },
  {
    id: "disc_2",
    name: "Summer Sale",
    code: "SUMMER20",
    type: "percentage",
    value: 20,
    usageCount: 87,
    products: "All products",
  },
  {
    id: "disc_3",
    name: "New Customer",
    code: "WELCOME10",
    type: "percentage",
    value: 10,
    usageCount: 312,
    products: "All products",
  },
  {
    id: "disc_4",
    name: "Free Shipping",
    code: "FREESHIP",
    type: "fixed",
    value: 10,
    usageCount: 76,
    products: "All products",
  },
];

export function DiscountList() {
  const [showForm, setShowForm] = useState(false);

  if (showForm) {
    return (
      <div className="h-full">
        <div className="mb-4">
          <button onClick={() => setShowForm(false)} className="flex items-center text-blue-500 hover:text-blue-700">
            <span className="mr-1">←</span> Back to discounts
          </button>
        </div>
        <DiscountForm />
      </div>
    );
  }

  return (
    <div className="h-full p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Discounts</h1>
        <button
          onClick={() => setShowForm(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Add discount
        </button>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Name
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Code
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Discount
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Used
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Products
              </th>
              <th scope="col" className="relative px-6 py-3">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {fakeDiscounts.map((discount) => (
              <tr key={discount.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">{discount.name}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{discount.code}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">
                    {discount.type === "percentage" ? `${discount.value}%` : `$${discount.value.toFixed(2)}`}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{discount.usageCount} times</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{discount.products}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button className="text-blue-600 hover:text-blue-900 mr-3">Edit</button>
                  <button className="text-red-600 hover:text-red-900">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
