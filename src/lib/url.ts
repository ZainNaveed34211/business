export const BUSINESS_HOME = 'https://business.kluzar.com/';
export const LOGIN_URL = 'https://accounts.kluzar.com';
export const PAYMENTS_URL = 'https://payments.kluzar.com';

export function loginUrl(): string {
  return LOGIN_URL + '/login/?next=' + encodeURIComponent(BUSINESS_HOME);
}

export function signupUrl(): string {
  return LOGIN_URL + '/signup/?next=' + encodeURIComponent(BUSINESS_HOME);
}

export function paymentsUrl(): string {
  return PAYMENTS_URL + '/?return=' + encodeURIComponent(BUSINESS_HOME);
}

export function dashboardUrl(): string {
  return LOGIN_URL + '/dashboard/';
}
