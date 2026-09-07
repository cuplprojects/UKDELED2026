import { api } from '../stores/apiStore'

/**
 * Check Atom payment status using the official Atom API format
 * API: https://payment1.atomtech.in/ots/v2/payment/status
 * 
 * Request format:
 * {
 *   "payDetails": {
 *     "amount": 1,
 *     "signature": "hash",
 *     "txnCurrency": "INR"
 *   },
 *   "merchDetails": {
 *     "merchId": 618408,
 *     "merchTxnId": "txn_id",
 *     "merchTxnDate": "2024-01-16"
 *   }
 * }
 */
export const checkAtomPaymentStatus = async (statusRequest = null) => {
  try {
    console.log('[AtomPayment] Checking payment status...')

    let response;

    // If no request provided, use simple GET (auto-fetch latest transaction)
    if (!statusRequest) {
      console.log('[AtomPayment] Using simple status check (GET)')
      response = await api.get('/api/payment/check-status')
    } else {
      // Use advanced POST with full Atom request format
      console.log('[AtomPayment] Using advanced status check (POST) with full request:', statusRequest)
      response = await api.post('/api/payment/check-status-advanced', statusRequest)
    }

    console.log('[AtomPayment] Status response:', response.data)

    return {
      success: true,
      isPaid: response.data.isPaid,
      message: response.data.message || 'Payment status retrieved successfully',
      transactionId: response.data.transactionId,
      amount: response.data.amount
    }
  } catch (error) {
    console.error('[AtomPayment] Error checking payment status:', error)

    return {
      success: false,
      isPaid: false,
      message: error.response?.data?.message || 'Failed to check payment status'
    }
  }
}

/**
 * Advanced payment status check using Atom's exact API request format
 * Useful for manual verification with specific transaction details
 */
export const checkPaymentStatusAdvanced = async (merchTxnId, amount, signature, merchTxnDate) => {
  try {
    console.log('[AtomPayment] Checking payment status (advanced)...', {
      merchTxnId,
      amount,
      merchTxnDate
    })

    const statusRequest = buildAtomStatusRequest(
      merchTxnId,
      amount,
      signature,
      merchTxnDate
    )

    console.log('[AtomPayment] Sending advanced status request:', statusRequest)

    const response = await api.post('/api/payment/check-status-advanced', statusRequest)

    console.log('[AtomPayment] Advanced status response:', response.data)

    return {
      success: true,
      isPaid: response.data.isPaid,
      message: response.data.message,
      transactionId: response.data.transactionId,
      amount: response.data.amount
    }
  } catch (error) {
    console.error('[AtomPayment] Error in advanced status check:', error)

    return {
      success: false,
      isPaid: false,
      message: error.response?.data?.message || 'Failed to check payment status (advanced)'
    }
  }
}

/**
 * Build Atom payment status request
 * This utility helps construct the exact request format required by Atom API
 * Note: merchId will be retrieved from backend appsettings if not provided
 */
export const buildAtomStatusRequest = (merchantTxnId = '', amount = 0, signature = '', merchTxnDate = '', merchantId = '') => {
  const request = {
    merchDetails: {
      merchTxnId: merchantTxnId,
      merchTxnDate: merchTxnDate
    }
  }

  // Add payDetails if amount is provided
  if (amount > 0) {
    request.payDetails = {
      amount: amount,
      signature: signature,
      txnCurrency: 'INR'
    }
  }

  // Add merchId if provided, otherwise backend will use config
  if (merchantId) {
    request.merchDetails.merchId = merchantId
  }

  return request
}

/**
 * Format date for Atom API (YYYY-MM-DD format)
 */
export const formatDateForAtom = (date = new Date()) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Parse Atom payment response
 */
export const parseAtomResponse = (response) => {
  try {
    const payInstrument = response.payInstrument || {}
    const responseDetails = payInstrument.responseDetails || {}
    const payDetails = payInstrument.payDetails || {}
    const merchDetails = payInstrument.merchDetails || {}

    return {
      statusCode: responseDetails.statusCode,
      message: responseDetails.message,
      description: responseDetails.description,
      atomTxnId: payDetails.atomTxnId,
      amount: payDetails.amount,
      merchantTxnId: merchDetails.merchTxnId,
      success: responseDetails.statusCode === 'OTS0000'
    }
  } catch (error) {
    console.error('[AtomPayment] Error parsing response:', error)
    return null
  }
}
