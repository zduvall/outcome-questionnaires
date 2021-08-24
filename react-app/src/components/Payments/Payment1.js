// This is the component to gather customer information.
// It creates or updates the customer in stripe and database via the api call.
// Nothing yet updated in redux.

import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useHistory } from 'react-router-dom';

// import context
import { usePaymentsContext } from '../../pages/Payments';

// country codes
import countryCodes from '../../services/countryCodes';

export default function Payment1() {
  const history = useHistory();
  const sessionUser = useSelector((state) => state.session.user);
  const { setBillingInfo, paymentURL } = usePaymentsContext();

  const [errors, setErrors] = useState([]);
  const [name, setName] = useState(
    `${sessionUser.firstName} ${sessionUser.lastName}`
  );
  const [email, setEmail] = useState(sessionUser.email);
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [country, setCountry] = useState('');
  const [zip, setZip] = useState('');

  const [isProcessing, setProcessingTo] = useState(false);

  useEffect(() => {
    // redirect if already have subscription and are on wrong url
    if (sessionUser.subType && paymentURL === '/payments/') {
      history.push('/payments/update/1');
    }
    // redirect if don't have subscription and are on wrong url
    if (!sessionUser.subType && paymentURL === '/payments/update/') {
      history.push('/payments/1');
    }
  }, [sessionUser.subType, history, paymentURL]);

  async function onSubmit(e) {
    e.preventDefault();
    setErrors([]);
    setProcessingTo(true);

    const billingDetails = {
      name,
      email,
      line1: address,
      city,
      state,
      country,
      postal_code: zip,
      userId: sessionUser.id,
    };

    const res = await fetch('/api/payments/customer', {
      method: 'post',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(billingDetails),
    });

    const customer = await res.json();

    if (!customer.errors) {
      setBillingInfo(customer);
      history.push(`${paymentURL}2`); // got to appropriate page between '/payments/2' & '/payments/update/2'
    } else {
      setProcessingTo(false);
      setErrors(customer.errors);
    }
  }

  return (
    <div className='site__sub-section form-container'>
      <h2 className='tertiary-title cntr-txt-sml-margin'>
        Billing Information
      </h2>
      <form className='form' onSubmit={onSubmit}>
        <div className='site__sub-section__data'>
          <div className='errors-container'>
            {errors.map((error) => (
              <div key={error}>{error}</div>
            ))}
          </div>
          <div className='form__row'>
            <input
              name='name'
              type='text'
              placeholder='Full name'
              onChange={(e) => setName(e.target.value)}
              value={name}
              className='form__input'
            ></input>
            <input
              name='email'
              type='text'
              placeholder='Email'
              onChange={(e) => setEmail(e.target.value)}
              value={email}
              className='form__input'
            ></input>
          </div>
          <div className='form__row'>
            <input
              name='address'
              type='text'
              placeholder='Address'
              onChange={(e) => setAddress(e.target.value)}
              value={address}
              className='form__input'
            ></input>
          </div>
          <div className='form__row'>
            <input
              name='city'
              type='text'
              placeholder='City'
              onChange={(e) => setCity(e.target.value)}
              value={city}
              className='form__input'
            ></input>
            <input
              name='state'
              type='text'
              placeholder='State'
              onChange={(e) => setState(e.target.value)}
              value={state}
              className='form__input'
            ></input>
          </div>
          <div className='form__row'>
            <select
              name='country'
              type='text'
              placeholder='Country'
              onChange={(e) => setCountry(e.target.value)}
              value={country}
              className='form__input'
            >
              <option value='' disabled>
                Country
              </option>
              {countryCodes.map((country) => {
                return (
                  <option key={country.code} value={country.code}>
                    {country.name}
                  </option>
                );
              })}
            </select>
            <input
              name='zip'
              type='number'
              placeholder='Zip'
              onChange={(e) => setZip(e.target.value)}
              value={zip}
              className='form__input'
            ></input>
          </div>
        </div>
        <div className='buttons-grp-colLrg-rowSml'>
          <button
            className='primary-button form__button dashboard__button'
            type='submit'
            disabled={isProcessing}
          >
            {isProcessing ? 'Processing...' : 'Next'}
          </button>
          <button
            className='delete-button form__button dashboard__button'
            type='button'
            onClick={() => history.push('/account')}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
