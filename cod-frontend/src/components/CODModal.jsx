import { useRef, useState } from "react";

function CODModal({ product, variant, onClose, onSuccess }) {
  const idempotencyKeyRef = useRef(crypto.randomUUID());
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    address: "",
    city: "",
    state: "",
    pincode: "",
    quantity: 1,
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState("");
  const [pincodeBlocked, setPincodeBlocked] = useState(false);
  const [pincodeMessage, setPincodeMessage] = useState("");

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    setErrors((prev) => ({
      ...prev,
      [name]: "",
    }));
    if (name === "pincode") {
      checkPincode(value);
    }
  };

  const validate = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = "Please enter your full name";
    }

    const digits = formData.phone.replace(/\D/g, "");

    const validPhone =
      digits.length === 10 || (digits.length === 12 && digits.startsWith("91"));

    if (!formData.phone.trim()) {
      newErrors.phone = "Please enter your phone number";
    } else if (!validPhone) {
      newErrors.phone = "Enter a valid Indian phone number";
    }

    if (!formData.address.trim()) {
      newErrors.address = "Please enter your address";
    }

    if (!formData.city.trim()) {
      newErrors.city = "City is required";
    }

    if (!formData.state.trim()) {
      newErrors.state = "State is required";
    }

    if (!/^\d{6}$/.test(formData.pincode)) {
      newErrors.pincode = "Enter a valid 6 digit pincode";
    }

    if (Number(formData.quantity) < 1) {
      newErrors.quantity = "Quantity must be at least 1";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validate()) return;

    try {
      setLoading(true);
      setServerError("");

      const response = await fetch(
        "http://localhost:5000/api/shopify/createorder",
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",

            "X-Idempotency-Key": idempotencyKeyRef.current,
          },

          body: JSON.stringify({
            name: formData.name,
            phone: formData.phone,
            address: formData.address,
            city: formData.city,
            state: formData.state,
            pincode: formData.pincode,
            quantity: Number(formData.quantity),
            variantId: variant.id,
          }),
        },
      );

      const data = await response.json();
      if (response.status === 409 && data.status === "processing") {
        setServerError(data.message);
        return;
      }
      if (response.status === 409 && data.status === "unknown") {
        setServerError(data.message);
        return;
      }

      if (!response.ok) {
        setServerError(data.message || "Unable to place your order");
        return;
      }

      setServerError("");
      setFormData({
        name: "",
        phone: "",
        address: "",
        city: "",
        state: "",
        pincode: "",
        quantity: 1,
      });

      onSuccess(data);
    } catch (error) {
      setServerError(error.message || "Unable to place your order");
    } finally {
      setLoading(false);
    }
  };

  const checkPincode = async (pincode) => {
    if (!/^\d{6}$/.test(pincode)) {
      setPincodeBlocked(false);
      setPincodeMessage("");
      return;
    }

    try {
      const response = await fetch(
        `http://localhost:5000/api/settings/check-pincode/${pincode}`,
      );

      const data = await response.json();

      if (!response.ok) {
        return;
      }

      setPincodeBlocked(data.blocked);

      setPincodeMessage(data.blocked ? data.message : "");
    } catch (error) {
      console.error("PINCODE CHECK ERROR:", error);
    }
  };

  return (
    <div className="cod-modal-backdrop">
      <div className="cod-modal-shell">
        <div className="cod-modal-topbar">
          <div>
            <span className="cod-badge">Cash on Delivery</span>

            <h2>Complete your order</h2>

            <p>Enter your delivery details below.</p>
          </div>

          <button
            type="button"
            className="cod-close-button"
            onClick={onClose}
            disabled={loading}
          >
            ×
          </button>
        </div>

        <div className="cod-product-summary">
          <div className="cod-product-icon">{product.title?.charAt(0)}</div>

          <div className="cod-product-info">
            <strong>{product.title}</strong>

            {variant.title !== "Default Title" && <span>{variant.title}</span>}
          </div>

          <div className="cod-product-price">₹{variant.price}</div>
        </div>

        <form onSubmit={handleSubmit} className="cod-form">
          <div className="cod-field">
            <label>Full name</label>

            <input
              type="text"
              name="name"
              placeholder="Enter your full name"
              value={formData.name}
              onChange={handleChange}
            />

            {errors.name && (
              <span className="cod-error-text">{errors.name}</span>
            )}
          </div>

          <div className="cod-field">
            <label>Phone number</label>

            <div className="cod-phone-wrap">
              <span className="cod-phone-prefix">+91</span>

              <input
                type="tel"
                name="phone"
                placeholder="9876543210"
                value={formData.phone}
                onChange={handleChange}
              />
            </div>

            {errors.phone && (
              <span className="cod-error-text">{errors.phone}</span>
            )}
          </div>

          <div className="cod-field">
            <label>Address</label>

            <textarea
              name="address"
              placeholder="House no, street, area"
              value={formData.address}
              onChange={handleChange}
            />

            {errors.address && (
              <span className="cod-error-text">{errors.address}</span>
            )}
          </div>

          <div className="cod-grid-2">
            <div className="cod-field">
              <label>City</label>

              <input
                type="text"
                name="city"
                placeholder="Pathankot"
                value={formData.city}
                onChange={handleChange}
              />

              {errors.city && (
                <span className="cod-error-text">{errors.city}</span>
              )}
            </div>

            <div className="cod-field">
              <label>State</label>

              <input
                type="text"
                name="state"
                placeholder="Punjab"
                value={formData.state}
                onChange={handleChange}
              />

              {errors.state && (
                <span className="cod-error-text">{errors.state}</span>
              )}
            </div>
          </div>

          <div className="cod-grid-2">
            <div className="cod-field">
              <label>Pincode</label>

              <input
                type="text"
                name="pincode"
                placeholder="145001"
                maxLength={6}
                value={formData.pincode}
                onChange={handleChange}
              />

              {errors.pincode && (
                <span className="cod-error-text">{errors.pincode}</span>
              )}
            </div>

            <div className="cod-field">
              <label>Quantity</label>

              <input
                type="number"
                name="quantity"
                min="1"
                value={formData.quantity}
                onChange={handleChange}
              />

              {errors.quantity && (
                <span className="cod-error-text">{errors.quantity}</span>
              )}
            </div>
          </div>

          {serverError && <div className="cod-server-error">{serverError}</div>}

          <div className="cod-secure-note">
            <span>✓</span>
            Pay when your order is delivered
          </div>

          {pincodeBlocked && (
            <span className="cod-error-text">{pincodeMessage}</span>
          )}
          <button
            type="submit"
            className="cod-submit-button"
            disabled={loading || pincodeBlocked}
          >
            {pincodeBlocked
              ? "COD Not Available"
              : loading
                ? "Placing order..."
                : "Place Order"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default CODModal;
