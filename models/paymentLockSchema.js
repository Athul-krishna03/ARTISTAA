const mongoose = require('mongoose');

const paymentLockSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        unique: true,
        index: true
    },
    createdAt: {
        type: Date,
        default: Date.now,
        expires: 300
    }
});

const PaymentLock = mongoose.model('PaymentLock', paymentLockSchema);
module.exports = PaymentLock