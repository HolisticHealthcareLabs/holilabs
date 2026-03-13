import { NextRequest } from 'next/server';

jest.mock('@/lib/api/patient-portal-middleware', () => ({
  createPatientPortalRoute: (handler: any) => handler,
}));

jest.mock('@/lib/notifications/send-push', () => ({
  sendTestNotification: jest.fn(),
}));

const { POST } = require('../route');
const { sendTestNotification } = require('@/lib/notifications/send-push');

const mockContext = {
  session: { userId: 'pu-1', patientId: 'patient-1', email: 'p@test.com' },
  requestId: 'req-1',
};

describe('POST /api/portal/notifications/test-push', () => {
  beforeEach(() => jest.clearAllMocks());

  it('sends test notification and returns sentCount', async () => {
    (sendTestNotification as jest.Mock).mockResolvedValue({ success: true, sentCount: 1 });

    const req = new NextRequest('http://localhost:3000/api/portal/notifications/test-push', {
      method: 'POST',
    });
    const res = await POST(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.sentCount).toBe(1);
    expect(sendTestNotification).toHaveBeenCalledWith('pu-1');
  });

  it('returns 500 when notification delivery fails', async () => {
    (sendTestNotification as jest.Mock).mockResolvedValue({
      success: false,
      errors: ['No subscriptions found'],
    });

    const req = new NextRequest('http://localhost:3000/api/portal/notifications/test-push', {
      method: 'POST',
    });
    const res = await POST(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.success).toBe(false);
    expect(data.error).toBe('Failed to send test notification');
  });

  it('passes correct userId from session to sendTestNotification', async () => {
    (sendTestNotification as jest.Mock).mockResolvedValue({ success: true, sentCount: 2 });

    const contextWithDifferentUser = {
      ...mockContext,
      session: { ...mockContext.session, userId: 'pu-99' },
    };

    const req = new NextRequest('http://localhost:3000/api/portal/notifications/test-push', {
      method: 'POST',
    });
    await POST(req, contextWithDifferentUser);

    expect(sendTestNotification).toHaveBeenCalledWith('pu-99');
  });

  it('includes error details in failure response', async () => {
    const errors = ['Subscription expired', 'Invalid endpoint'];
    (sendTestNotification as jest.Mock).mockResolvedValue({ success: false, errors });

    const req = new NextRequest('http://localhost:3000/api/portal/notifications/test-push', {
      method: 'POST',
    });
    const res = await POST(req, mockContext);
    const data = await res.json();

    expect(data.details).toEqual(errors);
  });
});
