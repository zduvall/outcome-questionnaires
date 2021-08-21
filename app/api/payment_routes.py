import os
import stripe
from datetime import datetime

from flask import Blueprint, jsonify, request
from flask_login import login_required, current_user
from .auth_routes import validation_errors_to_error_messages

from app.forms import NewCustomerForm
from app.models import Customer, User, db
from app.config import Config

# Set your secret key. Remember to switch to your live secret key in production.
# See your keys here: https://dashboard.stripe.com/account/apikeys

# set up stripe
stripe_keys = {
    "secret_key": os.environ["STRIPE_SECRET_KEY"],
    "publishable_key": os.environ["STRIPE_PUBLISHABLE_KEY"],
    "price_id": os.environ["STRIPE_PRICE_ID"],
}

stripe.api_key = stripe_keys["secret_key"]

payment_routes = Blueprint("payments", __name__)


# @payment_routes.route("/config")
# def get_publishable_key():
#     return jsonify(stripe.api_key)


@payment_routes.route("/customer", methods=["POST"])
@login_required
def create_customer():
    """
    Creates a new customer or modifies customer if already exists
    """
    form = NewCustomerForm()
    form["csrf_token"].data = request.cookies["csrf_token"]
    if form.validate_on_submit():

        # modify customer if already exists
        customer_to_update = Customer.query.filter_by(
            userId=form.data["userId"]
        ).first()

        if customer_to_update:
            stripe_customer = stripe.Customer.modify(
                customer_to_update.stripeCustomerId,
                name=form.data["name"],
                email=form.data["email"],
                address={
                    "city": form.data["city"],
                    "line1": form.data["line1"],
                    "state": form.data["state"],
                    "country": form.data["country"],
                    "postal_code": form.data["postal_code"],
                },
                metadata={"userId": form.data["userId"]},
            )

            return stripe_customer.to_dict()

        # create customer if doesn't yet exist
        stripe_customer = stripe.Customer.create(
            name=form.data["name"],
            email=form.data["email"],
            address={
                "city": form.data["city"],
                "line1": form.data["line1"],
                "state": form.data["state"],
                "country": form.data["country"],
                "postal_code": form.data["postal_code"],
            },
            metadata={"userId": form.data["userId"]},
        )

        new_db_customer = Customer(
            userId=stripe_customer.metadata["userId"],
            stripeCustomerId=stripe_customer.id,
        )

        db.session.add(new_db_customer)
        db.session.commit()

        return stripe_customer.to_dict()

    print("-------errors-------", form.errors)
    return {"errors": validation_errors_to_error_messages(form.errors)}, 401


@payment_routes.route("/create-subscription", methods=["POST"])
@login_required
def add_payment_info():
    """
    Create subscription (or just update default payment if sub already exists).
    Add some of payment info to customer in DB.
    """

    try:
        # Attach the payment method to the customer
        stripe.PaymentMethod.attach(
            request.json["paymentMethodId"],
            customer=request.json["customerId"],
        )
        # Set the default payment method on the customer, will remove default
        # status from previous payment method if one already exists
        stripe.Customer.modify(
            request.json["customerId"],
            invoice_settings={
                "default_payment_method": request.json["paymentMethodId"],
            },
        )

        # oncy create a subscription if a stripeSubId doesn't already exist
        # or if sub is not active (really only need 2nd check because subStatus
        # is empty if there isn't a subscription yet, just doing an extra test)
        # otherwise just retrieve it
        subscription = (
            stripe.Subscription.create(
                customer=request.json["customerId"],
                items=[{"price": request.json["priceId"]}],
                expand=["latest_invoice.payment_intent"],
            )
            if not current_user.customer.stripeSubId
            or current_user.customer.subStatus != "active"
            else stripe.Subscription.retrieve(current_user.customer.stripeSubId)
        )

        key = subscription["items"]["data"][0]["plan"]["product"]
        subType = Config.PRODUCT_DICT[key]

        # customer already exists at this point, so we're only modifying it.
        # If this is the first time, it only has a userId and stripeCustomerId
        # at this point.
        customer_to_update = Customer.query.filter_by(
            userId=request.json["userId"]
        ).first()

        if customer_to_update:
            customer_to_update.brand = request.json["brand"]
            customer_to_update.last4 = request.json["last4"]
            customer_to_update.expMonth = request.json["exp_month"]
            customer_to_update.expYear = request.json["exp_year"]
            customer_to_update.stripeSubId = subscription.id

            db.session.add(customer_to_update)

            current_user.subType = subType
            db.session.add(current_user)

            db.session.commit()

            return current_user.to_dict()

    except Exception as e:
        error = str(e)[str(e).index(":") + 1 :]
        print("-------errors-------", error)
        return {"errors": error}, 200


