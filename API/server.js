const express = require('express');
const app = express();
const { resolve } = require('path');
// Replace if using a different env file or config
const env = require('dotenv').config({ path: "./.env" });
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

app.use(express.static(process.env.STATIC_DIR));

app.use(
  express.json({
    // We need the raw body to verify webhook signatures.
    // Let's compute it only when hitting the Stripe webhook endpoint.
    verify: function(req, res, buf) {
      if (req.originalUrl.startsWith('/webhook')) {
        req.rawBody = buf.toString();
      }
    }
  })
);

app.get('/', (req, res) => {
  const path = resolve(process.env.STATIC_DIR + '/index.html');
  res.sendFile(path);
});

app.get('/public-key', (req, res) => {
  res.send({ publicKey: process.env.STRIPE_PUBLISHABLE_KEY });
});

app.post('/create-customer', async (req, res) => {
  // This creates a new Customer and attaches
  // the PaymentMethod to be default for invoice in one API call.

  //need to check if we already created this customer using "Retrieve customer API"
  
  const customer = await stripe.customers.create({
    payment_method: req.body.payment_method,
    email: req.body.email,
    invoice_settings: {
      default_payment_method: req.body.payment_method
    }
  });
  // At this point, associate the ID of the Customer object with your
  // own internal representation of a customer, if you have one.
  const subscription = await stripe.subscriptions.create({
    customer: customer.id,
    items: [{ plan: process.env.ONE_DAY_SUBSCRIPTION_PLAN_ID }],
    expand: ['latest_invoice.payment_intent']
  });
  
  res.send(subscription);
});

app.post('/subscription', async (req, res) => {
  let subscription = await stripe.subscriptions.retrieve(
    req.body.subscriptionId
  );
  res.send(subscription);
});

app.post('/customerDetails', async (req, res) => {

  //Alt Xsession verify

  stripe.customers.retrieve(req.body.customer,function(err, customer) {
      // asynchronously called
      if(err)
      { 
        console.log(err);
        res.send(err);
      }
      else
      {
        console.log(customer);
        res.send(customer);
      }
      
    }
  );
  
});


app.post('/subscriptionDetails', async (req, res) => {

  //this apijson data have transaction status also
  //values : incomplete, incomplete_expired, trialing, active, past_due(failed to renew), canceled, or unpaid.

  //Alt Xsession verify
  
  stripe.subscriptions.retrieve(req.body.subscription,function(err, subscription) {
      // asynchronously called
      if(err)
      { 
        console.log(err);
        res.send(err);
      }
      else
      {
        console.log(subscription);
        res.send(subscription);
      }
      
    }
  );
  
});

app.post('/upcomingInvoice', async (req, res) => {

  //Alt Xsession verify

  stripe.invoices.retrieveUpcoming({customer: req.body.customer},function(err, upcoming) {
      // asynchronously called

      if(err)
      { 
        console.log(err);
        res.send(err);
      }
      else
      {
        console.log(upcoming);
        res.send(upcoming);
      }
      

    }
  );
  
});

app.post('/retrieveInvoice', async (req, res) => {

  //Alt Xsession verify

  stripe.invoices.retrieve(req.body.invoice,function(err, invoice) {
         // asynchronously called

      if(err)
      { 
        console.log(err);
        res.send(err);
      }
      else
      {
        console.log(invoice);
        res.send(invoice);
      }
      

    }
  );
  
});

app.post('/deleteSubscription', async (req, res) => {

  stripe.subscriptions.del(req.body.subscription,function(err, success) {
         // asynchronously called

      if(err)
      { 
        console.log(err);
        res.send(err);
      }
      else
      {
        console.log(success);
        res.send(success);
      }

    }
  );
  
});


app.post('/cancelingSubscription', async (req, res) => {

  stripe.subscriptions.update(req.body.subscription, {cancel_at_period_end: true}, function(err, success) {
         // asynchronously called

      if(err)
      { 
        console.log(err);
        res.send(err);
      }
      else
      {
        console.log(success);
        res.send(success);
      }

    }
  );
  
});


app.post('/reActivateSubscription', async (req, res) => {

  const subscription = await stripe.subscriptions.retrieve(req.body.subscription);
  console.log("get subscription",subscription);
  console.log("subscription value",req.body.subscription);

  stripe.subscriptions.update(req.body.subscription, {cancel_at_period_end: false,
    items: [{id: subscription.items.data[0].id,plan: subscription.items.data[0].plan.id,}]}, function(err, success) {
      // asynchronously called
      if(err)
      { 
        console.log(err);
        res.send(err);
      }
      else
      {
        console.log(success);
        res.send(success);
      }

    }
  );
  
});
  


// Webhook handler for asynchronous events.
app.post('/webhook', async (req, res) => {
  let data;
  let eventType;
  // Check if webhook signing is configured.
  if (process.env.STRIPE_WEBHOOK_SECRET) {
    // Retrieve the event by verifying the signature using the raw body and secret.
    let event;
    let signature = req.headers['stripe-signature'];

    try {
      event = stripe.webhooks.constructEvent(
        req.rawBody,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET
      );
    } catch (err) {
      console.log(`⚠️  Webhook signature verification failed.`);
      return res.sendStatus(400);
    }
    // Extract the object from the event.
    dataObject = event.data.object;
    eventType = event.type;

    // Handle the Webhook event ()

    switch (event.type) {
      case 'customer.created':
         console.log(dataObject);
        break;
      case 'customer.updated':
         console.log(dataObject);
        break;
      case 'invoice.upcoming':
         console.log(dataObject);
        break;
      case 'invoice.created':
         console.log(dataObject);
        break;
      case 'invoice.finalized':
        console.log(dataObject);
        break;
      case 'invoice.payment_succeeded':
         console.log(dataObject);
        break;
      case 'invoice.payment_failed':
         console.log(dataObject);
        break;
      case 'customer.subscription.created':
         console.log(dataObject);
        break;
      // ... handle other event types
      default:
        // Unexpected event type
        return res.status(400).end();
    }
  } else {
    // Webhook signing is recommended, but if the secret is not configured in `config.js`,
    // retrieve the event data directly from the request body.
    data = req.body.data;
    eventType = req.body.type;
  }

  res.sendStatus(200);
});

app.listen(4242, () => console.log(`Node server listening on port ${4242}!`));
