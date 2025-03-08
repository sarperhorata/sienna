const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const User = require('../models/User');
const Image = require('../models/Image');
const Order = require('../models/Order');

// Create a payment intent for Stripe
exports.createPaymentIntent = async (req, res) => {
  try {
    const { imageId } = req.body;
    const userId = req.user._id;
    
    // Find the image
    const image = await Image.findById(imageId);
    
    if (!image) {
      return res.status(404).json({ message: 'Image not found' });
    }
    
    // Check if user already purchased this image
    const alreadyPurchased = req.user.purchasedImages.includes(imageId);
    
    if (alreadyPurchased) {
      return res.status(400).json({ message: 'You already own this image' });
    }
    
    // Create a payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(image.price * 100), // Convert to cents
      currency: 'usd',
      metadata: {
        userId: userId.toString(),
        imageId: imageId,
      },
    });
    
    // Create an order
    const order = new Order({
      user: userId,
      image: imageId,
      amount: image.price,
      paymentMethod: 'stripe',
      paymentId: paymentIntent.id,
    });
    
    await order.save();
    
    res.json({
      clientSecret: paymentIntent.client_secret,
      orderId: order._id,
    });
  } catch (error) {
    console.error('Create payment intent error:', error);
    res.status(500).json({ message: 'Server error during payment processing' });
  }
};

// Handle successful payment
exports.handlePaymentSuccess = async (req, res) => {
  try {
    const { paymentIntentId } = req.body;
    
    // Verify the payment with Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    
    if (paymentIntent.status !== 'succeeded') {
      return res.status(400).json({ message: 'Payment not successful' });
    }
    
    // Get user and image IDs from metadata
    const { userId, imageId } = paymentIntent.metadata;
    
    // Update the order status
    const order = await Order.findOneAndUpdate(
      { paymentId: paymentIntentId },
      { status: 'completed' },
      { new: true }
    );
    
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
    
    // Add image to user's purchased images
    await User.findByIdAndUpdate(
      userId,
      { $addToSet: { purchasedImages: imageId } }
    );
    
    res.json({
      message: 'Payment successful',
      order,
    });
  } catch (error) {
    console.error('Handle payment success error:', error);
    res.status(500).json({ message: 'Server error during payment processing' });
  }
};

// Subscribe to premium
exports.subscribeToPremium = async (req, res) => {
  try {
    const { paymentMethodId } = req.body;
    const userId = req.user._id;
    
    // Check if user already has a Stripe customer ID
    let user = req.user;
    
    if (!user.stripeCustomerId) {
      // Create a new customer in Stripe
      const customer = await stripe.customers.create({
        email: user.email,
        payment_method: paymentMethodId,
        invoice_settings: {
          default_payment_method: paymentMethodId,
        },
      });
      
      // Update user with Stripe customer ID
      user = await User.findByIdAndUpdate(
        userId,
        { stripeCustomerId: customer.id },
        { new: true }
      );
    }
    
    // Create a subscription
    const subscription = await stripe.subscriptions.create({
      customer: user.stripeCustomerId,
      items: [
        {
          price: 'price_monthly_premium', // This should be created in your Stripe dashboard
        },
      ],
      expand: ['latest_invoice.payment_intent'],
    });
    
    // Update user subscription status
    await User.findByIdAndUpdate(
      userId,
      { subscriptionStatus: 'premium' }
    );
    
    res.json({
      message: 'Subscription successful',
      subscription,
    });
  } catch (error) {
    console.error('Subscribe to premium error:', error);
    res.status(500).json({ message: 'Server error during subscription processing' });
  }
};

// Process crypto payment (placeholder)
exports.processCryptoPayment = async (req, res) => {
  try {
    const { imageId, transactionHash } = req.body;
    const userId = req.user._id;
    
    // In a real implementation, you would verify the transaction on the blockchain
    // For now, we'll just simulate a successful payment
    
    // Find the image
    const image = await Image.findById(imageId);
    
    if (!image) {
      return res.status(404).json({ message: 'Image not found' });
    }
    
    // Create an order
    const order = new Order({
      user: userId,
      image: imageId,
      amount: image.price,
      paymentMethod: 'crypto',
      paymentId: transactionHash,
      status: 'completed',
    });
    
    await order.save();
    
    // Add image to user's purchased images
    await User.findByIdAndUpdate(
      userId,
      { $addToSet: { purchasedImages: imageId } }
    );
    
    res.json({
      message: 'Crypto payment successful',
      order,
    });
  } catch (error) {
    console.error('Process crypto payment error:', error);
    res.status(500).json({ message: 'Server error during crypto payment processing' });
  }
}; 