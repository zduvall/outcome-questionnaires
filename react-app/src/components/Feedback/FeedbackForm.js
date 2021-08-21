import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useHistory } from 'react-router-dom';

// import thunks
import { cancelSubscription, deleteUser } from '../../store/session';

export default function FeedbackForm({ type }) {
  const history = useHistory();
  const dispatch = useDispatch();

  const sessionUser = useSelector((state) => state.session.user);

  const [feedback, setFeedback] = useState();
  const [errors, setErrors] = useState([]);
  const [processing, setProcessing] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setErrors([]);
    setProcessing(true);

    if (!feedback) {
      setErrors(['Please enter feedback before sending']);
      setProcessing(false);
      return;
    }

    const date = new Date();
    const readableDate = date.toLocaleString('en-us', {
      timeZone: 'America/Denver',
    });

    const data = {
      name: `${sessionUser.firstName} ${sessionUser.lastName}`,
      email: sessionUser.email,
      type,
      feedback: feedback,
      sent: readableDate,
    };

    const res = await fetch(
      'https://sheet.best/api/sheets/8e811641-935d-4f71-8958-0cf7bddab246',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }
    );
    if (res.ok) {
      proceed();
    } else {
      setProcessing(false);
    }
  }

  async function handleDeactivate() {
    if (sessionUser.subType) {
      await dispatch(
        cancelSubscription(sessionUser.id, sessionUser.customer.stripeSubId)
      );
    }
    await dispatch(deleteUser(sessionUser.id));
    history.push('/');
  }

  async function handleUnsubscribe() {
    const cancelled = await dispatch(
      cancelSubscription(sessionUser.id, sessionUser.customer.stripeSubId)
    );
    if (!cancelled.errors) {
      history.push('/account');
    } else {
      setErrors([cancelled.errors]);
    }
  }

  function proceed() {
    if (type === 'deactivate') handleDeactivate();
    else if (type === 'unsubscribe') handleUnsubscribe();
    else if (type === 'feedback') history.goBack();
  }

  return (
    <div className='site__sub-section form-container'>
      <form className='form' onSubmit={onSubmit}>
        <div className='site__sub-section__data'>
          <div className='errors-container'>
            {errors.map((error) => (
              <div key={error}>{error}</div>
            ))}
          </div>
          <div className='form__row'>
            <textarea
              placeholder='Share feedback here.'
              onChange={(e) => setFeedback(e.target.value)}
              className='form__input form__textarea'
            ></textarea>
          </div>
        </div>
        <div className='buttons-grp-colLrg-rowSml'>
          <button
            type='submit'
            className='primary-button'
            disabled={processing}
          >
            {processing ? 'Processing...' : 'Send'}
          </button>
          <button
            type='button'
            className='secondary-button'
            disabled={processing}
            onClick={() => proceed()}
          >
            {type === 'feedback' ? 'Cancel' : 'Skip'}
          </button>
        </div>
      </form>
    </div>
  );
}
