// This component is for credit car information.
// Without any API calls, it creates a payment method in stripe.
// Nothing is updated in database at this point. Still nothing in redux store.

import { useState, useEffect } from 'react';
import { useHistory } from 'react-router-dom';

// import context
import { usePaymentsContext } from '../../pages/Payments';

// stripe imports
import { CardElement, useStripe, useElements } from '@stripe/react-stripe-js';

export default function Payment2() {
  const history = useHistory();
  const { billingInfo, setPaymentMethod, paymentURL } = usePaymentsContext();

  // stripe
  const stripe = useStripe();
  const elements = useElements();

  const [errors, setErrors] = useState([]);
  const [isProcessing, setProcessingTo] = useState();

  async function onSubmit(e) {
    e.preventDefault();
    setErrors([]);
    setProcessingTo(true);

    if (cardElement) {
      const paymentMethodRes = await stripe.createPaymentMethod({
        type: 'card',
        card: cardElement,
        billing_details: {
          address: billingInfo.address,
          email: billingInfo.email,
          name: billingInfo.name,
        },
      });

      if (!paymentMethodRes.error) {
        setPaymentMethod(paymentMethodRes.paymentMethod);
        history.push(`${paymentURL}3`); // go to appropriate page between '/payments/3' & '/payments/update/3'
      } else {
        setProcessingTo(false);
        setErrors([paymentMethodRes.error.message]);
      }
    } else {
      setProcessingTo(false);
      setErrors(['Card informoation cannot be empty.']);
    }
  }

  useEffect(() => {
    if (!billingInfo) history.push(`${paymentURL}1`); // go to appropriate page between '/payments/1' & '/payments/update/1'
  }, [billingInfo, history, paymentURL]);

  const cardElementOptions = {
    style: {
      base: {
        fontSize: '17px',
        '::placeholder': {
          fontSize: '17px',
        },
      },
      invalid: {
        color: 'rgb(173, 0, 0)',
        iconColor: 'rgb(173, 0, 0)',
      },
      complete: {},
    },
    hidePostalCode: true, // maybe not needed
  };

  if (!elements) return null;

  const cardElement = elements.getElement('card');

  return (
    <div className='site__sub-section form-container'>
      <h2 className='tertiary-title cntr-txt-sml-margin'>Payment Method</h2>
      <form className='form' onSubmit={onSubmit}>
        <div className='site__sub-section__data'>
          <div className='errors-container'>
            {errors.map((error) => (
              <div key={error}>{error}</div>
            ))}
          </div>
          <div className='form-row'>
            <CardElement
              options={cardElementOptions}
              onChange={(e) => setErrors(e.error ? [e.error.message] : [])}
            />
          </div>
          <p className='powered-by-stripe'>
            Powered by{' '}
            <a
              href='https://stripe.com/'
              target='blank'
              className='clickable-link'
            >
              Stripe
            </a>
          </p>
        </div>
        <div className='form__row buttons-grp-colLrg-rowSml'>
          <button
            className='primary-button form__button dashboard__button'
            type='submit'
            disabled={isProcessing || errors.length}
          >
            {isProcessing && !errors.length ? 'Processing...' : 'Next'}
          </button>
          <button
            className='secondary-button form__button dashboard__button'
            type='button'
            onClick={() => history.push(`${paymentURL}1`)} // got to appropriate page between '/payments/1' & '/payments/update/1'
          >
            Back
          </button>
        </div>
      </form>
    </div>
  );
}
