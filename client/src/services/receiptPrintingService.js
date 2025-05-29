// Receipt Printing Service for Vila Falo Restaurant
// Supports both thermal printers and browser printing

class ReceiptPrintingService {
  constructor() {
    this.printerConnected = false;
    this.printerType = 'thermal'; // or 'browser'
    this.restaurantInfo = {
      name: 'Vila Falo',
      address: 'Rruga Kryesore, Tiranë',
      phone: '+355 69 123 4567',
      email: 'info@vilafalo.al',
      website: 'www.vilafalo.al'
    };
  }

  // Check if thermal printer is available
  async checkPrinterConnection() {
    try {
      // Check if Web Serial API is supported (for direct printer connection)
      if ('serial' in navigator) {
        return true;
      }
      
      // Check if printer is available via network (IP printer)
      // This would need to be configured with printer IP
      return false;
    } catch (error) {
      console.error('Printer check error:', error);
      return false;
    }
  }

  // Format currency for receipt
  formatCurrency(amount) {
    const numAmount = typeof amount === 'number' ? amount : parseFloat(amount) || 0;
    return numAmount.toLocaleString('sq-AL', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }) + ' LEK';
  }

  // Get item name helper
  getItemName(item, menuItems = []) {
    if (item && item.name) return item.name;
    
    if (item && item.menuItem && typeof item.menuItem === 'object') {
      if (item.menuItem.albanianName) return item.menuItem.albanianName;
      if (item.menuItem.name) return item.menuItem.name;
    }
    
    if (item && item.menuItem && typeof item.menuItem === 'string') {
      const menuItem = menuItems.find(m => m._id === item.menuItem);
      if (menuItem) {
        if (menuItem.albanianName) return menuItem.albanianName;
        if (menuItem.name) return menuItem.name;
      }
    }
    
    return 'Artikull pa emër';
  }

  // Calculate order total with validation
  calculateOrderTotal(items) {
    if (!Array.isArray(items)) return 0;
    
    return items.reduce((total, item) => {
      const price = typeof item.price === 'number' ? item.price : parseFloat(item.price) || 0;
      const quantity = typeof item.quantity === 'number' ? item.quantity : parseInt(item.quantity) || 0;
      return total + (price * quantity);
    }, 0);
  }

  // Generate ESC/POS commands for thermal printer
  generateThermalReceipt(order, menuItems = []) {
    const ESC = '\x1B';
    const commands = [];
    
    // Initialize printer
    commands.push(ESC + '@'); // Initialize
    commands.push(ESC + 'a' + '\x01'); // Center align
    
    // Restaurant header
    commands.push(ESC + '!' + '\x18'); // Double height + width
    commands.push(this.restaurantInfo.name + '\n');
    commands.push(ESC + '!' + '\x00'); // Normal size
    
    commands.push(this.restaurantInfo.address + '\n');
    commands.push('Tel: ' + this.restaurantInfo.phone + '\n');
    commands.push(this.restaurantInfo.email + '\n');
    commands.push('\n');
    
    // Receipt title
    commands.push(ESC + '!' + '\x08'); // Double width
    commands.push('FATURË FISKALE\n');
    commands.push(ESC + '!' + '\x00'); // Normal size
    commands.push('═'.repeat(32) + '\n');
    
    // Order details
    const now = new Date();
    commands.push(`Data: ${now.toLocaleDateString('sq-AL')}\n`);
    commands.push(`Ora: ${now.toLocaleTimeString('sq-AL')}\n`);
    commands.push(`Tavolina: ${order.table?.number || 'N/A'}\n`);
    commands.push(`Kamarier: ${order.waiter?.name || 'N/A'}\n`);
    commands.push(`Porosi ID: ${order._id?.slice(-8) || 'N/A'}\n`);
    commands.push('─'.repeat(32) + '\n');
    
    // Items header
    commands.push(ESC + 'a' + '\x00'); // Left align
    commands.push('Produkti              Sas  Çmimi\n');
    commands.push('─'.repeat(32) + '\n');
    
    // Order items
    const safeItems = Array.isArray(order.items) ? order.items : [];
    let calculatedTotal = 0;
    
    safeItems.forEach(item => {
      const itemName = this.getItemName(item, menuItems);
      const price = typeof item.price === 'number' ? item.price : parseFloat(item.price) || 0;
      const quantity = typeof item.quantity === 'number' ? item.quantity : parseInt(item.quantity) || 0;
      const itemTotal = price * quantity;
      calculatedTotal += itemTotal;
      
      // Truncate long names
      const truncatedName = itemName.length > 18 ? itemName.substring(0, 18) : itemName;
      const namePadded = truncatedName.padEnd(18);
      const qtyPadded = quantity.toString().padStart(3);
      const pricePadded = this.formatCurrency(price).padStart(9);
      
      commands.push(`${namePadded} ${qtyPadded} ${pricePadded}\n`);
      
      if (itemTotal !== price) {
        const totalPadded = this.formatCurrency(itemTotal).padStart(32);
        commands.push(`${totalPadded}\n`);
      }
      
      if (item.notes && item.notes.trim()) {
        commands.push(`  * ${item.notes}\n`);
      }
    });
    
    // Totals
    commands.push('─'.repeat(32) + '\n');
    
    const displayTotal = order.totalAmount || calculatedTotal;
    
    // Subtotal (without tax)
    const subtotal = displayTotal / 1.2; // Assuming 20% VAT
    const tax = displayTotal - subtotal;
    
    commands.push(`Nëntotali:        ${this.formatCurrency(subtotal).padStart(13)}\n`);
    commands.push(`TVSH (20%):       ${this.formatCurrency(tax).padStart(13)}\n`);
    commands.push('═'.repeat(32) + '\n');
    
    commands.push(ESC + '!' + '\x18'); // Double height + width
    commands.push(`TOTALI:           ${this.formatCurrency(displayTotal).padStart(13)}\n`);
    commands.push(ESC + '!' + '\x00'); // Normal size
    
    // Payment info
    commands.push('─'.repeat(32) + '\n');
    commands.push(`Pagesa: ${order.paymentMethod || 'Kesh'}\n`);
    commands.push(`Status: ${order.paymentStatus === 'paid' ? 'E paguar' : 'E papaguar'}\n`);
    
    // Footer
    commands.push('\n');
    commands.push(ESC + 'a' + '\x01'); // Center align
    commands.push('Ju faleminderit për vizitën!\n');
    commands.push('Mirupafshim!\n\n');
    commands.push('Kthehuni së shpejti!\n');
    commands.push('★★★★★\n\n');
    
    // QR Code placeholder (if printer supports it)
    if (order._id) {
      commands.push('Skanoni për vlerësim:\n');
      commands.push(`Vila-Falo-${order._id}\n\n`);
    }
    
    // Cut paper
    commands.push(ESC + 'd' + '\x03'); // Feed 3 lines
    commands.push(ESC + 'i'); // Partial cut
    
    return commands.join('');
  }

  // Print to thermal printer
  async printToThermalPrinter(receiptData) {
    try {
      // Method 1: Web Serial API (direct USB connection)
      if ('serial' in navigator) {
        const port = await navigator.serial.requestPort();
        await port.open({ baudRate: 9600 });
        
        const writer = port.writable.getWriter();
        const encoder = new TextEncoder();
        
        await writer.write(encoder.encode(receiptData));
        writer.releaseLock();
        await port.close();
        
        return { success: true, method: 'serial' };
      }
      
      // Method 2: Network printer (IP address)
      // This would require a backend endpoint that handles printer communication
      const response = await fetch('/api/print-receipt', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          receiptData,
          printerIP: '192.168.1.100', // Configure printer IP
        }),
      });
      
      if (response.ok) {
        return { success: true, method: 'network' };
      }
      
      throw new Error('Network printing failed');
      
    } catch (error) {
      console.error('Thermal printing error:', error);
      return { success: false, error: error.message };
    }
  }

  // Enhanced browser printing with better formatting
  async printToBrowser(order, menuItems = []) {
    const printWindow = window.open('', '_blank', 'width=400,height=600');
    
    if (!printWindow) {
      alert('Ju lutem aktivizoni dritaret pop-up për të printuar faturën');
      return { success: false, error: 'Pop-up blocked' };
    }
    
    const now = new Date();
    const safeItems = Array.isArray(order.items) ? order.items : [];
    const calculatedTotal = this.calculateOrderTotal(safeItems);
    const displayTotal = order.totalAmount || calculatedTotal;
    
    // Subtotal calculation (assuming 20% VAT)
    const subtotal = displayTotal / 1.2;
    const tax = displayTotal - subtotal;
    
    const receiptHTML = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Faturë - Tavolina ${order.table?.number || 'N/A'}</title>
          <meta charset="utf-8">
          <style>
            * {
              box-sizing: border-box;
              margin: 0;
              padding: 0;
            }
            
            body {
              font-family: 'Courier New', monospace;
              font-size: 12px;
              line-height: 1.4;
              width: 302px;
              margin: 0 auto;
              padding: 10px;
              background: white;
            }
            
            .header {
              text-align: center;
              margin-bottom: 15px;
              border-bottom: 2px solid #000;
              padding-bottom: 10px;
            }
            
            .restaurant-name {
              font-size: 18px;
              font-weight: bold;
              margin-bottom: 5px;
            }
            
            .receipt-title {
              font-size: 16px;
              font-weight: bold;
              margin: 10px 0;
              text-decoration: underline;
            }
            
            .info-section {
              margin-bottom: 15px;
              border-bottom: 1px dashed #000;
              padding-bottom: 10px;
            }
            
            .info-row {
              display: flex;
              justify-content: space-between;
              margin-bottom: 3px;
            }
            
            .items-section {
              margin-bottom: 15px;
            }
            
            .items-header {
              border-bottom: 1px solid #000;
              padding-bottom: 3px;
              margin-bottom: 5px;
              font-weight: bold;
            }
            
            .item-row {
              margin-bottom: 3px;
              display: flex;
              justify-content: space-between;
            }
            
            .item-name {
              flex: 1;
              max-width: 150px;
              word-wrap: break-word;
            }
            
            .item-qty {
              width: 30px;
              text-align: center;
            }
            
            .item-price {
              width: 80px;
              text-align: right;
            }
            
            .item-total {
              width: 80px;
              text-align: right;
              font-weight: bold;
            }
            
            .item-notes {
              font-style: italic;
              color: #666;
              margin-left: 10px;
              font-size: 10px;
            }
            
            .totals-section {
              border-top: 2px solid #000;
              border-bottom: 2px solid #000;
              padding: 8px 0;
              margin: 10px 0;
            }
            
            .total-row {
              display: flex;
              justify-content: space-between;
              margin-bottom: 3px;
            }
            
            .grand-total {
              font-size: 16px;
              font-weight: bold;
              border-top: 1px solid #000;
              padding-top: 5px;
              margin-top: 5px;
            }
            
            .footer {
              text-align: center;
              margin-top: 15px;
              font-size: 11px;
            }
            
            .footer-note {
              margin-bottom: 5px;
            }
            
            .qr-section {
              border: 1px dashed #000;
              padding: 8px;
              margin: 10px 0;
              text-align: center;
              font-size: 10px;
            }
            
            @media print {
              body {
                width: auto;
                margin: 0;
                padding: 5px;
              }
              
              .no-print {
                display: none;
              }
              
              @page {
                margin: 0;
                size: 80mm auto;
              }
            }
            
            .print-button {
              background: #4CAF50;
              color: white;
              border: none;
              padding: 10px 20px;
              border-radius: 5px;
              cursor: pointer;
              font-size: 14px;
              margin: 10px;
            }
            
            .print-button:hover {
              background: #45a049;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="restaurant-name">${this.restaurantInfo.name}</div>
            <div>${this.restaurantInfo.address}</div>
            <div>Tel: ${this.restaurantInfo.phone}</div>
            <div>${this.restaurantInfo.email}</div>
            <div class="receipt-title">FATURË FISKALE</div>
          </div>
          
          <div class="info-section">
            <div class="info-row">
              <span><strong>Data:</strong></span>
              <span>${now.toLocaleDateString('sq-AL')}</span>
            </div>
            <div class="info-row">
              <span><strong>Ora:</strong></span>
              <span>${now.toLocaleTimeString('sq-AL')}</span>
            </div>
            <div class="info-row">
              <span><strong>Tavolina:</strong></span>
              <span>${order.table?.number || 'N/A'}</span>
            </div>
            <div class="info-row">
              <span><strong>Kamarier:</strong></span>
              <span>${order.waiter?.name || 'N/A'}</span>
            </div>
            <div class="info-row">
              <span><strong>Porosi ID:</strong></span>
              <span>${order._id?.slice(-8) || 'N/A'}</span>
            </div>
          </div>
          
          <div class="items-section">
            <div class="items-header">
              <div class="item-row">
                <div class="item-name">Produkti</div>
                <div class="item-qty">Sas</div>
                <div class="item-price">Çmimi</div>
                <div class="item-total">Totali</div>
              </div>
            </div>
            
            ${safeItems.map(item => {
              const itemName = this.getItemName(item, menuItems);
              const price = typeof item.price === 'number' ? item.price : parseFloat(item.price) || 0;
              const quantity = typeof item.quantity === 'number' ? item.quantity : parseInt(item.quantity) || 0;
              const itemTotal = price * quantity;
              
              return `
                <div class="item-row">
                  <div class="item-name">${itemName}</div>
                  <div class="item-qty">${quantity}</div>
                  <div class="item-price">${this.formatCurrency(price)}</div>
                  <div class="item-total">${this.formatCurrency(itemTotal)}</div>
                </div>
                ${item.notes ? `<div class="item-notes">* ${item.notes}</div>` : ''}
              `;
            }).join('')}
          </div>
          
          <div class="totals-section">
            <div class="total-row">
              <span>Nëntotali:</span>
              <span>${this.formatCurrency(subtotal)}</span>
            </div>
            <div class="total-row">
              <span>TVSH (20%):</span>
              <span>${this.formatCurrency(tax)}</span>
            </div>
            <div class="total-row grand-total">
              <span><strong>TOTALI:</strong></span>
              <span><strong>${this.formatCurrency(displayTotal)}</strong></span>
            </div>
          </div>
          
          <div class="info-section">
            <div class="info-row">
              <span><strong>Pagesa:</strong></span>
              <span>${order.paymentMethod || 'Kesh'}</span>
            </div>
            <div class="info-row">
              <span><strong>Status:</strong></span>
              <span>${order.paymentStatus === 'paid' ? 'E paguar' : 'E papaguar'}</span>
            </div>
          </div>
          
          ${order._id ? `
            <div class="qr-section">
              <div>Skanoni për vlerësim:</div>
              <div style="font-family: monospace;">Vila-Falo-${order._id.slice(-8)}</div>
            </div>
          ` : ''}
          
          <div class="footer">
            <div class="footer-note"><strong>Ju faleminderit për vizitën!</strong></div>
            <div class="footer-note">Mirupafshim!</div>
            <div class="footer-note">★★★★★</div>
            <div style="margin-top: 10px; font-size: 9px;">
              TVSH përfshirë në çmim<br>
              Ruani këtë faturë për çdo reklamim
            </div>
          </div>
          
          <div class="no-print" style="text-align: center; margin-top: 20px;">
            <button class="print-button" onclick="window.print();">🖨️ Printo Faturën</button>
            <button class="print-button" onclick="window.close();" style="background: #f44336;">❌ Mbyll</button>
          </div>
        </body>
      </html>
    `;
    
    printWindow.document.write(receiptHTML);
    printWindow.document.close();
    
    return { success: true, method: 'browser' };
  }

  // Main print function that tries thermal first, then browser
  async printReceipt(order, menuItems = [], options = {}) {
    const { forceBrowser = false, autoClose = true } = options;
    
    try {
      // Try thermal printer first if not forced to browser
      if (!forceBrowser) {
        const printerConnected = await this.checkPrinterConnection();
        
        if (printerConnected) {
          const thermalData = this.generateThermalReceipt(order, menuItems);
          const thermalResult = await this.printToThermalPrinter(thermalData);
          
          if (thermalResult.success) {
            return {
              success: true,
              method: 'thermal',
              message: 'Fatura u printua në printerin termik'
            };
          }
        }
      }
      
      // Fallback to browser printing
      const browserResult = await this.printToBrowser(order, menuItems);
      
      if (browserResult.success) {
        return {
          success: true,
          method: 'browser',
          message: 'Fatura u hap për printim në browser'
        };
      }
      
      throw new Error('Të gjitha metodat e printimit dështuan');
      
    } catch (error) {
      console.error('Receipt printing error:', error);
      return {
        success: false,
        error: error.message,
        message: 'Gabim gjatë printimit të faturës'
      };
    }
  }

  // Print kitchen ticket (simplified version for kitchen)
  async printKitchenTicket(order, menuItems = []) {
    const ticketData = this.generateKitchenTicket(order, menuItems);
    
    try {
      const printerConnected = await this.checkPrinterConnection();
      
      if (printerConnected) {
        const result = await this.printToThermalPrinter(ticketData);
        if (result.success) {
          return { success: true, method: 'thermal' };
        }
      }
      
      // Fallback: open in new window for printing
      const printWindow = window.open('', '_blank', 'width=300,height=400');
      printWindow.document.write(`
        <html>
          <head>
            <title>Kitchen Ticket</title>
            <style>
              body { font-family: monospace; font-size: 14px; }
              .ticket { max-width: 250px; margin: 0 auto; }
              .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; }
              .item { margin: 5px 0; }
              .notes { font-style: italic; color: #666; }
            </style>
          </head>
          <body>
            <div class="ticket">
              <div class="header">
                <h2>KUZHINA</h2>
                <div>Tavolina ${order.table?.number || 'N/A'}</div>
                <div>${new Date().toLocaleTimeString('sq-AL')}</div>
              </div>
              <div class="items">
                ${Array.isArray(order.items) ? order.items.map(item => `
                  <div class="item">
                    <strong>${item.quantity}x ${this.getItemName(item, menuItems)}</strong>
                    ${item.notes ? `<div class="notes">* ${item.notes}</div>` : ''}
                  </div>
                `).join('') : ''}
              </div>
            </div>
            <script>
              setTimeout(() => window.print(), 500);
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
      
      return { success: true, method: 'browser' };
      
    } catch (error) {
      console.error('Kitchen ticket printing error:', error);
      return { success: false, error: error.message };
    }
  }

  // Generate kitchen ticket (simplified for kitchen staff)
  generateKitchenTicket(order, menuItems = []) {
    const ESC = '\x1B';
    const commands = [];
    
    commands.push(ESC + '@'); // Initialize
    commands.push(ESC + 'a' + '\x01'); // Center align
    
    commands.push(ESC + '!' + '\x18'); // Double height + width
    commands.push('KUZHINA\n');
    commands.push(ESC + '!' + '\x00'); // Normal size
    
    commands.push('═'.repeat(32) + '\n');
    commands.push(`Tavolina: ${order.table?.number || 'N/A'}\n`);
    commands.push(`Ora: ${new Date().toLocaleTimeString('sq-AL')}\n`);
    commands.push(`Kamarier: ${order.waiter?.name || 'N/A'}\n`);
    commands.push('─'.repeat(32) + '\n');
    
    const safeItems = Array.isArray(order.items) ? order.items : [];
    
    safeItems.forEach(item => {
      const itemName = this.getItemName(item, menuItems);
      const quantity = typeof item.quantity === 'number' ? item.quantity : parseInt(item.quantity) || 0;
      
      commands.push(ESC + '!' + '\x08'); // Double width
      commands.push(`${quantity}x ${itemName}\n`);
      commands.push(ESC + '!' + '\x00'); // Normal size
      
      if (item.notes && item.notes.trim()) {
        commands.push(`*** ${item.notes} ***\n`);
      }
      commands.push('\n');
    });
    
    commands.push('═'.repeat(32) + '\n');
    commands.push('\n\n');
    commands.push(ESC + 'i'); // Partial cut
    
    return commands.join('');
  }
}

// Export singleton instance
const receiptPrintingService = new ReceiptPrintingService();
export default receiptPrintingService;
