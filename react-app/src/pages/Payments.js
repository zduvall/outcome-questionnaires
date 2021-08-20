import {
  useState,
  useContext,
  createContext,
  useEffect,
  lazy,
  Suspense,
} from 'react';
import { useSelector } from 'react-redux';
import { useParams, useHistory, useLocation } from 'react-router-dom';

// import css
import '../components/Payments/Payments.css';

// // import components
// import Payment1 from '../components/Payments/Payment1';
// import Payment2 from '../components/Payments/Payment2';
// import Payment3 from '../components/Payments/Payment3';
import LoadingNotFoundInvalid from '../components/LoadingNotFoundInvalid';
const Payment1 = lazy(() => import('../components/Payments/Payment1'));
const Payment2 = lazy(() => import('../components/Payments/Payment2'));
const Payment3 = lazy(() => import('../components/Payments/Payment3'));

const PaymentsContext = createContext();
export const usePaymentsContext = () => useContext(PaymentsContext);

export default function Payments() {
  const history = useHistory();
  const location = useLocation();
  const sessionUser = useSelector((state) => state.session.user);

  const { subPageId } = useParams('subPageId');

  // set to either '/payments/update/' or '/payments/' based on current url
  const paymentURL = location.pathname.slice(
    0,
    location.pathname.lastIndexOf('/') + 1
  );

  const [billingInfo, setBillingInfo] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');

  useEffect(() => {
    // If the subPageId is missing from '/payments/update/subPageId', it will think we're on
    // just '/payments/' and subPageId will be set to 'update'. This first check prevents that
    // and anything other than just 1, 2, or 3.
    if (!['1', '2', '3'].includes(subPageId)) {
      history.push(`${paymentURL}1`);
    }
    // redirect if already have subscription and are on wrong url
    if (sessionUser.subType && paymentURL === '/payments/') {
      history.push('/payments/update/1');
    }
    // redirect to account page if in production (change that later)
    if (process.env.NODE_ENV === 'production') {
      history.push('/account');
    }
  }, [sessionUser, paymentURL, history, subPageId]);

  // --------------------------------------------------------------------------------------------
  // next thing to do is make sure that when I'm on the route 'payments/update/:subPageId" I'm not
  // creating a second subscription for the same product on the same customer -- that's what it does
  // right now. Maybe I should do it by passing another variable to the API and changing how my
  // "/create-subscription" route works, so it updates if needed instead of creates? I could also
  // maybe rename it, to "/create-subscription-or-update-billing" (or something like that)
  // I also still need to make sure I'm rendering account details for billing properly when a payment
  // fails -- let them know they have 30 days to fix it (and then make sure stripe bills correctly
  // when they do fix it)
  // https://stripe.com/docs/api/subscriptions/object
  // https://stripe.com/docs/testing
  // https://dashboard.stripe.com/settings/billing/automatic
  // --------------------------------------------------------------------------------------------

  // ------ lazy components ------
  const renderLoader = () => (
    <LoadingNotFoundInvalid message={'Loading eDOT...'} />
  );

  const Payment1Lazy = () => (
    <Suspense fallback={renderLoader()}>
      <Payment1 />
    </Suspense>
  );
  const Payment2Lazy = () => (
    <Suspense fallback={renderLoader()}>
      <Payment2 />
    </Suspense>
  );
  const Payment3Lazy = () => (
    <Suspense fallback={renderLoader()}>
      <Payment3 />
    </Suspense>
  );
  return (
    <PaymentsContext.Provider
      value={{
        billingInfo,
        setBillingInfo,
        paymentMethod,
        setPaymentMethod,
        paymentURL,
      }}
    >
      <div className='site__page'>
        <h1 className='primary-title'>
          {paymentURL === '/payments/update/'
            ? 'Update Billing'
            : 'Premium Subscription'}
        </h1>
        {subPageId === '1' && <Payment1Lazy />}
        {subPageId === '2' && <Payment2Lazy />}
        {subPageId === '3' && <Payment3Lazy />}
      </div>
    </PaymentsContext.Provider>
  );
}

// 1 = billing information
// 2 = payment method
// 3 = confirm
