import { useState } from "react";
import CODModal from "./CODModal";

function ProductCard({ product }) {
  const variants = product.variants?.nodes || [];

  const [selectedVariantId, setSelectedVariantId] = useState(
    variants[0]?.id || ""
  );

  const [showModal, setShowModal] = useState(false);
  const [orderResult, setOrderResult] = useState(null);

  const selectedVariant =
    variants.find(
      (variant) => variant.id === selectedVariantId
    ) || variants[0];

  const handleOpenModal = () => {
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);

    // clear/reset selected variant
    setSelectedVariantId(
      variants[0]?.id || ""
    );
  };

  const handleSuccess = (data) => {
    setShowModal(false);

    setOrderResult({
      ...data,

      selectedProductTitle:
        product.title,

      selectedVariantTitle:
        selectedVariant?.title,

      selectedVariantId:
        selectedVariant?.id,
    });

    // reset variant after successful order
    setSelectedVariantId(
      variants[0]?.id || ""
    );
  };

  return (
    <>
      <div className="product-card">
        <div className="product-content">

          <h3>
            {product.title}
          </h3>

          <div className="price">
            ₹{selectedVariant?.price || "0.00"}
          </div>

          <button
            className="cod-button"
            onClick={handleOpenModal}
          >
            Order Now
          </button>

        </div>
      </div>


      {showModal && selectedVariant && (
        <CODModal
          product={product}
          variant={selectedVariant}
          onClose={handleCloseModal}
          onSuccess={handleSuccess}
        />
      )}


      {orderResult && (
        <div className="success-modal-overlay">

          <div className="success-modal">

            <div className="success-check">
              ✓
            </div>

            <h2>
              Congratulations!
            </h2>

            <p className="success-message">
              Your Cash on Delivery order
              has been placed successfully.
            </p>


            <div className="success-details">

              <div>
                <span>
                  Product
                </span>

                <strong>
                  {
                    orderResult
                      .selectedProductTitle
                  }
                </strong>
              </div>


              {orderResult.selectedVariantTitle !==
                "Default Title" && (
                <div>
                  <span>
                    Variant
                  </span>

                  <strong>
                    {
                      orderResult
                        .selectedVariantTitle
                    }
                  </strong>
                </div>
              )}


              <div>
                <span>
                  Order Number
                </span>

                <strong className="success-order-number">
                  {
                    orderResult
                      .order
                      ?.orderNumber
                  }
                </strong>
              </div>

            </div>


            <button
              className="continue-shopping-button"
              onClick={() =>
                setOrderResult(null)
              }
            >
              Continue Shopping
            </button>

          </div>

        </div>
      )}
    </>
  );
}

export default ProductCard;