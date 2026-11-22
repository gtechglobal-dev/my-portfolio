import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  CheckCircle2,
  KeyRound,
  Loader2,
  Lock,
  ShieldCheck,
  XCircle,
} from 'lucide-react';
import { getSchoolCheckout, verifyPayment } from '../../lib/marketplace';
import type { SchoolCheckout } from '../../lib/marketplace';

type Status = 'loading' | 'ready' | 'paying' | 'success' | 'failed';

const money = (value: number) =>
  new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(value);

const isEmbedded = typeof window !== 'undefined' && window.self !== window.top;

const notifyParent = (order: SchoolCheckout) => {
  const message = {
    type: 'gtech-pin-order-complete',
    reference: order.reference,
    signature: order.returnSignature || '',
  };
  try {
    if (window.opener && !window.opener.closed) {
      window.opener.postMessage(message, window.location.origin);
      return;
    }
    if (window.parent && window.parent !== window) {
      window.parent.postMessage(message, '*');
    }
  } catch {
    return;
  }
};

const SchoolOrderPage = ({ callback = false }: { callback?: boolean }) => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const reference = params.get('reference') || '';
  const [checkout, setCheckout] = useState<SchoolCheckout | null>(null);
  const [status, setStatus] = useState<Status>('loading');
  const [message, setMessage] = useState('');
  const [quantity, setQuantity] = useState(10);

  const returnWithPinOrder = (order: SchoolCheckout) => {
    const url = new URL('/', window.location.origin);
    url.searchParams.set('pinOrder', order.reference);
    url.searchParams.set('pinSig', order.returnSignature || '');
    window.location.replace(url.toString());
  };

  useEffect(() => {
    const forward = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type !== 'gtech-pin-order-complete') return;
      if (window.parent !== window) window.parent.postMessage(event.data, '*');
    };
    window.addEventListener('message', forward);
    return () => window.removeEventListener('message', forward);
  }, []);

  useEffect(() => {
    let active = true;
    if (!reference) {
      setStatus('failed');
      setMessage('No order reference was supplied.');
      return () => {
        active = false;
      };
    }
    (async () => {
      try {
        const order = await getSchoolCheckout(reference);
        if (!active) return;
        setCheckout(order);
        setQuantity(order.quantity || 10);

        if (callback || params.get('callback') === '1') {
          const verified = await verifyPayment(reference);
          if (!active) return;
          const complete = { ...verified.checkout, returnSignature: order.returnSignature };
          setCheckout(complete);
          if (verified.paymentStatus !== 'success') {
            setStatus('failed');
            setMessage('Payment was not confirmed by Paystack. Please try again.');
            return;
          }
          notifyParent(complete);
          if (window.opener && !isEmbedded) {
            setStatus('success');
            setMessage('Payment confirmed. Your PINs are now in your school vault.');
            window.setTimeout(() => window.close(), 1200);
            return;
          }
          if (isEmbedded) {
            setStatus('success');
            setMessage('Payment confirmed. Your PINs are now in your school vault.');
            return;
          }
          returnWithPinOrder(complete);
          return;
        }

        if (order.paymentStatus === 'success' && isEmbedded) {
          notifyParent(order);
          setStatus('success');
          setMessage('Payment confirmed. Your PINs are now in your school vault.');
          return;
        }

        setStatus('ready');
      } catch (err) {
        if (!active) return;
        setStatus('failed');
        setMessage((err as Error).message || 'This checkout could not be loaded.');
      }
    })();

    return () => {
      active = false;
    };
  }, [reference, callback]);

  const handlePay = async () => {
    if (!checkout) return;
    setStatus('paying');
    setMessage('');
    try {
      const result = await verifyPayment(checkout.reference);
      if (result.paymentStatus === 'success') {
        const complete = { ...result.checkout, returnSignature: checkout.returnSignature };
        setCheckout(complete);
        notifyParent(complete);
        setStatus('success');
        setMessage('Payment confirmed. Your PINs are now in your school vault.');
        return;
      }
      if (isEmbedded) {
        const paymentWindow = window.open(
          result.authorizationUrl,
          'gtech-pin-payment',
          'width=520,height=760,scrollbars=yes,resizable=yes'
        );
        if (paymentWindow) {
          setStatus('ready');
          setMessage('Secure payment opened in a new window. Your PINs are added automatically when payment is completed.');
          return;
        }
      }
      window.location.assign(result.authorizationUrl);
    } catch (err) {
      setStatus('failed');
      setMessage((err as Error).message || 'The payment could not be started.');
    }
  };

  return (
    <div className={`pin-shop${isEmbedded ? ' pin-shop--embedded' : ''}`}>
      <header className="pin-shop__header">
        <div className="pin-shop__brand">
          <img className="pin-shop__logo" src="/gtechlogo.png" alt="Gtech Global" />
          <span>
            <strong>Gtech Global</strong>
            <small>Result PIN checkout</small>
          </span>
        </div>
        <span className="pin-shop__secure"><ShieldCheck size={14} /> Secure payment</span>
      </header>

      <main className="pin-shop__main">
        {status === 'loading' && (
          <section className="pin-shop__state">
            <Loader2 className="pin-shop__spin" size={34} />
            <h1>Preparing your PIN order</h1>
            <p>Loading your product, school details and secure payment reference.</p>
          </section>
        )}

        {status === 'failed' && (
          <section className="pin-shop__state pin-shop__state--error">
            <XCircle size={36} />
            <h1>Checkout unavailable</h1>
            <p>{message}</p>
            <button className="pin-shop__button pin-shop__button--soft" type="button" onClick={() => navigate(-1)}>
              Return to School Management
            </button>
          </section>
        )}

        {status === 'success' && (
          <section className="pin-shop__state pin-shop__state--success">
            <CheckCircle2 size={42} />
            <h1>Payment confirmed</h1>
            <p>{message}</p>
            {!isEmbedded && checkout && (
              <button className="pin-shop__button" type="button" onClick={() => returnWithPinOrder(checkout)}>
                Back to my school
              </button>
            )}
          </section>
        )}

        {(status === 'ready' || status === 'paying') && checkout && (
          <div className="pin-shop__layout">
            <section className="pin-shop__intro">
              <div className="pin-shop__identity">
                <img className="pin-shop__identity-logo" src="/gtechlogo.png" alt="Gtech Global" />
                <div>
                  <span className="pin-shop__eyebrow">Gtech Global</span>
                  <h1>Result PIN checkout</h1>
                  <p className="pin-shop__lede">Securely purchase PINs for your school. They are delivered to your vault after payment.</p>
                </div>
              </div>

              <div className="pin-shop__product">
                <span className="pin-shop__product-icon"><KeyRound size={24} /></span>
                <div>
                  <span className="pin-shop__eyebrow">Order</span>
                  <h2>{checkout.productName}</h2>
                  <p>For {checkout.customerName || 'your school'} · {quantity} PIN{quantity === 1 ? '' : 's'}</p>
                </div>
              </div>

              <div className="pin-shop__highlights">
                <div><ShieldCheck size={16} /><span>Secure Paystack payment</span></div>
                <div><Lock size={16} /><span>4 checks per PIN</span></div>
                <div><CheckCircle2 size={16} /><span>Instant vault delivery</span></div>
              </div>

              <div className="pin-shop__mobile-summary">
                <div className="pin-shop__cart-head">
                  <span>Order summary</span>
                  <span className="pin-shop__ref">{checkout.reference}</span>
                </div>
                <div className="pin-shop__totals">
                  <div><span>PINs</span><strong>{quantity}</strong></div>
                  <div><span>Unit price</span><strong>{money(checkout.unitPrice)}</strong></div>
                  <div className="pin-shop__total"><span>Total</span><strong>{money(checkout.unitPrice * quantity)}</strong></div>
                </div>
                <button className="pin-shop__button" type="button" onClick={handlePay} disabled={status === 'paying'}>
                  {status === 'paying' ? <Loader2 className="pin-shop__spin" size={17} /> : <Lock size={16} />}
                  {status === 'paying' ? 'Opening secure payment...' : 'Pay securely'}
                </button>
                <p className="pin-shop__note">
                  {message || 'Payment opens securely. Your PINs are added automatically after confirmation.'}
                </p>
                <div className="pin-shop__payment-mark"><ShieldCheck size={15} /> Secured by Paystack</div>
              </div>
            </section>

            <aside className="pin-shop__cart">
              <div className="pin-shop__cart-head">
                <span>Order summary</span>
                <span className="pin-shop__ref">{checkout.reference}</span>
              </div>

              <div className="pin-shop__totals">
                <div><span>School</span><strong>{checkout.customerName || 'School'}</strong></div>
                <div><span>PINs</span><strong>{quantity}</strong></div>
                <div><span>Unit price</span><strong>{money(checkout.unitPrice)}</strong></div>
                <div className="pin-shop__total"><span>Total</span><strong>{money(checkout.unitPrice * quantity)}</strong></div>
              </div>

              <button className="pin-shop__button" type="button" onClick={handlePay} disabled={status === 'paying'}>
                {status === 'paying' ? <Loader2 className="pin-shop__spin" size={17} /> : <Lock size={16} />}
                {status === 'paying' ? 'Opening secure payment...' : 'Pay securely'}
              </button>

              <p className="pin-shop__note">
                {message || 'Payment opens securely. Your PINs are added automatically after confirmation.'}
              </p>
              <div className="pin-shop__payment-mark"><ShieldCheck size={15} /> Secured by Paystack</div>
            </aside>
          </div>
        )}
      </main>
    </div>
  );
};

export default SchoolOrderPage;
