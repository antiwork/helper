import { useState } from "react";

export function DiscountForm() {
  const [discountType, setDiscountType] = useState<"percentage" | "fixed">("percentage");
  const [limitQuantity, setLimitQuantity] = useState(false);
  const [limitValidity, setLimitValidity] = useState(false);
  const [minimumAmount, setMinimumAmount] = useState(false);
  const [minimumQuantity, setMinimumQuantity] = useState(false);
  const [allProducts, setAllProducts] = useState(false);

  return (
    <div className="max-w-4xl bg-white p-6 rounded-lg shadow">
      <h1 className="mb-6 text-3xl font-bold text-gray-800">Create discount</h1>

      <div className="flex flex-col md:flex-row justify-between mb-8 gap-4">
        <div>
          <p className="text-gray-600 mb-2">
            Create a discount code so your audience can buy your products at a reduced price.
          </p>
          <p className="text-gray-600 mb-2">
            Once the code is created, you can share it or copy a unique link per product that automatically applies the
            discount.
          </p>
          <button className="text-blue-600 underline">Learn more</button>
        </div>

        <div className="flex gap-3">
          <button className="bg-transparent border border-gray-300 text-gray-700 px-4 py-2 rounded flex items-center gap-2">
            <span>Cancel</span>
          </button>
          <button className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">Add discount</button>
        </div>
      </div>

      <div className="space-y-6">
        <div>
          <label htmlFor="name" className="block text-gray-700 mb-2">
            Name
          </label>
          <input
            type="text"
            id="name"
            placeholder="Black Friday"
            className="w-full border border-gray-300 rounded p-2 text-gray-800"
          />
        </div>

        <div>
          <label htmlFor="discount-code" className="block text-gray-700 mb-2">
            Discount code
          </label>
          <div className="flex">
            <input
              type="text"
              id="discount-code"
              placeholder="dlehOwh"
              className="w-full border border-gray-300 rounded-l p-2 text-gray-800"
            />
            <button className="bg-gray-200 border border-gray-300 rounded-r p-2 text-gray-600">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          </div>
        </div>

        <div>
          <label htmlFor="products" className="block text-gray-700 mb-2">
            Products
          </label>
          <input
            type="text"
            id="products"
            placeholder="Products to which this discount will apply"
            className="w-full border border-gray-300 rounded p-2 text-gray-800 mb-2"
          />
          <div className="flex items-center">
            <input
              type="checkbox"
              id="all-products"
              checked={allProducts}
              onChange={() => setAllProducts(!allProducts)}
              className="mr-2"
            />
            <label htmlFor="all-products" className="text-gray-700">
              All products
            </label>
          </div>
        </div>

        <div>
          <p className="text-gray-700 mb-2">Type</p>
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center">
              <input
                type="radio"
                id="percentage"
                name="discount-type"
                checked={discountType === "percentage"}
                onChange={() => setDiscountType("percentage")}
                className="mr-2"
              />
              <label htmlFor="percentage" className="text-gray-700">
                Percentage
              </label>
              {discountType === "percentage" && (
                <div className="flex ml-4">
                  <input
                    type="number"
                    className="w-20 border border-gray-300 rounded-l p-2 text-gray-800"
                    placeholder="0"
                  />
                  <span className="bg-gray-200 border border-gray-300 rounded-r p-2 text-gray-600">%</span>
                </div>
              )}
            </div>
            <div className="flex items-center">
              <input
                type="radio"
                id="fixed"
                name="discount-type"
                checked={discountType === "fixed"}
                onChange={() => setDiscountType("fixed")}
                className="mr-2"
              />
              <label htmlFor="fixed" className="text-gray-700">
                Fixed amount
              </label>
              {discountType === "fixed" && (
                <div className="flex ml-4">
                  <span className="bg-gray-200 border border-gray-300 rounded-l p-2 text-gray-600">$</span>
                  <input
                    type="number"
                    className="w-20 border border-gray-300 rounded-r p-2 text-gray-800"
                    placeholder="0"
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        <div>
          <p className="text-gray-700 mb-2">Settings</p>
          <div className="space-y-2">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="limit-quantity"
                checked={limitQuantity}
                onChange={() => setLimitQuantity(!limitQuantity)}
                className="mr-2"
              />
              <label htmlFor="limit-quantity" className="text-gray-700">
                Limit quantity
              </label>
            </div>
            <div className="flex items-center">
              <input
                type="checkbox"
                id="limit-validity"
                checked={limitValidity}
                onChange={() => setLimitValidity(!limitValidity)}
                className="mr-2"
              />
              <label htmlFor="limit-validity" className="text-gray-700">
                Limit validity period
              </label>
            </div>
            <div className="flex items-center">
              <input
                type="checkbox"
                id="min-amount"
                checked={minimumAmount}
                onChange={() => setMinimumAmount(!minimumAmount)}
                className="mr-2"
              />
              <label htmlFor="min-amount" className="text-gray-700">
                Set a minimum qualifying amount
              </label>
            </div>
            <div className="flex items-center">
              <input
                type="checkbox"
                id="min-quantity"
                checked={minimumQuantity}
                onChange={() => setMinimumQuantity(!minimumQuantity)}
                className="mr-2"
              />
              <label htmlFor="min-quantity" className="text-gray-700">
                Set a minimum quantity
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