@payment_routes.route("/cancel-subscription", methods=["PUT"])
@login_required
def cancel_subscription():
    """
    Cancel subscription in stripe and change subType on user
    """
    try:
        stripe.Subscription.delete(request.json["stripeSubId"])

        user_w_cancelled_sub = User.query.get(request.json["userId"])
        user_w_cancelled_sub.subType = 0

        db.session.add(user_w_cancelled_sub)
        db.session.commit()

        return user_w_cancelled_sub.to_dict()
    except Exception as e:
        error = "Cancellation failed, please reach out to Zachary Duvall (see footer) with concerns"
        print("-------errors-------", error)
        return {"errors": error}, 200


@payment_routes.route("/get-bill-date-and-status/<path:stripeSubId>", methods=["GET"])
@login_required
def get_bill_date_and_status(stripeSubId):
    """
    Get the next billing date and subscription status from stripe
    """
    subscription = stripe.Subscription.retrieve(stripeSubId)

    sub_status = subscription.status
    last_bill_date = datetime.fromtimestamp(subscription.current_period_start)
    next_bill_date = datetime.fromtimestamp(subscription.current_period_end)

    current_user.customer.subStatus = sub_status
    current_user.customer.lastBillDate = last_bill_date
    current_user.customer.nextBillDate = next_bill_date

    db.session.add(current_user)
    db.session.commit()

    return current_user.to_dict()


#  https://stripe.com/docs/billing/subscriptions/fixed-price#manage-subscription-payment-failure


# @payment_routes.route("/stripe-webhook", methods=["POST"])
# def webhook_received():
#     # You can use webhooks to receive information about asynchronous payment events.
#     # For more about our webhook events check out https://stripe.com/docs/webhooks.
#     webhook_secret = os.environ("STRIPE_WEBHOOK_SECRET")
#     request_data = json.loads(request.data)

#     if webhook_secret:
#         # Retrieve the event by verifying the signature using the raw body and secret if webhook signing is configured.
#         signature = request.headers.get("stripe-signature")
#         try:
#             event = stripe.Webhook.construct_event(
#                 payload=request.data, sig_header=signature, secret=webhook_secret
#             )
#             data = event["data"]
#         except Exception as e:
#             return e
#         # Get the type of webhook event sent - used to check the status of PaymentIntents.
#         event_type = event["type"]
#     else:
#         data = request_data["data"]
#         event_type = request_data["type"]

#     data_object = data["object"]

#     if event_type == "invoice.paid":
#         # Used to provision services after the trial has ended.
#         # The status of the invoice will show up as paid. Store the status in your
#         # database to reference when a user accesses your service to avoid hitting rate
#         # limits.
#         print(data)

#     if event_type == "invoice.payment_failed":
#         # If the payment fails or the customer does not have a valid payment method,
#         # an invoice.payment_failed event is sent, the subscription becomes past_due.
#         # Use this webhook to notify your user that their payment has
#         # failed and to retrieve new card details.
#         print(data)

#     if event_type == "customer.subscription.deleted":
#         # handle subscription cancelled automatically based
#         # upon your subscription settings. Or if the user cancels it.
#         print(data)

#     return jsonify({"status": "success"})
