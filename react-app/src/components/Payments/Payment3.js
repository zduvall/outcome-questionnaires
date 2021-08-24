// This is the component to confirm subscription.
// It attaches the payment method to the customer, creates a subscription in
// stripe, updates the DB, and adds the new or updated info into redux store.

import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useHistory } from 'react-router-dom';

// import thunk
import { addPaymentMethod } from '../../store/session';

// import context
import { usePaymentsContext } from '../../pages/Payments';

export default function Payment3() {
  const history = useHistory();
  const dispatch = useDispatch();
  const sessionUser = useSelector((state) => state.session.user);
  const { billingInfo, paymentMethod, paymentURL } = usePaymentsContext();

  const [errors, setErrors] = useState([]);
  const [isProcessing, setProcessingTo] = useState();

  useEffect(() => {
    if (!billingInfo || !paymentMethod) history.push(`${paymentURL}1`); // got to appropriate page between '/payments/1' & '/payments/update/1'
  }, [billingInfo, paymentMethod, history, paymentURL]);

  if (!billingInfo || !paymentMethod) return null;

  const { brand, last4, exp_month, exp_year } = paymentMethod.card;

  async function handleSubscribe() {
    setErrors([]);
    setProcessingTo(true);

    // make sure to update this in addition to product_dict in config.py if change subscription price
    const priceId = 'price_1J0cqNJUL0dIO0rKV44p2IAR';

    const res = await dispatch(
      addPaymentMethod(
        billingInfo.id,
        paymentMethod.id,
        priceId,
        sessionUser.id,
        brand,
        last4,
        exp_month,
        exp_year
      )
    );

    if (res.errors) {
      setErrors([res.errors]);
    } else {
      history.push('/account');
    }
  }

  return (
    <div className='site__sub-section form-container'>
      <h2 className='tertiary-title cntr-txt-sml-margin'>
        Confirm Information
      </h2>
      <div className='errors-container'>
        {errors.map((error) => (
          <div key={error}>{error}</div>
        ))}
      </div>
      <div className='form'>
        <div className='site__sub-section__data'>
          <p>Billing Information</p>
          <p className='tertiary-text indented-tight-text'>
            {billingInfo.name}
          </p>
          <p className='tertiary-text indented-tight-text'>
            {billingInfo.address.line1}
          </p>
          <p className='tertiary-text indented-tight-text'>
            {billingInfo.address.city}, {billingInfo.address.state}{' '}
            {billingInfo.address.postal_code}
          </p>
          <p className='tertiary-text indented-tight-text'>
            {billingInfo.email}
          </p>
          <p>Payment Method</p>
          <p className='tertiary-text indented-tight-text'>
            {brand.charAt(0).toUpperCase() + brand.slice(1)}: ***{last4}, Exp:{' '}
            {exp_month}/{exp_year.toString().slice(2)}
          </p>
        </div>
        <div className='form__row buttons-grp-colLrg-rowSml'>
          <button
            className='primary-button form__button dashboard__button'
            disabled={isProcessing || errors.length}
            onClick={handleSubscribe}
          >
            {isProcessing && !errors.length
              ? 'Processing...'
              : paymentURL === '/payments/'
              ? 'Subscribe'
              : 'Update'}
          </button>
          <button
            className='secondary-button form__button dashboard__button'
            disabled={isProcessing}
            onClick={() => history.push(`${paymentURL}1`)} // got to appropriate page between '/payments/1' & '/payments/update/1'
          >
            Start Over
          </button>
          <button
            className='delete-button form__button dashboard__button'
            disabled={isProcessing}
            onClick={() => history.push('/account')}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
