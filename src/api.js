// Backend'in adresi. Yerel gelistirmede localhost:3000, prod'a deploy
// ederken .env dosyasinda (ya da Vercel/Netlify ayarlarinda) VITE_BACKEND_URL
// tanimlarsan onu kullanir.
const BACKEND_URL = (import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000').replace(/\/+$/, '')
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

  // Backend beklenmedik bir sebeple hic cevap donmezse (orn. sunucuda
  // yakalanmamis bir hata) istek sonsuza kadar "Yukleniyor..." durumunda
  // kalmasin diye 15 saniyelik bir zaman asimi koyuyoruz.
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 15000)

  let res
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    })
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error('Sunucu cevap vermedi (zaman asimi). Tekrar dene.')
    }
    throw new Error('Backend\'e ulasilamiyor. "npm run dev" ile calistigindan emin ol (localhost:3000).')
  } finally {
    clearTimeout(timeoutId)
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
  requestOtp: (email) => request('/auth/request-otp', { method: 'POST', body: { email }, auth: false }),
  register: (payload) => request('/auth/register', { method: 'POST', body: payload, auth: false }),
  login: (identifier, password) => request('/auth/login', { method: 'POST', body: { identifier, password }, auth: false }),

  getOrders: (dormId) => request(dormId ? `/orders?dormId=${dormId}` : '/orders'),
  createOrder: (payload) => request('/orders', { method: 'POST', body: payload }),
  joinOrder: (id, amount) => request(`/orders/${id}/join`, { method: 'POST', body: amount ? { amount } : {} }),
  leaveOrder: (id) => request(`/orders/${id}/leave`, { method: 'POST' }),
  closeOrder: (id) => request(`/orders/${id}/close`, { method: 'POST' }),
  cancelOrder: (id) => request(`/orders/${id}/cancel`, { method: 'POST' }),
  removeOrderParticipant: (id, userId) => request(`/orders/${id}/participants/${userId}/remove`, { method: 'POST' }),

  getRequests: (dormId) => request(dormId ? `/requests?dormId=${dormId}` : '/requests'),
  createRequest: (payload) => request('/requests', { method: 'POST', body: payload }),
  fulfillRequest: (id) => request(`/requests/${id}/fulfill`, { method: 'POST' }),
  cancelRequest: (id) => request(`/requests/${id}/cancel`, { method: 'POST' }),

  getRides: (dormId) => request(dormId ? `/rides?dormId=${dormId}` : '/rides'),
  createRide: (payload) => request('/rides', { method: 'POST', body: payload }),
  joinRide: (id) => request(`/rides/${id}/join`, { method: 'POST' }),
  leaveRide: (id) => request(`/rides/${id}/leave`, { method: 'POST' }),
  cancelRide: (id) => request(`/rides/${id}/cancel`, { method: 'POST' }),
  removeRideParticipant: (id, userId) => request(`/rides/${id}/participants/${userId}/remove`, { method: 'POST' }),

  getListings: (dormId) => request(dormId ? `/listings?dormId=${dormId}` : '/listings'),
  createListing: (payload) => request('/listings', { method: 'POST', body: payload }),
  markSold: (id) => request(`/listings/${id}/sold`, { method: 'POST' }),
  cancelListing: (id) => request(`/listings/${id}/cancel`, { method: 'POST' }),

  // Yonetici (admin) uclari - sadece isAdmin=true kullanicilar cagirabilir
  admin: {
    getUsers: (dormId) => request(dormId ? `/admin/users?dormId=${dormId}` : '/admin/users'),
    banUser: (id) => request(`/admin/users/${id}/ban`, { method: 'POST' }),
    unbanUser: (id) => request(`/admin/users/${id}/unban`, { method: 'POST' }),
    reactivateUser: (id) => request(`/admin/users/${id}/reactivate`, { method: 'POST' }),
    getDorms: () => request('/admin/dorms'),
    createDorm: (payload) => request('/admin/dorms', { method: 'POST', body: payload }),
    updateDorm: (id, payload) => request(`/admin/dorms/${id}`, { method: 'PUT', body: payload }),
    deleteDorm: (id) => request(`/admin/dorms/${id}`, { method: 'DELETE' }),
    getStats: (dormId) => request(dormId ? `/admin/stats?dormId=${dormId}` : '/admin/stats'),
    getReports: (dormId) => request(dormId ? `/admin/reports?dormId=${dormId}` : '/admin/reports'),
    getReportDetail: (id) => request(`/admin/reports/${id}`),
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
    rate: (userId, score, comment) =>
      request(`/profile/${userId}/rate`, { method: 'POST', body: { score, comment } }),
  },

  // DM (mesajlasma) uclari
  messages: {
    start: (payload) => request('/messages/start', { method: 'POST', body: payload }),
    getConversations: () => request('/messages/conversations'),
    getMessages: (conversationId) => request(`/messages/conversations/${conversationId}/messages`),
    send: (conversationId, body, replyToId) =>
      request(`/messages/conversations/${conversationId}/messages`, {
        method: 'POST',
        body: replyToId ? { body, replyToId } : { body },
      }),
    deleteMessage: (messageId) => request(`/messages/messages/${messageId}`, { method: 'DELETE' }),
    react: (messageId, emoji) =>
      request(`/messages/messages/${messageId}/react`, { method: 'POST', body: { emoji } }),
    accept: (conversationId) => request(`/messages/conversations/${conversationId}/accept`, { method: 'POST' }),
    decline: (conversationId) => request(`/messages/conversations/${conversationId}/decline`, { method: 'POST' }),
    getUnreadCount: () => request('/messages/unread-count'),
  },

  reports: {
    create: (payload) => request('/reports', { method: 'POST', body: payload }),
  },

  push: {
    getVapidKey: () => request('/push/vapid-public-key', { auth: false }),
    subscribe: (subscription) => request('/push/subscribe', { method: 'POST', body: subscription }),
    unsubscribe: (endpoint) => request('/push/unsubscribe', { method: 'POST', body: { endpoint } }),
  },
}
