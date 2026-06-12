import { useEffect, useState } from 'react';
import api from '../api/axios';
import { formatCurrency, formatDate, getStatusBadge, capitalize, today } from '../utils/helpers';
import { ArrowLeft, CreditCard, AlertTriangle, CheckCircle, Clock, X, Printer, Phone, MapPin, ChevronDown, Ban, Undo2, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function InvoiceDetail({ id, onBack, autoPrint }) {
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showPayModal, setShowPayModal] = useState(false);
  const [payForm, setPayForm] = useState({ payment_date: today(), amount: '', payment_method: 'cash', reference_number: '', notes: '' });
  const [paying, setPaying] = useState(false);

  // Returns State
  const [returns, setReturns] = useState([]);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [returnItemsState, setReturnItemsState] = useState({});
  const [returnReason, setReturnReason] = useState('');
  const [returnNotes, setReturnNotes] = useState('');
  const [processingReturn, setProcessingReturn] = useState(false);
  const [printReturnData, setPrintReturnData] = useState(null);

  // Action Modal State (Cancel/Delete)
  const [showActionModal, setShowActionModal] = useState(false);
  const [actionType, setActionType] = useState(null);

  const fetchInvoice = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/invoices/${id}`);
      setInvoice(res.data.data);
      if (res.data.data.nextInstallment) {
        const due = res.data.data.nextInstallment.amount_due - res.data.data.nextInstallment.amount_paid;
        setPayForm(f => ({ ...f, amount: due }));
      }
      
      // Fetch returns
      const retRes = await api.get(`/invoices/${id}/returns`);
      setReturns(retRes.data.data);

    } catch { toast.error('Failed to load invoice details'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchInvoice(); }, [id]);

  useEffect(() => {
    if (autoPrint && invoice && !loading) {
      setTimeout(() => window.print(), 500);
    }
  }, [autoPrint, invoice, loading]);

  const handlePayment = async (e) => {
    e.preventDefault();
    setPaying(true);
    try {
      await api.post('/invoices/payments/record', { invoice_id: id, ...payForm });
      toast.success('Payment recorded!');
      setShowPayModal(false);
      fetchInvoice();
    } catch (err) { toast.error(err.response?.data?.message || 'Payment error'); }
    finally { setPaying(false); }
  };

  const handleAction = async (action) => {
    if (action === 'return') {
      // Open Return Modal
      const initialRetState = {};
      invoice.items.forEach(i => {
        initialRetState[i.id] = { qty: 0, max: i.quantity - (i.returned_quantity || 0), price: i.unit_price };
      });
      setReturnItemsState(initialRetState);
      setReturnReason('Customer Request');
      setReturnNotes('');
      setShowReturnModal(true);
      return;
    }

    // Open Custom Action Modal
    setActionType(action);
    setShowActionModal(true);
  };

  const confirmAction = async () => {
    try {
      if (actionType === 'delete') {
        await api.delete(`/invoices/${id}`);
        toast.success('Invoice deleted');
        onBack();
      } else {
        await api.post(`/invoices/${id}/${actionType}`);
        toast.success(`Invoice ${actionType}ed`);
        setShowActionModal(false);
        fetchInvoice();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || `Failed to ${actionType} invoice`);
      setShowActionModal(false);
    }
  };

  const submitReturn = async (e) => {
    e.preventDefault();
    const itemsToReturn = Object.entries(returnItemsState)
      .filter(([_, data]) => data.qty > 0)
      .map(([id, data]) => ({
        invoice_item_id: id,
        product_id: invoice.items.find(i => i.id == id).product_id,
        quantity: data.qty,
        refund_amount: data.qty * data.price
      }));

    if (itemsToReturn.length === 0) return toast.error('Please select at least one item to return');

    setProcessingReturn(true);
    try {
      const res = await api.post(`/invoices/${id}/returns`, {
        itemsToReturn,
        reason: returnReason,
        notes: returnNotes
      });
      toast.success('Return processed successfully!');
      setShowReturnModal(false);
      fetchInvoice();
      
      // Auto open print note for the new return
      const newRetRes = await api.get(`/invoices/${id}/returns`);
      if (newRetRes.data.data.length > 0) {
        setPrintReturnData(newRetRes.data.data[0]);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to process return');
    } finally {
      setProcessingReturn(false);
    }
  };

  if (loading) return <div className="loading-wrap"><div className="spinner" /><span>Loading invoice...</span></div>;
  if (!invoice) return <div>Invoice not found</div>;

  const { items, installments, payments, nextInstallment } = invoice;
  const isInstallment = invoice.payment_type === 'installment';
  const paidCount = installments?.filter(i => i.status === 'paid').length || 0;
  const overdueCount = installments?.filter(i => i.status === 'overdue').length || 0;

  return (
    <div>
      <div className="page-header no-print">
        <div>
          <button className="btn btn-ghost btn-sm" onClick={onBack} style={{ marginBottom: 8 }}><ArrowLeft size={15} /> Back to Invoices</button>
          <div className="page-header-title">{invoice.invoice_number}</div>
          <span className={`badge ${getStatusBadge(invoice.status)}`} style={{ marginTop: 4 }}>{capitalize(invoice.status)}</span>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-ghost" onClick={() => window.print()}><Printer size={15} /> Print</button>
          
          <div className="dropdown" style={{ position: 'relative' }}>
            <button className="btn btn-outline" onClick={(e) => {
              const menu = e.currentTarget.nextElementSibling;
              menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
            }}>Actions <ChevronDown size={15} /></button>
            <div className="dropdown-menu" style={{ position: 'absolute', right: 0, top: '100%', background: 'color-mix(in srgb, var(--card-bg) 85%, transparent)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', border: '1px solid var(--border)', borderRadius: '8px', boxShadow: '0 10px 30px rgba(0,0,0,0.15)', display: 'none', zIndex: 100, minWidth: 200, marginTop: 8, overflow: 'hidden' }}>
              {invoice.status !== 'cancelled' && (
                <div style={{ padding: '10px 16px', cursor: 'pointer', borderBottom: '1px solid var(--border-light)', fontSize: 13, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text)' }} onClick={() => handleAction('cancel')} className="hover-bg"><Ban size={14} style={{ opacity: 0.6 }} /> Cancel Invoice</div>
              )}
              {invoice.status !== 'cancelled' && invoice.status !== 'returned' && (
                <div style={{ padding: '10px 16px', cursor: 'pointer', borderBottom: '1px solid var(--border-light)', fontSize: 13, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text)' }} onClick={() => handleAction('return')} className="hover-bg"><Undo2 size={14} style={{ opacity: 0.6 }} /> Return Items</div>
              )}
              {(invoice.status === 'cancelled' || invoice.status === 'returned') && (
                <div style={{ padding: '10px 16px', cursor: 'pointer', color: 'var(--danger)', fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }} onClick={() => handleAction('delete')} className="hover-bg"><Trash2 size={14} /> Delete Invoice</div>
              )}
            </div>
          </div>

          {invoice.balance_amount > 0 && invoice.status !== 'cancelled' && invoice.status !== 'returned' && (
            <button className="btn btn-primary" onClick={() => setShowPayModal(true)}>
              <CreditCard size={15} /> Record Payment
            </button>
          )}
        </div>
      </div>

      {/* Next Installment Alert */}
      {isInstallment && nextInstallment && invoice.status !== 'completed' && (
        <div className={`${nextInstallment.status === 'overdue' ? 'inv-overdue-alert' : 'inv-next-due'} mb-20 no-print`}>
          {nextInstallment.status === 'overdue'
            ? <AlertTriangle size={22} style={{ color: 'var(--danger)' }} />
            : <Clock size={22} style={{ color: 'var(--warning)' }} />}
          <div>
            <div className="fw-700" style={{ fontSize: 14 }}>
              {nextInstallment.status === 'overdue' ? '⚠ Overdue Payment!' : 'Next Installment Due'}
            </div>
            <div className="text-secondary fs-13">
              Installment #{nextInstallment.installment_number} — Due: {formatDate(nextInstallment.due_date)} —
              Amount: <strong>{formatCurrency(nextInstallment.amount_due - nextInstallment.amount_paid)}</strong>
            </div>
          </div>
          <button className="btn btn-primary btn-sm" style={{ marginLeft: 'auto' }} onClick={() => setShowPayModal(true)}>Pay Now</button>
        </div>
      )}

      {/* Installment Progress */}
      {isInstallment && installments.length > 0 && (
        <div className="card mb-20 no-print">
          <div className="card-header">
            <span className="card-title">Installment Progress — {paidCount}/{installments.length} paid</span>
            {overdueCount > 0 && <span className="badge badge-danger">{overdueCount} overdue</span>}
          </div>
          <div className="card-body">
            <div className="installment-track" style={{ marginBottom: 16 }}>
              {installments.map(inst => (
                <div key={inst.id} className={`inst-step ${inst.status}`} title={`#${inst.installment_number} - ${formatDate(inst.due_date)} - ${capitalize(inst.status)}`} />
              ))}
            </div>
            <div className="table-wrapper">
              <table>
                <thead><tr><th>#</th><th>Due Date</th><th>Amount</th><th>Paid</th><th>Remaining</th><th>Status</th></tr></thead>
                <tbody>
                  {installments.map(inst => (
                    <tr key={inst.id}>
                      <td className="fw-600">#{inst.installment_number}</td>
                      <td>{formatDate(inst.due_date)}</td>
                      <td>{formatCurrency(inst.amount_due)}</td>
                      <td className="text-success fw-600">{formatCurrency(inst.amount_paid)}</td>
                      <td className={inst.amount_due - inst.amount_paid > 0 ? 'text-danger fw-700' : 'text-muted'}>
                        {formatCurrency(Math.max(0, inst.amount_due - inst.amount_paid))}
                      </td>
                      <td><span className={`badge ${getStatusBadge(inst.status)}`}>{capitalize(inst.status)}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      <div className="invoice-grid" style={{ gap: 20 }}>
        {/* Invoice Detail */}
        <div className="card invoice-print" style={{ background: 'white', color: '#111827', borderRadius: '12px', padding: '15px 20px', border: '1px solid #e5e7eb' }}>
          
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #f3f4f6', paddingBottom: 16, marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ width: 56, height: 56, background: 'linear-gradient(135deg, var(--primary) 0%, #4338ca 100%)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 900, fontSize: 32, boxShadow: '0 4px 10px rgba(0,0,0,0.1)' }}>
                T
              </div>
              <div>
                <div style={{ fontSize: 26, fontWeight: 900, letterSpacing: '-0.5px', color: '#111827' }}>The Orient Life</div>
                <div style={{ fontSize: 13, color: '#6b7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Consumer Products Division</div>
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 36, fontWeight: 900, color: 'var(--primary)', letterSpacing: '-1px', lineHeight: 1 }}>INVOICE</div>
              <div style={{ fontSize: 14, color: '#6b7280', marginTop: 12 }}>Invoice #: <span style={{ color: '#111827', fontWeight: 700 }}>{invoice.invoice_number}</span></div>
              <div style={{ fontSize: 14, color: '#6b7280', marginTop: 4 }}>Date: <span style={{ color: '#111827', fontWeight: 700 }}>{formatDate(invoice.invoice_date)}</span></div>
            </div>
          </div>

          {/* Customer & Plan Info */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
            <div>
              <div style={{ fontSize: 11, textTransform: 'uppercase', color: '#9ca3af', fontWeight: 800, letterSpacing: '1px', marginBottom: 12 }}>Billed To</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#111827' }}>{invoice.customer_name}</div>
              <div style={{ fontSize: 14, color: '#4b5563', marginTop: 6, display: 'flex', alignItems: 'center', gap: 6 }}><Phone size={14} style={{ color: '#9ca3af' }} />{invoice.customer_phone}</div>
              {invoice.customer_address && <div style={{ fontSize: 14, color: '#4b5563', marginTop: 4, display: 'flex', alignItems: 'center', gap: 6 }}><MapPin size={14} style={{ color: '#9ca3af' }} />{invoice.customer_address}</div>}
            </div>
            <div style={{ background: '#f8fafc', padding: 20, borderRadius: 12, border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                <span style={{ fontSize: 13, color: '#64748b', fontWeight: 600 }}>Payment Plan</span>
                <span style={{ fontSize: 14, fontWeight: 800, color: '#0f172a' }}>{isInstallment ? 'Installments' : 'Cash / Full'}</span>
              </div>
              {isInstallment && (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                    <span style={{ fontSize: 13, color: '#64748b', fontWeight: 600 }}>Term</span>
                    <span style={{ fontSize: 14, fontWeight: 800, color: '#0f172a' }}>{invoice.installment_months} {capitalize(invoice.installment_frequency || 'monthly')}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #e2e8f0', paddingTop: 12 }}>
                    <span style={{ fontSize: 13, color: '#64748b', fontWeight: 600 }}>Installment Amount</span>
                    <span style={{ fontSize: 15, fontWeight: 800, color: 'var(--primary)' }}>{formatCurrency(invoice.installment_amount)}</span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Items Table */}
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 20 }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', padding: '6px 10px', fontSize: 11, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '1px', borderBottom: '2px solid #e5e7eb', background: '#f9fafb', borderTopLeftRadius: 8, borderBottomLeftRadius: 8 }}>Description</th>
                <th style={{ textAlign: 'center', padding: '6px 10px', fontSize: 11, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '1px', borderBottom: '2px solid #e5e7eb', background: '#f9fafb', width: 80 }}>Qty</th>
                <th style={{ textAlign: 'right', padding: '6px 10px', fontSize: 11, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '1px', borderBottom: '2px solid #e5e7eb', background: '#f9fafb', width: 140 }}>Unit Price</th>
                <th style={{ textAlign: 'right', padding: '6px 10px', fontSize: 11, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '1px', borderBottom: '2px solid #e5e7eb', background: '#f9fafb', width: 140, borderTopRightRadius: 8, borderBottomRightRadius: 8 }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => (
                <tr key={item.id}>
                  <td style={{ padding: '8px 10px', borderBottom: '1px solid #f3f4f6' }}>
                    <div style={{ fontWeight: 700, fontSize: 14, color: '#111827' }}>{item.product_name}</div>
                    <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>{item.brand} {item.model}</div>
                  </td>
                  <td style={{ textAlign: 'center', padding: '8px 10px', fontSize: 14, fontWeight: 500, color: '#374151', borderBottom: '1px solid #f3f4f6' }}>{item.quantity}</td>
                  <td style={{ textAlign: 'right', padding: '8px 10px', fontSize: 14, color: '#4b5563', borderBottom: '1px solid #f3f4f6' }}>{formatCurrency(item.unit_price)}</td>
                  <td style={{ textAlign: 'right', padding: '8px 10px', fontSize: 14, fontWeight: 700, color: '#111827', borderBottom: '1px solid #f3f4f6' }}>{formatCurrency(item.total_price)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totals */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ width: 280, padding: 20, background: '#f9fafb', borderRadius: 12, border: '1px dashed #cbd5e1' }}>
              <div style={{ fontSize: 12, color: '#64748b', fontWeight: 700, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Terms & Notes</div>
              <div style={{ fontSize: 13, color: '#475569', lineHeight: 1.5 }}>
                {invoice.notes ? invoice.notes : 'Thank you for your business. Please ensure timely payments according to the agreed schedule.'}
              </div>
            </div>
            <div style={{ width: 320 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', rowGap: 4, fontSize: 14, color: '#000' }}>
                <span style={{ fontWeight: 600 }}>Subtotal</span>
                <span style={{ textAlign: 'right' }}>{formatCurrency(invoice.subtotal)}</span>
                
                {invoice.discount > 0 && (
                  <>
                    <span style={{ fontWeight: 600 }}>Discount</span>
                    <span style={{ textAlign: 'right' }}>-{formatCurrency(invoice.discount)}</span>
                  </>
                )}
                
                {invoice.down_payment > 0 && (
                  <>
                    <span style={{ fontWeight: 600 }}>Down Payment</span>
                    <span style={{ textAlign: 'right' }}>-{formatCurrency(invoice.down_payment)}</span>
                  </>
                )}
                
                <div style={{ gridColumn: '1 / -1', borderTop: '2px solid #000', marginTop: 4, marginBottom: 4 }} />
                
                <span style={{ fontWeight: 800, fontSize: 16 }}>Total Due</span>
                <span style={{ fontWeight: 800, fontSize: 16, textAlign: 'right' }}>{formatCurrency(invoice.total_amount - invoice.down_payment)}</span>
                
                <span style={{ fontWeight: 600 }}>Amount Paid</span>
                <span style={{ textAlign: 'right' }}>{formatCurrency(invoice.paid_amount)}</span>
                
                <span style={{ fontWeight: 800 }}>Balance</span>
                <span style={{ fontWeight: 800, textAlign: 'right' }}>{formatCurrency(invoice.balance_amount)}</span>
              </div>
            </div>
          </div>

          {/* Signatures */}
          <div style={{ marginTop: 40, display: 'flex', justifyContent: 'space-between', paddingBottom: 10 }}>
            <div style={{ width: 240 }}>
              <div style={{ borderTop: '2px solid #d1d5db', paddingTop: 12, textAlign: 'center', fontSize: 13, color: '#4b5563', fontWeight: 600 }}>Customer Signature</div>
            </div>
            <div style={{ width: 240 }}>
              <div style={{ borderTop: '2px solid #d1d5db', paddingTop: 12, textAlign: 'center', fontSize: 13, color: '#4b5563', fontWeight: 600 }}>Authorized Signatory</div>
            </div>
          </div>
        </div>

        {/* Payment & Returns History */}
        <div className="no-print" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div className="card">
            <div className="card-header"><span className="card-title">Payment History</span></div>
            {payments.length === 0 && <div className="empty-state" style={{ padding: '30px 0' }}><CreditCard size={30} /><h3>No payments yet</h3></div>}
            {payments.map(p => (
              <div key={p.id} style={{ padding: '12px 20px', borderBottom: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div className="fw-700 text-success">{formatCurrency(p.amount)}</div>
                  <div className="text-muted fs-12">{formatDate(p.payment_date)} · {capitalize(p.payment_method)}</div>
                  {p.reference_number && <div className="text-muted fs-12">Ref: {p.reference_number}</div>}
                </div>
                <span className="badge badge-success"><CheckCircle size={10} /> Received</span>
              </div>
            ))}
          </div>

          {returns && returns.length > 0 && (
            <div className="card">
              <div className="card-header"><span className="card-title">Return History</span></div>
              {returns.map(r => (
                <div key={r.id} style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-light)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <div>
                      <div className="fw-700">{r.return_number}</div>
                      <div className="text-muted fs-12">{formatDate(r.return_date)} · {r.reason}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div className="fw-700 text-danger">-{formatCurrency(r.total_refund_amount)}</div>
                      <button className="btn btn-ghost btn-sm" onClick={() => setPrintReturnData(r)} style={{ marginTop: 4 }}><Printer size={12} /> Print Note</button>
                    </div>
                  </div>
                  <div style={{ background: 'var(--bg)', padding: 12, borderRadius: 6 }}>
                    {r.items?.map(ri => (
                      <div key={ri.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                        <span>{ri.quantity}x {ri.product_name}</span>
                        <span>{formatCurrency(ri.refund_amount)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Return Items Wizard Modal */}
      {showReturnModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowReturnModal(false)}>
          <div className="modal" style={{ width: 800, maxWidth: '95vw' }}>
            <div className="modal-header">
              <h3 className="modal-title">Process Return</h3>
              <button className="btn btn-ghost" style={{ padding: 4 }} onClick={() => setShowReturnModal(false)}><X size={20} /></button>
            </div>
            <div className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
              <div className="alert alert-warning" style={{ marginBottom: 20 }}>
                <strong>Note:</strong> Returning items will automatically restock the inventory and reduce the customer's outstanding balance. If the balance becomes negative, you owe the customer a refund.
              </div>
              
              <table className="table" style={{ marginBottom: 24 }}>
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Price</th>
                    <th>Purchased</th>
                    <th>Returned</th>
                    <th>Return Qty</th>
                    <th style={{ textAlign: 'right' }}>Refund Value</th>
                  </tr>
                </thead>
                <tbody>
                  {invoice.items.map(item => {
                    const state = returnItemsState[item.id];
                    if (!state) return null;
                    return (
                      <tr key={item.id}>
                        <td>{item.product_name}</td>
                        <td>{formatCurrency(item.unit_price)}</td>
                        <td>{item.quantity}</td>
                        <td>{item.returned_quantity || 0}</td>
                        <td>
                          <input 
                            type="number" 
                            className="form-control" 
                            style={{ width: 80, padding: '4px 8px', minHeight: 32 }}
                            min={0} 
                            max={state.max}
                            value={state.qty === 0 ? '' : state.qty}
                            onChange={(e) => {
                              let val = parseInt(e.target.value) || 0;
                              if (val > state.max) val = state.max;
                              setReturnItemsState(s => ({ ...s, [item.id]: { ...s[item.id], qty: val } }));
                            }}
                            disabled={state.max === 0}
                            placeholder="0"
                          />
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 600 }}>{formatCurrency(state.qty * state.price)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                <div className="form-group">
                  <label className="form-label">Return Reason</label>
                  <select className="form-control" value={returnReason} onChange={e => setReturnReason(e.target.value)}>
                    <option>Customer Request</option>
                    <option>Defective Product</option>
                    <option>Wrong Item Delivered</option>
                    <option>Other</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Additional Notes</label>
                  <input type="text" className="form-control" value={returnNotes} onChange={e => setReturnNotes(e.target.value)} placeholder="Optional details..." />
                </div>
              </div>
            </div>
            <div className="modal-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: 18, fontWeight: 700 }}>
                Total Refund: {formatCurrency(Object.values(returnItemsState).reduce((sum, s) => sum + (s.qty * s.price), 0))}
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button type="button" className="btn btn-ghost" onClick={() => setShowReturnModal(false)}>Cancel</button>
                <button type="button" className="btn btn-primary" onClick={submitReturn} disabled={processingReturn}>
                  {processingReturn ? 'Processing...' : 'Confirm Return'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Action Modal (Cancel/Delete) */}
      {showActionModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowActionModal(false)}>
          <div className="modal" style={{ width: 450 }}>
            <div className="modal-header">
              <h3 className="modal-title">{actionType === 'delete' ? 'Delete Invoice' : 'Cancel Invoice'}</h3>
              <button className="btn btn-ghost" style={{ padding: 4 }} onClick={() => setShowActionModal(false)}><X size={20} /></button>
            </div>
            <div className="modal-body">
              <div className={`alert ${actionType === 'delete' ? 'alert-danger' : 'alert-warning'}`} style={{ marginBottom: 20 }}>
                {actionType === 'delete' 
                  ? 'Are you sure you want to permanently DELETE this invoice? This action cannot be undone.'
                  : 'Are you sure you want to CANCEL this invoice? Pending installments will be cancelled.'}
              </div>
              
              <div style={{ padding: '16px', background: 'var(--bg)', borderRadius: 8, border: '1px solid var(--border)' }}>
                <div style={{ fontWeight: 600, marginBottom: 4 }}>
                  {actionType === 'delete' ? 'Permanent Removal' : 'Inventory Restock'}
                </div>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                  {actionType === 'delete' 
                    ? 'This invoice is already cancelled. Deleting it will permanently erase the record from the database without any further inventory adjustments.'
                    : 'All items from this invoice will be automatically added back to your current stock.'}
                </div>
              </div>
            </div>
            <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button className="btn btn-ghost" onClick={() => setShowActionModal(false)}>Keep Invoice</button>
              <button className={`btn ${actionType === 'delete' ? 'btn-danger' : 'btn-primary'}`} onClick={confirmAction}>
                Confirm {actionType === 'delete' ? 'Delete' : 'Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Return Note Print View Modal */}
      {printReturnData && (
        <div className="modal-overlay" style={{ zIndex: 9999, background: 'rgba(0,0,0,0.8)' }}>
          <div className="modal" style={{ width: 900, maxWidth: '95vw', padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '16px 24px', background: 'var(--bg)', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }} className="no-print">
              <h3 style={{ margin: 0 }}>Return Note Preview</h3>
              <div style={{ display: 'flex', gap: 10 }}>
                <button className="btn btn-primary" onClick={() => {
                  const originalContent = document.body.innerHTML;
                  const printContent = document.getElementById('return-print-area').innerHTML;
                  document.body.innerHTML = printContent;
                  window.print();
                  document.body.innerHTML = originalContent;
                  window.location.reload();
                }}><Printer size={15} /> Print</button>
                <button className="btn btn-ghost" onClick={() => setPrintReturnData(null)}><X size={20} /></button>
              </div>
            </div>
            <div style={{ padding: 40, maxHeight: '80vh', overflowY: 'auto', background: '#e2e8f0' }} className="no-print">
              <div id="return-print-area" style={{ background: 'white', padding: '60px 50px', borderRadius: 4, boxShadow: '0 10px 25px rgba(0,0,0,0.1)', maxWidth: 800, margin: '0 auto' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 40, borderBottom: '2px solid var(--primary)', paddingBottom: 20 }}>
                  <div>
                    <h1 style={{ margin: '0 0 10px 0', fontSize: 36, color: '#111827', letterSpacing: '-1px' }}>CREDIT NOTE</h1>
                    <div style={{ fontSize: 16, color: '#6b7280', fontWeight: 500 }}>Return #: {printReturnData.return_number}</div>
                    <div style={{ fontSize: 16, color: '#6b7280', fontWeight: 500 }}>Original Invoice: {invoice.invoice_number}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 24, fontWeight: 900, color: 'var(--primary)', letterSpacing: '-0.5px' }}>TOL Consumer Products</div>
                    <div style={{ fontSize: 14, color: '#6b7280', marginTop: 4 }}>123 Business Road, City</div>
                    <div style={{ fontSize: 14, color: '#6b7280' }}>Phone: +1 234 567 890</div>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 50 }}>
                  <div style={{ width: '45%' }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 8 }}>Customer Details</div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: '#111827', marginBottom: 4 }}>{invoice.customer_name}</div>
                    <div style={{ fontSize: 14, color: '#4b5563', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}><Phone size={14} /> {invoice.customer_phone}</div>
                  </div>
                  <div style={{ width: '45%', textAlign: 'right' }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 8 }}>Return Info</div>
                    <div style={{ fontSize: 14, color: '#4b5563', marginBottom: 4 }}><span style={{ fontWeight: 600 }}>Date:</span> {formatDate(printReturnData.return_date)}</div>
                    <div style={{ fontSize: 14, color: '#4b5563', marginBottom: 4 }}><span style={{ fontWeight: 600 }}>Reason:</span> {printReturnData.reason}</div>
                    <div style={{ fontSize: 14, color: '#4b5563' }}><span style={{ fontWeight: 600 }}>Processed By:</span> {printReturnData.created_by_name}</div>
                  </div>
                </div>

                <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 40 }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: 'left', padding: '16px 16px', background: '#f8fafc', color: '#4b5563', fontWeight: 700, fontSize: 13, textTransform: 'uppercase', borderBottom: '2px solid #e2e8f0', borderTopLeftRadius: 8 }}>Item Description</th>
                      <th style={{ textAlign: 'center', padding: '16px 16px', background: '#f8fafc', color: '#4b5563', fontWeight: 700, fontSize: 13, textTransform: 'uppercase', borderBottom: '2px solid #e2e8f0' }}>Qty</th>
                      <th style={{ textAlign: 'right', padding: '16px 16px', background: '#f8fafc', color: '#4b5563', fontWeight: 700, fontSize: 13, textTransform: 'uppercase', borderBottom: '2px solid #e2e8f0', borderTopRightRadius: 8 }}>Refund Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {printReturnData.items?.map((item, index) => (
                      <tr key={index}>
                        <td style={{ padding: '20px 16px', borderBottom: '1px solid #f3f4f6', color: '#1f2937', fontWeight: 600, fontSize: 15 }}>{item.product_name}</td>
                        <td style={{ textAlign: 'center', padding: '20px 16px', borderBottom: '1px solid #f3f4f6', color: '#4b5563', fontSize: 15 }}>{item.quantity}</td>
                        <td style={{ textAlign: 'right', padding: '20px 16px', borderBottom: '1px solid #f3f4f6', color: '#111827', fontWeight: 700, fontSize: 15 }}>{formatCurrency(item.refund_amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 60 }}>
                  <div style={{ width: 300 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '20px 0', borderTop: '2px solid #e5e7eb', fontSize: 20, fontWeight: 900, color: '#111827' }}>
                      <span>Total Credit</span>
                      <span style={{ color: '#ef4444' }}>{formatCurrency(printReturnData.total_refund_amount)}</span>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 60, paddingTop: 40, borderTop: '1px solid #e5e7eb' }}>
                  <div style={{ textAlign: 'center', width: 200 }}>
                    <div style={{ borderTop: '2px solid #d1d5db', paddingTop: 10, fontSize: 13, color: '#4b5563', fontWeight: 600 }}>Customer Signature</div>
                  </div>
                  <div style={{ textAlign: 'center', width: 200 }}>
                    <div style={{ borderTop: '2px solid #d1d5db', paddingTop: 10, fontSize: 13, color: '#4b5563', fontWeight: 600 }}>Authorized By</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPayModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowPayModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <span className="modal-title">Record Payment — {invoice.invoice_number}</span>
              <button className="modal-close" onClick={() => setShowPayModal(false)}><X size={16} /></button>
            </div>
            <form onSubmit={handlePayment}>
              <div className="modal-body">
                <div style={{ background: 'var(--danger-bg)', border: '1.5px solid var(--danger)', borderRadius: 'var(--radius)', padding: '12px 16px', marginBottom: 18, display: 'flex', justifyContent: 'space-between' }}>
                  <span className="fw-600" style={{ fontSize: 13 }}>Outstanding Balance</span>
                  <span className="fw-800 text-danger" style={{ fontSize: 18 }}>{formatCurrency(invoice.balance_amount)}</span>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Payment Date *</label>
                    <input type="date" className="form-control" value={payForm.payment_date} onChange={e => setPayForm({ ...payForm, payment_date: e.target.value })} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Amount (Rs.) *</label>
                    <input type="number" className="form-control" value={payForm.amount} onChange={e => setPayForm({ ...payForm, amount: e.target.value })} required min="1" max={invoice.balance_amount} step="0.01" />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Payment Method</label>
                  <select className="form-control" value={payForm.payment_method} onChange={e => setPayForm({ ...payForm, payment_method: e.target.value })}>
                    <option value="cash">Cash</option>
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="card">Card</option>
                    <option value="cheque">Cheque</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Reference Number</label>
                  <input className="form-control" value={payForm.reference_number} onChange={e => setPayForm({ ...payForm, reference_number: e.target.value })} placeholder="Transaction / receipt number" />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setShowPayModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-success" disabled={paying}>
                  <CheckCircle size={15} /> {paying ? 'Saving...' : 'Record Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
