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

  const [paymentURL, setPaymentURL] = useState('/payments/')
  const [billingInfo, setBillingInfo] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');

  // redirect to account page if try to access payments page while already subscribed (or if while in production (change that later))
  useEffect(() => {
    // but don't redirect if they are subscribed and trying to update their payment
    if (sessionUser.subType && location.pathname.startsWith('/payments/update/')) {
      setPaymentURL('/payments/update/')
    } else if (sessionUser.subType || process.env.NODE_ENV === 'production') {
      history.push('/account');
    }
  }, [sessionUser, location, history]);

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
      value={{ billingInfo, setBillingInfo, paymentMethod, setPaymentMethod, paymentURL }}
    >
      <div className='site__page'>
        {paymentURL === '/payments/' && <h1 className='primary-title'>Premium Subscription</h1>}
        {paymentURL === '/payments/update/' && <h1 className='primary-title'>Update Billing</h1>}
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
