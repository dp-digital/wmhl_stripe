const env = require('dotenv').config().parsed;
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const express = require('express');

const app = express();

const PORT = process.env.PORT || 3000;
app.use(express.json());

app.get('/', (req, res) => {
    res.send('API Working...');
})

app.post('/payment-intent', async (req, res) => {
    try {
        const AUTH_TOKEN = process.env.AUTH_TOKEN;

        if (!AUTH_TOKEN) {
            return res.status(500).json({ status: false, message: 'API_AUTH_TOKEN is not set' });
        }

        const token = req.headers.authorization?.split(' ')[1];
        if (token !== AUTH_TOKEN) {
            return res.status(401).json({ status: false, message: 'Unauthorized' });
        }

        if (!req.body || typeof req.body !== 'object') {
            return res.status(400).json({ status: false, message: 'Request body must be valid JSON' });
        }

        const { amount, customerId } = req.body;

        if (typeof customerId !== 'string' || customerId.trim() === '') {
            return res.status(400).json({ status: false, message: 'Customer ID must be a non-empty string' });
        }

        const amountFloat = parseFloat(amount);
        const amountInt = Math.round(amountFloat * 100);

        if (amount === undefined || isNaN(amountFloat)) {
            return res.status(400).json({ status: false, message: 'Amount is required and must be a valid number' });
        }

        if (isNaN(amountInt) || amountInt <= 0) {
            return res.status(400).json({ status: false, message: 'Amount must be a positive integer' });
        }

        const paymentIntent = await stripe.paymentIntents.create({
            amount: amountInt,
            currency: 'aud',
            customer: customerId,
            setup_future_usage: 'off_session',
            payment_method_types: ['card']
        });

        const ephemeralKey = await stripe.ephemeralKeys.create(
            { customer: customerId },
            { apiVersion: '2023-10-16' }
        );

        return res.status(200).json({ 
            status: true,
            message: {
                data: paymentIntent,
                secretKey: process.env.STRIPE_SECRET_KEY,
                clientSecret: paymentIntent.client_secret,
                ephemeralKey: ephemeralKey.secret,
                customerId: customerId
            }
        });

    } catch (error) {
        console.error('Stripe error:', error);
        return res.status(500).json({ status: false, message: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
