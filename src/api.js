// Backend'in adresi. Yerel gelistirmede localhost:3000, prod'a deploy
// ederken .env dosyasinda (ya da Vercel/Netlify ayarlarinda) VITE_BACKEND_URL
// tanimlarsan onu kullanir.
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000'
const BASE_URL = `${BACKEND_URL}/api`

function getToken() {
  return localStorage.getItem('yurtpano_token')
}

async function request(path, { method = 'GET', body, auth = true } = {}) {
  const headers = { 'Content-Type': 'application/json' }
  if (auth) {
    const token = getToken()
    if (token) headers.Authorization = `Bearer ${token}`
  }

  let res
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    })
  } catch (err) {
    throw new Error('Backend\'e ulasilamiyor. "npm run dev" ile calistigindan emin ol (localhost:3000).')
  }

  const data = await res.json().catch(() => ({}))

  if (!res.ok) {
    // Token gecersiz/suresi dolmus: kullaniciyi otomatik cikis yaptirmak icin
    // global bir event yayinliyoruz, AuthContext bunu dinleyip oturumu kapatir.
    if (res.status === 401 && auth) {
      localStorage.removeItem('yurtpano_token')
      localStorage.removeItem('yurtpano_user')
      window.dispatchEvent(new Event('yurtpano:unauthorized'))
    }
    const message = typeof data.error === 'string' ? data.error : 'Girdiginiz bilgileri kontrol edin.'
    throw new Error(message)
  }
  return data
}

export const api = {
  getDorms: () => request('/dorms', { auth: false }),
  requestOtp: (phone) => request('/auth/request-otp', { method: 'POST', body: { phone }, auth: false }),
  register: (payload) => request('/auth/register', { method: 'POST', body: payload, auth: false }),
  login: (identifier, password) => request('/auth/login', { method: 'POST', body: { identifier, password }, auth: false }),

  getOrders: () => request('/orders'),
  createOrder: (payload) => request('/orders', { method: 'POST', body: payload }),
  joinOrder: (id, amount) => request(`/orders/${id}/join`, { method: 'POST', body: amount ? { amount } : {} }),
  leaveOrder: (id) => request(`/orders/${id}/leave`, { method: 'POST' }),
  closeOrder: (id) => request(`/orders/${id}/close`, { method: 'POST' }),
  cancelOrder: (id) => request(`/orders/${id}/cancel`, { method: 'POST' }),

  getRequests: () => request('/requests'),
  createRequest: (payload) => request('/requests', { method: 'POST', body: payload }),
  fulfillRequest: (id) => request(`/requests/${id}/fulfill`, { method: 'POST' }),
  cancelRequest: (id) => request(`/requests/${id}/cancel`, { method: 'POST' }),

  getRides: () => request('/rides'),
  createRide: (payload) => request('/rides', { method: 'POST', body: payload }),
  joinRide: (id) => request(`/rides/${id}/join`, { method: 'POST' }),
  leaveRide: (id) => request(`/rides/${id}/leave`, { method: 'POST' }),
  cancelRide: (id) => request(`/rides/${id}/cancel`, { method: 'POST' }),

  getListings: () => request('/listings'),
  createListing: (payload) => request('/listings', { method: 'POST', body: payload }),
  markSold: (id) => request(`/listings/${id}/sold`, { method: 'POST' }),
  cancelListing: (id) => request(`/listings/${id}/cancel`, { method: 'POST' }),

  // Yonetici (admin) uclari - sadece isAdmin=true kullanicilar cagirabilir
  admin: {
    getUsers: () => request('/admin/users'),
    banUser: (id) => request(`/admin/users/${id}/ban`, { method: 'POST' }),
    unbanUser: (id) => request(`/admin/users/${id}/unban`, { method: 'POST' }),
    reactivateUser: (id) => request(`/admin/users/${id}/reactivate`, { method: 'POST' }),
    getDorms: () => request('/admin/dorms'),
    createDorm: (payload) => request('/admin/dorms', { method: 'POST', body: payload }),
    updateDorm: (id, payload) => request(`/admin/dorms/${id}`, { method: 'PUT', body: payload }),
    deleteDorm: (id) => request(`/admin/dorms/${id}`, { method: 'DELETE' }),
    getStats: () => request('/admin/stats'),
    getReports: () => request('/admin/reports'),
    resolveReport: (id) => request(`/admin/reports/${id}/resolve`, { method: 'POST' }),
  },

  // Profil uclari
  profile: {
    getMe: () => request('/profile/me'),
    getUser: (userId) => request(`/profile/${userId}`),
    updateMe: (payload) => request('/profile/me', { method: 'PUT', body: payload }),
    changePassword: (currentPassword, newPassword) =>
      request('/profile/password', { method: 'PUT', body: { currentPassword, newPassword } }),
    updateEmail: (email, currentPassword) =>
      request('/profile/email', { method: 'PUT', body: { email, currentPassword } }),
    setNotifications: (dmNotifications) =>
      request('/profile/notifications', { method: 'PUT', body: { dmNotifications } }),
    deactivate: (currentPassword) =>
      request('/profile/deactivate', { method: 'POST', body: { currentPassword } }),
  },

  // DM (mesajlasma) uclari
  messages: {
    start: (payload) => request('/messages/start', { method: 'POST', body: payload }),
    getConversations: () => request('/messages/conversations'),
    getMessages: (conversationId) => request(`/messages/conversations/${conversationId}/messages`),
    send: (conversationId, body) =>
      request(`/messages/conversations/${conversationId}/messages`, { method: 'POST', body: { body } }),
    deleteMessage: (messageId) => request(`/messages/messages/${messageId}`, { method: 'DELETE' }),
    accept: (conversationId) => request(`/messages/conversations/${conversationId}/accept`, { method: 'POST' }),
    decline: (conversationId) => request(`/messages/conversations/${conversationId}/decline`, { method: 'POST' }),
    getUnreadCount: () => request('/messages/unread-count'),
  },

  reports: {
    create: (payload) => request('/reports', { method: 'POST', body: payload }),
  },
}
