const express = require("express");
const { shopifyGraphQL } = require("../config/shopify");
const Order = require("../models/Order");
const Idempotency = require("../models/Idempotency");

const router = express.Router();

// ========================================
// GET PRODUCTS + VARIANT IDS
// ========================================

router.get("/products", async (req, res) => {
  try {
    const query = `
      query {
        products(first: 20) {
          nodes {
            id
            title

            variants(first: 20) {
              nodes {
                id
                title
                price
              }
            }
          }
        }
      }
    `;

    const result = await shopifyGraphQL(query);

    res.status(200).json({
      success: true,
      products: result.data.products.nodes,
    });
  } catch (error) {
    console.error("PRODUCT ERROR:", error.message);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});
 
router.post("/createorder", async (req, res) => {
  try {
    const idempotencyKey = req.headers["x-idempotency-key"];
    if (!idempotencyKey) {
      return res.status(400).json({
        success: false,
        message: "Idempotency key is required",
      });
    }

    const { name, phone, address, city, state, pincode, quantity, variantId } = req.body;

    if (!name || !phone || !address || !quantity || !variantId) {
      return res.status(400).json({
        success: false,
        message: "Name, phone, address, quantity and variantId are required",
      });
    }
 

try {
  await Idempotency.create({
    key: idempotencyKey,
    status: "processing",
    requestPayload: req.body,
  });

  console.log(
    "FIRST REQUEST - CONTINUE TO SHOPIFY:",
    idempotencyKey
  );

} catch (error) {


  if (error.code === 11000) {

    const existing =
      await Idempotency.findOne({
        key: idempotencyKey,
      });

    console.log(
      "DUPLICATE REQUEST:",
      existing
    );



    if (
      existing?.status === "completed" &&
      existing?.responseData
    ) {
      console.log(
        "RETURNING EXISTING ORDER:",
        existing.orderNumber
      );

      return res.status(200).json({
        ...existing.responseData,

        idempotent: true,

        message:
          "This order has already been created.",
      });
    }



    if (
      existing?.status === "processing"
    ) {
      return res.status(409).json({
        success: false,

        status: "processing",

        message:
          "Your order request has already been sent and is being processed.",
      });
    }



    if (
      existing?.status === "unknown"
    ) {
      return res.status(409).json({
        success: false,

        status: "unknown",

        message:
          "Your order has already been submitted and is being verified.",
      });
    }



    if (
      existing?.status === "failed"
    ) {
      return res.status(409).json({
        success: false,

        status: "failed",

        message:
          existing.errorMessage ||
          "This order request has already been attempted.",
      });
    }


    return res.status(409).json({
      success: false,

      status: "processing",

      message:
        "Your order request has already been sent.",
    });
  }

  throw error;
}

    let normalizedPhone = String(phone).replace(/\D/g, "");
    if (normalizedPhone.startsWith("91") && normalizedPhone.length === 12) {
      normalizedPhone = normalizedPhone.slice(2);
    }
    if (normalizedPhone.length !== 10) {
      await Idempotency.findOneAndUpdate(
        { key: idempotencyKey },
        { $set: { status: "failed", errorMessage: "Invalid phone number" } }
      );
      return res.status(400).json({
        success: false,
        message: "Please enter a valid 10 digit Indian phone number",
      });
    }
    normalizedPhone = `+91${normalizedPhone}`;

    const variantQuery = `
      query GetVariant($id: ID!) {
        node(id: $id) {
          ... on ProductVariant {
            id
            title
            price
            product {
              id
              title
            }
          }
        }
      }
    `;
    const variantResult = await shopifyGraphQL(variantQuery, { id: variantId });
    const variantNode = variantResult.data?.node;
    if (!variantNode) {
      await Idempotency.findOneAndUpdate(
        { key: idempotencyKey },
        { $set: { status: "failed", errorMessage: "Invalid variant ID" } }
      );
      return res.status(400).json({
        success: false,
        message: "The provided variant ID does not exist",
      });
    }

    const product = variantNode.product;
    const variant = {
      id: variantNode.id,
      title: variantNode.title,
      price: variantNode.price,
    };

    const customerMutation = `
      mutation CustomerCreate($input: CustomerInput!) {
        customerCreate(input: $input) {
          customer {
            id
            firstName
            phone
            addresses {
              address1
              phone
              countryCode
            }
          }
          userErrors {
            field
            message
          }
        }
      }
    `;

    const customerResult = await shopifyGraphQL(customerMutation, {
      input: {
        firstName: name,
        phone: normalizedPhone,
        addresses: [
          {
            firstName: name,
            address1: address,
            phone: normalizedPhone,
            countryCode: "IN",
          },
        ],
      },
    });

    const customerErrors = customerResult.data?.customerCreate?.userErrors || [];
    let customer = customerResult.data?.customerCreate?.customer;

    const phoneAlreadyExists = customerErrors.some(
      (error) =>
        error.field?.includes("phone") &&
        error.message?.toLowerCase().includes("already been taken")
    );

    if (phoneAlreadyExists) {
      const searchCustomerQuery = `
        query SearchCustomer($query: String!) {
          customers(first: 1, query: $query) {
            nodes {
              id
              firstName
              lastName
              phone
            }
          }
        }
      `;
      const existingCustomerResult = await shopifyGraphQL(searchCustomerQuery, {
        query: `phone:${normalizedPhone}`,
      });
      customer = existingCustomerResult.data?.customers?.nodes?.[0];
      if (!customer) {
        await Idempotency.findOneAndUpdate(
          { key: idempotencyKey },
          { $set: { status: "failed", errorMessage: "Existing customer not found" } }
        );
        return res.status(400).json({
          success: false,
          message: "Existing customer could not be found",
        });
      }
    } else if (customerErrors.length > 0) {
      await Idempotency.findOneAndUpdate(
        { key: idempotencyKey },
        { $set: { status: "failed", errorMessage: customerErrors[0]?.message } }
      );
      return res.status(400).json({
        success: false,
        message: customerErrors[0]?.message || "Customer creation failed",
        errors: customerErrors,
      });
    }

    if (!customer) {
      await Idempotency.findOneAndUpdate(
        { key: idempotencyKey },
        { $set: { status: "failed", errorMessage: "Customer not created" } }
      );
      return res.status(400).json({
        success: false,
        message: "Shopify customer was not created",
      });
    }

    const customerId = customer.id;

    const mutation = `
      mutation CreateOrder($order: OrderCreateOrderInput!) {
        orderCreate(order: $order) {
          order {
            id
            name
            displayFinancialStatus
            customer {
              id
              firstName
              phone
            }
            shippingAddress {
              firstName
              address1
              phone
              country
            }
            billingAddress {
              firstName
              address1
              phone
              country
            }
            lineItems(first: 10) {
              nodes {
                title
                quantity
              }
            }
          }
          userErrors {
            field
            message
          }
        }
      }
    `;

    const variables = {
      order: {
        lineItems: [
          {
            variantId: variantId,
            quantity: Number(quantity),
          },
        ],
        customer: {
          toAssociate: {
            id: customerId,
          },
        },
        phone: normalizedPhone,
        shippingAddress: {
          firstName: name,
          address1: address,
          phone: normalizedPhone,
          countryCode: "IN",
        },
        billingAddress: {
          firstName: name,
          address1: address,
          phone: normalizedPhone,
          countryCode: "IN",
        },
        financialStatus: "PENDING",
        tags: ["COD-Form"],
      },
    };

    const result = await shopifyGraphQL(mutation, variables);
    const orderCreate = result.data?.orderCreate;

    if (orderCreate?.userErrors?.length > 0) {
      await Idempotency.findOneAndUpdate(
        { key: idempotencyKey },
        { $set: { status: "failed", errorMessage: orderCreate.userErrors[0].message } }
      );
      return res.status(400).json({
        success: false,
        message: "Shopify validation error",
        errors: orderCreate.userErrors,
      });
    }

    if (!orderCreate?.order) {
      await Idempotency.findOneAndUpdate(
        { key: idempotencyKey },
        { $set: { status: "failed", errorMessage: "Order not created" } }
      );
      return res.status(400).json({
        success: false,
        message: "Shopify order was not created",
        response: result,
      });
    }

    const responseData = {
      success: true,
      message: "COD order created successfully",
      product: {
        id: product.id,
        title: product.title,
        variantId: variant.id,
        variantTitle: variant.title,
        price: variant.price,
      },
      customer: {
        id: customerId,
        name: name,
        phone: normalizedPhone,
        shippingAddress: { address, city, state, pincode },
        billingAddress: { address, city, state, pincode },
      },
      order: {
        id: orderCreate.order.id,
        orderNumber: orderCreate.order.name,
        financialStatus: orderCreate.order.displayFinancialStatus,
        customer: orderCreate.order.customer,
        shippingAddress: orderCreate.order.shippingAddress,
        billingAddress: orderCreate.order.billingAddress,
        items: orderCreate.order.lineItems.nodes,
      },
    };

    await Idempotency.findOneAndUpdate(
      { key: idempotencyKey },
      {
        $set: {
          status: "completed",
          shopifyOrderId: orderCreate.order.id,
          orderNumber: orderCreate.order.name,
          responseData: responseData,
          errorMessage: null,
        },
      }
    );

    return res.status(201).json(responseData);
  } catch (error) {
    console.error("CREATE ORDER ERROR:", error);
    if (idempotencyKey) {
      await Idempotency.findOneAndUpdate(
        { key: idempotencyKey },
        { $set: { status: "failed", errorMessage: error.message } }
      ).catch(() => {});
    }
    return res.status(500).json({
      success: false,
      message: "Unable to create order",
      error: error.message,
    });
  }
});

module.exports = router;
