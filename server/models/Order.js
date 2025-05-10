const mongoose = require('mongoose');
require('dotenv').config();

const OrderItemSchema = new mongoose.Schema({
  menuItem: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MenuItem',
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  price: {
    type: Number,
    required: true
  },
  notes: {
    type: String,
    trim: true
  },
  status: {
    type: String,
    enum: ['pending', 'preparing', 'ready', 'served', 'cancelled'],
    // Albanian translations
    // pending: në pritje
    // preparing: në përgatitje
    // ready: gati
    // served: servuar
    // cancelled: anuluar
    default: 'pending'
  }
});

const OrderSchema = new mongoose.Schema({
  table: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Table',
    required: true
  },
  waiter: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  items: [OrderItemSchema],
  status: {
    type: String,
    enum: ['active', 'completed', 'cancelled'],
    // Albanian translations
    // active: aktive
    // completed: përfunduar
    // cancelled: anuluar
    default: 'active'
  },
  totalAmount: {
    type: Number,
    required: true
  },
  paymentStatus: {
    type: String,
    enum: ['unpaid', 'paid'],
    // Albanian translations
    // unpaid: e papaguar
    // paid: e paguar
    default: 'unpaid'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  completedAt: {
    type: Date
  }
});

// Pre-save hook to calculate total amount
OrderSchema.pre('save', function(next) {
  if (this.isModified('items')) {
    this.totalAmount = this.items.reduce((total, item) => {
      return total + (item.price * item.quantity);
    }, 0);
  }
  next();
});

module.exports = mongoose.model('Order', OrderSchema);