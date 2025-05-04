import { useState } from "react";

export function DiscountForm() {
  const [discountType, setDiscountType] = useState<"percentage" | "fixed">("percentage");
  const [limitQuantity, setLimitQuantity] = useState(false);
  const [limitValidity, setLimitValidity] = useState(false);
  const [minimumAmount, setMinimumAmount] = useState(false);
  const [minimumQuantity, setMinimumQuantity] = useState(false);
  const [allProducts, setAllProducts] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errors, setErrors] = useState<{ name?: string }>({});
  const [formValues, setFormValues] = useState({
    name: "",
    code: "",
    products: "",
    value: "",
  });

  const handleInputChange = (field: keyof typeof formValues, value: string | number) => {
    setFormValues((prev) => ({ ...prev, [field]: value }));

    if (field === "name" && errors.name) {
      setErrors((prev) => ({ ...prev, name: undefined }));
    }
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    const newErrors: { name?: string } = {};

    if (!formValues.name.trim()) {
      newErrors.name = "Discount name is required";
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length === 0) {
      setIsSuccess(true);
    }
  };

  if (isSuccess) {
    return (
      <div className="max-w-4xl bg-white p-6 rounded-lg shadow">
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-2 mb-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6 text-green-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <h2 className="text-xl font-semibold text-green-700">Discount created successfully!</h2>
          </div>

          <div className="ml-8 space-y-2 text-gray-700">
            <p>
              <span className="font-medium">Name:</span> {formValues.name || "Unnamed discount"}
            </p>
            <p>
              <span className="font-medium">Code:</span> {formValues.code || "dlehOwh"}
            </p>
            <p>
              <span className="font-medium">Discount type:</span>
              {discountType === "percentage" ? `${formValues.value || 0}% off` : `$${formValues.value || 0} off`}
            </p>
            <p>
              <span className="font-medium">Products:</span>
              {allProducts ? "All products" : formValues.products || "No specific products"}
            </p>

            {(limitQuantity || limitValidity || minimumAmount || minimumQuantity) && (
              <div className="mt-2">
                <p className="font-medium">Additional settings:</p>
                <ul className="list-disc ml-5">
                  {limitQuantity && <li>Limited quantity</li>}
                  {limitValidity && <li>Limited validity period</li>}
                  {minimumAmount && <li>Minimum qualifying amount</li>}
                  {minimumQuantity && <li>Minimum quantity requirement</li>}
                </ul>
              </div>
            )}
          </div>

          <div className="mt-6 flex gap-3">
            <button
              onClick={() => setIsSuccess(false)}
              className="bg-transparent border border-gray-300 text-gray-700 px-4 py-2 rounded flex items-center gap-2"
            >
              Edit discount
            </button>
            <button className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">Share discount</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <form name="discount-form" onSubmit={handleSubmit} className="max-w-4xl bg-white p-6 rounded-lg shadow">
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
          <button type="button" className="text-blue-600 underline">
            Learn more
          </button>
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            className="bg-transparent border border-gray-300 text-gray-700 px-4 py-2 rounded flex items-center gap-2"
          >
            <span>Cancel</span>
          </button>
          <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
            Add discount
          </button>
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
            value={formValues.name}
            required
            onChange={(e) => handleInputChange("name", e.target.value)}
            className={`w-full border ${errors.name ? "border-red-500" : "border-gray-300"} rounded p-2 text-gray-800`}
          />
          {errors.name && <p className="mt-1 text-red-500 text-sm">{errors.name}</p>}
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
              value={formValues.code}
              onChange={(e) => handleInputChange("code", e.target.value)}
              className="w-full border border-gray-300 rounded-l p-2 text-gray-800"
            />
            <button type="button" className="bg-gray-200 border border-gray-300 rounded-r p-2 text-gray-600">
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
            value={formValues.products}
            onChange={(e) => handleInputChange("products", e.target.value)}
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
                    value={formValues.value}
                    onChange={(e) => handleInputChange("value", parseFloat(e.target.value))}
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
                    value={formValues.value}
                    onChange={(e) => handleInputChange("value", parseFloat(e.target.value))}
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
    </form>
  );
}
