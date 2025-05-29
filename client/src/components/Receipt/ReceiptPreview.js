import React from 'react';
import receiptPrintingService from '../../services/receiptPrintingService';

const ReceiptPreview = ({ order, menuItems = [], onClose, onPrint }) => {
  if (!order) return null;
  
  const now = new Date();
  const safeItems = Array.isArray(order.items) ? order.items : [];
  const calculatedTotal = receiptPrintingService.calculateOrderTotal(safeItems);
  const displayTotal = order.totalAmount || calculatedTotal;
  
  // Subtotal calculation (assuming 20% VAT)
  const subtotal = displayTotal / 1.2;
  const tax = displayTotal - subtotal;
  
  const getItemName = (item) => receiptPrintingService.getItemName(item, menuItems);
  
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white p-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold">📄 Paraqitja e Faturës</h2>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors duration-200"
            >
              ✕
            </button>
          </div>
          <p className="text-blue-100 mt-2">Tavolina {order.table?.number || 'N/A'}</p>
        </div>
        
        {/* Receipt Content */}
        <div className="overflow-y-auto max-h-[60vh]">
          <div className="p-6 font-mono text-sm bg-gray-50 border-l-4 border-blue-500">
            {/* Restaurant Header */}
            <div className="text-center mb-6 pb-4 border-b-2 border-gray-300">
              <div className="text-lg font-bold mb-2">{receiptPrintingService.restaurantInfo.name}</div>
              <div className="text-gray-600">
                <div>{receiptPrintingService.restaurantInfo.address}</div>
                <div>Tel: {receiptPrintingService.restaurantInfo.phone}</div>
                <div>{receiptPrintingService.restaurantInfo.email}</div>
              </div>
              <div className="text-lg font-bold mt-4 text-blue-700">FATURË FISKALE</div>
            </div>
            
            {/* Order Info */}
            <div className="mb-6 space-y-2">
              <div className="flex justify-between">
                <span className="font-semibold">Data:</span>
                <span>{now.toLocaleDateString('sq-AL')}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold">Ora:</span>
                <span>{now.toLocaleTimeString('sq-AL')}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold">Tavolina:</span>
                <span>{order.table?.number || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold">Kamarier:</span>
                <span>{order.waiter?.name || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold">Porosi ID:</span>
                <span>{order._id?.slice(-8) || 'N/A'}</span>
              </div>
            </div>
            
            <div className="border-t-2 border-gray-300 pt-4 mb-4">
              <div className="flex justify-between font-semibold mb-2">
                <span>Produkti</span>
                <span>Sas</span>
                <span>Çmimi</span>
                <span>Totali</span>
              </div>
              <div className="border-b border-gray-300 mb-3"></div>
              
              {/* Items */}
              <div className="space-y-3">
                {safeItems.map((item, index) => {
                  const itemName = getItemName(item);
                  const price = typeof item.price === 'number' ? item.price : parseFloat(item.price) || 0;
                  const quantity = typeof item.quantity === 'number' ? item.quantity : parseInt(item.quantity) || 0;
                  const itemTotal = price * quantity;
                  
                  return (
                    <div key={index}>
                      <div className="grid grid-cols-4 gap-2 text-xs">
                        <div className="col-span-1 truncate">{itemName}</div>
                        <div className="text-center">{quantity}</div>
                        <div className="text-right">{receiptPrintingService.formatCurrency(price)}</div>
                        <div className="text-right font-semibold">{receiptPrintingService.formatCurrency(itemTotal)}</div>
                      </div>
                      
                      {item.notes && (
                        <div className="text-xs text-gray-600 italic mt-1 ml-2">
                          * {item.notes}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
            
            {/* Totals */}
            <div className="border-t-2 border-gray-300 pt-4 space-y-2">
              <div className="flex justify-between">
                <span>Nëntotali:</span>
                <span>{receiptPrintingService.formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span>TVSH (20%):</span>
                <span>{receiptPrintingService.formatCurrency(tax)}</span>
              </div>
              <div className="border-t border-gray-300 pt-2">
                <div className="flex justify-between text-lg font-bold">
                  <span>TOTALI:</span>
                  <span>{receiptPrintingService.formatCurrency(displayTotal)}</span>
                </div>
              </div>
            </div>
            
            {/* Payment Info */}
            <div className="border-t border-gray-300 pt-4 mt-4 space-y-2">
              <div className="flex justify-between">
                <span className="font-semibold">Pagesa:</span>
                <span>{order.paymentMethod || 'Kesh'}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold">Status:</span>
                <span className={order.paymentStatus === 'paid' ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}>
                  {order.paymentStatus === 'paid' ? 'E paguar' : 'E papaguar'}
                </span>
              </div>
            </div>
            
            {/* Footer */}
            <div className="text-center mt-6 pt-4 border-t border-gray-300 text-xs text-gray-600">
              <div className="font-semibold mb-2">Ju faleminderit për vizitën!</div>
              <div>Mirupafshim!</div>
              <div className="mt-2">★★★★★</div>
              {order._id && (
                <div className="mt-4 p-2 bg-gray-200 rounded">
                  <div className="text-xs">Skanoni për vlerësim:</div>
                  <div className="font-mono text-xs">Vila-Falo-{order._id.slice(-8)}</div>
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Footer Actions */}
        <div className="p-6 bg-gray-50 border-t flex justify-between items-center">
          <div className="text-sm text-gray-600">
            <div>💡 Paraqitja e faturës së printuar</div>
            <div className="text-xs">TVSH përfshirë në çmim</div>
          </div>
          
          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:border-gray-400 transition-colors duration-200"
            >
              Mbyll
            </button>
            {onPrint && (
              <button
                onClick={onPrint}
                className="px-6 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white rounded-lg transition-all duration-200 flex items-center"
              >
                🖨️ Printo Tani
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReceiptPreview;