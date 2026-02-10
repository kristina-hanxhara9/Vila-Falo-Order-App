// Thermal Printer Service for Receipt Printing
// This handles direct communication with thermal printers

class ThermalPrinterService {
  constructor() {
    this.printerSettings = {
      interface: 'usb', // 'usb', 'serial', 'network'
      vendorId: 0x04b8, // Epson vendor ID (default)
      productId: 0x0202, // Epson product ID (default)
      width: 48, // Character width (48 for 80mm paper)
      characterSet: 'CP850', // Character set
      removeAccents: true,
      // Network settings (if using network printer)
      host: '192.168.1.100',
      port: 9100,
      // Serial settings (if using serial printer)
      path: '/dev/usb/lp0',
      baudRate: 9600
    };
    
    this.isAvailable = this.checkPrinterAvailability();
  }

  // Check if thermal printing is available
  checkPrinterAvailability() {
    // Check if we're in a browser environment that supports USB/Serial APIs
    if (typeof window !== 'undefined') {
      return !!(navigator.usb || navigator.serial || window.electronAPI);
    }
    return false;
  }

  // ESC/POS Commands for thermal printers
  getESCPOSCommands() {
    return {
      INIT: '\x1B\x40', // Initialize printer
      CUT: '\x1D\x56\x41', // Cut paper
      FEED: '\x0A', // Line feed
      ALIGN_LEFT: '\x1B\x61\x00',
      ALIGN_CENTER: '\x1B\x61\x01',
      ALIGN_RIGHT: '\x1B\x61\x02',
      FONT_NORMAL: '\x1B\x21\x00',
      FONT_BOLD: '\x1B\x21\x08',
      FONT_LARGE: '\x1B\x21\x30',
      UNDERLINE_ON: '\x1B\x2D\x01',
      UNDERLINE_OFF: '\x1B\x2D\x00',
      EMPHASIS_ON: '\x1B\x45\x01',
      EMPHASIS_OFF: '\x1B\x45\x00'
    };
  }

  // Format receipt data for thermal printing
  formatReceiptData(order, restaurant = 'Vila Falo') {
    const cmd = this.getESCPOSCommands();
    const now = new Date();
    const dateString = now.toLocaleDateString('sq-AL');
    const timeString = now.toLocaleTimeString('sq-AL');
    
    let receipt = '';
    
    // Initialize printer
    receipt += cmd.INIT;
    
    // Header
    receipt += cmd.ALIGN_CENTER;
    receipt += cmd.FONT_LARGE;
    receipt += cmd.EMPHASIS_ON;
    receipt += 'VILA FALO\n';
    receipt += cmd.EMPHASIS_OFF;
    receipt += cmd.FONT_NORMAL;
    receipt += 'Restaurant & Bar\n';
    receipt += 'Voskopoj\u00eb, Kor\u00e7\u00eb\n';
    receipt += 'Shqip\u00ebri\n';
    receipt += 'Tel: +355 69 555 7890\n';
    receipt += 'NIPT: K32587419L\n';
    receipt += this.createLine('-', 48) + '\n';
    
    // Order Info
    receipt += cmd.ALIGN_LEFT;
    receipt += cmd.FONT_NORMAL;
    receipt += `Data: ${dateString}\n`;
    receipt += `Ora: ${timeString}\n`;
    receipt += `Tavolina: ${order.table?.number || 'N/A'}\n`;
    receipt += `Kamarieri: ${order.waiter?.name || 'N/A'}\n`;
    receipt += this.createLine('-', 48) + '\n';
    
    // Items header
    receipt += cmd.FONT_BOLD;
    receipt += this.formatLine('Produkti', 'Sasi', '\u00c7mimi', 'Total') + '\n';
    receipt += cmd.FONT_NORMAL;
    receipt += this.createLine('-', 48) + '\n';
    
    // Items
    const safeItems = Array.isArray(order.items) ? order.items : [];
    safeItems.forEach(item => {
      const itemName = this.getItemName(item);
      const itemPrice = typeof item.price === 'number' ? item.price : parseFloat(item.price) || 0;
      const itemQuantity = typeof item.quantity === 'number' ? item.quantity : parseInt(item.quantity) || 0;
      const itemTotal = itemPrice * itemQuantity;
      
      // Item name (may wrap to multiple lines)
      receipt += this.wrapText(itemName, 48) + '\n';
      
      // Quantity, price, total line
      receipt += this.formatPriceLine(
        `${itemQuantity}x`,
        `${itemPrice.toLocaleString()}`,
        `${itemTotal.toLocaleString()}`
      ) + '\n';
      
      // Add notes if any
      if (item.notes) {
        receipt += `  Note: ${item.notes}\n`;
      }
    });
    
    // Total section
    receipt += this.createLine('-', 48) + '\n';
    receipt += cmd.FONT_BOLD;
    receipt += cmd.ALIGN_RIGHT;
    receipt += `TOTALI: ${order.totalAmount?.toLocaleString() || '0'} LEK\n`;
    receipt += cmd.FONT_NORMAL;
    receipt += cmd.ALIGN_LEFT;
    receipt += this.createLine('=', 48) + '\n';
    
    // Tax information
    receipt += cmd.ALIGN_CENTER;
    receipt += 'INFORMACION FISKAL\n';
    receipt += `TVSH (20%): ${((order.totalAmount || 0) * 0.2).toLocaleString()} LEK\n`;
    receipt += `Pa TVSH: ${((order.totalAmount || 0) * 0.8).toLocaleString()} LEK\n`;
    receipt += this.createLine('-', 48) + '\n';
    
    // Footer
    receipt += '\n';
    receipt += '\ud83c\udf7d\ufe0f FALEMINDERIT! \ud83c\udf7d\ufe0f\n';
    receipt += 'P\u00ebr vizit\u00ebn tuaj n\u00eb Vila Falo\n';
    receipt += 'Voskopoje - Zemra e Alpeve Shqiptare\n';
    receipt += '\n';
    
    // QR Code (if supported)
    receipt += this.generateQRCode(order._id);
    
    // Cut paper
    receipt += '\n\n\n';
    receipt += cmd.CUT;
    
    return receipt;
  }

  // Helper function to get item name
  getItemName(item) {
    if (item && item.name) return item.name;
    if (item && item.menuItem && typeof item.menuItem === 'object') {
      if (item.menuItem.albanianName) return item.menuItem.albanianName;
      if (item.menuItem.name) return item.menuItem.name;
    }
    return 'Artikull pa emer';
  }

  // Create a line of characters
  createLine(char, length) {
    return char.repeat(length);
  }

  // Format text to fit width and wrap if needed
  wrapText(text, width) {
    if (text.length <= width) return text;
    
    const words = text.split(' ');
    let lines = [];
    let currentLine = '';
    
    words.forEach(word => {
      if ((currentLine + word).length <= width) {
        currentLine += (currentLine ? ' ' : '') + word;
      } else {
        if (currentLine) lines.push(currentLine);
        currentLine = word;
      }
    });
    
    if (currentLine) lines.push(currentLine);
    return lines.join('\n');
  }

  // Format a line with multiple columns
  formatLine(col1, col2, col3, col4) {
    const col1Width = 20;
    const col2Width = 6;
    const col3Width = 10;
    const col4Width = 10;
    
    return (
      (col1 || '').padEnd(col1Width).substring(0, col1Width) +
      (col2 || '').padStart(col2Width).substring(0, col2Width) +
      (col3 || '').padStart(col3Width).substring(0, col3Width) +
      (col4 || '').padStart(col4Width).substring(0, col4Width)
    );
  }

  // Format price line (quantity, unit price, total)
  formatPriceLine(qty, price, total) {
    const qtyWidth = 8;
    const priceWidth = 15;
    const totalWidth = 15;
    
    return (
      qty.padStart(qtyWidth).substring(0, qtyWidth) +
      price.padStart(priceWidth).substring(0, priceWidth) +
      total.padStart(totalWidth).substring(0, totalWidth)
    );
  }

  // Generate QR code for receipt (basic implementation)
  generateQRCode(orderId) {
    // This would generate ESC/POS commands for QR code
    // For now, we'll just add the order ID as text
    return `\nOrder ID: ${orderId}\n`;
  }

  // Print via Web USB API (for supported printers)
  async printViaUSB(receiptData) {
    try {
      if (!navigator.usb) {
        throw new Error('Web USB API not supported');
      }

      // Request device
      const device = await navigator.usb.requestDevice({
        filters: [
          { vendorId: this.printerSettings.vendorId },
          { vendorId: 0x04b8 }, // Epson
          { vendorId: 0x1504 }, // Citizen
          { vendorId: 0x0519 }  // Star
        ]
      });

      await device.open();
      
      if (device.configuration === null) {
        await device.selectConfiguration(1);
      }
      
      const interface_ = device.configuration.interfaces[0];
      await device.claimInterface(interface_.interfaceNumber);
      
      // Convert string to Uint8Array
      const encoder = new TextEncoder();
      const data = encoder.encode(receiptData);
      
      // Find the correct endpoint
      const endpoint = interface_.alternate.endpoints.find(
        ep => ep.direction === 'out'
      );
      
      if (endpoint) {
        await device.transferOut(endpoint.endpointNumber, data);
      }
      
      await device.close();
      return { success: true, message: 'Fatura u printua me sukses!' };
      
    } catch (error) {
      console.error('USB printing failed:', error);
      throw new Error(`Gabim në printim: ${error.message}`);
    }
  }

  // Print via Web Serial API (for serial printers)
  async printViaSerial(receiptData) {
    try {
      if (!navigator.serial) {
        throw new Error('Web Serial API not supported');
      }

      const port = await navigator.serial.requestPort();
      await port.open({ 
        baudRate: this.printerSettings.baudRate || 9600 
      });
      
      const writer = port.writable.getWriter();
      const encoder = new TextEncoder();
      const data = encoder.encode(receiptData);
      
      await writer.write(data);
      writer.releaseLock();
      await port.close();
      
      return { success: true, message: 'Fatura u printua me sukses!' };
      
    } catch (error) {
      console.error('Serial printing failed:', error);
      throw new Error(`Gabim në printim: ${error.message}`);
    }
  }

  // Print via network (TCP/IP)
  async printViaNetwork(receiptData) {
    try {
      // This would require a backend service to handle network printing
      const response = await fetch('/api/print/thermal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          printerHost: this.printerSettings.host,
          printerPort: this.printerSettings.port,
          data: receiptData
        })
      });

      if (!response.ok) {
        throw new Error('Network printing failed');
      }

      return { success: true, message: 'Fatura u printua me sukses!' };
      
    } catch (error) {
      console.error('Network printing failed:', error);
      throw new Error(`Gabim në printim: ${error.message}`);
    }
  }

  // Main print function
  async printReceipt(order, options = {}) {
    try {
      const receiptData = this.formatReceiptData(order, options.restaurantName);
      
      // Try different printing methods based on availability and settings
      if (this.printerSettings.interface === 'usb' && navigator.usb) {
        return await this.printViaUSB(receiptData);
      } else if (this.printerSettings.interface === 'serial' && navigator.serial) {
        return await this.printViaSerial(receiptData);
      } else if (this.printerSettings.interface === 'network') {
        return await this.printViaNetwork(receiptData);
      } else {
        // Fallback to browser printing with thermal-optimized layout
        return this.printViaBrowser(order, options);
      }
      
    } catch (error) {
      console.error('Thermal printing failed:', error);
      // Fallback to browser printing
      return this.printViaBrowser(order, options);
    }
  }

  // Fallback browser printing with thermal-optimized layout
  printViaBrowser(order, options = {}) {
    const printWindow = window.open('', '_blank');
    
    if (!printWindow) {
      return { 
        success: false, 
        message: 'Ju lutem aktivizoni dritaret pop-up për të printuar faturën' 
      };
    }
    
    const now = new Date();
    const dateString = now.toLocaleDateString('sq-AL');
    const timeString = now.toLocaleTimeString('sq-AL');
    
    printWindow.document.write(`
      <html>
        <head>
          <title>Fatura - Tavolina ${order.table?.number || 'N/A'}</title>
          <style>
            @media print {
              @page {
                size: 80mm auto;
                margin: 2mm;
              }
            }
            
            body {
              font-family: 'Courier New', monospace;
              margin: 0;
              padding: 5px;
              font-size: 12px;
              line-height: 1.2;
              width: 72mm;
              color: #000;
            }
            
            .header {
              text-align: center;
              margin-bottom: 10px;
              border-bottom: 1px dashed #000;
              padding-bottom: 5px;
            }
            
            .header h1 {
              font-size: 18px;
              font-weight: bold;
              margin: 0 0 5px 0;
            }
            
            .header p {
              margin: 0;
              font-size: 12px;
            }
            
            .info {
              margin-bottom: 10px;
              font-size: 11px;
            }
            
            .info div {
              margin-bottom: 2px;
            }
            
            .items {
              margin-bottom: 10px;
            }
            
            .item {
              margin-bottom: 5px;
              border-bottom: 1px dotted #ccc;
              padding-bottom: 3px;
            }
            
            .item-name {
              font-weight: bold;
              font-size: 11px;
            }
            
            .item-details {
              display: flex;
              justify-content: space-between;
              font-size: 10px;
            }
            
            .item-notes {
              font-size: 9px;
              font-style: italic;
              color: #666;
              margin-top: 2px;
            }
            
            .total {
              text-align: right;
              font-weight: bold;
              font-size: 14px;
              margin-top: 10px;
              border-top: 2px solid #000;
              padding-top: 5px;
            }
            
            .footer {
              text-align: center;
              margin-top: 15px;
              font-size: 10px;
              border-top: 1px dashed #000;
              padding-top: 10px;
            }
            
            .dashed-line {
              border-top: 1px dashed #000;
              margin: 10px 0;
            }
            
            .no-print {
              display: none;
            }
            
            @media screen {
              .no-print {
                display: block;
                text-align: center;
                margin-top: 20px;
              }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>VILA FALO</h1>
            <p>Restaurant & Bar</p>
            <p>Voskopojë, Korçë, Shqipëri</p>
            <p>Tel: +355 69 555 7890</p>
            <p>NIPT: K32587419L</p>
          </div>
          
          <div class="info">
            <div><strong>Data:</strong> ${dateString}</div>
            <div><strong>Ora:</strong> ${timeString}</div>
            <div><strong>Tavolina:</strong> ${order.table?.number || 'N/A'}</div>
            <div><strong>Kamarieri:</strong> ${order.waiter?.name || 'N/A'}</div>
          </div>
          
          <div class="dashed-line"></div>
          
          <div class="items">
    `);
    
    // Add each item
    const safeItems = Array.isArray(order.items) ? order.items : [];
    safeItems.forEach(item => {
      const itemName = this.getItemName(item);
      const itemPrice = typeof item.price === 'number' ? item.price : parseFloat(item.price) || 0;
      const itemQuantity = typeof item.quantity === 'number' ? item.quantity : parseInt(item.quantity) || 0;
      const itemTotal = itemPrice * itemQuantity;
      
      printWindow.document.write(`
        <div class="item">
          <div class="item-name">${itemName}</div>
          <div class="item-details">
            <span>${itemQuantity}x ${itemPrice.toLocaleString()} LEK</span>
            <span>${itemTotal.toLocaleString()} LEK</span>
          </div>
          ${item.notes ? `<div class="item-notes">Note: ${item.notes}</div>` : ''}
        </div>
      `);
    });
    
    printWindow.document.write(`
          </div>
          
          <div class="total">
            TOTALI: ${(order.totalAmount || 0).toLocaleString()} LEK
          </div>
          
          <div class="footer">
            <p>🍽️ FALEMINDERIT! 🍽️</p>
            <p>Për vizitën tuaj në Vila Falo</p>
            <p>Voskopoje - Zemra e Alpeve Shqiptare</p>
            <p>TVSH (20%): ${((order.totalAmount || 0) * 0.2).toLocaleString()} LEK</p>
            <p>Pa TVSH: ${((order.totalAmount || 0) * 0.8).toLocaleString()} LEK</p>
            <p style="font-size: 8px; margin-top: 10px;">Order ID: ${order._id}</p>
          </div>
          
          <div class="no-print">
            <button onclick="window.print();" style="padding: 10px 20px; background-color: #4CAF50; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 14px;">🖨️ Print Receipt</button>
            <button onclick="window.close();" style="padding: 10px 20px; background-color: #f44336; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 14px; margin-left: 10px;">❌ Close</button>
          </div>
        </body>
      </html>
    `);
    
    printWindow.document.close();
    
    // Auto-print after a short delay
    setTimeout(() => {
      printWindow.print();
    }, 500);
    
    return { success: true, message: 'Dritarja e printimit u hap me sukses!' };
  }

  // Configure printer settings
  configurePrinter(settings) {
    this.printerSettings = { ...this.printerSettings, ...settings };
  }

  // Test printer connection
  async testPrinter() {
    const testReceipt = {
      _id: 'test',
      table: { number: 'TEST' },
      waiter: { name: 'TEST' },
      items: [
        {
          name: 'Test Item',
          quantity: 1,
          price: 100,
          notes: 'Test Note'
        }
      ],
      totalAmount: 100
    };

    return await this.printReceipt(testReceipt, { restaurantName: 'VILA FALO - TEST' });
  }
}

// Export for use in other components
export default ThermalPrinterService;